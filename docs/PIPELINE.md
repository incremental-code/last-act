# The Render Pipeline

What happens when you call `root.render(element)` or `setState(newValue)`?

## First render: `root.render(element)`

```
1. root.mount(element)
   ├─ renderComponent(App, null, null, root)
   │  ├─ Create appShadow
   │  ├─ Enter hook context: currentShadow = appShadow
   │  ├─ Call App({ props })
   │  │  ├─ useState(0) → reads/writes appShadow.state[0]
   │  │  ├─ useEffect(...) → queues into pendingEffects
   │  │  └─ Returns element tree
   │  ├─ Resolve children recursively
   │  │  └─ For each component child, renderComponent again
   │  └─ Exit hook context
   │
   ├─ createDomNode(resolvedHostElement)
   │  ├─ Walk the tree
   │  ├─ Create <div>, <button>, etc.
   │  └─ Attach event listeners
   │
   ├─ container.appendChild(dom)
   │
   ├─ linkShadowDom(appShadow, resolvedElement, domNode)
   │  └─ Stamp shadow.dom, shadow.parentDom on each shadow
   │
   └─ setTimeout(..., 0) to run pending effects

2. Effects run (in setTimeout)
   └─ For each effect, compare deps
      ├─ If deps changed or never ran: call cleanup, then run effect
      └─ Store the cleanup fn for next time
```

**Result:** Component tree mounted, DOM in the browser, shadows wired to DOM nodes, effects scheduled.

## Update: `setState(newValue)` somewhere in the tree

```
1. setState writes the slot and calls scheduleUpdate(shadow)
   └─ scheduler.js adds the shadow to dirty Set
      └─ queueMicrotask to flush

2. Microtask fires: flush()
   ├─ topAncestors(dirty) — if a parent is also dirty, skip the child
   │  (parent's subtree re-render will sweep it up)
   │
   └─ For each top-level dirty shadow, call onFlush(shadow)

3. onFlush = root.update(shadow)
   ├─ renderComponent(shadow.element, shadow, shadow.parent, root)
   │  ├─ Reuse the same shadow (it's passed as existingShadow)
   │  ├─ Call shadow.element.type(props) to re-run the component
   │  ├─ Resolve children (same as mount, but reusing previous shadows)
   │  └─ Returns [newResolvedElement, shadow] (same shadow, new resolved output)
   │
   ├─ reconcile(prevResolvedElement, newResolvedElement, shadow.dom, shadow.parentDom)
   │  ├─ Walk both trees
   │  ├─ Create/replace/patch/remove DOM nodes as needed
   │  └─ Return the (possibly new) DOM node
   │
   ├─ linkShadowDom(shadow, newResolvedElement, newDomNode)
   │  └─ Re-anchor all shadows to their (possibly shifted) DOM nodes
   │
   └─ setTimeout(..., 0) to run pending effects

4. Effects from this render run
   └─ Same as mount path — compare deps, cleanup, run
```

**Key insight:** Only the *dirty subtree* re-runs and re-diffs. Parent components that don't call `setState` are untouched. This is why per-component updates are fast.

## The Hook Call Context

During `renderComponent`, we set:

```js
const restore = enterComponent(shadow);
// Inside App(): useState/useEffect/useContext can see currentShadow
const rendered = App();
leaveComponent(restore);
```

This is how `useState` knows *which* state slot to access — it reads `currentShadow` from the global context in [hooks.js](../src/hooks.js).

**This is the "rules of hooks" in action:** Hooks must run in the same order every render, because call order = slot position. If you conditionally call `useState`, you'll read/write the wrong slot.

## Reconciliation (Diff) Details

When you render, you get a *new* element tree and a *new* resolved host tree. The diff compares:

```
OLD: <div id="a" className="x">
       <span>hi</span>
       <button onClick={old}>
       {null}  ← empty slot
     </div>

NEW: <div id="a" className="y">
       <span>bye</span>
       <button onClick={new}>
       <p>inserted</p>  ← was null
     </div>
```

Diff walks both trees:

1. **Same position, same tag** → patch in place (update id, className, listener, text, etc.)
2. **Same position, different tag** → replace
3. **One side null** → insert or remove
4. **Empty slot (null/false)** → don't shift your DOM index, sibling positions stay stable

This is how conditional rendering keeps siblings at stable positions — the DOM child at index 1 is always "the element at logical position 1", even if position 0 is hidden.

## Keyed Lists

When you render:

```js
list.map(item => createElement(ListItem, { key: item.id, ... }))
```

The diff sees the `key` prop. During reconciliation:

- **Old tree had key="a" at position 0, new tree has key="b" at position 0** → they're different components, patch to B's output.
- **But the shadows are matched by key** — `findPrevChildShadow` walks the old shadow array looking for `_key === "b"`, finds it, reuses that shadow.

So the *component state* follows the key (B keeps its state), but the *DOM node at position 0* gets reused and patched to render B.

---

## Full Cycle Example

```js
// First render
root.render(createElement(Counter));
// → App mounts, shadow created, state[0] = 0, DOM: <button>Increment to 1</button>

// User clicks button
onClick={() => setCount(count + 1)}  // count was 0 (closure)
// → setState(1)
// → dirty Set = {counterShadow}
// → microtask flushes: root.update(counterShadow)
// → renderComponent(Counter, counterShadow, ...) — same shadow reused
// → state[0] = 1 (written above)
// → useState(1) reads it, component renders with count=1
// → reconcile: button textContent changes from "0→1" to "1→2"
// → linkShadowDom re-anchors (button DOM node didn't move, just patched)
// → Effects run if deps changed
```

---

Next: [HOOKS.md](./HOOKS.md) to understand how `useState`, `useEffect`, `useContext` read/write the shadow.
