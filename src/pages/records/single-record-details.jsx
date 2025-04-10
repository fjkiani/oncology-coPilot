import React, { useState, useEffect } from "react";
import {
  IconChevronRight,
  IconFileUpload,
  IconProgress,
} from "@tabler/icons-react";
import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useStateContext } from "../../context/index";
import ReactMarkdown from "react-markdown";
import FileUploadModal from "./components/file-upload-modal";
import RecordDetailsHeader from "./components/record-details-header";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Import the component for displaying structured EHR data + CoPilot prompt
import PatientRecordViewer from "../../components/ehr/PatientRecordViewer";

const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

const SingleRecordDetails = () => {
  const { state } = useLocation(); // State possibly passed from navigation (e.g., recordName)
  const navigate = useNavigate();
  const { id: patientIdFromUrl } = useParams(); // Get patient ID from URL (e.g., PAT12345)

  // --- State for Uploaded File Analysis & Kanban ---
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [processingKanban, setIsProcessingKanban] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(state?.analysisResult || ""); // Analysis result from uploaded file
  const [filename, setFilename] = useState("");
  const [filetype, setFileType] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- State for Fetched Patient EHR Data ---
  const [patientData, setPatientData] = useState(null); // Structured EHR data from backend
  const [isLoadingEhr, setIsLoadingEhr] = useState(true); // Loading state for EHR data
  const [ehrError, setEhrError] = useState(null); // Error state for EHR data fetching

  const { updateRecord } = useStateContext(); // Context function (ensure this is available and working)

  // --- File Upload Modal Handlers ---
  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      console.log("Selected file:", selectedFile);
      setFileType(selectedFile.type);
      setFilename(selectedFile.name);
      setFile(selectedFile);
    }
  };

  // --- Base64 Helper ---
  const readFileAsBase64 = (fileToRead) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(fileToRead);
    });
  };

  // --- Gemini Call for Uploaded File Analysis ---
  const handleFileUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadSuccess(false);
    setAnalysisResult(""); // Clear previous analysis

    // Check if API Key is available (consider better error handling)
    if (!geminiApiKey) {
        console.error("Error: VITE_GEMINI_API_KEY is not set in environment variables.");
        setEhrError("Frontend API Key is missing."); // Use ehrError state for general errors?
        setUploading(false);
        return;
    }
    const genAI = new GoogleGenerativeAI(geminiApiKey);

    try {
      const base64Data = await readFileAsBase64(file);
      const imageParts = [{ inlineData: { data: base64Data, mimeType: filetype } }];
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); // Ensure correct model
      const prompt = `You are an expert cancer and any disease diagnosis analyst. Use your knowledge base to analyze the provided image/document and give a detailed treatment plan. Make it readable, clear, and easy to understand in paragraphs.`;

      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const text = response.text();
      setAnalysisResult(text);

      // Update record via context if documentID is available (e.g., from state)
      // The documentID might differ from the patientIdFromUrl
      const documentIdForUpdate = state?.id; // Get ID from navigation state if present
      if (documentIdForUpdate && updateRecord) {
         console.log(`Updating record ${documentIdForUpdate} with analysis result.`);
         await updateRecord({
            documentID: documentIdForUpdate,
            analysisResult: text,
            // kanbanRecords: "", // Reset Kanban? Decide on behavior
         });
      } else {
          console.warn("Cannot update record via context: documentID or updateRecord function missing.");
      }

      setUploadSuccess(true);
      setIsModalOpen(false);
      setFilename("");
      setFile(null);
      setFileType("");
    } catch (error) {
      console.error("Error uploading and analyzing file:", error);
      setUploadSuccess(false);
      // Display error to user?
    } finally {
      setUploading(false);
    }
  };

  // --- Gemini Call for Kanban Generation ---
  const processTreatmentPlan = async () => {
    if (!analysisResult) return;
    setIsProcessingKanban(true);

    if (!geminiApiKey) {
        console.error("Error: VITE_GEMINI_API_KEY is not set.");
        setIsProcessingKanban(false);
        return;
    }
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); // Ensure correct model

    const prompt = `Based on the following treatment plan analysis: \n${analysisResult}\n\n Create a Kanban board structure with columns: "Todo", "Work in progress", and "Done". Populate the 'tasks' array with actionable steps derived from the plan, assigning each task an 'id', the appropriate 'columnId' ('todo', 'doing', 'done'), and a concise 'content' description. Respond ONLY with the JSON structure, like this example:
{
  "columns": [
    { "id": "todo", "title": "Todo" },
    { "id": "doing", "title": "Work in progress" },
    { "id": "done", "title": "Done" }
  ],
  "tasks": [
    { "id": "1", "columnId": "todo", "content": "Schedule initial consultation" },
    { "id": "2", "columnId": "todo", "content": "Complete baseline blood tests" },
    { "id": "3", "columnId": "doing", "content": "Undergo first chemotherapy cycle" }
  ]
}
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        // Basic cleaning attempt for JSON
        const text = response.text().replace(/^`{3}json\s*|`{3}$/g, '').trim();
        console.log("Raw Kanban JSON Text:", text);
        const parsedResponse = JSON.parse(text);
        console.log("Parsed Kanban JSON:", parsedResponse);

        const documentIdForUpdate = state?.id;
        if (documentIdForUpdate && updateRecord) {
            console.log(`Updating record ${documentIdForUpdate} with Kanban data.`);
            await updateRecord({
                documentID: documentIdForUpdate,
                kanbanRecords: text, // Store the raw JSON string
            });
        } else {
             console.warn("Cannot update record via context: documentID or updateRecord function missing.");
        }

        navigate("/screening-schedules", { state: parsedResponse }); // Navigate with parsed data
    } catch(error) {
        console.error("Error processing treatment plan into Kanban:", error);
         // Display error to user?
    } finally {
        setIsProcessingKanban(false);
    }
  };

  // --- Effect for Fetching Patient EHR Data ---
  useEffect(() => {
    const fetchPatientData = async () => {
      // Use patientIdFromUrl obtained from useParams
      if (!patientIdFromUrl) {
        setEhrError("No patient ID specified in the URL.");
        setIsLoadingEhr(false);
        return;
      }

      setIsLoadingEhr(true);
      setEhrError(null);
      setPatientData(null); // Clear previous EHR data
      console.log(`Fetching EHR data for patient ID: ${patientIdFromUrl}`);

      try {
        const response = await fetch(`http://localhost:8000/api/patients/${patientIdFromUrl}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
          throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Handle specific backend error if patient not found
        if (data.error && data.error === "Patient not found") {
          throw new Error("Patient EHR data not found for this ID.");
        }
        setPatientData(data);
        console.log("Fetched patient EHR data:", data);
      } catch (fetchError) {
        console.error("Error fetching patient EHR data:", fetchError);
        setEhrError(fetchError.message || "Failed to load patient EHR record.");
      } finally {
        setIsLoadingEhr(false);
      }
    };

    fetchPatientData();
  }, [patientIdFromUrl]); // Dependency array includes the ID from the URL


  // --- Rendering Logic ---

  return (
    <div className="flex flex-col gap-6"> {/* Use flex-col for better layout */}
      {/* Header and Upload Button */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <RecordDetailsHeader recordName={state?.recordName || `Patient ID: ${patientIdFromUrl || 'N/A'}`} />
        <button
          type="button"
          onClick={handleOpenModal}
          className="inline-flex items-center gap-x-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50 dark:border-neutral-700 dark:bg-[#13131a] dark:text-white dark:hover:bg-neutral-800"
        >
          <IconFileUpload />
          Upload & Analyze Report
        </button>
      </div>

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onFileChange={handleFileChange}
        onFileUpload={handleFileUpload}
        uploading={uploading}
        uploadSuccess={uploadSuccess}
        filename={filename}
      />

      {/* Analysis Result Section (from uploaded file) */}
      <div className="w-full">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-[#13131a]">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-neutral-700">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-neutral-200">
              Uploaded Report Analysis
            </h2>
            <p className="text-sm text-gray-600 dark:text-neutral-400">
              AI analysis and treatment plan based on the uploaded document/image.
            </p>
          </div>
          <div className="flex w-full flex-col px-6 py-4 text-white">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                Analysis Result:
              </h3>
              <div className="prose prose-sm dark:prose-invert max-w-none"> {/* Added prose styling */}
                {analysisResult ? (
                  <ReactMarkdown>{analysisResult}</ReactMarkdown>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-neutral-400">
                    {uploading ? "Analyzing..." : "Upload a report to generate analysis."}
                  </p>
                )}
              </div>
            </div>
            {analysisResult && !uploading && ( // Show button only if analysis is done and not currently uploading
              <div className="mt-5 grid gap-2 sm:flex">
                <button
                  type="button"
                  onClick={processTreatmentPlan}
                  disabled={processingKanban}
                  className="inline-flex items-center gap-x-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                >
                  Generate Treatment Tasks
                  <IconChevronRight size={20} />
                  {processingKanban && (
                    <IconProgress size={20} className="animate-spin" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <hr className="my-6 border-gray-300 dark:border-neutral-700" />

      {/* EHR Data Viewer and CoPilot Section */}
      <div className="w-full">
         <h2 className="text-xl font-semibold text-gray-800 dark:text-neutral-200 mb-4">
            EHR Record & CoPilot
         </h2>
         {isLoadingEhr ? (
             <div className="p-4 text-center">Loading EHR data...</div>
         ) : ehrError ? (
             <div className="p-4 text-center text-red-600">Error loading EHR data: {ehrError}</div>
         ) : patientData ? (
             <PatientRecordViewer patientData={patientData} />
         ) : (
             <div className="p-4 text-center text-gray-500">EHR data not available for this patient.</div>
         )}
      </div>

    </div>
  );
};

export default SingleRecordDetails;
