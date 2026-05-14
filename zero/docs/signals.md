# Signals

Signals are reactive values that notify subscribers when they change. They're the foundation of Zero's reactivity system.

## Creating a Signal

```js
const count = new Signal(0);
const message = new Signal('Hello');
const data = new Signal({ id: 1, name: 'User' });
```

## Getting and Setting Values

```js
const count = new Signal(5);

count.get();     // 5
count.set(10);   // Updates to 10
```

## Subscribing to Changes

When a signal's value changes, all subscribers are notified.

```js
const count = new Signal(0);

const unsubscribe = count.subscribe((newValue) => {
  console.log('Count changed to:', newValue);
});

count.set(1);  // Logs: "Count changed to: 1"
count.set(2);  // Logs: "Count changed to: 2"

unsubscribe();
count.set(3);  // No log (unsubscribed)
```

## Using Signals in Components

Pass signals as prop values and they'll update automatically when the signal changes.

```js
const color = new Signal('red');

const div = createElement('div', {
  style: { color }
});

color.set('blue');  // div.style.color updates automatically
```

## Signals with Arrays

Signals work great for managing dynamic lists.

```js
const items = new Signal([
  { id: 1, name: 'Apple' },
  { id: 2, name: 'Banana' }
]);

function renderItem(item) {
  return createElement('li', {}, item.name);
}

function renderItems() {
  return items.get().map(renderItem);
}

const itemElements = new Signal(renderItems());

// Update the elements whenever items change
items.subscribe(() => {
  itemElements.set(renderItems());
});

// Render the list
const list = createElement('ul', {}, itemElements);
```

## Key Patterns

**Update based on current value:**
```js
const count = new Signal(0);
count.set(count.get() + 1);  // Increment
```

**Derived values:**
```js
const firstName = new Signal('John');
const lastName = new Signal('Doe');

const fullName = new Signal(`${firstName.get()} ${lastName.get()}`);

firstName.subscribe(() => {
  fullName.set(`${firstName.get()} ${lastName.get()}`);
});
```

**Conditional updates:**
```js
const isVisible = new Signal(true);

const div = createElement('div', {
  style: { display: isVisible.get() ? 'block' : 'none' }
});

isVisible.subscribe(() => {
  div.style.display = isVisible.get() ? 'block' : 'none';
});
```
