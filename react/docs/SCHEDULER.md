# Scheduler & Subtree Updates

## The Problem

Without a scheduler, every `setState` re-renders the whole app from root. That's slow and wasteful.

With a scheduler: multiple `setState` calls in one event handler coalesce into one re-render, and only the affected subtree re-runs.

## How It Works

[scheduler.js](../src/scheduler.js):

```js
const dirty = new Set();
let scheduled = false;

export function scheduleUpdate(shadow) {
    dirty.add(shadow);
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(flush);
}
```

When `setState` fires:
1. Add the shadow to the `dirty` Set
2. If already scheduled, return (don't queue another microtask)
3. If not scheduled, queue the flush

So 10 `setState` calls in one tick produce 1 flush call.

## Ancestor Dedup

Before flushing, we remove any dirty shadow whose *ancestor* is also dirty:

```js
function topAncestors(set) {
    const out = [];
    for (const s of set) {
        let isDuplicate = false;
        for (let p = s.parent; p; p = p.parent) {
            if (set.has(p)) {
                isDuplicate = true;
                break;
            }
        }
        if (!isDuplicate) out.push(s);
    }
    return out;
}
```

**Why?** If both a parent and a child are dirty, the parent's re-render will sweep the child up as part of its subtree walk. Re-rendering the child *again* would be redundant.

Example:

```js
function Parent() {
    const [x, setX] = useState(0);
    return createElement(Child);
}

function Child() {
    const [y, setY] = useState(0);
    return createElement('p', null, y);
}

// In an event handler:
setX(1);
setY(1);
```

- `dirty = {parentShadow, childShadow}`
- `topAncestors()` walks `childShadow.parent` → `parentShadow` → found in set → skip child
- `topAncestors()` returns `[parentShadow]` only
- Flush calls `root.update(parentShadow)`
- Parent re-runs, re-executes Child as part of its subtree walk
- Child re-renders (with new state) as a side effect

Result: **two `setState` calls, one re-render of each component, in order**.

## Subtree Re-render

When `flush` calls `root.update(shadow)`:

```js
update(shadow) {
    const [resolved] = renderComponent(
        shadow.element,   // the component element this shadow was created from
        shadow,           // reuse the SAME shadow (mutated in place with new values)
        shadow.parent,
        this
    );
    const newDom = reconcile(shadow.rendered, resolved, shadow.dom, shadow.parentDom);
    linkShadowDom(shadow, resolved, newDom);
}
```

Key insight: **we reuse the same shadow**, passed as the third argument to `renderComponent`. In exec:

```js
export function renderComponent(componentElement, existingShadow, parentShadow, root) {
    const shadow = existingShadow ?? makeShadow(...);
    // ... reuse the same shadow.state, shadow.effects, shadow.context arrays
}
```

Since we reuse the shadow, the `state` array carries over. `useState` reads the same slot it wrote before. Everything just works.

## When Does A Parent Re-render?

Parent only re-renders if:
1. Its own `setState` was called (it's in the dirty Set), OR
2. You call `root.render(element)` with a new element, OR
3. Its parent re-renders and re-executes it as part of a subtree walk

This is why **props don't cause re-renders** — if a parent's props change, the parent doesn't automatically re-render. The parent's component function runs when the parent re-renders. If you want a child to re-render when its props change, pass the props to the child, and the child's `exec` will call its component function.

But if the child's own props are *identical*, and it doesn't call `setState`, it won't re-render. React has `React.memo` as an opt-in bailout. last.act doesn't — we always re-execute the component function, but early returns and memoization are up to you:

```js
const Leaf = ({ x }) => {
    if (prevX === x) return prevElement;  // bailout manually
    prevX = x;
    prevElement = createElement('p', null, x);
    return prevElement;
};
```

(This is not idiomatic, but it's possible.)

## Effect Scheduling

After all component re-renders complete, we take the queued effects and run them:

```js
setTimeout(() => runEffects(effects), 0);
```

Effects are deferred via `setTimeout` so they observe the committed DOM. If an effect calls `setState`, that schedules another flush (a new microtask + effects cycle).

---

## Example Walk-Through

```js
function Counter() {
    const [n, setN] = useState(0);
    return createElement('button', 
        { onClick: () => { setN(1); setN(2); } },
        `n=${n}`
    );
}
```

**User clicks:**
1. First `setN(1)` → `scheduleUpdate(counterShadow)` → dirty = {counterShadow}, queueMicrotask
2. Second `setN(2)` → `scheduleUpdate(counterShadow)` → dirty already has it, return early
3. Microtask fires → flush()
4. `topAncestors({counterShadow})` → `[counterShadow]`
5. `root.update(counterShadow)`
   - Reuse counterShadow (state = [2], from the second setState)
   - renderComponent → Counter() runs → useState reads state[0] = 2
   - Element returned: button with n=2
   - reconcile: text "n=0" → "n=2"
6. Effects run (none in this example)

Result: **button text updates to "n=2"**, and only the Counter component ran. Very efficient.

Compare to "re-render from root": if we re-rendered the whole app, we'd call every component function even if they didn't have dirty state. That scales poorly.

---

Next: [EXTENDING.md](./EXTENDING.md) to add new features (refs, error boundaries, etc.)
