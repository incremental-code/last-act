# LastJS

This repo currently contains **two React-like implementations**. The active, current implementation lives in **`zero\`**. The root-level files are kept as a **reference implementation** for comparison and parity work.

## Canonical implementation

`index.html` boots `zero\index.js`, which renders the current demo app from `zero\app.js`.

The canonical `zero\` implementation currently demonstrates:

- `useState`
- `createContext` / `useContext`
- stable conditional rendering with falsy child slots
- key-based child matching
- recursive rendering of function components nested inside HTML elements
- a `createRoot(...).render(...)` API

## Getting started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm start
   ```
3. Open `http://localhost:3000`

## Repo layout

| Path | Status | Purpose |
| --- | --- | --- |
| `zero\` | Canonical | Current implementation and demo app |
| `index.html` | Canonical entry | Loads `zero\index.js` |
| `last.js` | Reference | Older object-based virtual DOM implementation |
| `index.js` | Reference | Older demo entry point for the root implementation |
| `test-conditional.js` | Reference | Older conditional component rendering demo |
| `test-broken-conditional.js` | Reference | Older demo showing broken conditional hook calls |
| `components\` | Reference | Demo components for the root implementation |

## Functional differences between implementations

| Area | Root implementation | `zero\` implementation |
| --- | --- | --- |
| Authoring model | `createElement(type, props, ...children)` returns object-shaped VDOM | array/tuple VDOM specs like `[div, props, children]` |
| Entry point | `render(Component, container)` | `createRoot(container).render(Component, props)` and `render(...)` |
| Hooks | `useState`, `useEffect` | `useState`, `createContext`, `useContext` |
| Context | Not implemented | Implemented |
| Conditional rendering | Demonstrated via `test-conditional.js` | Supported with stable falsy child handling |
| Keyed children | Not implemented | Implemented via `key` matching in child reconciliation |
| Nested function components under HTML nodes | Limited in the older code path | Explicit recursive processing via `processVdomChildren(...)` |
| DOM/event updates | More selective prop and event updates | Simpler updates; event listeners are currently reattached on every update |
| Demo coverage | `useEffect`, `createElement`, conditional rendering examples | context, conditional rendering, keyed list matching |

## Current direction

The `zero\` implementation is the code path to extend. The root implementation is still useful because it documents behavior and APIs that may be worth carrying forward, especially:

- `createElement(...)` authoring
- `useEffect(...)`
- the older demo scenarios around conditional rendering and hook behavior

## Parity roadmap

- [ ] Decide whether the canonical API should stay array-spec only or gain a compatibility layer/helper similar to `createElement(...)`
- [ ] Add an effect hook story to `zero\` (`useEffect` or an equivalent API)
- [ ] Port the more selective prop/event update behavior from the root implementation into `zero\last.js`
- [ ] Recreate or migrate the useful root demo scenarios under the canonical `zero\` app
- [ ] Remove or archive root-level reference files once the remaining useful behavior is either ported or intentionally dropped

## Notes on hook behavior

The older reference demos are still useful for one important distinction:

- **Conditional component rendering can be supported**
- **Conditional hook calls inside the same component are still invalid**

That distinction should remain documented even if the older demo files are eventually retired.
