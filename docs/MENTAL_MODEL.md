# Mental Model: How It All Fits Together

This is the "think like last.act" guide. Read after [ARCHITECTURE.md](./ARCHITECTURE.md).

## The Three Trees (Visual)

```
Your code:                    Shadow tree:              DOM tree:
─────────────────────────────────────────────────────────────────

App()  ────────────────────→  appShadow                <div>
 │                            state: [0]                 <button>
 ├─ <button>                   effects: []
 │                             children:               (mutable)
 ├─ <p>{count}</p             ├─ buttonShadow
 │                             └─ pShadow
 └─ <Counter>
     Counter()  ──────────→  counterShadow
      │                      state: [1]
      ├─ <div>              effects: [...]
      └─ <button>            children:
                             ├─ divShadow
                             └─ buttonShadow

(rebuilt every render)       (survives every render)   (minimal updates)
```

## The Render Cycle

### Mount

```
1. createElement(App)           → { type: App, props: {}, children: [] }
2. root.render(element)
3. renderComponent(App, null, null, root)
   ├─ Create appShadow
   ├─ currentShadow = appShadow
   ├─ Call App()
   │  ├─ useState(0)  → reads/writes appShadow.state[0]
   │  └─ returns element tree
   ├─ Recursively resolve children
   │  └─ Counter → renderComponent → counterShadow
   ├─ Exit currentShadow
   └─ shadow.rendered = resolved host-element tree
4. createDomNode(resolvedHostTree)  → real DOM
5. container.appendChild(dom)
6. linkShadowDom(shadow, tree, dom)
   └─ stamp shadow.dom, shadow.parentDom on each shadow
7. setTimeout(() => runEffects(...), 0)
```

### Update (setState)

```
1. setCount(5)
2. scheduleUpdate(appShadow)  → dirty.add(appShadow)
3. queueMicrotask(flush)
4. [2-3 repeated for other setStates — still queueing same microtask]
5. Microtask fires: flush()
   ├─ topAncestors(dirty)  → filter out shadows whose parent is also dirty
   └─ for each survivor, root.update(shadow)
6. root.update(appShadow)
   ├─ renderComponent(App, appShadow, null, root)  ← reuse the shadow
   │  └─ App() runs again → useState reads state[0]=5 now
   ├─ Recursively resolve children
   ├─ reconcile(oldVNode, newVNode, oldDom, parentDom)
   │  └─ Walk both trees, minimal DOM mutations
   ├─ linkShadowDom  ← re-anchor shadows to (possibly new) DOM nodes
   └─ queue effects
7. setTimeout(() => runEffects(...), 0)
```

## The "Aha" Moments

### Moment 1: Elements Are Cheap

```js
function App() {
    return createElement('div', null,
        createElement('button', { onClick: handleClick }, 'Click me'),
    );
}
```

**Every render**, this function is called, new elements are created, and old ones are thrown away. That's **fine** — elements are just data.

The expensive stuff (state, effects, DOM) lives in the shadow, which persists.

### Moment 2: Shadows Live by Position

```js
function Form() {
    const [name, setName] = useState('');    // slot 0
    const [email, setEmail] = useState('');  // slot 1
    const [age, setAge] = useState(0);       // slot 2
}
```

If you render:

```js
const [name, setName] = useState('');       // slot 0
if (showEmail) {
    const [email, setEmail] = useState(''); // ← WRONG: slot 1 if true, slot 1 if false
}
```

On the first render (showEmail=true), email is in slot 1. On the second (showEmail=false), name's second call might land in slot 1 accidentally.

This is the "rules of hooks" in action.

### Moment 3: Hooks Read From A Global

```js
export let currentShadow = null;

export function useState(init) {
    const shadow = currentShadow;  // ← read global context
    ...
}
```

This works because **while a component function runs, `currentShadow` points at that component's shadow**.

If you call a hook outside a component, `currentShadow` is null, and you get an error. That's intentional.

### Moment 4: setState Captures By Closure

```js
export function useState(init) {
    const shadow = currentShadow;
    const idx = stateIndex++;
    
    const setState = value => {
        shadow.state[idx] = value;  // ← captures shadow and idx
        scheduleUpdate(shadow);
    };
    
    return [shadow.state[idx], setState];
}
```

Even though `stateIndex` keeps incrementing, the returned `setState` always writes to *this specific* `shadow` at *this specific* `idx`.

