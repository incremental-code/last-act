# Tree Diffing

Understanding when and how Zero efficiently updates the DOM.

## No Virtual DOM, Direct Mutations

Zero doesn't use a virtual DOM. It directly mutates the real DOM:

```js
// When you update a signal, the DOM updates immediately
const color = new Signal('red');
const div = createElement('div', { style: { color } });

color.set('blue'); // div.style.color becomes 'blue' instantly
```

This is more efficient than React's approach for:
- Single prop updates
- Event handlers
- Computed properties

## Array Diffing with Keys

The only place Zero does diffing is with array children, using the `key` function:

```js
const items = new Signal([
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
]);

const list = createElement('div', {
  key: (item) => item.id  // This is how Zero tracks identity
}, items);

items.set([
  { id: 2, name: 'Bob' },    // Reordered
  { id: 1, name: 'Alice' },
  { id: 3, name: 'Charlie' } // New
]);
// Zero removes the node for item 3, reorders 1 and 2, adds 3
```

## Why Keys Matter

Without keys, Zero can't track which items changed:

```js
// ❌ WITHOUT KEY - Zero doesn't know what changed
const items = new Signal(['a', 'b', 'c']);
const list = createElement('div', {}, items);

items.set(['x', 'b', 'c', 'd']);
// Zero creates 4 new text nodes (inefficient)

// ✓ WITH KEY - Zero knows exactly what changed
const items = new Signal([
  { id: 1, text: 'a' },
  { id: 2, text: 'b' },
  { id: 3, text: 'c' }
]);

const list = createElement('div', {
  key: (item) => item.id
}, items);

items.set([
  { id: 4, text: 'x' },     // New
  { id: 2, text: 'b' },     // Existing
  { id: 3, text: 'c' },     // Existing
  { id: 5, text: 'd' }      // New
]);
// Zero creates nodes only for items 4 and 5
```

## Key Function Performance

The key function is called for every item on every update:

```js
// ✓ GOOD - Fast key extraction
const key = (item) => item.id;

// ✓ GOOD - Constant operation
const key = (item) => item.id.toString();

// ❌ SLOW - Complex computation
const key = (item) => {
  let hash = 0;
  for (let i = 0; i < item.name.length; i++) {
    hash = ((hash << 5) - hash) + item.name.charCodeAt(i);
  }
  return hash;
};

// ❌ WRONG - Generates new value every time
const key = (item) => Math.random();
```

## Avoiding Unnecessary DOM Operations

Don't recreate signals unnecessarily:

```js
// ❌ AVOID - Creates new elements every render
function ItemList() {
  const items = new Signal([...]);
  
  function render() {
    return items.get().map(item => createElement('div', {}, item.name));
  }

  return createElement('ul', {}, ...render());
}

// ✓ GOOD - Reuse elements via signal
function ItemList() {
  const items = new Signal([...]);
  const elements = new Signal(items.get().map(item => createElement('div', {}, item.name)));

  items.subscribe(() => {
    elements.set(items.get().map(item => createElement('div', {}, item.name)));
  });

  return createElement('ul', {}, elements);
}
```

## Keying Elements by Data Attributes

When rendering elements from objects, store the ID in a data attribute so the key function can access it:

```js
// ✓ GOOD - Store ID in data attribute for keying
const todos = new Signal([
  { id: 1, text: 'Learn Zero', done: false },
  { id: 2, text: 'Build something', done: false }
]);

const todoElements = new Signal([]);

function renderTodos() {
  return todos.get().map(todo =>
    createElement('div', {
      attributes: {
        class: `item ${todo.done ? 'done' : ''}`,
        'data-id': todo.id  // Store ID for keying
      }
    },
      createElement('button', {
        onclick: () => {
          const current = todos.get();
          todos.set(current.filter(t => t.id !== todo.id));
        }
      }, '✕')
    )
  );
}

todoElements.set(renderTodos());
todos.subscribe(() => {
  todoElements.set(renderTodos());
});

// Use the data attribute in the key function
const list = createElement('div', {
  key: (el) => el.getAttribute('data-id')
}, todoElements);
```

