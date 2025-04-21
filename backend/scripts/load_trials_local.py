import os
import json
import re
import pprint
import sqlite3
from dotenv import load_dotenv
import chromadb
from sentence_transformers import SentenceTransformer
import logging
from pathlib import Path
import google.generativeai as genai

# --- Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
dotenv_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=dotenv_path)

SQLITE_DB_PATH = "backend/db/trials.db"
CHROMA_DB_PATH = "./chroma_db"
CHROMA_COLLECTION_NAME = "clinical_trials_eligibility"
SOURCE_JSON_PATH = "backend/documents.json"
EMBEDDING_MODEL = 'all-MiniLM-L6-v2'
VECTOR_DIMENSION = 384

# --- LLM Configuration for Summarization ---
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
LLM_MODEL_NAME = "gemini-1.5-flash"

# --- Trial Summary Prompt Template (Copied from Agent) ---
TRIAL_SUMMARY_PROMPT_TEMPLATE = """
Summarize the key aspects of the following clinical trial based ONLY on the provided Description and Objectives.
Focus on: 
1. The primary condition being studied.
2. The main intervention(s) being tested.
3. The key target patient population (briefly).

Respond with a concise summary (2-4 sentences maximum). Do not include information not present in the text below.

**Trial Description:**
{description}

**Trial Objectives:**
{objectives}

**Summary:**
"""

# --- Helper Functions (Copied from previous script, adapted slightly) ---

def get_text_between(text, start_heading, end_heading=None):
    """Extracts text between two headings (e.g., ## Heading1 and ## Heading2)."""
    start_pattern = re.escape(start_heading)
    start_regex = r"(?m)^[ \t]*" + start_pattern + r"[ \t]*\n"
    start_match = re.search(start_regex, text, re.IGNORECASE)
    if not start_match:
        return None
    start_pos = start_match.end()
    end_pos = len(text)
    if end_heading:
        # Regex to find the next L2 or L3 heading more reliably
        end_regex = r"(?m)^[ \t]*#{2,3}[ \t]+"
        end_match = re.search(end_regex, text[start_pos:], re.IGNORECASE)
        if end_match:
            # Check if the found heading is the specific end_heading if provided
            # This logic might need refinement depending on markdown consistency
            found_heading = text[start_pos + end_match.start():].split('\n')[0].strip()
            # Simple check: if end_heading exists, try to match it approximately
            # This part is tricky, relying on the next heading marker is safer
            # if end_heading.lower() in found_heading.lower():
            end_pos = start_pos + end_match.start()
            # else: # Found a heading, but not the specific end one - still use it as boundary
            #     end_pos = start_pos + end_match.start()
    return text[start_pos:end_pos].strip()

def parse_markdown_content(markdown):
    """Parses the markdown text to extract key sections."""
    data = {}
    data['inclusion_criteria_text'] = get_text_between(markdown, "### Inclusion Criteria", "### Exclusion Criteria")
    data['exclusion_criteria_text'] = get_text_between(markdown, "### Exclusion Criteria", "## Locations & Contacts")
    data['description_text'] = get_text_between(markdown, "## Description", "## Eligibility Criteria")
    data['objectives_text'] = get_text_between(markdown, "## Trial Objectives and Outline", "## Trial Phase & Type")

    phase_type_section = get_text_between(markdown, "## Trial Phase & Type", "## Lead Organization")
    if phase_type_section:
        phase_match = re.search(r"\*\*Trial Phase\*\*\s+(.*)", phase_type_section)
        data['phase'] = phase_match.group(1).strip() if phase_match else None

    ids_section = get_text_between(markdown, "## Trial IDs", "Share this clinical trial")
    if ids_section:
        primary_id_match = re.search(r"- \*\*Primary ID\*\*\s+([^\n]+)", ids_section)
        data['primary_id'] = primary_id_match.group(1).strip() if primary_id_match else None
        nct_id_match = re.search(r"- \*\*ClinicalTrials\.gov ID\*\*\s+\[(NCT\d+)\]\(.*\)", ids_section)
        data['nct_id'] = nct_id_match.group(1).strip() if nct_id_match else None

    title_match = re.search(r"(?m)^# (.*)", markdown)
    data['title_from_markdown'] = title_match.group(1).strip() if title_match else None
    
    # Corrected status regex to capture only up to the newline
    status_match = re.search(r"Trial Status:\s*([^\n]+)", markdown) 
    data['status'] = status_match.group(1).strip() if status_match else None

    inc = data.get('inclusion_criteria_text', "") or ""
    exc = data.get('exclusion_criteria_text', "") or ""
    data['eligibility_text'] = f"Inclusion Criteria:\n{inc}\n\nExclusion Criteria:\n{exc}".strip()

    if not data.get('title_from_markdown'):
        logging.warning("Could not parse title from markdown H1.")

    return data

