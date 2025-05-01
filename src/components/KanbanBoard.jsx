import React, { useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import { createPortal } from "react-dom";
import ColumnContainer from "./ColumnContainer";
import TaskCard from "./TaskCard";
import { IconPlus } from "@tabler/icons-react";

function KanbanBoard({ 
  columns, 
  tasks, 
  onColumnsChange,
  onTasksChange,
  onCreateColumn,
  onDeleteColumn,
  onUpdateColumn,
  onCreateTask,
  onDeleteTask,
  onUpdateTask,
  onViewTaskDetails
}) {

  const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);
  const [activeColumn, setActiveColumn] = React.useState(null);
  const [activeTask, setActiveTask] = React.useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
  );

  return (
    <div className="mt-5 w-full text-gray-800">
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
      >
        <div className="m-auto flex gap-4 overflow-x-auto p-2">
          <div className="flex gap-4">
            <SortableContext items={columnsId}>
              {columns.map((col) => {
                const filteredTasks = tasks.filter((task) => task.columnId === col.id);
                console.log(`KanbanBoard: Rendering Column '${col.title}' (ID: ${col.id}). Passing ${filteredTasks.length} tasks.`, filteredTasks);
                return (
                  <ColumnContainer
                    key={col.id}
                    column={col}
                    deleteColumn={onDeleteColumn}
                    updateColumn={onUpdateColumn}
                    createTask={onCreateTask}
                    deleteTask={onDeleteTask}
                    updateTask={onUpdateTask}
                    tasks={filteredTasks}
                    onViewTaskDetails={onViewTaskDetails}
                  />
                );
              })}
            </SortableContext>
          </div>
          <button
            onClick={onCreateColumn}
            className="flex h-[60px] w-[250px] min-w-[250px] cursor-pointer items-center gap-2 rounded-lg border-2 border-gray-300 bg-gray-100 p-4 text-gray-600 ring-indigo-500 hover:ring-2 hover:border-indigo-500 transition-all duration-150 ease-in-out"
          >
            <IconPlus size={20} />
            Add Column
          </button>
        </div>
        {createPortal(
          <DragOverlay>
            {activeColumn && (
              <ColumnContainer
                column={activeColumn}
                deleteColumn={onDeleteColumn}
                updateColumn={onUpdateColumn}
                createTask={onCreateTask}
                deleteTask={onDeleteTask}
                updateTask={onUpdateTask}
                tasks={tasks.filter(
                  (task) => task.columnId === activeColumn.id,
                )}
                onViewTaskDetails={onViewTaskDetails}
              />
            )}
            {activeTask && (
              <TaskCard
                task={activeTask}
                deleteTask={onDeleteTask}
                updateTask={onUpdateTask}
              />
            )}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
    </div>
  );

  function onDragStart(event) {
    if (event.active.data.current?.type === "Column") {
      setActiveColumn(event.active.data.current.column);
    } else if (event.active.data.current?.type === "Task") {
      setActiveTask(event.active.data.current.task);
    }
  }

  function onDragEnd(event) {
    setActiveColumn(null);
    setActiveTask(null);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const isActiveAColumn = active.data.current?.type === "Column";
    if (isActiveAColumn) {
      if (onColumnsChange) {
        const activeIndex = columns.findIndex((col) => col.id === active.id);
        const overIndex = columns.findIndex((col) => col.id === over.id);
        onColumnsChange(arrayMove(columns, activeIndex, overIndex));
      }
      return;
    }

    const isActiveATask = active.data.current?.type === "Task";
    if (isActiveATask) {
      if (onTasksChange) {
        onTasksChange(active, over);
      }
    }
  }

  function onDragOver(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const isActiveATask = active.data.current?.type === "Task";
    const isOverATask = over.data.current?.type === "Task";
    const isOverAColumn = over.data.current?.type === "Column";

    if (isActiveATask && isOverATask) {
    }
    else if (isActiveATask && isOverAColumn) {
      const activeIndex = tasks.findIndex((t) => t.id === active.id);
      const activeTask = tasks[activeIndex];
      if (activeTask.columnId !== over.id) {
      }
    }
  }
}

export default KanbanBoard;
