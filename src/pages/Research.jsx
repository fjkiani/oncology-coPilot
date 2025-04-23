import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { arrayMove } from "@dnd-kit/sortable";

// Components
import SearchBar from '../components/research/SearchBar';
import ResultsDisplay from '../components/research/ResultsDisplay';
import KanbanBoard from '../components/KanbanBoard';
import PatientTrialMatchView from '../components/research/PatientTrialMatchView'; // Import the detail view

// Placeholder data structure anticipating agent outputs
const placeholderTrial = {
  id: 'NCI-2021-08397',
  title: 'Using Cancer Cells in the Blood (ctDNA) to Determine the Type of Chemotherapy that will Benefit Patients who Have Had Surgery for Colon Cancer, (CIRCULATE-NORTH AMERICA)',
  // --- Agent Outputs ---
  aiSummary: 'AI Summary Placeholder: This Phase II/III trial for Stage II/III Colon Cancer compares chemotherapy strategies based on ctDNA status after surgery. ctDNA+ patients get standard chemo vs. mFOLFIRINOX. ctDNA- patients get standard chemo vs. surveillance with chemo upon ctDNA detection.',
  aiEligibility: 'AI Eligibility Placeholder: [Review Needed] Appears eligible for Stage III Colon Cancer, ECOG 0-1, post-R0 resection. Requires specific checks: ctDNA test results, MSI status (must be stable), lab values (ANC, platelets, Hgb, bili, CrCl), prior treatment review.',
  // --- Extracted Key Details ---
  keyDetails: {
    phase: 'Phase II / Phase III',
    status: 'Active',
    condition: 'Colon Cancer', // Simplified
    leadOrg: 'National Cancer Institute (NCI)', // Example
  },
  // --- Actionable Info ---
  contactInfo: { // Example: First contact listed
    name: 'Site Public Contact (UAB Cancer Center)',
    phone: '205-934-0220',
    email: 'tmyrick@uab.edu'
  },
  sourceUrl: 'https://www.cancer.gov/research/participate/clinical-trials-search/v?id=NCI-2021-08397'
};

// Default Columns for Kanban
const defaultCols = [
  { id: "followUpNeeded", title: "Follow-up Needed" },
  { id: "inProgress", title: "In Progress" },
  { id: "done", title: "Done" },
];

// Helper to generate simple IDs (replace with better method if needed)
const generateId = () => Math.floor(Math.random() * 10001);

// LocalStorage keys
const KANBAN_COLUMNS_KEY = 'kanbanColumns';
const KANBAN_TASKS_KEY = 'kanbanTasks';

