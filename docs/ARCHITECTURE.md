# Architecture: The Mental Model

## The Problem

React renders components into a DOM. Components are functions that return UI descriptions. But components can't hold state in themselves — they'd be discarded on every re-render. So where does state live?

**React's answer:** Keep a separate *shadow tree*. It mirrors the component/element tree but *persists* across renders. State lives there.

## Three Trees

last.act maintains three trees in parallel:

```
1. ELEMENT TREE (rebuilt every render)
   ├─ App { type: function, props: {...}, children: [...] }
   └─ Button { type: 'button', props: {...} }

2. SHADOW TREE (persistent across renders)
   ├─ appShadow { state: [0, 'light'], effects: [...], children: [...] }
   └─ buttonShadow { parent: appShadow, ... }

3. DOM TREE (what users see)
   ├─ <div>...</div>
   └─ <button>...</button>
```

**Element tree:** You rebuild this every render by calling component functions. It's cheap to discard — it's just objects.

**Shadow tree:** This persists. It holds:
- `state` — array of `useState` values
- `effects` — array of `useEffect` slots (deps, cleanup, etc.)
- `context` — array of context values published by providers
- `children` — shadow nodes mirroring your element's children
- `parent` — the enclosing *component's* shadow (for context walking)
- `dom` / `parentDom` — DOM anchors (which real DOM node this shadow produced)

**DOM tree:** Real browser DOM. Updated minimally — we only touch what changed.

### How They Relate

1. **Component function runs** with the shadow as context (`useState` / `useEffect` read from it).
2. Component returns an element. That element might contain nested components.
3. **Nested components resolve recursively** — each gets a shadow node that mirrors its position in the element tree.
4. Once all components are resolved, you have a pure *host-element tree* (no function types left, only strings like `'div'`).
5. That tree is **diffed against the previous host-element tree**, producing minimal DOM mutations.
6. After DOM is updated, **shadows → DOM anchors are re-linked** so the next `setState` knows where to patch.

## State by Position, not Name

A shadow persists at a *position* in the tree, not by a name. So:

```js
function App() {
    const [count, setCount] = useState(0);
    const [theme, setTheme] = useState('light');
    return ...;
}
```

- **First `useState` call** lands in slot 0 of `appShadow.state`.
- **Second `useState` call** lands in slot 1.

If you call `useState` in a different order (e.g., conditionally inside an `if`), slot 0 might contain the *wrong* value. This is the "rules of hooks" — call order matters.

Shadows don't care *what* the state is or *why* — they just hold the array. Matching previous-to-current is by position. So:

- Keyed lists can reorder and keep state (we match child shadows by key, not position).
- Conditional children keep state when hidden (we preserve old shadows in null slots).

## The Identity Story

How does last.act know "this is the same component as last render"?

1. **Component functions** are compared by reference: `prevElement.type === currentElement.type`.
2. If they match, and **props are equal**, we skip re-executing (bailout).
3. If props changed (or they're from a list with a `key`), we **reuse the same shadow** — so state carries forward.

If the component function itself is *different* (e.g., a dynamic component), we treat it as a brand-new component with fresh state.

## Reading the Code

Once you understand these three trees:

- **[element.js](../src/element.js)** — builds element objects (the descriptions).
- **[shadow.js](../src/shadow.js)** — the shadow structure itself.
- **[exec.js](../src/exec.js)** — resolves elements → shadows.
- **[dom.js](../src/dom.js)** — creates real DOM from resolved elements.
- **[diff.js](../src/diff.js)** — patches DOM to match new tree.
- **[link.js](../src/link.js)** — re-anchors shadows to DOM nodes.

Everything else is supporting machinery: hooks (read/write shadows), scheduler (batch updates), context (walk shadow.parent), etc.

## Why This Design?

**Immutable elements + persistent shadows** is the sweet spot:

- **Immutable elements** are simple to reason about and cheap to allocate.
- **Persistent shadows** hold the "real" mutable state (values, effects, context).
- **Separation of concerns:** elements describe what to render, shadows hold how-to-persist-across-renders.

React does the same thing (calling shadows "fibers"). The names are different, but the idea is identical.

---

Next: read [PIPELINE.md](./PIPELINE.md) to see how these three trees flow through a render cycle.
