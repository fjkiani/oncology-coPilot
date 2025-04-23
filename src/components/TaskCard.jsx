import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconTrash, IconMessageCircle, IconClipboardList, IconMail, IconFlag, IconUserCircle, IconFileDescription } from "@tabler/icons-react";

const getTaskTypeStyle = (type) => {
  switch (type) {
    case 'PATIENT_MESSAGE_SUGGESTION':
      return { 
        icon: IconClipboardList, 
        bgColor: 'bg-yellow-100', 
        textColor: 'text-yellow-800', 
        label: 'Follow-up'
      };
    case 'TASK':
       return { 
        icon: IconClipboardList, 
        bgColor: 'bg-blue-100', 
        textColor: 'text-blue-700', 
        label: 'Task'
      };
    default:
      return { 
        icon: IconClipboardList, 
        bgColor: 'bg-gray-100', 
        textColor: 'text-gray-600', 
        label: type || 'Task'
      };
  }
};

function TaskCard({ task, deleteTask, updateTask, onViewTaskDetails }) {
  const [mouseIsOver, setMouseIsOver] = useState(false);

  const typeStyle = getTaskTypeStyle(task.suggestion_type);
  const isFollowUpTask = task.suggestion_type === 'PATIENT_MESSAGE_SUGGESTION';

  const handleDraftMessage = (e) => {
    e.stopPropagation();
    console.log("Trigger Patient Message Draft for task:", task.id, task.content);
    alert(`Placeholder: Would draft patient message for: ${task.content}`);
  };
  
  const handleFlagReview = (e) => {
    e.stopPropagation();
    console.log("Flag task for Clinician Review:", task.id, task.content);
    alert(`Placeholder: Would flag task for clinician review: ${task.content}`);
  };

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="relative flex h-[120px] min-h-[120px] cursor-grab items-center rounded-md border-2 border-blue-500 bg-gray-50 p-3 text-left opacity-70 shadow-md"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onViewTaskDetails(task)}
      className="task relative flex h-[auto] min-h-[120px] cursor-pointer flex-col justify-start rounded-md bg-white p-3 text-left shadow-sm border border-gray-200 hover:border-blue-400 hover:shadow-md"
      onMouseEnter={() => setMouseIsOver(true)}
      onMouseLeave={() => setMouseIsOver(false)}
    >
      <div className="flex justify-between items-start mb-1.5">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${typeStyle.bgColor} ${typeStyle.textColor}`}
          title={`Type: ${typeStyle.label}`}
        >
          <typeStyle.icon size={12} className="mr-1" />
          {typeStyle.label}
        </span>
        
        {mouseIsOver && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteTask(task.id);
            }}
            className="absolute top-1 right-1 flex-shrink-0 rounded bg-gray-100 p-1 stroke-gray-500 opacity-60 hover:bg-red-100 hover:stroke-red-600 hover:opacity-100"
            title="Delete Task"
          >
            <IconTrash size={14}/>
          </button>
        )}
      </div>
      
      <p className="my-1 w-full flex-grow whitespace-pre-wrap text-sm font-medium text-gray-800">
        {task.content}
      </p>
      
      <div className="text-xs text-gray-500 mt-1.5 space-y-0.5 border-t border-gray-100 pt-1.5">
          {task.patientId && (
            <p className="flex items-center truncate">
              <IconUserCircle size={14} className="mr-1 flex-shrink-0"/> Patient: {task.patientId}
            </p>)
          }
          {task.trial_id && (
            <p className="flex items-center truncate" title={task.trial_title || task.trial_id}>
               <IconFileDescription size={14} className="mr-1 flex-shrink-0"/> Trial: {task.trial_id}
            </p>)
          }
      </div>
      
      {isFollowUpTask && (
        <div className="flex justify-start items-center gap-2 mt-2 pt-2 border-t border-gray-100"> 
          <button 
            onClick={handleDraftMessage} 
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
            title="Draft a message to the patient about this item"
           >
             <IconMail size={14} />
             Draft Patient Message
          </button>
          <button 
             onClick={handleFlagReview}
             className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-orange-700 bg-orange-100 rounded hover:bg-orange-200"
             title="Flag this item for internal clinician review"
           >
             <IconFlag size={14} />
             Flag for Review
          </button>
        </div>
      )}
    </div>
  );
}

export default TaskCard;
