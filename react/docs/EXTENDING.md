# Extending last.act

Once you understand the architecture, adding new features is straightforward. This guide covers:

- [useRef](#useref)
- [useMemo / useCallback](#usememo--usecallback)
- [Error boundaries](#error-boundaries)
- [Custom hooks](#custom-hooks)
- [Fragments](#fragments)
- [Keys beyond lists](#keys-beyond-lists)

## useRef

A ref is mutable state that doesn't trigger re-renders.

### Implementation

Add to [src/ref.js](../src/ref.js):

```js
import * as ctx from './hooks.js';

export function useRef(initialValue) {
    const shadow = ctx.currentShadow;
    const idx = ctx.nextStateSlot();  // steal a state slot
    
    if (shadow.state[idx] === undefined) {
        shadow.state[idx] = { current: initialValue };
    }
    
    return shadow.state[idx];
}
```

(We reuse the state array even though useRef isn't state, since refs also need to persist.)

### Use Case

```js
function TextInput() {
    const inputRef = useRef(null);
    return createElement('div', null,
        createElement('input', { ref: inputRef }),  // ← set by DOM commit
        createElement('button', {
            onClick: () => inputRef.current.focus()  // ← read when needed
        }, 'Focus'),
    );
}
```

But wait — `ref` attributes don't automatically set `ref.current`. We need to wire that in [dom.js](../src/dom.js):

```js
export function setProperty(dom, key, value) {
    if (key === 'ref') {
        if (value) value.current = dom;  // set the ref
    } else if (key.startsWith('on')) {
        dom.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'className') {
        dom.setAttribute('class', value);
    } else {
        dom.setAttribute(key, value);
    }
}
```

And update [element.js](../src/element.js) to NOT lift `ref` (we want it in props):

Actually no — [element.js](../src/element.js) already lifts `ref` onto `element.ref`. So during DOM creation, we'd need to check `element.ref` not `props.ref`. In `createDomNode`:

```js
export function createDomNode(element) {
    if (element.type === 'TEXT_ELEMENT') return document.createTextNode(...);
    
    const dom = document.createElement(element.type);
    for (const [key, value] of Object.entries(element.props)) {
        if (key === 'children') continue;
        setProperty(dom, key, value);
    }
    
    if (element.ref) element.ref.current = dom;  // ← add this
    
    for (const child of element.props.children) {
        if (child == null) continue;
        dom.appendChild(createDomNode(child));
    }
    return dom;
}
```

Refs are now implemented.

## useMemo / useCallback

Memoization — run a function only if deps changed.

### useMemo

```js
import * as ctx from './hooks.js';

export function useMemo(fn, deps) {
    const shadow = ctx.currentShadow;
    const idx = ctx.nextStateSlot();
    
    if (shadow.state[idx] === undefined || !depsEqual(deps, shadow.state[idx].deps)) {
        shadow.state[idx] = {
            value: fn(),
            deps: deps ? [...deps] : undefined,
        };
    }
    
    return shadow.state[idx].value;
}

function depsEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}
```

Use:

```js
function Expensive({ data }) {
    const result = useMemo(() => slowCalculation(data), [data]);
    return createElement('p', null, result);
}
```

### useCallback

Just memoized function. Return the function itself, not its result:

```js
export function useCallback(fn, deps) {
    const memoized = useMemo(() => fn, deps);
    return memoized;
}
```

Both are tiny — they just reuse the state slot infrastructure with a manual deps check.

## Error Boundaries

Catch errors during render and display a fallback UI instead of crashing the whole app.

This requires catching exceptions in [exec.js](../src/exec.js):

```js
export function renderComponent(componentElement, existingShadow, parentShadow, root) {
    const shadow = existingShadow ?? makeShadow(...);
    // ...
    
    const restore = enterComponent(shadow);
    let rendered;
    try {
        rendered = componentElement.type(componentElement.props ?? {});
        while (rendered && typeof rendered.type === 'function') {
            rendered = rendered.type(rendered.props ?? {});
        }
    } catch (err) {
        leaveComponent(restore);
        
        // Check if an ancestor is an ErrorBoundary
        if (tryErrorBoundary(shadow, err, root)) return;
        
        // No boundary caught it, re-throw
        throw err;
    }
    
    resolveChildren(rendered, shadow, shadow, root);
    leaveComponent(restore);
    shadow.rendered = rendered;
    return [rendered, shadow];
}

function tryErrorBoundary(shadow, err, root) {
    while (shadow) {
        if (shadow.errorBoundary) {
            // Found a boundary. Call it with the error.
            const fallback = shadow.errorBoundary(err);
            shadow.rendered = fallback;
            root.update(shadow);
            return true;
        }
        shadow = shadow.parent;
    }
    return false;
}
```

Then a component can mark itself as a boundary:

```js
function ErrorBoundary({ children, onError }) {
    const shadow = useInternalShadow();  // we'd need to export this
    shadow.errorBoundary = onError;
    return children;
}

// Use:
createElement(ErrorBoundary, { onError: err => createElement('p', null, 'Error!') },
    createElement(Risky)
)
```

This is more involved because it requires introspection (accessing the shadow inside a hook). last.act doesn't export that currently, but it's possible.

## Custom Hooks

Custom hooks are just functions that call other hooks:

```js
export function useLocalStorage(key, initialValue) {
    const [value, setValue] = useState(() => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch {
            return initialValue;
        }
    });
    
    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(value));
    }, [value]);
    
    return [value, setValue];
}
```

Use:

```js
function App() {
    const [theme, setTheme] = useLocalStorage('theme', 'light');
    return createElement('div', null, theme);
}
```

No special wiring needed — custom hooks just call the built-in ones, which read `currentShadow`.

## Fragments

A Fragment is a grouping that doesn't produce a DOM node.

In JSX, you'd write:

```jsx
<>
  <div>A</div>
  <div>B</div>
</>
```

In createElement terms:

```js
createElement(Fragment, null,
    createElement('div', null, 'A'),
    createElement('div', null, 'B'),
)
```

Fragment is just a component that returns its children:

```js
export function Fragment({ children }) {
    return children;  // ← return the children array directly
}
```

But wait — `children` is an array, not an element. The diff and exec don't handle that. You'd need to flatten it during exec in [exec.js](../src/exec.js):

Actually, [element.js](../src/element.js) already flattens children with `.flat(Infinity)`, so an array in children *is* flattened. The issue is that `Fragment` returns an array, not an element.

A hack: make Fragment return a special marker element:

```js
export const Fragment = Symbol('Fragment');

// In exec, handle Fragment specially:
if (rendered?.type === Fragment) {
    resolved.type = 'fragment';  // marker for diff to handle
}

// In diff, a fragment just splices its children into the parent
```

This is getting messy. The cleaner approach: Fragment renders each child individually, not as an array. But that requires passing children as separate arguments to exec, which is a bigger refactor.

**For now:** Fragments aren't in last.act. If you need them, the workaround is to wrap in a `<div>` or `<span>` (which has zero semantic cost in most cases).

## Keys Beyond Lists

Keys aren't just for arrays. Any time you want to preserve a component's identity across a change, use a key:

```js
function Container() {
    const [show, setShow] = useState(true);
    return createElement('div', null,
        // Without a key: Tab1's state is lost when show=false
        show && createElement(Tab1, { key: 'tab1' }),
        // With a key: Tab1's state is preserved, re-attached when show=true
    );
}
```

Keys work the same way everywhere — they're matched in `findPrevChildShadow`, reusing the previous shadow even if the position changed.

---

## General Pattern for New Hooks

1. Capture `currentShadow` from context
2. Claim a slot with `nextStateSlot()` / `nextEffectSlot()`
3. Store your data in `shadow.state[idx]` or `shadow.effects[idx]`
4. Return the data or a function that mutates it

All hooks follow this pattern. There's no registration, no plugin system — just read/write the shadow.

---

## Adding to the Library

To add a new hook or feature to last.act:

1. **Create a new file** (e.g., `src/ref.js`) with your implementation
2. **Import in [src/index.js](../src/index.js)** and re-export
3. **Add tests** in `src/tests/` covering the happy path and edge cases
4. **Update docs** (this file or a new guide)

That's it. The library is intentionally minimal — no configuration, no build steps, no plugin infrastructure.

---

## What's Hard to Add

Some features are tricky because they require architectural changes:

- **Concurrent rendering** — would need to split execution into interruptible chunks
- **Suspense** — requires lazy-loading infrastructure and a different render scheduling model
- **Portals** — requires DOM nodes to live in different trees but share a shadow hierarchy
- **Lazy components** — code-splitting support

last.act intentionally doesn't support these. If you need them, use React. last.act is for understanding the core, not for production apps with advanced requirements.

But **refs**, **custom hooks**, **memoization**, and **error boundaries** are all straightforward.
