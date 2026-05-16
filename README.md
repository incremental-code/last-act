# Last-Act

A minimal zero dependency jsx compatible web application framework based on the upcoming TC39 Signals standardisation,
in under 260 lines, 1.3KB gzipped.

# API

```
const vnode = createElement(type, props, ...children)
const element = mount(vnode, parent?)
const hydrated = hydrate(vnode, existingElement)
const mounted = getMountedNode(vnode)
const html = serialize(vnode)
const stopFn = effect(fn)
onUnmount(vnodeOrElement, fn)
```

# Example
```
function HelloWorld() {

  const name = new Signal.State('');

  return createElement('div', null, ...[
    createElement('input', { oninput: (e) => name.set(e.target.value) }),
    createElement(Greeting, { name })
  ])
}

function Greeting({ name }) {
  return createElement('h1', null, name)
}
```

# Mental Model

**Signals as attributes on a native element**
Pass a signal inside the `attributes` prop. `setSignalAttribute` wraps it in an `effect` so any change is reflected immediately. `null`, `undefined`, `false`, or an empty array removes the attribute; a boolean `true` sets it to `""` (useful for `disabled`); an array is joined with spaces (useful for `class`). The effect is torn down automatically when the element is removed from the DOM.

**Signals as non-attribute props on a native element**
Any prop that is not `key`, `attributes`, or `children` is assigned directly to the DOM property via `element[key] = value`. Signals passed this way are **not** reactive — the signal object itself is set as the property. Use this only when the native element or a lower-level binding will consume the signal.

**Signals as props to a component**
The entire props object is forwarded as-is to the component function. The component receives the live signal and is responsible for deciding how to bind it (e.g. pass it as an `attributes` entry, or as a single-signal child).

**Signal as a single child (`setChildren` called directly)**
When `setChildren` receives a signal directly (not wrapped in an array) it calls `setChildrenSignal`, which sets up a reactive binding. If the signal's value is a `Node`, the element's content is replaced with that node. If the value is an array, key-based reconciliation runs (see below).

**Signals inside a children array**
When `setChildren` receives an array that contains at least one signal, it routes the whole array into `setChildrenSignal`. Each signal is resolved with `.get()` directly inside the effect, making every sub-signal a tracked dependency. When any sub-signal changes, the effect re-runs, resolves the updated node, and the key-based reconciler swaps only that slot. Plain `Node` values in the array are passed through unchanged. Elements resolved from sub-signals must carry a `key` so the reconciler can locate and replace them by identity rather than position.

**Key-based reconciliation**
Set the `key` prop on elements that belong to a dynamic list: `createElement('li', { key: item.id }, ...)`. The key is stored as `data-key`. When `setChildrenSignal` re-runs after a signal update, it (1) removes elements whose keys are no longer present, then (2) inserts or moves remaining elements into the correct order. Elements without a key are not tracked and will be re-created.

**Conditional rendering**
Use a `Signal.Computed` that returns either an element or a different element. Pass that computed signal as a direct child via `setChildren(container, conditionalSignal)`. The DOM is replaced each time the condition changes.

**Unmount and cleanup**
`onUnmount(element, fn)` registers `fn` to run when the element is permanently removed from the DOM. A `MutationObserver` watches the document and fires `fn` one microtask after removal — the delay lets a same-tick remove-then-reinsert (e.g. a list reorder) pass through without triggering cleanup. All reactive bindings created by the framework (`setSignalAttribute`, `setChildrenSignal`) register their stop function via `onUnmount`, so subscriptions are cleaned up automatically.

**Effect scheduling**
`effect(fn)` runs `fn` once immediately inside a `Signal.Computed`, then re-runs it (via a microtask-queued `Watcher`) whenever any signal read inside `fn` changes. Multiple signal changes in the same microtask are batched into a single re-run.

---
