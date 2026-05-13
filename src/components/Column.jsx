import { Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// A single column (Now / Soon / Later) that acts as a droppable area
export default function Column({ columnId, title, tasks, onDeleteTask }) {
  return (
    <div className="flex flex-col bg-slate-100/50 rounded-2xl p-4 min-h-[500px]">
      {/* Column header with task count badge */}
      <h3 className="font-semibold text-slate-700 mb-4 px-2 flex items-center justify-between">
        {title}
        <span className="bg-slate-200 text-slate-600 text-xs py-1 px-2 rounded-full">
          {tasks.length}
        </span>
      </h3>

      {/* Droppable zone — tasks can be dragged into this area */}
      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 transition-colors duration-200 rounded-xl p-2 -mx-2",
              snapshot.isDraggingOver ? "bg-slate-200/50" : ""
            )}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onDelete={onDeleteTask}
              />
            ))}
            {provided.placeholder}

            {/* Shown when the column is empty and nothing is being dragged over it */}
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="h-full min-h-[120px] flex items-center justify-center border-2 border-dashed border-slate-300 rounded-xl m-2 p-6 text-center text-sm text-slate-400">
                Drag tasks here or add above
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
