# Audit Report — Wahala Sorter

A thorough look at what could bite you later and what to do about it now. Each issue includes the problem, why it matters, a fix, and why the fix works.

---

## Vulnerabilities

### 1. No input sanitization on task titles

**Problem:** The `TaskInput` component passes `title.trim()` straight into state without any sanitation. While React's JSX escaping (`{task.title}`) prevents XSS in this specific codebase, the raw unsanitized data is stored and could be rendered unsafely if someone later adds `dangerouslySetInnerHTML`, logs it to a console dashboard, sends it to an API, or displays it in a different context.

**Why it matters:** If this codebase grows — and someone adds a rich-text preview, an activity log, or an admin panel that renders task data unsafely — all stored task titles become an XSS vector. It's a time bomb, not an active fire, but time bombs are worse because nobody remembers they're there.

**Fix:**

```js
// In TaskInput.jsx
const handleSubmit = (e) => {
  e.preventDefault();
  const trimmed = title.trim();
  if (!trimmed) return;
  onAddTask(trimmed.replace(/[<>]/g, ''));
  setTitle('');
};
```

Or, more robustly, use a dedicated sanitization function (or DOMPurify if you ever render HTML):

```js
// helpers/sanitize.js
export function sanitize(str) {
  return str.replace(/[&<>"'/]/g, '');  // strips common XSS characters
}
```

**Why it works:** Stripping angle brackets removes the ability to inject HTML tags while keeping legitimate text intact. A user who types "I <3 CSS" will lose the brackets, which is a minor loss compared to the alternative. The key principle: **never trust input, even from yourself.**

### 2. Module-level side effects in INITIAL_TASKS

**Problem:** `INITIAL_TASKS` calls `uuidv4()` and `Date.now()` at module scope (not inside a component or lazy initializer):

```js
const INITIAL_TASKS = [
  { id: uuidv4(), title: "Plan the app layout", status: "Now", createdAt: Date.now() - 300000 },
  ...
];
```

These run when the module is first imported, not when `App` mounts. This is fine today, but if this file ever gets imported in tests, server-side rendering, or code-split chunks, those side effects run at unexpected times.

**Why it matters:** UUID generation at module scope makes the module impure. It breaks tree-shaking, complicates testing (every import generates new IDs), and would completely break SSR (the server and client IDs would differ on first render, causing hydration mismatches).

**Fix:**

Move the seed data into a function or a lazy initializer:

```js
function App() {
  const [tasks, setTasks] = useState(() => [
    { id: uuidv4(), title: "Plan the app layout", status: "Now", createdAt: Date.now() - 300000 },
    { id: uuidv4(), title: "Implement drag and drop", status: "Soon", createdAt: Date.now() - 100000 },
    { id: uuidv4(), title: "Add dark mode support", status: "Later", createdAt: Date.now() },
  ]);
```

Or extract a factory:

```js
function createSampleTasks() {
  return [
    { id: uuidv4(), title: "Plan the app layout", status: "Now", createdAt: Date.now() - 300000 },
    { id: uuidv4(), title: "Implement drag and drop", status: "Soon", createdAt: Date.now() - 100000 },
    { id: uuidv4(), title: "Add dark mode support", status: "Later", createdAt: Date.now() },
  ];
}
```

**Why it works:** The `useState(() => ...)` lazy initializer runs only once per component mount. UUIDs are generated when the component mounts, not when the module loads. The module stays pure, SSR works, and tests can import the file without triggering side effects.

---

## Accessibility Issues

### 3. Delete button hidden behind hover

**Problem:** In `TaskCard.jsx`, the delete button uses `opacity-0 group-hover:opacity-100`:

```jsx
<button
  onClick={() => onDelete(task.id)}
  className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 p-1 shrink-0"
  title="Delete task"
>
  <Trash2 size={16} />
</button>
```

**Why it matters:**
- **Mobile users can't hover.** The delete button is invisible on touch devices. Yes, `focus:opacity-100` is there, but tapping the card to focus the button is non-obvious — most users will never discover it.
- **Keyboard users get whiplash.** The button appears only on focus, so tabbing through the board makes buttons flicker in and out of existence. Screen reader users hear "Delete task" announced for an invisible button.
- **The `title` attribute is not a reliable accessible name.** Some screen readers ignore it. The button has no visible text label and the icon's SVG is not labeled.

**Fix:**

Always show the delete button, or at minimum use a persistent action that doesn't rely on hover:

```jsx
<button
  onClick={() => onDelete(task.id)}
  className="text-slate-400 hover:text-red-500 transition-colors p-1 shrink-0"
  aria-label={`Delete task: ${task.title}`}
>
  <Trash2 size={16} aria-hidden="true" />
</button>
```

If you want to preserve the clean look, consider a "delete mode" toggle on the board, or always show a subtle icon that becomes more prominent on hover:

```jsx
// Subtle by default, bold on hover — but always visible
className="text-slate-300 hover:text-red-500 transition-colors p-1 shrink-0"
```

**Why it works:** The button is always discoverable regardless of input method. The `aria-label` gives it an accessible name ("Delete task: Pay bills") that screen readers announce. The icon is hidden from assistive tech with `aria-hidden="true"` since the label covers it. Users on all devices can confidently delete tasks.

### 4. Submit button has no accessible name on mobile

**Problem:** In `TaskInput.jsx`, the button text is hidden on small screens:

```jsx
<button type="submit" disabled={!title.trim()}>
  <Plus size={20} />
  <span className="hidden sm:inline">Add Task</span>
</button>
```

On screens narrower than the `sm` breakpoint, the `<span>` gets `display: none`, leaving only the `Plus` icon as the button's content. The icon has no label, so screen readers see a nameless button.

**Why it matters:** The Web Content Accessibility Guidelines (WCAG) require all interactive elements to have an accessible name (SC 4.1.2). A button with only an unlabeled icon fails this criterion. A visually impaired user on mobile hears "button" with no indication of what the button does. A sighted user on mobile sees a `+` icon that's common but not universally understood.

**Fix:**

Add an `aria-label` to the button:

```jsx
<button
  type="submit"
  disabled={!title.trim()}
  aria-label="Add task"
>
  <Plus size={20} aria-hidden="true" />
  <span className="hidden sm:inline">Add Task</span>
</button>
```

Or better, use visually-hidden text that's always accessible:

```jsx
<button type="submit" disabled={!title.trim()}>
  <Plus size={20} aria-hidden="true" />
  <span className="sr-only">Add task</span>
  <span className="hidden sm:inline">Add Task</span>
</button>
```

Tailwind's `sr-only` class keeps the text in the DOM and accessible to screen readers while hiding it visually.

**Why it works:** The `aria-label` provides an explicit accessible name regardless of visual content. Adding `sr-only` text serves the same purpose while being more robust (some translation tools handle real text better than `aria-label`). The icon is hidden from AT since it's decorative.

### 5. No keyboard support for drag and drop

**Problem:** The app relies entirely on `@hello-pangea/dnd`'s default keyboard handling. While that library provides basic keyboard drag (Space/Enter to pick up, arrow keys to move), there's nothing in the UI that communicates this to users. No instructions, no visible drag handles, no announcement when a drag starts or ends.

**Why it matters:** WCAG SC 2.1.1 (Keyboard) requires all functionality to be operable through a keyboard interface. The current implementation technically passes (keyboard drag works), but WCAG SC 3.3.2 (Labels or Instructions) says users should be told how to operate the interface. A user who relies on a keyboard has no way of knowing they can press Space to pick up a task card.

Also, the `dragHandleProps` are spread on the entire card, meaning any click on the card initiates a drag. This makes it easy to accidentally trigger a drag when you mean to do something else (like focus the delete button).

**Fix:**

Add visible instructions and consider a dedicated drag handle:

```jsx
// In Column.jsx — add instructions
<Droppable droppableId={columnId}>
  {(provided, snapshot) => (
    <div ref={provided.innerRef} {...provided.droppableProps} ...>
      {/* Screen-reader-only instructions */}
      <span className="sr-only" role="status">
        {tasks.length} tasks in {title}. Use Space to pick up a task and arrow keys to move it.
      </span>
      {tasks.map(...)}
    </div>
  )}
</Droppable>
```

For a dedicated drag handle (better UX):

```jsx
// In TaskCard.jsx — separate the drag handle from the card body
<div ref={provided.innerRef} {...provided.draggableProps}>
  <div className="flex gap-2">
    <button {...provided.dragHandleProps} aria-label={`Drag ${task.title}`}>
      <GripVertical size={16} />
    </button>
    <div className="flex-1">{/* card content */}</div>
  </div>
</div>
```

**Why it works:** Visible instructions remove the guesswork for keyboard users. A dedicated drag handle prevents accidental drags and makes the interaction model obvious. Screen reader users get a `role="status"` announcement that tells them the board state.

### 6. No live region for task changes

**Problem:** When a task is added, deleted, or moved, there's no announcement to assistive technology. A screen reader user won't know that a task appeared, disappeared, or changed columns unless they happen to be focused on that spot.