This ensures that when you add or remove items, each element is correctly identified by its ID, even after re-rendering.

## When Diffing is Necessary

Zero's minimal diffing approach works best when:
- **Props are reactive** — Changes automatically update the DOM
- **Lists are keyed** — Array updates are efficient
- **Components are static** — No re-renders, so no diffing needed

You might need custom diffing when:
- **Content is complex** — Large nested structures
- **Reordering is frequent** — Heavy list manipulation
- **Items are identical** — Can't use a unique key

## Diffing Large Lists

For large lists, use efficient key functions:

```js
// List of 10,000 users
const users = new Signal([...]);

// ✓ GOOD - O(1) key lookup
const userList = createElement('div', {
  key: (user) => user.id
}, users);

// ❌ SLOW - O(n) key lookup
const userList = createElement('div', {
  key: (user) => user.email  // Email lookup requires searching
}, users);

// ❌ VERY SLOW - O(n) key generation
const userList = createElement('div', {
  key: (user) => `${user.firstName}-${user.lastName}`  // String concatenation
}, users);
```

## Detecting When Diffing Occurs

Monitor list updates to understand diffing:

```js
const items = new Signal([
  { id: 1, name: 'A' },
  { id: 2, name: 'B' }
]);

// Listen to updates
items.subscribe(() => {
  console.time('List update');
  // Zero performs diffing and DOM updates here
  console.timeEnd('List update');
});

// This triggers a minimal update (one element added)
items.set([
  { id: 1, name: 'A' },
  { id: 2, name: 'B' },
  { id: 3, name: 'C' }  // Only this needs a new DOM node
]);
```

## Comparing Zero's Approach to React

Zero:
- ✓ No virtual DOM overhead for prop updates
- ✓ Direct DOM mutations (faster for small changes)
- ✓ Minimal diffing (only on array children)
- ✗ Relies on you to structure state correctly
- ✗ No automatic re-render optimization

React:
- ✓ Automatic re-render optimization (memoization)
- ✓ Complex diffing algorithm (handles any tree structure)
- ✓ Batched updates
- ✗ Virtual DOM overhead on every update
- ✗ Can be slower for simple changes

## Best Practices for Diffing

1. **Use stable keys** — Don't use array indices or random IDs
2. **Normalize data** — Flat structure, not deeply nested
3. **Subscribe selectively** — Only subscribe to the signals you use
4. **Batch updates** — Group list changes together
5. **Lazy render** — Defer rendering large lists until visible

## Pattern: Incremental Diffing

For very large lists, render in chunks:

```js
function IncrementalList({ items }) {
  const batchSize = 50;
  const currentBatch = new Signal(0);

  function getBatchItems() {
    const start = currentBatch.get() * batchSize;
    const end = start + batchSize;
    return items.get().slice(start, end);
  }

  const batchElements = new Signal(
    getBatchItems().map(item => createElement('li', {}, item.name))
  );

  currentBatch.subscribe(() => {
    const batch = getBatchItems();
    if (batch.length > 0) {
      const newElements = batch.map(item => createElement('li', {}, item.name));
      const current = batchElements.get();
      batchElements.set([...current, ...newElements]);
    }
  });

  return createElement('ul', {},
    batchElements,
    currentBatch.get() * batchSize < items.get().length
      ? createElement('button', {
          onclick: () => currentBatch.set(currentBatch.get() + 1)
        }, 'Load More')
      : null
  );
}
```

## Pattern: Efficient Reordering

Preserve DOM nodes when reordering:

```js
const items = new Signal([
  { id: 1, name: 'A' },
  { id: 2, name: 'B' },
  { id: 3, name: 'C' }
]);

// Zero preserves the DOM nodes for ids 1, 2, 3 and only reorders them
const list = createElement('ul', {
  key: (item) => item.id
}, items);

// This efficiently reorders without recreating elements
items.set([
  { id: 3, name: 'C' },
  { id: 1, name: 'A' },
  { id: 2, name: 'B' }
]);
```