def initialize_sqlite(db_path):
    """Connects to SQLite DB and creates table if not exists."""
    logging.info(f"Initializing SQLite database at {db_path}...")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        # Add ai_summary column
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS clinical_trials (
            source_url TEXT PRIMARY KEY,
            nct_id TEXT,
            primary_id TEXT,
            title TEXT,
            status TEXT,
            phase TEXT,
            description_text TEXT,
            inclusion_criteria_text TEXT,
            exclusion_criteria_text TEXT,
            objectives_text TEXT,
            eligibility_text TEXT,
            raw_markdown TEXT,
            metadata_json TEXT,
            ai_summary TEXT DEFAULT NULL  -- Add new column for precomputed summary
        );
        """
        cursor.execute(create_table_sql)
        # Attempt to add column if table already exists (idempotent)
        try:
            cursor.execute("ALTER TABLE clinical_trials ADD COLUMN ai_summary TEXT DEFAULT NULL;")
            logging.info("Added 'ai_summary' column to existing table.")
        except sqlite3.OperationalError as alter_err:
            # Ignore error if column already exists
            if "duplicate column name" in str(alter_err).lower():
                logging.info("'ai_summary' column already exists.")
            else:
                raise # Re-raise unexpected alter table errors

        # Create indices
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_status ON clinical_trials (status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_phase ON clinical_trials (phase);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_nct_id ON clinical_trials (nct_id);")
        conn.commit()
        logging.info("SQLite database and table initialized/updated successfully.")
        return conn
    except sqlite3.Error as e:
        logging.error(f"SQLite error during initialization/update: {e}")
        return None
    except Exception as e:
        logging.error(f"Unexpected error initializing/updating SQLite: {e}")
        return None

def initialize_chromadb(path, collection_name):
    """Initializes ChromaDB client and gets/creates a collection."""
    logging.info(f"Initializing ChromaDB at {path} for collection '{collection_name}'...")
    try:
        client = chromadb.PersistentClient(path=path)
        collection = client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"} # Specify cosine distance
        )
        logging.info("ChromaDB client and collection initialized successfully.")
        return collection
    except Exception as e:
        logging.error(f"Failed to initialize ChromaDB: {e}", exc_info=True)
        return None

# --- Main Execution ---
if __name__ == "__main__":
    logging.info("--- Starting Clinical Trial Local Loading Script --- (with AI Summary Pre-computation)")

    # Initialize LLM Client
    llm_client = None
    if GOOGLE_API_KEY:
        try:
            logging.info("Configuring Google Generative AI for summarization...")
            genai.configure(api_key=GOOGLE_API_KEY)
            llm_client = genai.GenerativeModel(LLM_MODEL_NAME)
            logging.info("Google Generative AI client initialized successfully.")
        except Exception as e:
            logging.error(f"Failed to initialize Google Generative AI client: {e}. AI summaries will be skipped.")
    else:
        logging.warning("GOOGLE_API_KEY not found. AI summaries will be skipped.")

    # 1. Initialize SQLite (now includes ai_summary column)
    sql_conn = initialize_sqlite(SQLITE_DB_PATH)
    if not sql_conn:
        exit(1)
    sql_cursor = sql_conn.cursor()

    # 2. Initialize ChromaDB
    chroma_collection = initialize_chromadb(CHROMA_DB_PATH, CHROMA_COLLECTION_NAME)
    if not chroma_collection:
        sql_conn.close()
        exit(1)

    # 3. Load Source JSON
    logging.info(f"Loading source JSON file: {SOURCE_JSON_PATH}")
    try:
        with open(SOURCE_JSON_PATH, 'r') as f:
            trials_data = json.load(f)
        logging.info(f"Successfully loaded {len(trials_data)} trials from JSON.")
    except Exception as e:
        logging.error(f"Error loading JSON file {SOURCE_JSON_PATH}: {e}")
        sql_conn.close()
        exit(1)

    # 4. Initialize Embedding Model
    logging.info(f"Loading embedding model: {EMBEDDING_MODEL}...")
    try:
        model = SentenceTransformer(EMBEDDING_MODEL)
        logging.info("Embedding model loaded successfully.")
    except Exception as e:
        logging.error(f"Failed to load sentence transformer model '{EMBEDDING_MODEL}': {e}")
        sql_conn.close()
        exit(1)

    # 5. Process and Load Trials
    logging.info("--- Starting data processing and loading (including AI summaries) ---")
    processed_count = 0
    error_count = 0
    chroma_batch_size = 100 # Adjust batch size as needed for ChromaDB performance
    chroma_batch = {"ids": [], "embeddings": [], "documents": [], "metadatas": []}

    for i, trial in enumerate(trials_data):
        logging.info(f"Processing trial {i+1}/{len(trials_data)}...")
        metadata = trial.get("metadata", {})
        markdown = trial.get("markdown", "")
        source_url = metadata.get("sourceURL")

        if not source_url:
            logging.warning(f"Skipping trial {i+1} due to missing 'sourceURL' in metadata.")
            error_count += 1
            continue

        try:
            # Parse markdown content
            parsed_data = parse_markdown_content(markdown)
            
            # --- Generate AI Summary --- 
            ai_summary = "AI summary skipped: LLM client not initialized." # Default
            if llm_client:
                try:
                    description_text = parsed_data.get('description_text', 'Not available.')
                    objectives_text = parsed_data.get('objectives_text', 'Not available.')
                    if description_text != 'Not available.' or objectives_text != 'Not available.':
                        summary_prompt_text = TRIAL_SUMMARY_PROMPT_TEMPLATE.format(
                            description=description_text,
                            objectives=objectives_text
                        )
                        summary_response = llm_client.generate_content(
                            summary_prompt_text,
                            generation_config=genai.GenerationConfig(temperature=0.3)
                        )
                        
                        # --- Handle potential JSON response from LLM --- 
                        raw_text = summary_response.text.strip() if summary_response.text else ""
                        if raw_text:
                            try:
                                parsed_json = json.loads(raw_text)
                                if isinstance(parsed_json, dict):
                                    # Format a text summary FROM the unexpected JSON
                                    cond = parsed_json.get('primaryCondition', 'N/A')
                                    inter = parsed_json.get('intervention', 'N/A')
                                    pop = parsed_json.get('targetPopulation', 'N/A')
                                    ai_summary = f"Studies {cond}. Intervention: {inter}. Population: {pop}." 
                                    logging.warning(f"Trial {source_url}: LLM returned JSON for summary, formatted to text.")
                                else:
                                     # It parsed as JSON, but wasn't a dict? Use raw text.
                                     ai_summary = raw_text 
                            except json.JSONDecodeError:
                                # Failed to parse JSON, assume it's the intended plain text
                                ai_summary = raw_text 
                        else:
                            ai_summary = "AI summary generation failed or returned empty."
                            
                        logging.debug(f"Trial {source_url}: AI summary stored.")
                    else:
                        ai_summary = "AI summary skipped: No description or objectives found."
                        logging.warning(f"Trial {source_url}: Skipping summary - no description/objectives.")
                except Exception as summary_err:
                    logging.error(f"Trial {source_url}: LLM summary generation failed: {summary_err}", exc_info=False) 
                    ai_summary = f"Error generating AI summary: {summary_err}"
            
            # Prepare data for SQLite (including potentially fixed ai_summary)
            sql_data = (
                source_url,
                parsed_data.get('nct_id'),
                parsed_data.get('primary_id'),
                metadata.get("title") or parsed_data.get('title_from_markdown', 'N/A'),
                parsed_data.get('status'),
                parsed_data.get('phase'),
                parsed_data.get('description_text'),
                parsed_data.get('inclusion_criteria_text'),
                parsed_data.get('exclusion_criteria_text'),
                parsed_data.get('objectives_text'),
                parsed_data.get('eligibility_text'),
                markdown, # Store original markdown
                json.dumps(metadata), # metadata_json
                ai_summary # Add the generated/fixed summary
            )

            # Insert or Replace into SQLite (updated query)
            # Ensure the number of columns matches the number of placeholders
            insert_sql = """
            INSERT OR REPLACE INTO clinical_trials (
                source_url, nct_id, primary_id, title, status, phase,
                description_text, inclusion_criteria_text, exclusion_criteria_text,
                objectives_text, eligibility_text, raw_markdown, metadata_json,
                ai_summary -- Added column
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?); -- Added placeholder
            """
            sql_cursor.execute(insert_sql, sql_data)

            # Prepare data for ChromaDB
            eligibility_text_to_embed = parsed_data.get('eligibility_text')
            if eligibility_text_to_embed:
                # Generate embedding
                embedding = model.encode([eligibility_text_to_embed])[0].tolist()

                # Add to ChromaDB batch
                chroma_batch["ids"].append(source_url) # Use source_url as the unique ID
                chroma_batch["embeddings"].append(embedding)
                chroma_batch["documents"].append(eligibility_text_to_embed[:500]) # Store snippet as document
                # Store key metadata for potential filtering in Chroma (optional)
                chroma_batch["metadatas"].append({
                    "title": sql_data[3], # Title from sql_data tuple
                    "status": sql_data[4],
                    "phase": sql_data[5]
                    # Add other relevant metadata if needed for Chroma filtering
                })
            else:
                logging.warning(f"Trial {source_url}: No eligibility text found for ChromaDB embedding.")

            # Upsert batch to ChromaDB if full
            if len(chroma_batch["ids"]) >= chroma_batch_size:
                logging.info(f"Upserting batch of {len(chroma_batch['ids'])} embeddings to ChromaDB...")
                chroma_collection.upsert(**chroma_batch)
                chroma_batch = {"ids": [], "embeddings": [], "documents": [], "metadatas": []} # Reset batch

            processed_count += 1
            if (i + 1) % 10 == 0: # Commit more frequently due to LLM calls
                 logging.info(f"Processed {i+1}/{len(trials_data)} trials (including summaries). Committing...")
                 sql_conn.commit() 

        except sqlite3.Error as e:
            logging.error(f"SQLite error processing trial {i+1} ({source_url}): {e}")
            error_count += 1
        except Exception as e:
            logging.error(f"General error processing trial {i+1} ({source_url}): {e}", exc_info=True)
            error_count += 1

    # Upsert any remaining items in the last ChromaDB batch
    if chroma_batch["ids"]:
        logging.info(f"Upserting final batch of {len(chroma_batch['ids'])} embeddings to ChromaDB...")
        try:
            chroma_collection.upsert(**chroma_batch)
        except Exception as e:
            logging.error(f"Error upserting final ChromaDB batch: {e}", exc_info=True)
            error_count += len(chroma_batch["ids"]) # Count these as errors if final upsert fails

    # Final commit and close SQLite connection
    try:
        sql_conn.commit()
        sql_conn.close()
        logging.info("SQLite connection closed.")
    except sqlite3.Error as e:
        logging.error(f"SQLite error during final commit/close: {e}")

    logging.info("--- Loading Complete ---")
    logging.info(f"Successfully processed: {processed_count} trials (check logs for warnings).")
    logging.info(f"Errors/Skipped trials: {error_count}. Check logs for details.") 