# LastJS

A tiny, deliberately-readable reimplementation of React's core ideas — no build
step, plain ES modules. The goal is pedagogical: if you read [`last.js`](last.js)
end to end you've seen the spine of React (components, `useState`, `useEffect`,
`useContext`, and a DOM reconciler), with none of the scheduling cleverness.

## Getting started

```bash
npm install
npm start         # serves on http://localhost:3000
```

`http://localhost:3000` is the homepage — it loads [`last.js`](last.js) at runtime and
shows the whole file with its comments lifted out and set alongside the code they
describe. The live demo (the components in [`app.js`](app.js)) is at
[`/demo.html`](demo.html).

## Authoring model

Components are plain functions that receive `props` and return an *element* — the
same `{ type, props }` description JSX compiles to. You build elements with
`createElement(type, props, ...children)`:

```js
import { createElement, useState } from './last.js';
import { button } from './html.js';

const Counter = () => {
    const [n, setN] = useState(0);
    return createElement(button, { onClick: () => setN(n + 1) }, `Clicked ${n} times`);
};
```

`type` is a DOM tag string (`'button'`) for a host element, or a function for a
component. String constants for the common tag names live in [`html.js`](html.js)
(`button` is literally `'button'`) — importing them gives you autocomplete and
typo-checking.

Mount a root component into the DOM:

```js
import { createRoot, createElement } from './last.js';
import { App } from './app.js';

const root = createRoot(document.querySelector('#root'));
root.render(createElement(App));
```

## How it works (the short version)

1. Components return elements. Elements are cheap and **rebuilt from scratch on
   every render**, so they can't hold state.
2. `render()` runs every function component and splices its returned element in
   place of the component element, leaving a tree of pure *host* elements (DOM
   tags only).
3. In parallel, LastJS keeps a **shadow tree** with the same shape that *does*
   persist between renders. Each shadow node owns the `useState` / `useEffect` /
   context slots for one position in the tree. (React calls this the fiber tree.)
4. `diff()` walks the new host-element tree against the previous one and makes
   the minimal DOM mutations to match.
5. Queued `useEffect` callbacks run after the DOM is committed (deferred via
   `setTimeout`).
6. `setState` mutates a shadow slot and re-renders from the root; the shadow tree
   carries state forward so components resume where they left off.

## API

| Export | Description |
| --- | --- |
| `createElement(type, props, ...children)` | Build an element (what JSX compiles to). `key` / `ref` are lifted out of `props` onto the element. |
| `createRoot(container)` | Returns a `RootContainer`; call `.render(element)` on it to (re)render into `container`. |
| `render(element, container)` | One-shot convenience wrapper around `createRoot` (no memory between calls — single render only). |
| `useState(initialValue)` | Returns `[value, setState]`. `initialValue` may be a function (lazy init); `setState` accepts a value or an updater function `prev => next`. |
| `useEffect(fn, deps)` | Runs `fn` after the render commits when `deps` change (per-element `===`). No `deps` → every render; `[]` → mount only. `fn` may return a cleanup function, run before the next re-run. |
| `createContext()` | Returns `{ Provider, index }`. (No default-value argument — `useContext` throws if no `Provider` is above it.) |
| `useContext(context)` | Reads the nearest provided value by walking up the component chain. |

## Demo app (`app.js`)

`<App>` keeps a counter and theme in `useState`, publishes the theme through a
context `Provider`, and renders three self-contained demos:

- **`useState` / `useContext`** — counter and theme toggle.
- **Demo 1 — conditional rendering** — a hidden component keeps its state and
  resumes when shown again; the sibling after it is unaffected (a falsy child
  slot keeps sibling positions stable).
- **Demo 2 — key-based list matching** — reorder a list; each item keeps its own
  count because components are matched by `key`.
- **Demo 3 — `useEffect` with cleanup** — a `setInterval` is started when the
  timer runs and cleared by the cleanup function before the effect re-runs.

## Hook rules

- Call hooks unconditionally, in the same order, at the top level of a component
  — the call order *is* the slot's identity, so a hook inside an `if`/loop breaks
  the mapping.
- **Conditional component rendering is fine.** A component can be omitted from
  the tree and will resume its state when it reappears (see Demo 1).

## Limitations / not implemented

This is a teaching implementation, not a React replacement. Notably:

- No render batching — two `setState` calls in one handler cause two renders.
- The DOM child patch is index-based; keys keep component *state* across reorders
  but the DOM nodes themselves are reused-and-repainted by position.
- No `useEffect` cleanup on unmount — a vanished component's shadow is just
  garbage-collected, so cleanup only runs before a re-run, not on removal.
- No fibers / interruptible rendering, synthetic events, fragments, error
  boundaries, or `createContext` default values.

## Repo layout

| Path | Purpose |
| --- | --- |
| `last.js` | Core library (heavily commented — start here) |
| `index.html` | Homepage with annotated source viewer |
| `demo.html` | Live demo page |
| `demo.js` | Demo entry point (mounts `<App>` into `demo.html`) |
| `app.js` | Demo application components |
| `html.js` | String constants for HTML element names |
