# Hooks: useState, useEffect, useContext

All hooks share one trick: **they read from a module-level context variable** that points to the current component's shadow.

## The Global Context

In [hooks.js](../src/hooks.js):

```js
export let currentShadow = null;
export let stateIndex = 0;
export let effectIndex = 0;
export let pendingEffects = [];
```

These are module-level `let` bindings. While a component function runs, `currentShadow` points at that component's shadow. Each hook call increments `stateIndex` / `effectIndex` to claim the next slot.

When the component function returns, `leaveComponent` restores the previous `currentShadow`.

## useState

```js
export function useState(initialValue) {
    const shadow = currentShadow;
    const idx = nextStateSlot();  // stateIndex++

    if (shadow.state[idx] === undefined)
        shadow.state[idx] = 
            typeof initialValue === 'function' ? initialValue() : initialValue;

    const setState = value => {
        shadow.state[idx] = 
            typeof value === 'function' ? value(shadow.state[idx]) : value;
        scheduleUpdate(shadow);
    };

    return [shadow.state[idx], setState];
}
```

**On first call at slot 0:**
- `shadow.state[0]` is undefined
- Initialize it with `initialValue` (or call the function if lazy init)

**On subsequent renders:**
- `shadow.state[0]` already has a value
- Return it unchanged

**setState:**
- Can be direct assignment: `setState(5)`
- Or functional form: `setState(prev => prev + 1)` (useful for closures)
- Writes the slot, calls `scheduleUpdate(shadow)` to re-render this subtree

**The closure capture:**
The returned `setState` captures `shadow` and `idx` *by value at hook-call time*. So even though the global `stateIndex` marches on to other components, this particular `setState` always targets the same slot in the same shadow.

## useEffect

```js
export function useEffect(fn, deps) {
    const idx = nextEffectSlot();  // effectIndex++
    if (!currentShadow.effects[idx])
        currentShadow.effects[idx] = { hasRun: false, deps: undefined, cleanup: null };

    queueEffect({ slot: currentShadow.effects[idx], fn, deps });
}
```

Effect **does not run during render**. It just **queues a record** with the function, deps, and a reference to the effect slot.

After the DOM is committed, [scheduler.js](../src/scheduler.js) or [root.js](../src/root.js) calls `runEffects()`:

```js
function runEffects(effects) {
    for (const { slot, fn, deps } of effects) {
        // Run if: first time ever, OR no deps (run every render),
        // OR deps array changed
        if (!slot.hasRun || !depsEqual(deps, slot.deps)) {
            if (slot.cleanup) slot.cleanup();  // cleanup from *last* run first
            slot.cleanup = fn() ?? null;       // capture return value as next cleanup
            slot.deps = deps ? [...deps] : undefined;
            slot.hasRun = true;
        }
    }
}
```

**Deps comparison:**
- `depsEqual([a], [a])` → true, skip re-run
- `depsEqual([a], [b])` → false, re-run
- No deps array or different lengths → different, re-run

**Cleanup timing:**
- If deps change, cleanup from the previous run fires first
- Then the new effect runs
- The returned function (if any) becomes the cleanup for next time

**Why setTimeout?**
Effects run via `setTimeout(..., 0)`, deferring to the next macrotask. This ensures the DOM is fully committed before effects see it. If effects called `setState`, that would schedule another re-render for the next microtask — and then effects would run again. The `setTimeout` queues them after those re-renders.

## useContext

```js
export function useContext(context) {
    let shadow = currentShadow;
    while (shadow !== null) {
        if (shadow.context[context.slot] !== undefined)
            return shadow.context[context.slot];
        shadow = shadow.parent;
    }
    if (context.defaultValue !== undefined)
        return context.defaultValue;
    throw new Error('useContext: no matching Provider found');
}
```

Walking up `shadow.parent` means you're walking the *component* chain, skipping host elements. So:

```js
const Ctx = createContext();

function App() {
    return createElement(Ctx.Provider, { value: 'x' }, 
        createElement('div', null,
            createElement('div', null,
                createElement(Leaf)
            )
        )
    );
}

function Leaf() {
    return createElement('p', null, useContext(Ctx));
}
```

- App's shadow has parent=null
- Provider's shadow has parent=App's shadow (they both execute in App's component context)
- Div#1 shadow has parent=App's shadow (host elements don't change the parent link)
- Div#2 shadow has parent=App's shadow
- Leaf's shadow has parent=App's shadow
- useContext walks: Leaf → App → null, finds the value at App's context[slot]

**Note:** The Provider itself doesn't have special wiring. It's just a component that:
1. Stamps a value into `currentShadow.context[slot]`
2. Returns a host element wrapping its children

Since all components in the subtree share the same component-parent shadow (the Provider's enclosing component, which is usually App), they all reach back to App when walking `parent`.

## Provider Implementation

```js
export function createContext() {
    const slot = nextIndex++;
    return {
        slot,
        Provider: ({ value, children }) => {
            currentShadow.context[slot] = value;
            return createElement('div', null, ...children);
        },
    };
}
```

When Provider runs (executes as a component function):
1. **currentShadow = Provider's shadow**
2. **Provider stamps its value into that shadow's context array**
3. **Returns a host element wrapping the children**

But wait — Provider's parent shadow is the enclosing component (e.g., App). So consumers in the Provider's subtree walk `parent` and find App's shadow... which has the Provider's value stamped into it!

Actually no — let me re-read. During exec, the Provider **function** runs with `currentShadow = providerShadow`. It stamps `currentShadow.context[slot] = value` into **providerShadow**. Then it returns a `<div>` with children.

Exec walks those children. For each component child, it calls `renderComponent(..., ..., **parentShadow = providerShadow**, ...)`. So consumers have `parent = providerShadow`. When they useContext and walk up, they find `providerShadow.context[slot]`. ✓

So the Provider is both an execution boundary (its own shadow) AND a context provider (stamps into its shadow, which is the parent link for descendants).

---

## Hook Rules

The three golden rules:

1. **Only call hooks at the top level** — not inside `if`/loops. Call order = slot identity.
2. **Only call hooks inside components** — `currentShadow` must be non-null.
3. **Hooks must run in the same order every render** — or slot 0 might contain slot 1's data.

These aren't enforced in last.act (React doesn't enforce them at runtime either — they're linting rules), but violating them will confuse your state.

---

Next: [SCHEDULER.md](./SCHEDULER.md) to understand how multiple `setState` calls are batched and how subtree updates work.
