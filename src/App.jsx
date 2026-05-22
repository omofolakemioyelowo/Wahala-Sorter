import { useState } from "react";
import TaskInput from "./components/TaskInput";
import Board from "./components/Board";
import { ListTodo } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

// Sample tasks so the board isn't empty on first visit
const INITIAL_TASKS = [
  {
    id: uuidv4(),
    title: "Plan the app layout",
    status: "Now",
    createdAt: Date.now() - 300000,
  },
  {
    id: uuidv4(),
    title: "Implement drag and drop",
    status: "Soon",
    createdAt: Date.now() - 100000,
  },
  {
    id: uuidv4(),
    title: "Add dark mode support",
    status: "Later",
    createdAt: Date.now(),
  },
];

function App() {
  const [tasks, setTasks] = useState(INITIAL_TASKS);

  // Called when the user submits a new task — defaults to "Now"
  const handleAddTask = (title) => {
    const newTask = {
      id: uuidv4(),
      title,
      status: "Now",
      createdAt: Date.now(),
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  // Remove a task by its unique id
  const handleDeleteTask = (id) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  // Runs after a drag ends — updates the task's column and position
  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    // Dropped outside any droppable area
    if (!destination) return;

    // Dropped back in the exact same spot
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    setTasks((prevTasks) => {
      const newTasks = [...prevTasks];
      const taskIndex = newTasks.findIndex((t) => t.id === draggableId);
      const [movedTask] = newTasks.splice(taskIndex, 1);

      // Update the task's column to wherever it was dropped
      movedTask.status = destination.droppableId;

      // Collect tasks already in the destination column to find the right insertion index
      const destTasks = newTasks.filter(
        (t) => t.status === destination.droppableId,
      );

      if (destTasks.length === 0) {
        newTasks.push(movedTask);
      } else {
        const destTaskToInsertBefore = destTasks[destination.index];
        if (destTaskToInsertBefore) {
          const absoluteIndex = newTasks.findIndex(
            (t) => t.id === destTaskToInsertBefore.id,
          );
          newTasks.splice(absoluteIndex, 0, movedTask);
        } else {
          newTasks.push(movedTask);
        }
      }

      return newTasks;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Sticky header — visible at all times while the board scrolls below */}
      <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200/50">
        <header className="max-w-6xl mx-auto pt-6 px-6 md:pt-10 md:px-10 pb-3 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 flex items-center justify-center gap-3 tracking-tight">
            Wahala Sorter
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Sort out your wahala smoothly.
          </p>
        </header>
        <div className="px-6 md:px-10 pb-5">
          <TaskInput onAddTask={handleAddTask} />
        </div>
      </div>

      {/* Scrollable board area with the three columns */}
      <main className="max-w-6xl mx-auto px-6 md:px-10 pt-6 pb-12">
        <Board
          tasks={tasks}
          onDragEnd={handleDragEnd}
          onDeleteTask={handleDeleteTask}
        />
      </main>
    </div>
  );
}

export default App;