**Why it matters:** WCAG SC 4.1.3 (Status Messages) requires that status changes be programmatically available without receiving focus. Adding a task is a status change — the user should know it happened.

**Fix:**

Add a live region in `App.jsx`:

```jsx
const [announcement, setAnnouncement] = useState('');

const handleAddTask = (title) => {
  const newTask = { id: uuidv4(), title, status: "Now", createdAt: Date.now() };
  setTasks((prev) => [newTask, ...prev]);
  setAnnouncement(`Added "${title}" to Now`);
};

const handleDeleteTask = (id) => {
  const task = tasks.find(t => t.id === id);
  setTasks((prev) => prev.filter((task) => task.id !== id));
  if (task) setAnnouncement(`Deleted "${task.title}"`);
};

// In JSX:
<div aria-live="polite" className="sr-only">{announcement}</div>
```

**Why it works:** The `aria-live="polite"` region tells screen readers to announce content changes when the user is idle. The `sr-only` class keeps it visually hidden. Users of assistive technology get real-time feedback for every action they take.

---

## Performance Problems

### 7. No memoization causes cascading re-renders

**Problem:** Every state change in `App` re-renders the entire tree. `Board`, `Column`, and every `TaskCard` re-render on every task add, delete, or drag. There are zero `useMemo`, `useCallback`, or `React.memo` calls anywhere in the codebase.

```jsx
// Board.jsx — filters all tasks on every render, even if tasks haven't changed
const columns = {
  Now: { title: 'Now', items: tasks.filter(t => t.status === 'Now') },
  Soon: { title: 'Soon', items: tasks.filter(t => t.status === 'Soon') },
  Later: { title: 'Later', items: tasks.filter(t => t.status === 'Later') },
};
```

**Why it matters:** With 9 tasks (3 per column), this is imperceptible. With 300 tasks across a team's board, every drag operation re-filters 300 tasks three times (900 iterations), re-creates three column objects, and re-renders every card. This is `O(n)` per action where it could be `O(1)`.

**Fix:**

Memoize the column grouping and the callback props:

```jsx
// Board.jsx
import { useMemo } from 'react';

export default function Board({ tasks, onDragEnd, onDeleteTask }) {
  const columns = useMemo(() => ({
    Now: { title: 'Now', items: tasks.filter(t => t.status === 'Now') },
    Soon: { title: 'Soon', items: tasks.filter(t => t.status === 'Soon') },
    Later: { title: 'Later', items: tasks.filter(t => t.status === 'Later') },
  }), [tasks]);

  // ...
}
```

```jsx
// App.jsx
const handleAddTask = useCallback((title) => {
  const newTask = { id: uuidv4(), title, status: "Now", createdAt: Date.now() };
  setTasks((prev) => [newTask, ...prev]);
}, []);

const handleDeleteTask = useCallback((id) => {
  setTasks((prev) => prev.filter((task) => task.id !== id));
}, []);
```

```jsx
// TaskCard.jsx
export default React.memo(TaskCard);
```

**Why it works:** `useMemo` skips re-computing the column groupings when `tasks` hasn't changed. `useCallback` stable-izes the handler references so child components don't re-render just because the callback was recreated. `React.memo` on `TaskCard` prevents re-rendering cards whose props haven't changed. Together, these turn an `O(n)` re-render cascade into an `O(1)` one — only the affected card re-renders.

### 8. Unstable callback in DragDropContext

**Problem:** `handleDragEnd` in `App.jsx` is recreated on every render. Since `DragDropContext` receives a new function reference each time, it may re-subscribe internal event handlers. The same applies to `onDeleteTask` being passed down to every `Column` and every `TaskCard`.

**Why it matters:** Every keystroke in the task input (which triggers a re-render of `App`) recreates all callback functions, forcing `Board`, all `Column`s, and all `TaskCard`s to receive new prop references. Even with `React.memo`, the memoization check would fail because the functions are new every time.

**Fix:**

Wrap the drag end handler with `useCallback`:

```jsx
const handleDragEnd = useCallback((result) => {
  // ... existing logic
}, []); // no dependencies — uses functional state update
```

Since `handleDragEnd` uses the functional form of `setTasks`, it closes over no external variables and needs no dependencies.

**Why it works:** `useCallback` returns the same function reference across renders unless its dependency array changes. Child components wrapped in `React.memo` will see the same prop reference and skip re-rendering. The drag-and-drop library doesn't need to re-subscribe to events.

### 9. Heavy computation during drag

