# Zero Framework Docs

Zero is a minimal, signal-based UI framework. Components render once, props update via reactive signals, and lists are managed with simple array mutations.

## Getting Started

- **[Signals](./signals.md)** — Reactive values that power Zero's reactivity
- **[Components](./components.md)** — Function components and how to build them
- **[Props](./props.md)** — Configuring elements and passing data
- **[Lists](./lists.md)** — Rendering and managing dynamic lists

## Quick Example

```js
import { Signal, createElement as h } from './zero.js';

const count = new Signal(0);

const counter = h('div', {},
  h('p', {}, 'Count: '),
  h('span', { textContent: count }),
  h('button', {
    onclick: () => count.set(count.get() + 1)
  }, 'Increment')
);

document.body.appendChild(counter);
```

## Core Concepts

**Signals** are reactive values. When you update a signal, any element using that signal automatically updates.

**Components** are functions that return elements. They render once—no re-renders.

**Props** are set directly on DOM elements. Style, attributes, event handlers, everything.

**Lists** are handled by passing a signal containing an array. Updates to the array update the DOM.

## Philosophy

Zero ditches the virtual DOM and reconciliation loop. Instead:

- Elements are real DOM nodes, created once
- Props are bound directly to the DOM
- Reactivity comes from signals, not component state
- List changes are minimal—only add/remove/reorder what changed
- No magic, no implicit dependencies

This makes Zero simpler, faster, and easier to understand.

## See Also

- [example.html](../example.html) — Working demo with a counter and todo list
- [zero.test.js](../zero.test.js) — Test suite with usage examples
