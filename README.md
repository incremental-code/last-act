# LastJS

A minimal functional reactive UI library. Components return plain array specs; state and effects persist across renders in the vdom tree.

## Getting started

```bash
npm install
npm start         # serves on http://localhost:3000
```

## Authoring model

Components are plain functions that return a `[nodeType, props, children]` tuple:

```js
const Counter = () => {
    const [n, setN] = useState(0);
    return ['button', { onClick: () => setN(n + 1) }, `Clicked ${n} times`];
};
```

String constants for HTML element names can be imported from `html.js`:

```js
import { div, button, span } from './html.js';
```

Entry point:

```js
import { createRoot } from './last.js';
createRoot(document.querySelector('#root')).render(App, {});
```

## API

| Export | Description |
| --- | --- |
| `createRoot(container)` | Returns a `RootContainer` with a `.render(Component, props)` method |
| `render(Component, container, props)` | Convenience wrapper around `createRoot` |
| `useState(initialValue)` | Returns `[value, setState]`; setState accepts a value or updater function |
| `useEffect(fn, deps)` | Runs `fn` after render when `deps` change; `fn` may return a cleanup function |
| `createContext()` | Returns `{ Provider, index }` |
| `useContext(context)` | Reads the nearest provider value for `context` |

## Demo app (`app.js`)

The demo covers:

- `useState` — counter, theme toggle
- `createContext` / `useContext` — theme passed via context
- **Demo 1** — stable conditional rendering with falsy child slots
- **Demo 2** — key-based child matching for reordered lists
- **Demo 3** — `useEffect` with `setInterval` and cleanup

## Hook rules

- Call hooks unconditionally at the top level of a component.
- **Conditional component rendering is fine** — a component can be omitted from the tree and will resume its state when it reappears (see Demo 1).
- **Conditional hook calls inside one component are not valid** — the hook index must be stable across renders.

## Repo layout

| Path | Purpose |
| --- | --- |
| `last.js` | Core library |
| `app.js` | Demo application |
| `html.js` | String constants for HTML element names |
| `index.js` | Entry point |
| `index.html` | HTML shell |
