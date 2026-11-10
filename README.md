# Last-Act

A minimal zero dependency jsx compatible web application framework based on the upcoming TC39 Signals standardisation,
in under 260 lines, 1.3KB gzipped.

# API

```
const vnode = html`<div id="app">${child}</div>`
const vnode = createElement(type, props, ...children)
const element = mount(vnode, parent?)
const hydrated = hydrate(vnode, existingElement)
const mounted = getMountedNode(vnode)
const html = serialize(vnode)
const stopFn = effect(fn)
onUnmount(vnodeOrElement, fn)
```

# Example
```js
function HelloWorld() {
  const name = signal('');

  return html`
    <div>
      <input ${{ oninput: (e) => name.set(e.target.value) }} />
      <${Greeting} ${{ name }} />
    </div>
  `
}

function Greeting({ name }) {
  return html`<h1>${name}</h1>`
}
```

See [patterns.md](patterns.md) for the common patterns.

# Mental Model

**Signals as attributes on a native element**
In `html`, `name=${signal}` puts the signal in the element's `attributes`. `setSignalAttribute` wraps it in an `effect` so any change is reflected immediately. `null`, `undefined`, `false`, or an empty array removes the attribute; `true` sets it to `""` (useful for `disabled`); an array is joined with spaces (useful for `class`). Static values follow the same rules. Attributes that need the strings `"true"`/`"false"` (such as `aria-*`) must be passed strings. The effect is torn down automatically when the element is removed from the DOM.

**Signals as properties on a native element**
In `html`, `${{ name: value }}` sets `element[name] = value`. Any prop that is not `key`, `attributes`, or `children` is treated this way. On a native element (HTML or SVG), a signal passed as a property is bound reactively, so `${{ value: text }}` keeps an `<input>`'s live value in sync. Properties are not serialized. Components never reach this binding: they receive their props, signals included, unchanged.

**Signals as props to a component**
The entire props object is forwarded as-is to the component function. The component receives the live signal and is responsible for deciding how to bind it (e.g. pass it as an `attributes` entry, or as a single-signal child).

**Signal as a single child**
When an element's only child is a signal, `setChildren` calls `setChildrenSignal`, which sets up a reactive binding. If the signal's value is a `Node`, the element's content is replaced with that node. If the value is an array, key-based reconciliation runs (see below).

**Signals inside a children array**
When `setChildren` receives an array that contains at least one signal, it routes the whole array into `setChildrenSignal`. Each signal is resolved with `.get()` directly inside the effect, making every sub-signal a tracked dependency. When any sub-signal changes, the effect re-runs, resolves the updated node, and the key-based reconciler swaps only that slot. Plain `Node` values in the array are passed through unchanged. Elements resolved from sub-signals must carry a `key` so the reconciler can locate and replace them by identity rather than position.

**Key-based reconciliation**
Set the `key` prop on elements that belong to a dynamic list: `html`<li ${{ key: item.id }}>...</li>``. The key is stored as `data-key`. When `setChildrenSignal` re-runs after a signal update, it (1) places each new element at its position, keeping the same DOM node when the same node is returned again and swapping in a new node with the same key in place, then (2) removes everything left over. If any child in the list has no key, the children are all replaced instead.

**Conditional rendering**
Use a `computed` that returns either an element or a different element, and place it in child position: `html`<div>${conditional}</div>``. The DOM is replaced each time the condition changes.

**Unmount and cleanup**
`onUnmount(element, fn)` registers `fn` to run when the element is permanently removed from the DOM. A `MutationObserver` watches the document and fires `fn` one microtask after removal — the delay lets a same-tick remove-then-reinsert (e.g. a list reorder) pass through without triggering cleanup. All reactive bindings created by the framework (signal attributes, signal properties and signal children) register their stop function via `onUnmount`, so subscriptions are cleaned up automatically.

**Effect scheduling**
`effect(fn)` runs `fn` once immediately inside a `Signal.Computed`, then re-runs it (via a microtask-queued `Watcher`) whenever any signal read inside `fn` changes. Multiple signal changes in the same microtask are batched into a single re-run.

**SSR hydration gap**
`hydrate(vnode, existingElement)` expects the client to rebuild the same vnode tree that was rendered on the server, then walks the existing DOM to attach reactive behavior. That keeps SSR and client output consistent, but it also means there is currently no `noHydrate`, `static`, or island-style boundary for server-only content.

This becomes a stack limitation when a page contains large static content that should be rendered on the server but does not need any client-side behavior. For example, a blog article page might parse markdown into a full vnode tree on the server:

```js
function BlogPostPage({ page }) {
  return html`
    <article>
      <h1>${page.title}</h1>
      ${renderMarkdown(page.body)}
    </article>
  `
}
```

With the current model, the browser still has to rebuild `BlogPostPage` and run `renderMarkdown(page.body)` again during hydration so that `hydrate(...)` can match the existing DOM. That is correct, but it is unnecessary client work for content that is effectively static.

Today the workaround is to keep the server and client render path deterministic and accept the extra hydration cost. A future stack improvement would be an explicit SSR-only boundary so apps can render static sections on the server without re-running them on the client.

**Fragment root gap**
`mount(...)` and `hydrate(...)` currently assume a single root node. Components that return sibling fragments or arrays can work in SSR output, but client-side mounting can stringify them or fail to reconcile them as a unit. For apps using `last-router`, that means page components should still wrap multiple top-level nodes in one element until fragment-root support lands in `last-act`.

---