**Problem:** The `handleDragEnd` function performs an array search (`findIndex`), a splice, a filter, and potentially another `findIndex`. These happen synchronously during a drag event, which is a user-perceptible interaction (the user just dropped a card — they're waiting for feedback).

```js
const taskIndex = newTasks.findIndex((t) => t.id === draggableId);
const destTasks = newTasks.filter((t) => t.status === destination.droppableId);
const absoluteIndex = newTasks.findIndex((t) => t.id === destTaskToInsertBefore.id);
```

**Why it matters:** With small lists, this is fine. But each operation is `O(n)`, and they're chained. As the task list grows, the time between drop and visual feedback grows linearly. Drag-and-drop feels sluggish when there's a visible delay between releasing the mouse and seeing the card snap into place.

**Fix:**

Use a Map for O(1) lookups:

```jsx
const handleDragEnd = useCallback((result) => {
  const { source, destination, draggableId } = result;
  if (!destination) return;
  if (source.droppableId === destination.droppableId && source.index === destination.index) return;

  setTasks((prev) => {
    const taskMap = new Map(prev.map(t => [t.id, t]));
    const movedTask = taskMap.get(draggableId);
    if (!movedTask) return prev;

    const newTasks = prev.filter(t => t.id !== draggableId);
    movedTask.status = destination.droppableId;

    const destTasks = newTasks.filter(t => t.status === destination.droppableId);
    const insertAt = destTasks[destination.index];

    if (!insertAt) {
      newTasks.push(movedTask);
    } else {
      const idx = newTasks.findIndex(t => t.id === insertAt.id);
      newTasks.splice(idx, 0, movedTask);
    }

    return newTasks;
  });
}, []);
```

**Why it works:** The `Map` gives O(1) lookup for the moved task. The rest of the algorithm is still O(n), but the constant factors are lower. More importantly, the entire operation happens inside the functional state updater, so it's batched with React's state update. The real fix at scale would be to normalize the data (tasks indexed by ID) so that position updates affect only the reordered column.

### 10. Using index as implicit sort when data is stored flat

**Problem:** Tasks are stored as a flat array where array order represents the visual order across all columns. The `index` prop passed to `TaskCard` is the index within a single column's filtered array. After a drag, the flat array is mutated to reflect the new visual position. This creates a coupling between the flat array structure and the visual grid that's fragile and hard to reason about.

**Why it matters:** This flat-ordering approach means:
- Inserting a task in "Now" at position 0 means it goes to the front of the flat array. But if "Now" tasks are scattered across the flat array (because they were added at different times), the relationship between array index and visual position is unclear.
- Any bug in the drag logic can silently corrupt the ordering. There are no invariants or assertions.
- Persisting this to a database would require storing order for every task relative to every other task.

**Fix:**

Use column-specific order arrays:

```js
const [tasks, setTasks] = useState({});
const [columnOrder, setColumnOrder] = useState({
  Now: [],
  Soon: [],
  Later: [],
});
```

Where `tasks` is `{ [id]: Task }` and `columnOrder` is `{ [columnId]: [id, id, ...] }`. This is a normalized data structure: tasks are stored once by ID, and each column stores an ordered list of IDs.

**Why it works:** When a task moves, you only update the two column order arrays (splice from one, insert into the other). No filtering needed — `columnOrder[columnId].map(id => tasks[id])` gives you the ordered tasks for a column in O(m) where m is the column's task count. This scales linearly with column size, not total task count.

---

## Bad UX Decisions

### 11. "Add Task" always creates in the "Now" column

**Problem:** The input field is above the board, disconnected from any column. New tasks always land in "Now," regardless of where the user's attention is.

**Why it matters:** If a user is looking at the "Later" column and thinking about a future task, they have to add it and then drag it to "Later." That's two interactions for what should be one. It breaks the principle of least astonishment — the first ask when adding a new item to a list-based tool is "where does this go?"

**Fix:**

Let the user pick the target column at creation time:

```jsx
// Options
// 1. Dropdown/radio group in the input bar
// 2. Contextual input in each column header
// 3. Smart default based on which column is in view

// Simplest approach — inline the input in each column header:
function ColumnHeader({ title, count, onAddTask }) {
  const [isAdding, setIsAdding] = useState(false);
  // ...
}
```

The most practical fix for this small app: add a `<select>` next to the input:

```jsx
<select
  value={targetColumn}
  onChange={(e) => setTargetColumn(e.target.value)}
  className="px-3 py-3 rounded-lg border border-slate-200 text-sm"
>
  <option value="Now">Now</option>
  <option value="Soon">Soon</option>
  <option value="Later">Later</option>
</select>
```

**Why it works:** Users can file tasks directly into the right column, eliminating the drag-to-move friction. The cognitive load of "which column?" replaces the physical load of "now drag it," which is a favorable trade — thinking is cheap, dragging is effort.

### 12. No undo or confirmation for deletion

**Problem:** Clicking the delete button instantly removes the task with no confirmation and no way to undo. After deletion, the task is gone forever within that session.

**Why it matters:** Accidental taps happen, especially on mobile where the delete button is close to the card content. Muscle memory or a mis-tap can destroy data instantly. The user has no recourse — not even an "Undo" banner. This erodes trust in the tool. Nobody wants to use software where one wrong click is permanent.

**Fix:**

Add a temporary undo mechanism:

```jsx
const [deletedTask, setDeletedTask] = useState(null);
const undoTimeoutRef = useRef(null);

const handleDeleteTask = (id) => {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  setTasks((prev) => prev.filter((t) => t.id !== id));
  setDeletedTask(task);

  // Clear previous timeout
  if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);

  // Auto-dismiss after 5 seconds
  undoTimeoutRef.current = setTimeout(() => {
    setDeletedTask(null);
  }, 5000);
};

const handleUndo = () => {
  if (!deletedTask) return;
  setTasks((prev) => [...prev, deletedTask]);
  setDeletedTask(null);
  if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
};
```

Then render a toast/banner:

```jsx
{deletedTask && (
  <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-4 z-50">
    <span>Task deleted</span>
    <button onClick={handleUndo} className="font-semibold underline hover:no-underline">
      Undo
    </button>
  </div>
)}
```

**Why it works:** The undo pattern is well-established (Gmail, Trello, Slack) and gives users a safety net. The 5-second auto-dismiss means the undo option doesn't linger forever. The fixed positioning ensures it's visible regardless of scroll position. Users feel safe experimenting because mistakes aren't permanent.

### 13. No data persistence — everything is lost on refresh

**Problem:** All tasks live in React state. Refresh the page and everything is gone. The seed data re-appears, but any work done during the session is lost.

**Why it matters:** This is the first thing a user will notice and it immediately destroys confidence. "I spent 10 minutes organizing my tasks and then accidentally refreshed and lost everything" is the kind of feedback that makes people abandon a tool forever. The expectation for a task management app is at least local persistence.

For the record, `localStorage` is not a persistence strategy for production — it's a cache. But for a client-only demo app, it's the difference between "useful" and "toy."

**Fix:**

Sync state to `localStorage`:

```jsx
const STORAGE_KEY = 'wahala-sorter-tasks';

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function App() {
  const [tasks, setTasks] = useState(loadTasks ?? createSampleTasks());

  // Persist on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);
}
```

**Why it works:** Tasks are automatically saved to `localStorage` after every state change (thanks to the `useEffect` dependency on `tasks`). On reload, `loadTasks()` checks for saved data and restores it. The `try/catch` handles edge cases like corrupted data. The user's work survives accidental refreshes.

### 14. No feedback when a task is added

**Problem:** Type a title, hit Enter, the task appears in the "Now" column. There's no animation, no toast, no subtle highlight — it just silently appears. If the board is scrolled down, the new task is added to the top of the "Now" column, which might be scrolled out of view.

**Why it matters:** Feedback is a fundamental UX principle. Every user action should produce a perceptible response. Without feedback, users aren't sure if their action registered. They might type the same task twice, thinking the first attempt failed. The ambiguity creates anxiety.

**Fix:**

Use a brief animation and scroll behavior:

```jsx
// In TaskCard.jsx, add a "new" animation
const [isNew, setIsNew] = useState(true);

useEffect(() => {
  const timer = setTimeout(() => setIsNew(false), 1000);
  return () => clearTimeout(timer);
}, []);

// Use the isNew state to apply an animation class
className={cn(
  "transition-all duration-500",
  isNew ? "animate-fadeIn border-blue-300" : ""
)}
```

And in your Tailwind config or CSS:

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.4s ease-out;
}
```

**Why it works:** The fade-in animation provides immediate visual feedback that confirms the task was added. It lasts 400ms — long enough to notice, short enough to not feel sluggish. The brief blue border draws attention to the new item. After one second, the card settles into its normal appearance.

### 15. No empty state for the whole board

**Problem:** There's a per-column empty state ("Drag tasks here or add above"), but if all three columns are empty, the user sees three identical empty-state messages. There's no "Welcome! Add your first task" guidance.

**Why it matters:** A completely empty board is disorienting. The user just arrived and sees three dashed boxes saying the same thing. There's no explanation of what the columns mean, how to use them, or what to do first. Onboarding starts at zero and the user has to figure everything out themselves.

**Fix:**

Add a board-level empty state when all tasks are gone:

```jsx
// In Board.jsx
const totalTasks = tasks.length;

