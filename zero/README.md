# Zero Framework

A minimal, signal-based UI framework without reconciliation. Components render once, props update via signals.

## Core Concepts

### Signals
Reactive values that notify subscribers when they change.

```js
const count = new Signal(0);
count.set(5); // Updates all subscribers
```

### createElement
Returns a real DOM element. Supports JSX syntax when transpiled.

```js
const div = createElement('div', { id: 'myDiv' }, 'Hello');
```

### Props
Properties are set directly on the DOM element. For actual HTML attributes, use `props.attributes`.

```js
createElement('div', { 
  style: { color: 'red' },
  attributes: { 'data-test': 'value' },
  onclick: () => console.log('clicked')
})
```

### Reactive Props
Pass signals as prop values. The element updates automatically when the signal changes.

```js
const color = new Signal('blue');
const div = createElement('div', { 
  style: { color }
});
color.set('red'); // div style updates
```

### Function Components
Functions that receive props and return an element.

```js
function Button({ label, onclick }) {
  return createElement('button', { onclick }, label);
}
```

### Array Children
Pass a signal containing an array. Use `key` prop to specify how to extract the identity of each item.

```js
const items = new Signal([
  { id: 1, name: 'Apple' },
  { id: 2, name: 'Banana' }
]);

createElement('div', { key: (item) => item.id }, items);
```

When the array signal updates, child nodes are reordered and added/removed as needed, using the key function to track identity.

## Trade-offs

- **No synthetic event system**: Event handlers are raw DOM events
- **No error boundaries**: Errors in handlers bubble up normally
- **No built-in optimization**: Component functions run once at creation time
- **Props are read-only**: Mutating props won't trigger updates (use signals instead)

## Example

See `example.html` for a working demo.