So 10 re-renders later, `setState` still targets the right slot.

### Moment 5: Diff Doesn't Move DOM, Rewrites Content

When a keyed list reorders:

```
OLD: [Item(key='a'), Item(key='b'), Item(key='c')]
NEW: [Item(key='c'), Item(key='b'), Item(key='a')]
```

The *component shadows* are matched by key and reused (so state persists). But the *DOM nodes at those positions* are patched in place:

- DOM node at position 0 is rewritten with C's content (its key matched, shadow reused, so state is C's)
- DOM node at position 1 is rewritten with B's content
- DOM node at position 2 is rewritten with A's content

The DOM nodes don't physically move. They're patched to look like C, B, A.

This is a design choice — it's simpler than moving nodes around, and it works fine for most UIs.

### Moment 6: Context Walks the Component Chain

```js
function App() {
    return createElement(ThemeCtx.Provider, { value: 'dark' },
        createElement('div', null,  ← host element (doesn't affect context walk)
            createElement('div', null,  ← host element
                createElement(Leaf)  ← component
            )
        )
    );
}

function Leaf() {
    const theme = useContext(ThemeCtx);  // ← walks shadow.parent chain
}
```

- Leaf's shadow has `parent = App's shadow` (not the div shadows — they don't create a parent link)
- useContext walks: Leaf → App → null
- Finds `App.shadow.context[slot] = 'dark'` (set by Provider)

Host elements are *transparent* to the context chain. Only components create parent links.

## The Efficiency Win

```js
function List({ items }) {
    return createElement('ul', null,
        items.map(item => createElement(ListItem, { key: item.id, item }))
    );
}
```

If an item in the middle calls `setState`:

1. `scheduleUpdate(itemShadow)`
2. Flush: `topAncestors({itemShadow})` → no ancestor is dirty → return [itemShadow]
3. `root.update(itemShadow)`
   - Only this item's component re-executes
   - Only this item's portion of the DOM gets diffed/patched
   - App, List, and sibling items don't re-run

Compare: "re-render from root" would re-execute App → List → all items → even the unchanged ones. Wasteful.

With 100 items, updating one rerenders 1 component (+ scheduler overhead). Without a scheduler, 100 components.

## The Trade-Off

**What you gain:**
- Clean separation: elements describe what; shadows remember how.
- Efficient per-component updates.
- Hooks that are simple and composable.

**What you lose:**
- More moving parts. Three trees instead of one.
- The mental overhead of shadows, indices, etc.
- No built-in bailout for unchanged subtrees (you have to `React.memo` or implement it yourself).

It's a good trade for understanding React. For production, the overhead of the mental model is worth the efficiency and composability.

---

## How to Read The Code

Once you've grasped the three trees, read the code in this order:

1. **[element.js](../src/element.js)** — Build the element tree (the easy part)
2. **[shadow.js](../src/shadow.js)** — Understand the shadow structure
3. **[exec.js](../src/exec.js)** — Resolve elements → shadows → host tree
4. **[dom.js](../src/dom.js)** — Create real DOM from resolved elements
5. **[diff.js](../src/diff.js)** — Patch DOM to match new tree
6. **[link.js](../src/link.js)** — Wire shadows to DOM nodes
7. **[hooks.js](../src/hooks.js)** — The global context that makes hooks work
8. **[state.js](../src/state.js)** — `useState` reading/writing the shadow
9. **[effect.js](../src/effect.js)** — `useEffect` scheduling and running
10. **[context.js](../src/context.js)** — `useContext` walking the parent chain
11. **[scheduler.js](../src/scheduler.js)** — Batching and dedup
12. **[root.js](../src/root.js)** — Orchestrating the whole pipeline

Each file is one screenful (~50 lines). By the time you finish, you'll have read the spine of React.

---

## One Analogy

Think of it like a stage production:

- **Elements** are the script — what characters say and do. Written fresh before each performance.
- **Shadows** are the actors — they remember their character's state (motivation, relationships) across scenes.
- **DOM** is the physical stage and props — updated only when the script calls for it.

The director (scheduler) decides which actors need to rehearse their lines before the next performance. If only one actor's character changed, only they rehearse. If the lead changed, everyone rehearses.

---

Next: Pick a guide ([ARCHITECTURE](./ARCHITECTURE.md), [HOOKS](./HOOKS.md), etc.) and start reading the code.
