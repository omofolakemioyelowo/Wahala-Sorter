import { DragDropContext } from '@hello-pangea/dnd';
import Column from './Column';

// Renders the three-column board wrapped in a drag-and-drop context
export default function Board({ tasks, onDragEnd, onDeleteTask }) {
  // Group tasks by their status into the three columns
  const columns = {
    Now: { title: 'Now', items: tasks.filter(t => t.status === 'Now') },
    Soon: { title: 'Soon', items: tasks.filter(t => t.status === 'Soon') },
    Later: { title: 'Later', items: tasks.filter(t => t.status === 'Later') },
  };

  return (
    // DragDropContext wraps the entire board and handles drag start/update/end
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {Object.entries(columns).map(([columnId, column]) => (
          <Column
            key={columnId}
            columnId={columnId}
            title={column.title}
            tasks={column.items}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
