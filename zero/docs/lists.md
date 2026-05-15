# Rendering Lists

Zero provides a simple way to render dynamic lists using signals and the `key` prop.

## Basic List Rendering

Pass a signal containing an array as a child:

```js
const items = new Signal(['Apple', 'Banana', 'Cherry']);

const list = createElement('div', {}, items);
```

When the signal updates, the DOM automatically re-renders the list.

```js
items.set(['Apple', 'Banana', 'Cherry', 'Date']);
// DOM adds a new text node
```

## Lists with Custom Key Function

For more complex lists, use the `key` prop to specify how to extract the identity of each item:

```js
const items = new Signal([
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
]);

const list = createElement('div', {
  key: (item) => item.id
}, items);
```

The key function receives each item and should return a unique identifier. This is used to track which DOM nodes correspond to which items when reordering or filtering.

## Rendering Item Elements

To render structured elements for each item, derive an element-array signal from the items with `computed()`:

```js
import { Signal, computed, createElement } from './zero.js';

const items = new Signal([
  { id: 1, name: 'Apple', price: 1.50 },
  { id: 2, name: 'Banana', price: 0.75 }
]);

function ItemRow(item) {
  return createElement('div', {
    attributes: { class: 'item-row', 'data-id': String(item.id) }
  },
    createElement('span', {}, item.name),
    createElement('span', {}, '$' + item.price)
  );
}

const itemElements = computed(() => items.get().map(ItemRow));

const list = createElement('div', {
  attributes: { class: 'items' },
  key: (el) => el.getAttribute('data-id')
}, itemElements);
```

`computed()` re-runs whenever `items` changes and produces a fresh array of elements. The keyed reconciler in `createElement` uses the `data-id` attribute to track item identity, so reorders and partial updates reuse existing DOM nodes.

## Adding Items

```js
function addItem(name, price) {
  const current = items.get();
  const newId = Math.max(...current.map(i => i.id), 0) + 1;
  items.set([...current, { id: newId, name, price }]);
}

addItem('Orange', 2.00);
// The list automatically updates
```

## Removing Items

```js
function removeItem(id) {
  const current = items.get();
  items.set(current.filter(item => item.id !== id));
}

removeItem(1);
// The list automatically updates
```

## Reordering Items

```js
function sortByName() {
  const current = items.get();
  items.set([...current].sort((a, b) => a.name.localeCompare(b.name)));
}

sortByName();
// The list reorders in the DOM
```

## Complete Example

```js
const todos = new Signal([
  { id: 1, text: 'Learn Zero', done: false },
  { id: 2, text: 'Build app', done: false }
]);

function TodoItem(item) {
  return createElement('div', {
    attributes: { class: 'todo-item', 'data-id': String(item.id) }
  },
    createElement('input', {
      type: 'checkbox',
      checked: item.done
    }),
    createElement('span', {}, item.text)
  );
}

const todoElements = computed(() => todos.get().map(TodoItem));

const todoList = createElement('div', {
  attributes: { class: 'todos' },
  key: (el) => el.getAttribute('data-id')
}, todoElements);

function addTodo(text) {
  const current = todos.get();
  const newId = Math.max(...current.map(t => t.id), 0) + 1;
  todos.set([...current, { id: newId, text, done: false }]);
}

function toggleTodo(id) {
  const current = todos.get();
  todos.set(current.map(t => 
    t.id === id ? { ...t, done: !t.done } : t
  ));
}
```

## Key Patterns

**Filter a list:**
```js
function filterDone() {
  const current = todos.get();
  todos.set(current.filter(t => !t.done));
}
```

**Reverse a list:**
```js
function reverse() {
  const current = todos.get();
  todos.set([...current].reverse());
}
```

**Clear a list:**
```js
function clear() {
  todos.set([]);
}
```
