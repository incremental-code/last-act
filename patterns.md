# Framework Patterns

This document outlines the common patterns for using the `last-act` framework to build web applications.

All examples use the `html` tagged template and the `signal` / `computed` helpers:

```js
import { html, signal, computed } from '@incremental-code/last-act'
```

## Data Binding

### Attributes vs Properties
On a native element, `html` sends each value to one of two places:

- **Attributes**: `name="value"` and `name=${value}` call `element.setAttribute(name, ...)`. Attributes are written into server-rendered HTML.
- **Properties**: `${{ name: value }}` (or `props=${{ ... }}`) assigns `element[name] = value`. Properties are never serialized. Use them for event handlers and for live DOM state that has no attribute, such as `value` or `checked`.

`key` is the exception: `${{ key: id }}` is not a property. It is stored as `data-key` (see Dynamic Lists).

### Signals as Attributes
Pass a signal as an attribute value. The framework creates an `effect` that keeps the DOM attribute in sync with the signal's value. Static values follow the same rules:

- **Removal**: `null`, `undefined`, `false`, or an empty array `[]` removes the attribute, so `disabled=${false}` re-enables a button.
- **Boolean Attributes**: `true` sets the attribute to an empty string `""` (e.g. `disabled`, `hidden`). A valueless attribute such as `<input disabled>` is the same as `true`.
- **Class Lists**: an array of strings is joined with spaces, which suits `class` and `rel`.
- **"true"/"false" attributes**: `aria-*`, `draggable` and `contenteditable` need the literal strings, so pass a string: `aria-expanded=${computed(() => String(open.get()))}`.

```js
const busy = signal(false)
const classes = computed(() => ['btn', busy.get() && 'btn--busy'].filter(Boolean))

html`<button class=${classes} disabled=${busy}>Save</button>`
```

### Signals as Properties on a Native Element
When a property value is a signal on a native element (HTML or SVG), the property is bound reactively: `element[name]` is set to the signal's current value and updated whenever it changes. The binding is removed when the element unmounts.

Use this for DOM state that an attribute can't control after the element is created. The `value` attribute only sets an input's *default*: once the user types, changing the attribute no longer changes what is shown. The `value` *property* always does.

```js
const text = signal('')

html`
  <input ${{ value: text, oninput: e => text.set(e.target.value) }} />
  <button ${{ onclick: () => text.set('') }}>Clear</button>
`
```

The same applies to `checked`, `selected`, `indeterminate` and `scrollTop`.

Notes:
- Only native tags reach this binding. Components never do (see Component Props), so they always receive the signal itself.
- Custom elements are native elements too, so a custom element receives the signal's *value* through its property, not the signal object.
- SVG elements get the same attribute, property and keyed-list bindings as HTML elements. Most SVG geometry properties (`r`, `cx`, `width`) are read-only objects, so set those as attributes: `<circle r=${radius} />`.
- Properties are not part of server-rendered HTML. After hydration they are set on the client. If the initial state must be in the HTML (for example an input's starting text), pass it as an attribute as well.

## Component Patterns

### Component Props
A component receives the props object as-is, so signals arrive unchanged and the component decides how to bind them. With `html`, pass component props with `${{ ... }}`. A plain `name=${value}` on a component lands in its `attributes` prop instead.

```js
function Greeting({ name }) {
  // name is a Signal; in child position it is bound as reactive text
  return html`<h1>Hello ${name}</h1>`
}

const name = signal('world')
html`<${Greeting} ${{ name }} />`
```

### Dynamic Lists (Key-based Reconciliation)
When rendering dynamic lists, provide a `key` on elements that belong to the list. The framework stores it as `data-key` and uses it for key-based reconciliation.

- **Requirement**: Elements without a key are not tracked and will be re-created.
- **Reconciliation**: When the signal providing the list changes, the framework removes elements whose keys are gone and moves or inserts the rest into the correct order.

```js
function List({ items }) {
  const rows = computed(() =>
    items.get().map(item => html`<li ${{ key: item.id }}>${item.text}</li>`)
  )
  return html`<ul>${rows}</ul>`
}
```

### Signal as a Single Child
When a signal is the only child of an element, its value is bound reactively.
- **Node Value**: If the signal's value is a node, the element's content is replaced with that node.
- **Array Value**: If the value is an array, key-based reconciliation runs (see above).

## Rendering Logic

### Conditional Rendering
Use a `computed` that returns one element or another (or `null`), and place it in child position. The DOM is replaced each time the condition changes.

```js
const content = computed(() =>
  isVisible.get() ? html`<div>Visible content</div>` : null
)

html`<div>${content}</div>`
```

### Manual Side Effects
Use `effect(fn)` to run a function once immediately and then re-run it (via a microtask-queued `Watcher`) whenever any signal read inside the function changes. Multiple changes in the same microtask are batched.

```js
effect(() => {
  console.log('Count changed to:', count.get())
})
```

## Lifecycle

### Unmount and Cleanup
Use `onUnmount(vnodeOrElement, fn)` to register a cleanup function that runs when the element is permanently removed from the DOM.

- **Automatic Cleanup**: Reactive bindings created by the framework (signal attributes, signal properties and signal children) automatically register their stop functions via `onUnmount` and are cleaned up without manual intervention.