const Research = () => {
  const { patientId } = useParams(); // Get patientId if navigating from EMR
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Combined loading state
  const [error, setError] = useState(null);
  const [patientData, setPatientData] = useState(null); // State for full patient data
  
  // --- State for the Detail View --- 
  const [detailViewContext, setDetailViewContext] = useState(null); // Stores { patientData, trialItem }
  // --- End State --- 
  
  // --- Column State Initialization --- 
  const [columns, setColumns] = useState(() => {
    const savedCols = localStorage.getItem(KANBAN_COLUMNS_KEY);
    let initialCols = defaultCols; // Default value
    if (savedCols) {
      try {
        // Attempt to parse, use default if fails or empty
        const parsedCols = JSON.parse(savedCols);
        if (Array.isArray(parsedCols) && parsedCols.length > 0) {
          initialCols = parsedCols;
        } 
      } catch (error) {
         // Ignore error, will use defaultCols
         console.error("Kanban: Error parsing columns from localStorage, using defaults:", error);
      }
    }
    return initialCols;
  });
  // --- End Column Initialization --- 

  // --- Task State Initialization ---
  const [tasks, setTasks] = useState(() => {
    const savedTasks = localStorage.getItem(KANBAN_TASKS_KEY);
    let initialTasks = [];
    if (savedTasks) {
        try {
            const parsedTasks = JSON.parse(savedTasks);
            if (Array.isArray(parsedTasks)) {
                initialTasks = parsedTasks;
            }
        } catch (error) {
            console.error("Kanban: Error parsing tasks from localStorage, using empty list:", error);
        }
    }
    // Filter tasks specific to this patient context AFTER loading all
    return initialTasks.filter(task => !patientId || task.patientId === patientId);
  });
  // --- End Task Initialization ---

  // --- Effect to Verify Columns on Mount --- 
  useEffect(() => {
    const hasFollowUpNeeded = columns.some(col => col.id === "followUpNeeded");
    if (!hasFollowUpNeeded) {
      console.warn("Kanban State Verification: 'followUpNeeded' column missing. Resetting columns to default and saving.");
      setColumns(defaultCols);
      localStorage.setItem(KANBAN_COLUMNS_KEY, JSON.stringify(defaultCols));
    }
    // We might also want to verify 'inProgress' and 'done' if they are essential
  }, []); // Empty dependency array ensures this runs only once on mount
  // --- End Verification Effect --- 

  // Save state to localStorage whenever it changes
  useEffect(() => {
    // Only save if columns state is valid (e.g., has the default needed column)
    if (columns.some(col => col.id === "followUpNeeded")) { 
      localStorage.setItem(KANBAN_COLUMNS_KEY, JSON.stringify(columns));
    } else {
      // Avoid saving an invalid state back to localStorage
      console.warn("Kanban: Attempted to save invalid columns state to localStorage. Aborted.");
    }
  }, [columns]);

  useEffect(() => {
    // When tasks change, update localStorage but only for the *full* task list
    // Need to load ALL tasks, update the relevant ones, then save all back
    const allTasksSaved = localStorage.getItem(KANBAN_TASKS_KEY);
    const allTasks = allTasksSaved ? JSON.parse(allTasksSaved) : [];
    // Create map of current patient tasks for easy update
    const currentPatientTasksMap = new Map(tasks.filter(t => t.patientId === patientId).map(t => [t.id, t]));
    // Filter out old tasks for this patient and add updated ones
    const updatedAllTasks = allTasks
        .filter(task => task.patientId !== patientId) // Remove old tasks for this patient
        .concat(tasks.filter(task => task.patientId === patientId)); // Add current tasks for this patient
    
    localStorage.setItem(KANBAN_TASKS_KEY, JSON.stringify(updatedAllTasks));
  }, [tasks, patientId]); // Depend on tasks and patientId
  
  // Reload tasks when patientId changes
  useEffect(() => {
    const savedTasks = localStorage.getItem(KANBAN_TASKS_KEY);
    const allTasks = savedTasks ? JSON.parse(savedTasks) : [];
    setTasks(allTasks.filter(task => !patientId || task.patientId === patientId));
  }, [patientId]); // Only reload tasks when patientId changes

  // Effect to fetch patient data if patientId exists
  useEffect(() => {
    setSearchResults([]); // Clear results on patient change
    setError(null);
    setPatientData(null); // Clear previous patient data

    if (patientId) {
      console.log(`Fetching patient data for: ${patientId}`);
      setIsLoading(true); // Use the combined loading state
      const fetchPatientData = async () => {
        try {
          const response = await fetch(`http://localhost:8000/api/patients/${patientId}`); // Use actual endpoint
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Failed to load patient data.' }));
            throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
          }
          const data = await response.json();
          if (data.success && data.data) {
            console.log("Patient data loaded:", data.data);
            setPatientData(data.data);
          } else {
            throw new Error(data.message || 'Patient data not found or invalid format.');
          }
        } catch (err) {
          console.error("Error fetching patient data:", err);
          setError(`Failed to load patient data: ${err.message}`);
          setPatientData(null); // Ensure patient data is null on error
        } finally {
          setIsLoading(false);
        }
      };
      fetchPatientData();
    } else {
       console.log('Research page loaded without patient context.');
       setIsLoading(false); // No patientId, so not loading
    }
  }, [patientId]); // Rerun when patientId changes

  // --- Add Task Function (from Checklist Modal) ---
  const addTask = useCallback((taskText) => {
    if (!taskText) return;
    const newTask = {
      id: generateId(), // Use helper
      columnId: "followUpNeeded", // Default column
      content: taskText,
      patientId: patientId || null 
    };
    setTasks(prevTasks => [...prevTasks, newTask]);
    console.log('Kanban Task Added:', newTask); 
  }, [patientId]); // Depend on patientId to associate task

  // --- Kanban Handler Functions ---
  const handleCreateColumn = useCallback(() => {
    const newColumn = {
      id: generateId(),
      title: `Column ${columns.length + 1}`,
    };
    setColumns(prev => [...prev, newColumn]);
  }, [columns.length]);

  const handleDeleteColumn = useCallback((id) => {
    setColumns(prev => prev.filter((col) => col.id !== id));
    // Also delete tasks in that column
    setTasks(prev => prev.filter((task) => task.columnId !== id));
  }, []);

  const handleUpdateColumn = useCallback((id, title) => {
    setColumns(prev => prev.map((col) => (col.id === id ? { ...col, title } : col)));
  }, []);

  const handleCreateTask = useCallback((columnId) => {
     const newTask = {
      id: generateId(),
      columnId,
      content: `New Task`, // Simple default content
      patientId: patientId || null
    };
    setTasks(prev => [...prev, newTask]);
  }, [patientId]);

  const handleDeleteTask = useCallback((id) => {
    setTasks(prev => prev.filter((task) => task.id !== id));
  }, []);

  const handleUpdateTask = useCallback((id, content) => {
    setTasks(prev => prev.map((task) => task.id === id ? { ...task, content } : task));
  }, []);

  const handleTaskMove = useCallback((active, over) => {
      // Handles both reordering within a column and moving between columns
      setTasks((prevTasks) => {
          const activeIndex = prevTasks.findIndex((t) => t.id === active.id);
          const overIndex = prevTasks.findIndex((t) => t.id === over.id);

          if (activeIndex === -1) return prevTasks; // Should not happen

          let newTasks = [...prevTasks];

          if (over.data.current?.type === "Column") {
              // Dropping Task onto a Column
              if (overIndex === -1) { // Check if over.id is a column ID
                 newTasks[activeIndex].columnId = over.id; 
                 // Move to the end of the list logically, dnd-kit handles visual
                 return arrayMove(newTasks, activeIndex, newTasks.length -1); 
              } 
          }
          
          if (over.data.current?.type === "Task") { 
              // Dropping Task onto another Task
              if (overIndex === -1) return prevTasks; // Should not happen

              if (newTasks[activeIndex].columnId !== newTasks[overIndex].columnId) {
                  // Moving to a different column
                  newTasks[activeIndex].columnId = newTasks[overIndex].columnId;
                  return arrayMove(newTasks, activeIndex, overIndex);
              } else {
                 // Reordering within the same column
                 return arrayMove(newTasks, activeIndex, overIndex);
              }
          }
          
          return prevTasks; // Return previous state if drop target is invalid
      });
  }, []);
  // --- End Kanban Handlers ---

  // --- NEW: Handler for Planning Follow-ups --- 
  const handlePlanFollowups = async (followupData) => {
    // Destructure the data passed from ResultsDisplay
    const { suggestions, trialId, trialTitle } = followupData;

    if (!suggestions || suggestions.length === 0) {
      console.log("No action suggestions provided to plan follow-ups.");
      setError("No action suggestions available to create follow-up tasks.");
      return;
    }
    
    console.log(`Planning follow-ups for Trial ${trialId} based on suggestions:`, suggestions);
    setIsLoading(true); // Indicate activity
    setError(null);

    try {
        const apiUrl = 'http://localhost:8000/api/plan-followups'; 
        
        // Prepare the request body including the new trial info
        const requestBody = {
            action_suggestions: suggestions,
            patient_id: patientId,
            trial_id: trialId,       // Add trialId
            trial_title: trialTitle  // Add trialTitle
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody), // Send the full request body
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Failed to plan follow-ups.'}));
            throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();

        // Assuming the API returns { success: true, planned_tasks: [...] } 
        if (result.success && Array.isArray(result.planned_tasks)) {
            console.log("Received planned tasks:", result.planned_tasks);
            
            // Add patientId to each task if not already present and patientId exists
            const tasksToAdd = result.planned_tasks.map(task => ({
                 ...task, // Expecting { id, content, columnId }
                 id: task.id || generateId(), // Ensure ID exists
                 columnId: task.columnId || 'followUpNeeded', // Default column if missing
                 patientId: task.patientId || patientId || null // Assign current patient context
            }));

            // Add new tasks to the existing tasks state
            setTasks(prevTasks => [
                ...prevTasks,
                ...tasksToAdd
            ]);
            console.log("Follow-up tasks added to Kanban board.");
        } else {
            throw new Error(result.message || 'Invalid response format from planning endpoint.');
        }

    } catch (err) {
        console.error("Error planning follow-ups:", err);
        setError(`Failed to plan follow-ups: ${err.message}`);
    } finally {
        setIsLoading(false);
    }
  };
  // --- END NEW HANDLER ---

  // Function to handle search triggered by SearchBar
  const handleSearch = async (query) => {
    if (!query) {
      setError('Please enter a search query.');
      return;
    }
    console.log(`Performing search for: ${query}`);
    setSearchQuery(query);
    setIsLoading(true);
    setError(null);
    setSearchResults([]); // Clear previous results

    // Prepare request body using the fetched patientData state
    const requestBody = {
        query: query,
        patient_context: patientData // Use the full patientData object (or null if not loaded)
    };

    try {
        const response = await fetch('http://localhost:8000/api/search-trials', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ detail: 'Failed to parse error response.' }));
             console.error("Backend search error:", response.status, errorData);
             throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data && result.data.found_trials) {
            console.log("Trials found:", result.data.found_trials);
            setSearchResults(result.data.found_trials);
            if (result.data.found_trials.length === 0) {
                 // Changed: Display message via ResultsDisplay instead of setting error here
                 // setError('No matching trials found.');
            }
        } else if (result.success) {
            console.log("Search successful but no trials found or data format unexpected.");
            setSearchResults([]);
            // Changed: Display message via ResultsDisplay instead of setting error here
            // setError(result.message || 'No matching trials found.');
        } else {
             console.error("Backend indicated failure:", result);
             throw new Error(result.message || 'Backend search failed.');
        }
    } catch (err) {
        console.error("Error fetching search results:", err);
        setError(err.message || 'Failed to fetch search results. Check backend connection.');
        setSearchResults([]); // Ensure results are cleared on error
    } finally {
        setIsLoading(false); // Ensure loading state is turned off
    }
    
    // Clear detail view on new search
    setDetailViewContext(null);
  };

  // Function to handle search triggered by button
  const handlePatientContextSearch = () => {
    if (!patientData) {
      setError("Cannot search by context: Patient data not loaded.");
      return;
    }

    // Construct query from patient data (e.g., primary diagnosis)
    const diagnosis = patientData.diagnosis?.primary;
    if (!diagnosis) {
      // Fallback if primary diagnosis is missing
      setError("Cannot generate query: Primary diagnosis missing in patient data.");
      // Alternatively, you could try a broader query or prompt user
      return;
    }
    
    console.log(`Triggering context search using diagnosis: ${diagnosis}`);
    // Call the main search handler with the generated query
    handleSearch(diagnosis);
  };

  // --- Handler to show Detail View when Kanban card is clicked ---
  const handleViewTaskDetails = async (task) => {
    console.log("handleViewTaskDetails called for task:", task);
    if (!task.trial_id || !patientData) {
      console.error("Cannot view details: Missing trial ID on task or patient data not loaded.");
      alert("Could not load details for this task: Missing context.");
      return;
    }

    // --- Fetch specific trial details + analysis --- 
    setIsLoading(true); // Use main loading indicator for now
    setError(null);
    try {
      const apiUrl = `/api/trial-details/${task.trial_id}?patientId=${task.patientId}`;
      console.log(`Fetching trial details from: ${apiUrl}`);
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
         const errorData = await response.json().catch(() => ({ detail: `HTTP error! Status: ${response.status}` }));
         throw new Error(errorData.detail || `Failed to fetch details for trial ${task.trial_id}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
          console.log("Received trial detail data:", result.data);
          // Set the context for the detail view
          setDetailViewContext({ 
              patientData: patientData, 
              trialItem: result.data // Use the fetched, combined data
          }); 
      } else {
          throw new Error(result.message || `Invalid response format when fetching details for trial ${task.trial_id}`);
      }

    } catch (err) {
        console.error(`Error fetching details for trial ${task.trial_id}:`, err);
        setError(`Failed to load details for trial ${task.trial_id}: ${err.message}`);
        setDetailViewContext(null); // Clear context on error
    } finally {
        setIsLoading(false);
    }
    // --- End Fetch --- 
  };
  
  // --- Handler to close Detail View ---
  const handleCloseDetailView = () => {
      setDetailViewContext(null); 
      setError(null); // Also clear error when closing manually
  };

  // --- Render Logic --- 
  return (
    <div className="research-container p-4 md:p-6 bg-gray-50">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Research Portal</h1>
      
      {/* Patient Context Banner */}      
      {patientId && patientData && // Show patient ID only if data loaded successfully
        <p className="mb-4 text-sm text-gray-600">Showing research relevant to Patient ID: {patientId} ({patientData.demographics?.name || 'Name N/A'})</p>
      }
      {patientId && !patientData && !isLoading && // Show if patientId exists but data failed to load
         <p className="mb-4 text-sm text-red-600">Could not load data for Patient ID: {patientId}. Proceeding without context.</p>
      }
      
      {/* Conditionally render Detail View OR Main Layout */}      
      {detailViewContext ? (
          // Show Detail View
          <PatientTrialMatchView 
              trialItem={detailViewContext.trialItem}
              patientContext={detailViewContext.patientData}
              onClose={handleCloseDetailView} 
          />
      ) : (
          // Show Main Layout
          <>
            {/* Search Area */}          
            <div className="search-controls mb-6 flex flex-col sm:flex-row items-start gap-3">
              {/* Search Bar takes full width on small, less on larger */}
              <div className="flex-grow w-full sm:w-auto">
                <SearchBar onSearch={handleSearch} isLoading={isLoading} />
              </div>
              
              {/* Context Search Button - only enabled if patientData exists */}
              <button
                onClick={handlePatientContextSearch}
                disabled={!patientData || isLoading} // Disable if no patient or already loading
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed w-full sm:w-auto whitespace-nowrap"
              >
                Find Trials for This Patient
              </button>
            </div>

            {/* Display Loading / Error (related to search) / Results */}            
            {isLoading && searchResults.length === 0 && !error && <div className="text-center p-6 text-gray-500">Searching for trials...</div>}
            {/* Display search error separately from loading */}            
            {error && !isLoading && <div className="text-center p-6 text-red-600">Error: {error}</div>} 
            {!isLoading && searchResults.length > 0 && (
              <ResultsDisplay 
                results={searchResults} 
                patientContext={patientData} 
                onPlanFollowups={handlePlanFollowups} 
               />
            )}
            {!isLoading && !error && searchQuery && searchResults.length === 0 && (
                <div className="text-center p-6 text-gray-500">No matching trials found for "{searchQuery}".</div>
            )}
            
            {/* Kanban Board */}            
            {patientId && (
                <div className="mt-8 mb-6 border-t pt-6">
                 <h3 className="text-lg font-semibold mb-3 text-gray-700">Follow-up Task Board</h3>
                 <KanbanBoard 
                    columns={columns}
                    tasks={tasks} 
                    onColumnsChange={setColumns} 
                    onTasksChange={handleTaskMove} 
                    onCreateColumn={handleCreateColumn}
                    onDeleteColumn={handleDeleteColumn}
                    onUpdateColumn={handleUpdateColumn}
                    onCreateTask={handleCreateTask}
                    onDeleteTask={handleDeleteTask}
                    onUpdateTask={handleUpdateTask}
                    onViewTaskDetails={handleViewTaskDetails} 
                 />
               </div>
            )}
          </>
      )}
      
    </div>
  );
};

export default Research; 