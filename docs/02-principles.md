# Software Engineering Principles in Wahala Sorter

## Table of Contents

1. [Single Responsibility Principle](#1-single-responsibility-principle)
2. [Separation of Concerns](#2-separation-of-concerns)
3. [Composition](#3-composition)
4. [Reusability](#4-reusability)
5. [Immutability](#5-immutability)
6. [Declarative UI](#6-declarative-ui)
7. [Unidirectional Data Flow](#7-unidirectional-data-flow)
8. [Lifting State Up](#8-lifting-state-up)
9. [Controlled Components](#9-controlled-components)
10. [Functional State Updates](#10-functional-state-updates)
11. [Encapsulation / Information Hiding](#11-encapsulation--information-hiding)
12. [DRY (Don't Repeat Yourself)](#12-dry-dont-repeat-yourself)
13. [Defensive Programming](#13-defensive-programming)
14. [Explicit Prop Contract](#14-explicit-prop-contract)
15. [Configuration over Hardcoding](#15-configuration-over-hardcoding)
16. [Utility Function Abstraction](#16-utility-function-abstraction)
17. [Key Prop Pattern](#17-key-prop-pattern)
18. [Conditional Rendering Patterns](#18-conditional-rendering-patterns)
19. [Render Prop Pattern](#19-render-prop-pattern)
20. [Separation of Data Fetching from Presentation](#20-separation-of-data-filtering-from-presentation)
21. [Single Source of Truth](#21-single-source-of-truth)
22. [Early Return / Guard Clause Pattern](#22-early-return--guard-clause-pattern)

---

## 1. Single Responsibility Principle

**What it is:** Every module, class, or function should have **exactly one reason to change**. It should do one thing and do it well.

### Where it appears

**Every component** in this codebase follows SRP:

| Component   | Responsibility                                               |
| ----------- | ------------------------------------------------------------ |
| `App`       | Owns all state and all mutation logic (add, delete, reorder) |
| `Board`     | Groups tasks into columns and provides the drag-drop context |
| `Column`    | Renders one droppable column with its task list              |
| `TaskCard`  | Renders one draggable task card                              |
| `TaskInput` | Manages the input form for creating tasks                    |

### Code evidence

**`App.jsx` lines 14–68** — App's only job is state management. It defines the three handlers (`handleAddTask`, `handleDeleteTask`, `handleDragEnd`) and passes data down. It does NOT render columns, cards, or inputs directly — it delegates those to child components.

**`Board.jsx` lines 5–28** — Board's only job is grouping tasks by status and rendering the `DragDropContext` + grid of columns. It does NOT know how individual cards look or how the input form works.

**`Column.jsx` lines 11–53** — Column's only job is rendering one droppable zone with a header, task count, and list of cards. It does NOT know how drag events are processed or how tasks are created.

**`TaskCard.jsx` lines 12–52** — TaskCard's only job is rendering one card with its title, status badge, date, and delete button. It does NOT know about columns, the board, or task creation.

**`TaskInput.jsx` lines 5–34** — TaskInput's only job is capturing user input and submitting it. It manages its own local `title` state and knows nothing about the task list, columns, or drag-and-drop.

### Why it matters

If any component had more than one responsibility, changing one feature would risk breaking another. For example, if `TaskCard` also knew how to group tasks into columns, a change to card styling could accidentally break the board layout. SRP keeps each file focused, testable, and predictable.

---

## 2. Separation of Concerns

**What it is:** Different aspects of a program should be handled by different, independent modules. For a React app this means: UI is separate from business logic, data management is separate from presentation, layout is separate from styling strategy.

### Where it appears

**Data logic vs. UI rendering:**

```
App.jsx               — owns data + mutation logic (business layer)
Board / Column / Card — receive data via props, render it (presentation layer)
```

- `App.jsx` lines 18–68 contain ALL the business logic (add, delete, reorder). None of the child components contain any logic about how tasks are created, deleted, or reordered. They only call callbacks.

**State management vs. state localness:**

- `App.jsx` line 15 — `useState(INITIAL_TASKS)` — the **global** task list belongs to App.
- `TaskInput.jsx` line 6 — `useState('')` — the **local** input text belongs to TaskInput.
- These are separate concerns: global data that many components need vs. local ephemeral UI state that only one component needs.

**CSS vs. structure:**

- `src/index.css` lines 1–8 — Global body styles (background, text color, font smoothing) are in a CSS file.
- All component-level styles are colocated as Tailwind classes in the JSX. This separates the global look-and-feel (in CSS) from per-component styling (in JSX).
- `src/App.css` exists but is empty — separation of unused concerns, it's available when needed without polluting working files.

**Configuration vs. code:**

- `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `eslint.config.js` — each config file handles exactly one tool. Vite config doesn't contain Tailwind settings; Tailwind config doesn't contain ESLint rules.

### Why it matters

Without separation of concerns, `App.jsx` would mix database logic, rendering, event handling, and CSS in one file. Changing how drag-and-drop works would risk breaking how cards are displayed. Separation means you can modify `handleDragEnd` without ever touching `TaskCard`, and you can restyle a card without touching any business logic.

---

## 3. Composition

**What it is:** Building complex UIs by **combining smaller, simpler components** together, rather than having one giant monolithic component that does everything.

### Where it appears

**The entire component tree is a composition hierarchy:**

```
main.jsx
  └── StrictMode
       └── App
            ├── ListTodo (icon)
            ├── TaskInput
            │    └── Plus (icon)
            └── Board
                 └── DragDropContext
                      └── Column × 3
                           └── Droppable
                                └── TaskCard × N
                                     ├── Trash2 (icon)
                                     ├── status span
                                     └── date span
```

**Code references:**

- `App.jsx` line 82 — `<TaskInput onAddTask={handleAddTask} />` — App composes TaskInput into itself
- `App.jsx` lines 88–92 — `<Board tasks={tasks} onDragEnd={handleDragEnd} onDeleteTask={handleDeleteTask} />` — App composes Board
- `Board.jsx` lines 17–25 — `Object.entries(columns).map(... => <Column ... />)` — Board composes three Column instances
- `Column.jsx` lines 33–39 — `tasks.map(task => <TaskCard ... />)` — Column composes N TaskCard instances
- `Column.jsx` line 23 — `<Droppable droppableId={columnId}>` — Column composes the library's Droppable
- `TaskCard.jsx` line 15 — `<Draggable draggableId={task.id} index={index}>` — TaskCard composes the library's Draggable

**Icons are also composable:**

- `App.jsx` line 76 — `<ListTodo className="text-blue-500" size={36} />`
- `TaskCard.jsx` line 38 — `<Trash2 size={16} />`
- `TaskInput.jsx` line 30 — `<Plus size={20} />`

These lucide-react icon components are small, single-purpose components composed into the parent.

### Why it matters

Composition lets you build complex interfaces without complex components. Each piece is simple enough to understand in isolation. You can swap `TaskCard` for a different implementation without touching `Column`. You can add a new column type without modifying existing columns. Composition also enables **layout flexibility** — the grid layout in `Board.jsx` line 16 (`grid-cols-1 md:grid-cols-3`) controls column arrangement without each Column knowing about it.

---

## 4. Reusability

**What it is:** Designing components so they can be used in multiple contexts without modification.

### Where it appears

**Column is reused three times:**

`Board.jsx` lines 17–25 — `Object.entries(columns).map(([columnId, column]) => <Column ... />)` — The same `Column` component is instantiated three times, once per status (`'Now'`, `'Soon'`, `'Later'`). Each gets different props (`columnId`, `title`, `tasks`), but the component code is identical.

**TaskCard is reused N times:**

`Column.jsx` lines 33–39 — `tasks.map((task, index) => <TaskCard key={task.id} ... />)` — Every task in every column uses the same `TaskCard` component. A board with 15 tasks renders 15 instances of the same component.

**`cn` helper is duplicated (potential reuse opportunity):**

`Column.jsx` lines 6–8 and `TaskCard.jsx` lines 7–9 both define:

```js
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

This is identical code across two files. A reusability **improvement** would be extracting it to a shared utility file like `src/lib/utils.js`, but as-is it demonstrates the pattern of reusable helper functions.

**Tailwind utility classes are reused:**

The same Tailwind classes appear across components:

- `rounded-xl` — used in `Column.jsx` line 29, `TaskCard.jsx` line 22
- `shadow-sm` — used in `TaskCard.jsx` line 22, `TaskInput.jsx` line 23
- `flex items-center justify-between` — used in `Column.jsx` line 15, `TaskCard.jsx` line 29
- `text-slate-500` — used in `App.jsx` line 79, `TaskCard.jsx` line 37

These aren't React component reuse, but they demonstrate reuse of the Tailwind design system.

### Why it matters

Reusability means you write code once and use it everywhere. When you fix a bug in `TaskCard`, all task cards everywhere get fixed. When you need to add a feature (like assigning tasks to users), you add it in one place. Without reusability, you'd copy-paste code for each column, leading to four copies of the same logic — and a bug fix would need to be applied four times.

---

## 5. Immutability

**What it is:** Never modifying existing data directly. Instead, create **new copies** with the changes applied. This is critical in React because it relies on reference equality to detect changes.

### Where it appears

**Adding a task (creates a new array):**

`App.jsx` line 25:

```js
setTasks((prev) => [newTask, ...prev]);
```

This creates a **brand new array** with the new task prepended. The original `prev` array is not modified. The spread operator `...prev` copies all existing task objects into the new array.

**Deleting a task (creates a new array):**

`App.jsx` line 30:

```js
setTasks((prev) => prev.filter((task) => task.id !== id));
```

`Array.prototype.filter()` **always returns a new array**. The original array is unchanged. The old tasks that pass the filter are copied into the new array; the deleted task is simply not included.

**Reordering tasks (copies the array before mutation):**

`App.jsx` lines 43–67:

```js
setTasks((prevTasks) => {
  const newTasks = [...prevTasks];      // LINE 44: creates a COPY
  const taskIndex = newTasks.findIndex(...);
  const [movedTask] = newTasks.splice(taskIndex, 1);  // LINE 46: splice mutates the COPY
  movedTask.status = destination.droppableId;
  // ...insert movedTask into newTasks at the correct position
  return newTasks;                      // LINE 66: returns the COPY
});
```

Line 44 is the **critical immutability line**: `const newTasks = [...prevTasks]`. Without this copy, calling `splice` on `prevTasks` would **mutate React's state directly**, which is forbidden. React wouldn't detect the change (same array reference), and the UI wouldn't update.

### What would break without immutability

If `App.jsx` line 44 were `const newTasks = prevTasks` instead of `[...prevTasks]`:

- `splice` on line 46 would mutate `prevTasks` (React's state) directly.
- `prevTasks` and the new state would reference the same array.
- React would not detect a state change (reference equality check passes — same object).
- The UI would not re-render, even though data changed.

### Why it matters

Immutability guarantees that React can detect changes with a simple `===` comparison. It also prevents **side effects** — where modifying data in one place unexpectedly changes it somewhere else. If the `tasks` array were mutated in `handleDragEnd`, the `Board` component's rendering could see different data than `App`'s state, leading to inconsistent UI.

---

## 6. Declarative UI

**What it is:** Instead of telling the computer **how** to do something step-by-step (imperative), you describe **what** the UI should look like for any given state, and React handles the how.

### Where it appears

**Every component's `return` is a declarative description:**

`Column.jsx` lines 23–51:

```jsx
<Droppable droppableId={columnId}>
  {(provided, snapshot) => (
    <div ref={provided.innerRef} {...provided.droppableProps}
      className={cn("...", snapshot.isDraggingOver ? "bg-slate-200/50" : "")} >
      {tasks.map((task, index) => <TaskCard ... />)}
      {provided.placeholder}
      {tasks.length === 0 && !snapshot.isDraggingOver && (
        <div className="...">Drag tasks here or add above</div>
      )}
    </div>
  )}
</Droppable>
```

This is declarative because:

- It says "if `isDraggingOver` is true, show a highlight background" — not "listen for drag-over events and imperatively change the background color via DOM API."
- It says "if there are no tasks and nothing is being dragged over, show the empty state" — not "on every re-render, check if the column is empty, then create or destroy a DOM element."
- It says "for each task, render a TaskCard" — not "loop through tasks, create DOM elements, append them one by one."

**Another example — `TaskInput.jsx` line 27:**

```jsx
disabled={!title.trim()}
```

This declaratively says "the button is disabled when the title is empty." It does NOT say "listen for input events, check length, then set the disabled attribute." React handles the DOM attribute updates automatically.

### The imperative alternative (what we avoid)

Without declarative UI, you'd write something like:

```js
// imperative approach — NOT what this codebase does
const input = document.querySelector("input");
const button = document.querySelector("button");
input.addEventListener("input", () => {
  if (input.value.trim() === "") {
    button.setAttribute("disabled", "disabled");
  } else {
    button.removeAttribute("disabled");
  }
});
```

### Why it matters

Declarative code is **easier to reason about** — you just describe what the UI should look like, and React figures out the DOM operations. It eliminates entire categories of bugs (forgetting to clean up event listeners, inconsistent state between variables and DOM, etc.). It also makes the code more predictable: given the same props and state, the component always renders the same output.

---

## 7. Unidirectional Data Flow

**What it is:** Data flows in **one direction** through the component tree: **down** via props, **up** via callbacks. Child components never directly modify a parent's state.

### Where it appears

**Data flows DOWN (parent → child):**

```
App (state owner)
  │
  ├── tasks ──────────────────┐
  ├── handleDragEnd ──────────┐│
  └── handleDeleteTask ───────┐││
                              ▼▼▼
                          Board
                           │
                     ┌─────┼─────┐
                     │     │     │
                     ▼     ▼     ▼
                   Column Column Column
                     │
               ┌─────┼─────┐
               │     │     │
               ▼     ▼     ▼
            TaskCard TaskCard TaskCard
```

- `App.jsx` line 89 — `tasks={tasks}` — data flows down
- `Board.jsx` lines 20–22 — `title={column.title} tasks={column.items}` — data flows down
- `Column.jsx` lines 34–38 — `task={task} index={index} onDelete={onDeleteTask}` — data flows down
- `App.jsx` line 82 — `<TaskInput onAddTask={handleAddTask} />` — the callback flows down

**Events flow UP (child → parent via callbacks):**

1. `TaskInput.jsx` line 11 — `onAddTask(title.trim())` — user types, clicks submit → calls App's `handleAddTask`
2. `TaskCard.jsx` line 34 — `onClick={() => onDelete(task.id)}` — user clicks trash → calls App's `handleDeleteTask`
3. `Board.jsx` line 15 — `<DragDropContext onDragEnd={onDragEnd}>` — user drags and drops → library calls App's `handleDragEnd`

**Visual trace of one user action:**

When a user clicks "Delete" on a task:

1. **Event starts** in `TaskCard.jsx` line 34: `onClick={() => onDelete(task.id)}`
2. **Calls up** to `Column.jsx` line 38: `onDelete={onDeleteTask}`
3. **Calls up** to `Board.jsx` line 23: `onDeleteTask={onDeleteTask}`
4. **Calls up** to `App.jsx` line 91: `onDeleteTask={handleDeleteTask}`
5. **State changes** in `App.jsx` line 30: `setTasks(prev => prev.filter(...))`
6. **Data flows down** via React re-render: App passes the new `tasks` array to Board → Board to Column → Column to TaskCard
7. The deleted task's TaskCard never renders because it's no longer in the array

### What violates this

**The immutability violation that doesn't happen but you should watch for:**

Line 49 of App.jsx:

```js
movedTask.status = destination.droppableId;
```

This **mutates the task object itself**. Since the task object hasn't been recreated (only the array was copied with `[...prevTasks]`), this is a **direct mutation of a state object**. In strict React purity, you should create a new task object:

```js
const updatedTask = { ...movedTask, status: destination.droppableId };
```

This existing mutation works because React only shallow-compares state references (the array), not the objects within it, but it's technically impure and could cause issues with `React.memo` or other optimizations.

### Why it matters

Unidirectional data flow makes the app **predictable and debuggable**. When something goes wrong, you know exactly where to look: data comes from above, events go up. There are no mysterious two-way bindings that change data in unexpected places. It also enables the **time-travel debugging** concept — because every state change goes through `setTasks`, you could theoretically log every state and replay the app's history.

---

## 8. Lifting State Up

**What it is:** When multiple components need to share the same data, move (lift) that state to their **nearest common ancestor** instead of keeping it in each component.

### Where it appears

**The `tasks` array lives in App, not in Board or Column:**

`App.jsx` line 15:

```js
const [tasks, setTasks] = useState(INITIAL_TASKS);
```

Why does it live here? Because:

- `Board` needs `tasks` to group and render columns
- `TaskInput` creates new tasks (needs `setTasks`)
- `TaskCard` deletes tasks (needs `setTasks` behind the callback)
- The **nearest common ancestor** of Board and TaskInput is App

**If state were NOT lifted:**

- If `tasks` lived in `Board`, `TaskInput` (App's child, not Board's child) couldn't add tasks to it — App would have to reach into Board, violating unidirectional data flow.
- If `tasks` lived in each `Column`, you couldn't drag a task from "Now" to "Soon" because each column would have its own independent copy.

**TaskInput's local state is NOT lifted:**

`TaskInput.jsx` line 6:

```js
const [title, setTitle] = useState("");
```

This state stays local because **only TaskInput needs it**. No other component cares about what the user is currently typing. If this were lifted to App, App would get cluttered with irrelevant state and every keystroke would re-render the entire app.

### The pattern in practice

```
Shared state (tasks) → lifted to App
                        ↓
UI state (title)     → stays in TaskInput (not lifted)
```

### Why it matters

Lifting state up is what makes data sharing possible in React's unidirectional flow. Without it, sibling components (Board and TaskInput) couldn't interact — TaskInput creates a task, but Board wouldn't know about it. Lifting to the parent App is the minimal elevation needed to enable communication.

---

## 9. Controlled Components

**What it is:** React, not the DOM, controls form input values. The input's `value` is driven by React state, and changes go through React's event handler.

### Where it appears

**`TaskInput.jsx` lines 6, 21, 22:**

```js
const [title, setTitle] = useState(""); // line 6 — state

<input
  value={title} // line 21 — React controls the value
  onChange={(e) => setTitle(e.target.value)} // line 22 — React handles changes
/>;
```

This is a **controlled input** because:

1. The input's `value` is always whatever `title` state holds.
2. When the user types, `onChange` fires → `setTitle(e.target.value)` updates state → React re-renders → the input shows the new value.
3. React is the **single source of truth** for the input's value.

**The clearing pattern on line 12:**

```js
setTitle("");
```

After submission, the state is set to empty string, and React re-renders the input with `value=""`. The input clears. You never touch the DOM directly — you just update state and React handles the rest.

### The uncontrolled alternative (what this avoids)

```jsx
// uncontrolled — NOT used here
<input ref={inputRef} />
// To get value: inputRef.current.value
```

An uncontrolled input stores its value in the DOM. React doesn't know the current value. To clear it after submission, you'd have to do `inputRef.current.value = ''` (imperative DOM manipulation). To disable the button when empty, you'd have to attach an event listener manually.

### Why it matters

Controlled components give React **full control** over the form. Every keystroke goes through React's state management, making it possible to:

- Validate input as the user types (prevent spaces, limit length)
- Transform input (uppercase, trim)
- Conditionally enable/disable the submit button based on real-time value (`disabled={!title.trim()}` on line 27)
- Clear the input after submission with a single state update

None of this is possible with uncontrolled inputs without extra imperative code.

---

## 10. Functional State Updates

**What it is:** When the new state depends on the previous state, pass a **function** to the state setter (`setState(prev => ...)`) instead of a value (`setState(newValue)`).

### Where it appears

**`App.jsx` line 25 — Adding a task:**

```js
setTasks((prev) => [newTask, ...prev]);
```

**`App.jsx` line 30 — Deleting a task:**

```js
setTasks((prev) => prev.filter((task) => task.id !== id));
```

**`App.jsx` lines 43–67 — Reordering after drag:**

```js
setTasks((prevTasks) => {
  // complex logic that reads and transforms prevTasks
  return newTasks;
});
```

### When it matters most

**All three `setTasks` calls use the functional form.** Here's why:

If you wrote `setTasks([newTask, ...tasks])` (reading `tasks` from the closure) instead of `setTasks(prev => [newTask, ...prev])`, and if multiple state updates were batched (React 18+ does this), you'd get a **stale closure** bug:

```js
// BUGGY alternative (NOT used):
const handleAddTask = (title) => {
  setTasks([newTask, ...tasks]); // tasks could be stale!
  setTasks([newTask2, ...tasks]); // both use the same old `tasks`!
};
```

With the functional form, each call gets the **most up-to-date** previous state directly from React, regardless of batching:

```js
// CORRECT (what the codebase does):
setTasks((prev) => [newTask, ...prev]); // prev is always fresh
setTasks((prev) => [newTask2, ...prev]); // prev now includes newTask!
```

### Why it matters

Functional updates guarantee correctness when state updates might be batched. If you rapid-fire delete two tasks, both deletions read the correct, current list. Without functional updates, the second deletion might use a stale list that still includes the first deleted task, leading to bugs where you try to delete a task that's already gone.

---

## 11. Encapsulation / Information Hiding

**What it is:** Each component hides its internal implementation details and exposes only a minimal public API (its props).

### Where it appears

**TaskInput hides its input state:**

External components only know about `TaskInput`'s prop: `onAddTask`.

```js
<TaskInput onAddTask={handleAddTask} />
```

Nobody outside `TaskInput` knows about:

- The `title` state variable (`TaskInput.jsx` line 6)
- The `handleSubmit` function (`TaskInput.jsx` line 8)
- How the form is structured (input + button)
- The specific Tailwind classes used for styling

If you changed from a controlled input to a different pattern (like a textarea or a rich text editor), no other component would need to change.

**Column hides its droppable internals:**

```jsx
// Column.jsx — public API
export default function Column({ columnId, title, tasks, onDeleteTask })
```

Board doesn't know that Column uses a `Droppable`, or that Column shows an empty-state message when there are no tasks. Board just passes `columnId`, `title`, `tasks`, `onDeleteTask` and trusts Column to handle the rest.

**TaskCard hides its drag-and-drop setup:**

```jsx
// TaskCard.jsx — public API
export default function TaskCard({ task, index, onDelete })
```

Column doesn't know that TaskCard uses a `Draggable`, or that the card changes appearance during drag (`isDragging`). Column just passes `task`, `index`, `onDelete`.

### Why it matters

Encapsulation means you can change the **internals** of any component without affecting other components. You could:

- Replace `@hello-pangea/dnd` with a different drag library (e.g., `dnd-kit`) and only change `TaskCard.jsx` and `Column.jsx` — `App.jsx` and `Board.jsx` wouldn't need changes.
- Change the empty state from text to an illustration — only `Column.jsx` changes.
- Add character count or validation to TaskInput — only `TaskInput.jsx` changes.

Each component is a "black box" with a well-defined interface. This is the foundation of maintainable code.

---

## 12. DRY (Don't Repeat Yourself)

**What it is:** Every piece of knowledge should have a **single, unambiguous representation** in the system. Avoid duplicate code.

### Where it appears

**The `cn()` helper avoids repeating `twMerge(clsx(...))`:**

`Column.jsx` lines 6–8 and `TaskCard.jsx` lines 7–9:

```js
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

Without this helper, every className expression would be:

```jsx
className={twMerge(clsx("flex-1 transition-colors", snapshot.isDraggingOver ? "bg-slate-200/50" : ""))}
```

With the helper:

```jsx
className={cn("flex-1 transition-colors", snapshot.isDraggingOver ? "bg-slate-200/50" : "")}
```

This reduces repetition **within** each file. (Note: the helper IS duplicated across two files — extracting to a shared `src/lib/utils.js` would be even more DRY.)

**The three columns use the same code via mapping, not copy-paste:**

`Board.jsx` lines 17–25:

```jsx
{
  Object.entries(columns).map(([columnId, column]) => (
    <Column
      key={columnId}
      columnId={columnId}
      title={column.title}
      tasks={column.items}
      onDeleteTask={onDeleteTask}
    />
  ));
}
```

Without this, you'd copy-paste:

```jsx
<Column key="Now" columnId="Now" title="Now" tasks={columns.Now.items} onDeleteTask={onDeleteTask} />
<Column key="Soon" columnId="Soon" title="Soon" tasks={columns.Soon.items} onDeleteTask={onDeleteTask} />
<Column key="Later" columnId="Later" title="Later" tasks={columns.Later.items} onDeleteTask={onDeleteTask} />
```

The `.map()` approach means adding a fourth column is just adding one entry to the `columns` object, not copy-pasting another `<Column>` tag.

**Status values are consistently `'Now'`, `'Soon'`, `'Later'`:**

These three strings appear in:

- `App.jsx` lines 8–11 (INITIAL_TASKS)
- `App.jsx` line 22 (new task status)
- `App.jsx` line 49 (drag-drop status update)
- `Board.jsx` lines 8–10 (column filtering)

They're consistently used as string literals rather than defining magic numbers or different names per location.

### Anti-pattern avoided: no duplicate event handler patterns

If `handleDeleteTask` were inlined into every TaskCard instead of defined once in App and passed down:

```jsx
// What would be repeated without DRY (does NOT happen here):
// TaskCard 1: <button onClick={() => setTasks(prev => prev.filter(t => t.id !== id1))} />
// TaskCard 2: <button onClick={() => setTasks(prev => prev.filter(t => t.id !== id2))} />
```

Instead, `handleDeleteTask` is defined once in `App.jsx` line 29 and passed down through the entire tree.

### Why it matters

Every duplication is a **bug waiting to happen**. If you duplicated the column rendering, you'd have to remember to update all three copies when changing column layout. If you duplicated the delete logic, a bug fix would need to be applied everywhere. DRY ensures changes happen in one place and propagate automatically.

---

## 13. Defensive Programming

**What it is:** Writing code that anticipates and handles potential problems gracefully rather than crashing.

### Where it appears

**Guard against null destination (drag dropped outside):**

`App.jsx` line 38:

```js
if (!destination) return;
```

Without this check, accessing `destination.droppableId` on line 49 would throw `TypeError: Cannot read properties of null`. The app would crash and show a blank page.

**Guard against no-op drag (same position):**

`App.jsx` line 41:

```js
if (
  source.droppableId === destination.droppableId &&
  source.index === destination.index
)
  return;
```

Without this, dragging a card and dropping it in the exact same spot would trigger a full reorder calculation and state update — wasteful but not crashing. The guard prevents unnecessary work.

**Guard against empty input:**

`TaskInput.jsx` line 10:

```js
if (title.trim()) {
```

Without this, submitting with an empty input would create a task with an empty title — a useless blank card on the board.

**Guard against out-of-bounds drop index:**

`App.jsx` lines 57–63:

```js
const destTaskToInsertBefore = destTasks[destination.index];
if (destTaskToInsertBefore) {
  // insert before this task
} else {
  newTasks.push(movedTask); // fallback: insert at end
}
```

If `destination.index` is larger than the actual number of tasks (shouldn't happen with the library, but defensive), `destTaskToInsertBefore` would be `undefined`. The code handles this gracefully by pushing to the end instead of crashing.

**Empty column still has a minimum height:**

`Column.jsx` line 13:

```jsx
min-h-[500px]
```

An empty column is still 500px tall. Without this, an empty column would collapse to zero height, making it hard to drag tasks into (the droppable area would be too small to hit). This is a UX defensive measure.

**Button disabled when input empty:**

`TaskInput.jsx` line 27:

```js
disabled={!title.trim()}
```

Prevents users from submitting empty tasks at the UI level, in addition to the `if (title.trim())` check in `handleSubmit`. This is **defense in depth** — two layers of protection.

### Why it matters

Defensive programming prevents the **"white screen of death"** (a full app crash). Users might accidentally drop a task outside a column, or press Enter with an empty input. The app handles these gracefully instead of crashing. This is especially important because crashed JavaScript means a completely broken page that requires a manual reload.

---

## 14. Explicit Prop Contract

**What it is:** Every component has a clearly defined interface — you know exactly what props it expects just by reading its declaration. No implicit dependencies, no magic globals.

### Where it appears

**Every component declares its props via destructuring in the function signature:**

`Board.jsx` line 5:

```js
export default function Board({ tasks, onDragEnd, onDeleteTask })
```

`Column.jsx` line 11:

```js
export default function Column({ columnId, title, tasks, onDeleteTask })
```

`TaskCard.jsx` line 12:

```js
export default function TaskCard({ task, index, onDelete })
```

`TaskInput.jsx` line 5:

```js
export default function TaskInput({ onAddTask })
```

**Prop trace for `onDeleteTask`:**

The delete function is explicitly passed through every layer:

1. `App.jsx` line 91: `onDeleteTask={handleDeleteTask}`
2. `Board.jsx` line 23: `onDeleteTask={onDeleteTask}` (pass-through)
3. `Column.jsx` line 38: `onDelete={onDeleteTask}` (renamed from `onDeleteTask` to `onDelete`)
4. `TaskCard.jsx` line 34: `onClick={() => onDelete(task.id)}` (used)

Every intermediate component explicitly lists the prop in its signature. No component accesses `props.onDeleteTask` without declaring it first.

**What's NOT in the contract (encapsulation):**

- `TaskInput` does NOT accept a `value` or `onChange` prop — those are internal
- `TaskCard` does NOT accept a `style` or `className` prop — styling is encapsulated
- `Board` does NOT accept a `columns` prop — it computes them internally

### Why it matters

Explicit prop contracts make components **self-documenting**. You can look at just the function signature and know exactly what data and callbacks a component needs. This prevents bugs where a component silently depends on a prop that was accidentally renamed upstream — the error would be immediate ("undefined is not a function") rather than a subtle UI glitch.

---

## 15. Configuration over Hardcoding

**What it is:** Separating configurable values from logic so they can be changed without modifying the logic.

### Where it appears

**Initial tasks as a constant:**

`App.jsx` lines 7–12:

```js
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
```

This is defined **outside** the component function (line 14 starts `function App()`). This means:

- It's only created **once** when the module loads, not on every re-render.
- If you want different sample data, you change this array — not the component logic.
- It's clearly labeled as "configuration" by the ALL_CAPS convention.

**Status values as consistent string literals:**

The three statuses `'Now'`, `'Soon'`, `'Later'` appear in multiple places but are consistently used. They could be extracted to a constant:

```js
const COLUMNS = ["Now", "Soon", "Later"];
```

This isn't done in the current code, but the consistent usage makes it easy to add without refactoring.

**Tailwind config (`tailwind.config.js`):**

The `content` paths (lines 3–6) are configuration that tells Tailwind where to scan for classes. If you move files to a new directory, you update this config — not the build tool or the CSS.

### Why it matters

Configuration over hardcoding makes changes safer and easier. Want different sample tasks? Edit `INITIAL_TASKS`. Want to change which files Tailwind scans? Edit `tailwind.config.js`. You don't need to understand the component logic to change these values, reducing the risk of introducing bugs.

---

## 16. Utility Function Abstraction

**What it is:** Extracting a common operation into a named function so the intent is clearer and the implementation can be changed in one place.

### Where it appears

**The `cn()` function:**

`Column.jsx` lines 6–8 and `TaskCard.jsx` lines 7–9:

```js
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

This abstracts the **"merge class names with conflict resolution"** operation. Without it, every `className` expression would be:

```jsx
className={twMerge(clsx("flex-1 transition-colors", condition ? "bg-blue" : ""))}
```

With it:

```jsx
className={cn("flex-1 transition-colors", condition ? "bg-blue" : "")}
```

The name `cn` (short for "classNames") communicates intent: "I'm combining class names." You don't need to think about `twMerge` and `clsx` every time.

**`format` from date-fns (`TaskCard.jsx` line 47):**

```js
{
  format(task.createdAt, "MMM d, h:mm a");
}
```

The `format` function abstracts away the complexity of `Date` methods. Without it, you'd need:

```js
{
  new Date(task.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
}
```

The abstraction makes the intent clear ("format this timestamp") and handles edge cases (invalid dates, timezone differences).

### Why it matters

Utility functions raise the **level of abstraction**. A developer reading `cn(...)` doesn't need to know about Tailwind merge semantics — they just know "these classes are being combined." The implementation details are hidden one level deeper. If you later switch from `tailwind-merge` to a different library, you change `cn()` in one place, not every `className` expression.

---

## 17. Key Prop Pattern

**What it is:** When rendering lists in React, each element needs a **unique and stable `key` prop** so React can track identity across re-renders.

### Where it appears

**`Board.jsx` line 19:**

```jsx
<Column key={columnId} columnId={columnId} ... />
```

Each column has a unique `columnId` (`'Now'`, `'Soon'`, `'Later'`). React uses this to know which column is which. Since these IDs don't change, React correctly tracks each column's state (scroll position, any child state) across re-renders.

**`Column.jsx` line 35:**

```jsx
<TaskCard key={task.id} task={task} index={index} />
```

Each task has a unique `id` from `uuidv4()`. This is critical for drag-and-drop because:

- React needs to know which card moved where.
- If you used `key={index}`, dragging a card would swap keys with another card, confusing React and causing visual glitches (wrong card animating, lost state, etc.).

### Why using key=index is wrong for this app

If the key were `index` instead of `task.id`:

1. Task at index 0 (key=0) is "Plan the app layout"
2. User drags "Implement drag and drop" (was index 1) to index 0
3. Now "Implement drag and drop" has key=0, and "Plan the app layout" has key=1
4. React thinks "Plan the app layout" (previously key=0) was **removed** and a new card appeared at key=0
5. Animations break, focus is lost, delete buttons might point to wrong tasks

With `key={task.id}`:

1. Task "a1b2..." (key=a1b2) is at position 0, task "c3d4..." (key=c3d4) is at position 1
2. User drags "c3d4..." to position 0
3. React sees key=a1b2 moved from 0 to 1, key=c3d4 moved from 1 to 0
4. Correct animation, correct identity

### Why it matters

The key prop is essential for correct reconciliation (React's algorithm for updating the DOM). Without stable keys, React might destroy and recreate DOM elements instead of moving them, causing:

- Lost focus/selection state
- Broken animations
- Incorrect event handler bindings
- Performance degradation

---

## 18. Conditional Rendering Patterns

**What it is:** Using JavaScript expressions within JSX to decide whether to render parts of the UI.

### Where it appears

**Three different patterns are used:**

**Pattern 1 — Ternary operator (Column.jsx line 30):**

```jsx
snapshot.isDraggingOver ? "bg-slate-200/50" : "";
```

A ternary in a className. If dragging over, add highlight class; otherwise, empty string (no class). This is a ternary because there are exactly two outcomes — with highlight or without.

**Pattern 2 — Logical AND (Column.jsx line 44):**

```jsx
{
  tasks.length === 0 && !snapshot.isDraggingOver && (
    <div className="...">Drag tasks here or add above</div>
  );
}
```

Uses `&&` (logical AND) for conditional rendering. When `tasks.length === 0` AND `!snapshot.isDraggingOver` are both true, the right side (the empty-state div) renders. If either condition is false, the expression short-circuits to `false` (React renders nothing). This is appropriate when the condition naturally produces a boolean — no else branch needed.

**Pattern 3 — Ternary in className (TaskCard.jsx lines 23–25):**

```jsx
snapshot.isDragging
  ? "border-blue-400 shadow-md scale-[1.02] rotate-1"
  : "border-slate-200";
```

Two different sets of classes depending on drag state. Ternary is the right choice because there are exactly two states: dragging and not dragging.

**Pattern 4 — If statement in event handler (App.jsx lines 38–41):**

```jsx
if (!destination) return;
if (
  source.droppableId === destination.droppableId &&
  source.index === destination.index
)
  return;
```

These are early returns in JavaScript, not inline JSX conditionals, but they're still conditional execution — "only proceed with the state update if certain conditions are met."

**The empty state is a compound conditional:**

```jsx
{tasks.length === 0 && !snapshot.isDraggingOver && ( ... )}
```

This is intentionally more specific than just `{tasks.length === 0 && ( ... )}`. Without the `!snapshot.isDraggingOver` check, the empty-state message would flicker while dragging a task over an empty column — the placeholder would show, then the empty message, then the placeholder again — creating a distracting visual.

### Why it matters

Different conditional patterns serve different purposes. Ternary is for if/else (two branches). AND is for single-branch conditions. Early returns guard against invalid states. Choosing the right pattern makes the code more readable and intent-clear. The compound condition for the empty state specifically prevents a UX flicker that would confuse users.

---

## 19. Render Prop Pattern

**What it is:** A pattern where a component receives a **function as its children** (or as a prop) and calls that function to determine what to render. The function receives arguments from the parent component.

### Where it appears

**`Droppable` render prop (Column.jsx lines 23–50):**

```jsx
<Droppable droppableId={columnId}>
  {(provided, snapshot) => (
    <div
      ref={provided.innerRef}
      {...provided.droppableProps}
      className={cn("...", snapshot.isDraggingOver ? "bg-slate-200/50" : "")}
    >
      ...
    </div>
  )}
</Droppable>
```

The `Droppable` component does NOT receive a React element as its child. It receives a **function**. `Droppable` calls this function with `provided` (methods and props the library needs to attach to your DOM element) and `snapshot` (current drag state). The Column component uses these to render the drop zone.

**`Draggable` render prop (TaskCard.jsx lines 15–50):**

```jsx
<Draggable draggableId={task.id} index={index}>
  {(provided, snapshot) => (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={cn("...", snapshot.isDragging ? "..." : "...")}
    >
      ...
    </div>
  )}
</Draggable>
```

Same pattern. `Draggable` calls the function with `provided` (ref, draggable props, drag handle props) and `snapshot` (isDragging boolean). The TaskCard uses these to make the card draggable and style it differently while dragging.

### What happens without the render prop

If `Droppable` just accepted children as React elements, it couldn't give you `provided` and `snapshot`. You'd need to use an imperative API or global context to access library internals. The render prop pattern **inverts control**: the library provides the tools, but you decide how to use them.

### Why it matters

The render prop pattern gives components like `Droppable` and `Draggable **ultimate flexibility** in how they render. The library doesn't dictate your HTML structure — you write the actual divs and classes. The library just provides the hooks (`innerRef`, `droppableProps`, `placeholder`, `snapshot.isDraggingOver`). This is in contrast to a component that hardcodes its own div structure and only lets you change text.

---

## 20. Separation of Data Filtering from Presentation

**What it is:** The logic that **computes what data to show** is separated from the code that **renders** that data.

### Where it appears

**Board computes, Column presents:**

`Board.jsx` lines 7–11:

```js
const columns = {
  Now: { title: "Now", items: tasks.filter((t) => t.status === "Now") },
  Soon: { title: "Soon", items: tasks.filter((t) => t.status === "Soon") },
  Later: { title: "Later", items: tasks.filter((t) => t.status === "Later") },
};
```

Board is responsible for the **data transformation** — it takes the flat `tasks` array and groups them by status into three buckets. The `.filter()` calls do the computation.

`Column.jsx` lines 11–53 just **renders** whatever `tasks` array it receives. It doesn't filter or transform. It just maps over tasks and renders TaskCards.

**In `App.jsx`, data logic is in dedicated handlers, not mixed with JSX:**

The three handlers (`handleAddTask` at lines 18–26, `handleDeleteTask` at lines 29–31, `handleDragEnd` at lines 34–68) are all **pure data manipulation**. They're defined before the `return` statement and are completely separate from the JSX that calls them.

The JSX (lines 70–95) only:

- Renders the layout structure
- Places components and passes props
- Shows static content (the title, tagline)

It contains zero data transformation logic.

### Why it matters

This separation means:

- To change how tasks are grouped, you only edit `Board.jsx` lines 7–11.
- To change how columns look, you only edit `Column.jsx`.
- To change how drag-and-drop works, you only edit `App.jsx` lines 34–68.
- To change the page title, you only edit the JSX in `App.jsx` line 77.

If data logic were mixed with JSX, you'd risk accidentally breaking the UI when changing data logic, and vice versa.

---

## 21. Single Source of Truth

**What it is:** Every piece of data has exactly one authoritative location. No duplicate state that can get out of sync.

### Where it appears

**The `tasks` array in App is the ONLY source of truth for task data:**

```
App.state.tasks  ← the only place task data lives
  ↓
  ↓ (renders)
  ↓
Board: tasks filtered by Board's `.filter()` calls  ← derived from truth
  ↓
Column: receives filtered subset                             ← derived from truth
  ↓
TaskCard: receives one task object                            ← derived from truth
```

The `INITIAL_TASKS` on line 8 is used exactly once — to initialize `useState` on line 15. After that, `INITIAL_TASKS` is never referenced again. The `tasks` state is the sole source.

**Task's `status` property is the source for column placement:**

- `App.jsx` line 22: new tasks get `status: 'Now'`
- `App.jsx` line 49: drag updates `movedTask.status = destination.droppableId`
- `Board.jsx` lines 8–10: `tasks.filter(t => t.status === 'Now')` reads status

If a task's status says `'Soon'`, it appears in the Soon column. There's no separate "column membership" state that can get out of sync with the task's status.

**The `title` state in TaskInput is the source for the input value:**

- Set on every keystroke (line 22): `setTitle(e.target.value)`
- Read for rendering (line 21): `value={title}`
- Read for submission (line 10): `title.trim()`
- Cleared after submission (line 12): `setTitle('')`

There's no duplicate. The input element doesn't have its own internal value — React controls it entirely.

### Why it matters

Two sources of truth for the same data guarantees they'll eventually disagree. For example, if task status were stored both in the task object AND in a separate "which column does this task belong to" map, dragging a task would need to update both places. Forgetting one would cause the task to appear in one column but belong to another — a ghost in the UI. Single source of truth eliminates this class of bugs.

---

## 22. Early Return / Guard Clause Pattern

**What it is:** Checking for invalid or no-op conditions at the **start** of a function and returning early, rather than wrapping the entire function body in an `if` statement.

### Where it appears

**`App.jsx` lines 38–41:**

```js
if (!destination) return;
if (
  source.droppableId === destination.droppableId &&
  source.index === destination.index
)
  return;
```

These two guard clauses sit at the top of `handleDragEnd`. They check for "no work needed" cases and exit immediately. The alternative would be nesting the entire function body inside an `if`:

```js
// Without early returns (worse alternative):
if (
  destination &&
  !(
    source.droppableId === destination.droppableId &&
    source.index === destination.index
  )
) {
  // ... all the reorder logic (lines 43-67) ...
}
```

**`TaskInput.jsx` line 10:**

```js
if (title.trim()) {
  onAddTask(title.trim());
  setTitle("");
}
```

This is an **entry gate** rather than an early return — it wraps the action in a condition. But it serves the same purpose: prevent proceeding with invalid state (empty title).

**The pattern in context:**

```
handleDragEnd:
  → Guard: dropped outside? → return early, nothing to do
  → Guard: same position? → return early, nothing to do
  → Main logic: reorder tasks
  → Return new state
```

### Why it matters

Early returns flatten code structure. Without them, you'd have nested `if` blocks that make it harder to trace the main logic path. With early returns, the **happy path** (the main logic) sits at the top level without indentation, and the edge cases are handled and dismissed upfront. This also prevents the "arrow anti-pattern" where code becomes deeply nested like `if (...) { if (...) { if (...) { ... } } }`.
