# last.act documentation

A tiny, readable reimplementation of React's core ideas in ~500 lines of plain ES modules.

## Guides

Start with **[Mental Model](./MENTAL_MODEL.md)** for the big picture, then dive into the deep-dives:

1. **[Mental Model](./MENTAL_MODEL.md)** — Think like last.act: the three trees, the "aha" moments, and how it all fits together
2. **[Architecture](./ARCHITECTURE.md)** — The three-tree concept: elements, shadows, and DOM
3. **[The Render Pipeline](./PIPELINE.md)** — Step-by-step walk through mount and update cycles
4. **[Hooks](./HOOKS.md)** — How `useState`, `useEffect`, `useContext` read/write the shadow
5. **[Scheduler & Updates](./SCHEDULER.md)** — Batching, ancestor dedup, per-subtree updates
6. **[Extending last.act](./EXTENDING.md)** — Adding refs, custom hooks, error boundaries, etc.

## Quick reference

```js
import { createElement, createRoot, useState, useEffect, createContext, useContext } from 'last-act';

const ThemeCtx = createContext('light');

function App() {
    const [count, setCount] = useState(0);
    const [theme, setTheme] = useState('light');
    
    useEffect(() => {
        document.title = `Count: ${count}`;
    }, [count]);
    
    return createElement(ThemeCtx.Provider, { value: theme },
        createElement('div', null,
            createElement('p', null, `Count: ${count}`),
            createElement('button', { onClick: () => setCount(count + 1) }, 'Inc'),
        ),
    );
}

const root = createRoot(document.getElementById('root'));
root.render(createElement(App));
```

## File guide

| File | Job | Lines |
|---|---|---|
| `src/element.js` | Build element objects; normalise children | 21 |
| `src/shadow.js` | Shadow tree structure; key/index matching | 45 |
| `src/hooks.js` | Hook call context (globals); slot tracking | 33 |
| `src/exec.js` | Resolve component tree to host-element tree | 69 |
| `src/dom.js` | Create / patch real DOM nodes | 36 |
| `src/diff.js` | Reconcile: old tree vs new tree → minimal mutations | 85 |
| `src/link.js` | Stamp DOM anchors on shadows after commit | 20 |
| `src/state.js` | `useState` hook implementation | 25 |
| `src/effect.js` | `useEffect` hook + cleanup runner | 33 |
| `src/context.js` | `createContext` / `useContext` | 32 |
| `src/scheduler.js` | Batch setState calls; dedup ancestors | 38 |
| `src/root.js` | Root mount/update; orchestrate the pipeline | 60 |
| `src/index.js` | Public API barrel | 5 |

Read in this order: `element.js` → `shadow.js` → `hooks.js` → `exec.js` → `dom.js` → `diff.js` → `state.js` → `effect.js` → `context.js` → `scheduler.js` → `root.js`.

Each file is ~1 screen of code. Comments explain the why, not the what.

## Why read this?

- **Understand React.** This is the skeleton React builds on. No jsx parser, no concurrent rendering, no suspense — just the core loop.
- **Learn by reading.** Every line is readable and intentional. No framework magic or hidden globals.
- **Extend it.** Once you understand the pieces, adding refs or error boundaries is straightforward.
