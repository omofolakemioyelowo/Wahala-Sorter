import { Draggable } from "@hello-pangea/dnd";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// A single task card that can be dragged between columns
export default function TaskCard({ task, index, onDelete }) {
  return (
    // Draggable wraps each card so @hello-pangea/dnd can track it
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "group relative p-4 mb-3 rounded-xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md",
            snapshot.isDragging
              ? "border-blue-400 shadow-md scale-[1.02] rotate-1"
              : "border-slate-200",
          )}
        >
          {/* Title row with delete button (appears on hover) */}
          <div className="flex justify-between items-start gap-4">
            <h4 className="font-medium text-slate-700 break-words flex-1">
              {task.title}
            </h4>
            <button
              onClick={() => onDelete(task.id)}
              className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 p-1 shrink-0"
              title="Delete task"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Footer with status badge and creation timestamp */}
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span className="bg-slate-100 px-2 py-1 rounded-md font-medium">
              {task.status}
            </span>
            <span>{format(task.createdAt, "MMM d, h:mm a")}</span>
          </div>
        </div>
      )}
    </Draggable>
  );
}
