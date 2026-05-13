import { useState } from 'react';
import { Plus } from 'lucide-react';

// Fixed input bar at the top of the board for creating new tasks
export default function TaskInput({ onAddTask }) {
  const [title, setTitle] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      onAddTask(title.trim());
      setTitle('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto flex gap-2">
      <input
        type="text"
        placeholder="What needs to be done? (e.g. Pay bills)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="flex-1 px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
      />
      <button
        type="submit"
        disabled={!title.trim()}
        className="px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
      >
        <Plus size={20} />
        <span className="hidden sm:inline">Add Task</span>
      </button>
    </form>
  );
}