if (totalTasks === 0) {
  return (
    <div className="text-center py-16">
      <ListTodo size={48} className="mx-auto text-slate-300 mb-4" />
      <h3 className="text-xl font-semibold text-slate-500 mb-2">No tasks yet</h3>
      <p className="text-slate-400 max-w-md mx-auto">
        Add your first task above. Use the <strong>Now</strong>, <strong>Soon</strong>, and{' '}
        <strong>Later</strong> columns to organize what matters.
      </p>
    </div>
  );
}

// Otherwise render the grid...
```

**Why it works:** A dedicated empty state replaces three confusing empty columns with one clear message. It guides the user toward the next action (adding a task). It explains what the columns mean — a mini onboarding that reduces the cognitive load of getting started.

### 16. Sticky header takes too much space on mobile

**Problem:** The header is sticky with `z-10`, contains the title, subtitle, and the entire input bar. On a mobile screen (375px height), this consumes about 200px of vertical space before any board content is visible.

**Why it matters:** Mobile users see mostly header when they first load the page. They have to scroll to see the board content, but the header follows them, permanently eating ~35% of the viewport. Less screen space for tasks means more scrolling, which means a worse experience.

**Fix:**

Collapse the header on scroll or make only the input sticky:

```jsx
const [isScrolled, setIsScrolled] = useState(false);

