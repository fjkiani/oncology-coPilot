import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";
import TaskCard from "./TaskCard";
import { IconPlus, IconTrash, IconChevronDown, IconChevronRight } from "@tabler/icons-react";

// Helper function to group tasks by trial_id
const groupTasksByTrial = (tasks) => {
  return tasks.reduce((groups, task) => {
    const key = task.trial_id || '__ungrouped__'; // Use a special key for tasks without a trial
    if (!groups[key]) {
      groups[key] = {
        trialId: task.trial_id,
        trialTitle: task.trial_title, // Store title for the header
        tasks: [],
      };
    }
    groups[key].tasks.push(task);
    return groups;
  }, {});
};

function ColumnContainer({
  column,
  deleteColumn,
  updateColumn,
  createTask,
  tasks, // Raw list of tasks for this column
  deleteTask,
  updateTask,
  onViewTaskDetails
}) {
  const [editMode, setEditMode] = useState(false);
  // --- State for Collapsible Groups --- 
  const [expandedGroups, setExpandedGroups] = useState({}); // Store { groupKey: true/false }
  // --- End State --- 

  // Group tasks for rendering
  const groupedTasks = useMemo(() => { 
    const groups = groupTasksByTrial(tasks);
    // Initialize expanded state when groups change (ensure all start expanded)
    setExpandedGroups(prev => {
      const newState = { ...prev };
      Object.keys(groups).forEach(key => {
        if (newState[key] === undefined) { // Only set if not already present
          newState[key] = true; // Default to expanded
        }
      });
      return newState;
    });
    return groups;
  }, [tasks]);

  // tasksIds must remain a flat list of all task IDs in the column for SortableContext
  const tasksIds = useMemo(() => tasks.map((task) => task.id), [tasks]);

  // --- Toggle Function --- 
  const toggleGroupExpansion = (key) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };
  // --- End Toggle Function --- 

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: "Column",
      column,
    },
    disabled: editMode,
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  // --- Light Theme Dragging Style ---
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex h-[500px] max-h-[500px] w-[350px] flex-col rounded-md border-2 border-blue-500 bg-gray-200 opacity-60"
      ></div>
    );
  }
  // --- End Light Theme ---

  return (
    <div
      ref={setNodeRef}
      style={style}
      // --- Light Theme Background ---
      className="flex h-[500px] max-h-[500px] w-[350px] flex-col rounded-xl bg-gray-100 border border-gray-300 shadow-sm"
      // --- End Light Theme ---
    >
      {/* Column Title Area */}
      <div
        {...attributes}
        {...listeners}
        onClick={() => {
          // Only allow editing title if not dragging
          if (!isDragging) setEditMode(true);
        }}
        // --- Light Theme Title Background + Text ---
        className="text-md mx-2 mt-2 flex h-[50px] cursor-grab items-center justify-between rounded-md bg-gray-200 p-3 font-semibold text-gray-700 border-b border-gray-300"
        // --- End Light Theme ---
      >
        <div className="flex gap-2 items-center">
          {/* Display Title or Edit Input */}
          {!editMode && column.title}
          {editMode && (
            <input
              // --- Light Theme Input ---
              className="rounded border border-gray-400 bg-white px-2 py-1 text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              // --- End Light Theme ---
              value={column.title}
              onChange={(e) => updateColumn(column.id, e.target.value)}
              autoFocus
              onBlur={() => setEditMode(false)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                setEditMode(false);
              }}
            />
          )}
        </div>
        {/* Delete Column Button */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering title edit
            deleteColumn(column.id);
          }}
          // --- Light Theme Button ---
          className="rounded stroke-gray-500 p-1.5 hover:bg-gray-300 hover:stroke-red-600"
          // --- End Light Theme ---
        >
          <IconTrash size={18}/>
        </button>
      </div>

      {/* Task List Area - Now with Collapsible Grouping */}
      <div className="flex flex-grow flex-col gap-y-1 overflow-y-auto overflow-x-hidden p-2 pt-1">
        {/* SortableContext needs ALL task IDs for this column */}
        <SortableContext items={tasksIds}>
          {Object.entries(groupedTasks).map(([key, group]) => {
            const isExpanded = expandedGroups[key] !== false; // Default to true if undefined
            const isTrialGroup = key !== '__ungrouped__';
            const showUngroupedHeader = key === '__ungrouped__' && Object.keys(groupedTasks).length > 1;
            
            // Determine header text
            let headerText = '';
            if (isTrialGroup) {
              headerText = `Trial: ${group.trialId || 'Unknown'} - ${group.trialTitle || 'No Title'}`;
            } else if (showUngroupedHeader) {
              headerText = 'General Tasks';
            }

            return (
              <div key={key} className="py-1"> {/* Group Container with padding */}
                {/* Render Header only if it should be shown */}                
                {headerText && (
                  <div 
                    // --- Enhanced Header Styling ---
                    className="flex items-center px-2 py-1.5 mb-1 text-xs font-semibold text-gray-700 border-b-2 border-gray-300 sticky top-0 bg-gradient-to-b from-gray-100 to-gray-200 z-10 cursor-pointer hover:bg-gray-200 rounded-t-md shadow-sm"
                    // --- End Enhanced Styling ---
                    title={isTrialGroup ? group.trialTitle : 'Toggle general tasks'}
                    onClick={() => toggleGroupExpansion(key)} // Toggle on click
                  >
                    {/* Chevron Icon */}
                    {isExpanded ? <IconChevronDown size={16} className="mr-1 text-gray-600"/> : <IconChevronRight size={16} className="mr-1 text-gray-600"/>}
                    {/* Header Text */}
                    <span className="truncate flex-grow pr-2">{headerText}</span> {/* Allow text to grow */}
                    {/* Task Count Badge */}
                    <span className="ml-auto flex-shrink-0 text-gray-500 bg-gray-300 rounded-full px-2 py-0.5 text-[10px] font-medium">
                       {group.tasks.length}
                    </span>
                  </div>
                )}

                {/* Conditionally Render Tasks within the group based on state */}                
                {isExpanded && (
                  <div className="flex flex-col gap-2 pl-2 pr-1"> {/* Indent tasks slightly */}                  
                    {group.tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        deleteTask={deleteTask}
                        updateTask={updateTask}
                        onViewTaskDetails={onViewTaskDetails}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </SortableContext>
      </div>

      {/* Add Task Button */}
      <button
        // --- Light Theme Button ---
        className="flex items-center justify-center gap-2 rounded-b-xl border-t border-gray-300 bg-gray-200 p-3 text-sm text-gray-600 hover:bg-gray-300 hover:text-blue-600 active:bg-gray-400"
        // --- End Light Theme ---
        onClick={() => createTask(column.id)}
      >
        <IconPlus size={18}/>
        Add task
      </button>
    </div>
  );
}

export default ColumnContainer;