useEffect(() => {
  const onScroll = () => setIsScrolled(window.scrollY > 60);
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, []);
```

Then conditionally show/hide elements:

```jsx
<header>
  <h1 className={cn("transition-all", isScrolled ? "text-xl" : "text-3xl")}>
    Wahala Sorter
  </h1>
  {!isScrolled && <p className="text-slate-500 mt-2">Sort out your wahala smoothly.</p>}
</header>
```

Or simpler — make only the input bar sticky, not the title:

```jsx
<div className="sticky top-0 z-10 bg-slate-50/95">
  <header className="pt-4 pb-2">{/* title, subtitle — not sticky elements */}</header>
</div>
<main>{/* board */}</main>
```

**Why it works:** Reducing the header height on scroll recovers valuable screen real estate. The title shrinks, the subtitle disappears, and the user sees more board content. The input remains sticky because it's the primary action — users always need access to it. The `passive: true` option on the scroll listener prevents it from blocking scrolling.

---

## Maintainability Issues

### 17. Duplicated `cn()` utility across components

**Problem:** The `cn()` function (which merges Tailwind classes with `clsx` + `tailwind-merge`) is defined in both `Column.jsx` and `TaskCard.jsx`:

```js
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

Three lines, duplicated twice. It's also imported differently: `clsx` uses double quotes in one file and single quotes in the other.

**Why it matters:** If you need to change how class merging works (add a custom prefix, configure Tailwind merge options, etc.), you have to hunt down every file that defines `cn()` and update each copy. One will inevitably be missed. This is classic copy-paste code duplication and it's a maintenance smell.

**Fix:**

Create a shared utility:

```js
// src/lib/utils.js
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

Then import it wherever needed:

```js
import { cn } from '../lib/utils';
```

**Why it works:** The utility lives in exactly one place. Changes propagate to every consumer automatically. The import is consistent. The function can be unit-tested. This is the DRY principle in action — every piece of knowledge has a single, unambiguous representation in the system.

### 18. Hardcoded column names spread across the codebase

**Problem:** The strings "Now", "Soon", and "Later" appear in multiple files:

- `App.jsx`: initial seed data, `handleAddTask` default status, `handleDragEnd` column logic
- `Board.jsx`: column definitions and filtering
- `TaskCard.jsx`: status badge rendering

If someone wants to rename "Later" to "Someday" or add a fourth column, they have to find and update every occurrence.

**Why it matters:** Inconsistency creeps in. One file gets updated, another doesn't. The column in the data doesn't match the column rendered in the UI. Bugs that are hard to spot because the strings look correct in isolation but don't match up.

**Fix:**

Define columns as a constant:

```js
// src/lib/constants.js
export const COLUMNS = [
  { id: 'Now', title: 'Now' },
  { id: 'Soon', title: 'Soon' },
  { id: 'Later', title: 'Later' },
];

export const DEFAULT_COLUMN = COLUMNS[0].id;
```

Then use it everywhere:

```js
// App.jsx
import { COLUMNS, DEFAULT_COLUMN } from '../lib/constants';

const INITIAL_TASKS = COLUMNS.map((col, i) => ({
  id: uuidv4(),
  title: ['Plan the app layout', 'Implement drag and drop', 'Add dark mode support'][i],
  status: col.id,
  createdAt: Date.now() - (COLUMNS.length - i) * 100000,
}));

// handleAddTask
status: DEFAULT_COLUMN,
```

```js
// Board.jsx
import { COLUMNS } from '../lib/constants';

const columns = Object.fromEntries(
  COLUMNS.map(col => [col.id, { title: col.title, items: tasks.filter(t => t.status === col.id) }])
);
```

**Why it works:** Adding a column is now a one-line change in `constants.js`. Renaming a column is a one-line change in `constants.js`. Everything else derives from the same source of truth. Inconsistent strings become impossible because there's only one source of truth.

### 19. Drag-and-drop logic is complex and fragile

**Problem:** The `handleDragEnd` function in `App.jsx` is 30 lines of manual array manipulation with splice, filter, findIndex, and conditional branching. It's the most complex function in the codebase and the hardest to test.

```js
const [movedTask] = newTasks.splice(taskIndex, 1);
movedTask.status = destination.droppableId;
const destTasks = newTasks.filter((t) => t.status === destination.droppableId);
// ... conditional insertion logic
```

**Why it matters:** This function has at least four code paths (drop in same column, different column, end of list, empty destination). It mutates the moved task object directly (`movedTask.status = ...`). It's never been tested. If a bug appears (e.g., a task disappears after a drag), untangling this logic under time pressure is painful.

**Fix:**

Extract the drag logic into a pure function that's easy to test:

```js
// src/lib/drag.js
export function reorderTasks(tasks, draggableId, source, destination) {
  const result = [...tasks];
  const sourceIndex = result.findIndex(t => t.id === draggableId);
  const [moved] = result.splice(sourceIndex, 1);

  moved.status = destination.droppableId;

  const destItems = result.filter(t => t.status === destination.droppableId);
  const targetItem = destItems[destination.index];

  if (!targetItem) {
    result.push(moved);
  } else {
    const insertAt = result.findIndex(t => t.id === targetItem.id);
    result.splice(insertAt, 0, moved);
  }

  return result;
}
```

Then test it:

```js
describe('reorderTasks', () => {
  it('moves a task from Now to Later', () => {
    const result = reorderTasks(tasks, 'task-1', ..., ...);
    expect(result.find(t => t.id === 'task-1').status).toBe('Later');
  });

  it('inserts at the correct position', () => { /* ... */ });

  it('handles end-of-list drops', () => { /* ... */ });
});
```

**Why it works:** The function is pure — same inputs always produce the same outputs. It's isolated from React, so it can be tested without a renderer. The test file documents the expected behavior for every code path. If a bug surfaces, you add a failing test first, then fix the function.

---

## Software Engineering Principle Violations

### 20. Single Responsibility Principle — App.jsx does everything

**Problem:** `App.jsx` is responsible for:
- State management (tasks, add, delete, reorder)
- Drag-and-drop orchestration
- Header layout (title, subtitle, decorative icon)
- Input bar layout and positioning
- Main content area layout

That's at least four responsibilities in one component.

**Why it matters:** The component can't be reused, can't be easily tested, and grows without bounds as new features are added. "Filters" would go here. "Undo logic" would go here. "Theme toggle" would go here. Every new feature adds more code to an already overloaded component.

**Fix:**

Split into focused components:

```
src/
├── App.jsx                    # thin orchestrator, ~20 lines
├── components/
│   ├── Header.jsx             # title + subtitle
│   ├── Layout.jsx             # overall page layout (header + main + footer)
│   ├── Board.jsx              # three-column grid
│   ├── Column.jsx             # single droppable column
│   ├── TaskCard.jsx           # single draggable card
│   └── TaskInput.jsx          # input form
├── hooks/
│   └── useTasks.js            # task state, add, delete, reorder — all extracted from App
├── lib/
│   ├── constants.js           # COLUMNS, DEFAULT_COLUMN
│   ├── utils.js               # cn()
│   └── drag.js                # reorderTasks()
```

`App.jsx` becomes:

```jsx
function App() {
  const { tasks, addTask, deleteTask, reorderTasks } = useTasks();

  return (
    <Layout>
      <Header />
      <TaskInput onAddTask={addTask} />
      <Board tasks={tasks} onDragEnd={reorderTasks} onDeleteTask={deleteTask} />
    </Layout>
  );
}
```

**Why it works:** Each piece now has one job. `useTasks` owns the data logic. `Layout` owns page structure. `Header` owns branding. Adding a feature like "filters" means adding a `<Filters>` component and a `filteredTasks` derived value — no other file changes. This is the Single Responsibility Principle applied at the component level.

### 21. Mutating objects inside state updates

**Problem:** In `handleDragEnd`, the dragged task object is mutated directly:

```js
const [movedTask] = newTasks.splice(taskIndex, 1);
movedTask.status = destination.droppableId;  // <-- mutation
```

Even though `setTasks` creates a new array with `[...prevTasks]`, the task objects themselves are still the original references. Mutating `movedTask.status` mutates the object that's still referenced in the old state.

**Why it matters:** This is subtle and dangerous. Other code holding a reference to the same task object sees the mutation. If any memoization or comparison is based on task object identity, it breaks. In StrictMode (which this project uses), React may call the state updater twice to detect side effects — this mutation would cause unpredictable results.

**Fix:**

Create a new task object instead of mutating:

```js
const movedTask = { ...newTasks.splice(taskIndex, 1)[0], status: destination.droppableId };
```

Or use a pure functional approach:

```js
setTasks((prev) => {
  const task = prev.find(t => t.id === draggableId);
  if (!task) return prev;

  const withoutTask = prev.filter(t => t.id !== draggableId);
  const updatedTask = { ...task, status: destination.droppableId };

  // ... insert updatedTask into withoutTask at the right position
});
```

**Why it works:** The spread operator creates a new object, so the original state is never mutated. React's state management works correctly with immutable updates. The `useCallback` and `React.memo` optimizations (if added) compare by reference and work reliably.

### 22. No error boundaries

**Problem:** If any component throws during rendering (e.g., a malformed task object causes `task.title` to fail), the entire app crashes and shows a white screen. There's no error boundary, no fallback UI, nothing.

**Why it matters:** A single corrupt task (e.g., loaded from `localStorage` with a missing `title` field) destroys the entire app. The user sees a blank page with no explanation and no way to recover. This is a catastrophic failure from a minor data issue.

**Fix:**

Create an error boundary:

```jsx
import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-slate-500 mb-4">An unexpected error occurred. Try refreshing the page.</p>
          <button onClick={() => this.setState({ error: null })} className="...">
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

Wrap at least the board area:

```jsx
<ErrorBoundary>
  <Board tasks={tasks} onDragEnd={handleDragEnd} onDeleteTask={handleDeleteTask} />
</ErrorBoundary>
```

**Why it works:** Error boundaries catch render-phase errors in their subtree and display a fallback UI instead of crashing the whole page. The "Try again" button lets the user recover without a full refresh. The error is contained to the board, so the header and input remain functional.

---

## Summary

| # | Issue | Category | Severity |
|---|-------|----------|----------|
| 1 | No input sanitization | Vulnerability | Low (latent) |
| 2 | Module-level side effects | Vulnerability | Low (latent) |
| 3 | Delete button hidden behind hover | Accessibility | High |
| 4 | Submit button missing accessible name | Accessibility | High |
| 5 | No keyboard drag-and-drop instructions | Accessibility | Medium |
| 6 | No live region for task changes | Accessibility | Medium |
| 7 | No memoization causes cascading re-renders | Performance | Medium |
| 8 | Unstable callback references | Performance | Low |
| 9 | Heavy computation during drag | Performance | Low |
| 10 | Index-based ordering is fragile | Performance | Medium |
| 11 | Tasks always created in "Now" column | UX | Medium |
| 12 | No undo or confirmation for deletion | UX | High |
| 13 | No data persistence | UX | High |
| 14 | No feedback when task is added | UX | Medium |
| 15 | No empty state for the whole board | UX | Low |
| 16 | Sticky header too large on mobile | UX | Medium |
| 17 | Duplicated `cn()` utility | Maintainability | Low |
| 18 | Hardcoded column names | Maintainability | Medium |
| 19 | Complex drag-and-drop logic | Maintainability | Medium |
| 20 | App.jsx does everything | SRP Violation | High |
| 21 | Object mutation in state updates | Principle Violation | Medium |
| 22 | No error boundaries | Principle Violation | High |

**Start with**: accessibility fixes (#3, #4), the UX issues (#12, #13), and the error boundary (#22). These directly impact real users every single session. Then tackle the maintainability debt (#17, #18, #20) before the codebase gets any bigger.
