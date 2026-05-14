# Derived State

Computing values from other signals, with caching and subscription patterns.

## Simple Derived Value

Derive a value from a single signal:

```js
const age = new Signal(25);
const nextYear = new Signal(age.get() + 1);

age.subscribe(() => {
  nextYear.set(age.get() + 1);
});
```

## Derived from Multiple Signals

```js
const firstName = new Signal('John');
const lastName = new Signal('Doe');
const fullName = new Signal(`${firstName.get()} ${lastName.get()}`);

firstName.subscribe(() => {
  fullName.set(`${firstName.get()} ${lastName.get()}`);
});

lastName.subscribe(() => {
  fullName.set(`${firstName.get()} ${lastName.get()}`);
});
```

## Computed Property Helper

Create a helper to reduce boilerplate:

```js
function derived(fn, dependencies) {
  const signal = new Signal(fn());
  
  dependencies.forEach(dep => {
    dep.subscribe(() => {
      signal.set(fn());
    });
  });
  
  return signal;
}

// Usage
const firstName = new Signal('John');
const lastName = new Signal('Doe');

const fullName = derived(
  () => `${firstName.get()} ${lastName.get()}`,
  [firstName, lastName]
);

firstName.set('Jane');
console.log(fullName.get()); // "Jane Doe"
```

## Filtered List

Derive a filtered version of a list:

```js
const items = new Signal([
  { id: 1, name: 'Apple', done: false },
  { id: 2, name: 'Banana', done: true },
  { id: 3, name: 'Cherry', done: false }
]);

const completedItems = new Signal(items.get().filter(i => i.done));

items.subscribe(() => {
  completedItems.set(items.get().filter(i => i.done));
});
```

## Sorted List

```js
const items = new Signal([
  { id: 3, name: 'Cherry' },
  { id: 1, name: 'Apple' },
  { id: 2, name: 'Banana' }
]);

const sortedByName = new Signal([...items.get()].sort((a, b) => a.name.localeCompare(b.name)));

items.subscribe(() => {
  sortedByName.set([...items.get()].sort((a, b) => a.name.localeCompare(b.name)));
});
```

## Memoized Computation

Cache expensive computations:

```js
let memoizedResult = null;
let lastInputValue = null;

function expensiveComputation(value) {
  if (value === lastInputValue && memoizedResult !== null) {
    return memoizedResult;
  }
  
  lastInputValue = value;
  memoizedResult = performHeavyCalculation(value);
  return memoizedResult;
}

const input = new Signal(10);
const result = new Signal(expensiveComputation(input.get()));

input.subscribe(() => {
  result.set(expensiveComputation(input.get()));
});
```

## Aggregated Statistics

```js
const items = new Signal([
  { price: 10 },
  { price: 20 },
  { price: 30 }
]);

function calculateStats() {
  const list = items.get();
  return {
    total: list.reduce((sum, item) => sum + item.price, 0),
    average: list.length > 0 ? list.reduce((sum, item) => sum + item.price, 0) / list.length : 0,
    count: list.length
  };
}

const stats = new Signal(calculateStats());

items.subscribe(() => {
  stats.set(calculateStats());
});
```

## Boolean Flags from State

```js
const items = new Signal([]);
const isEmpty = new Signal(true);
const hasItems = new Signal(false);

items.subscribe(() => {
  isEmpty.set(items.get().length === 0);
  hasItems.set(items.get().length > 0);
});
```

## Conditional State

```js
const user = new Signal(null);
const isLoggedIn = new Signal(false);
const username = new Signal('');

user.subscribe(() => {
  const u = user.get();
  isLoggedIn.set(u !== null);
  username.set(u?.name || '');
});
```

## Chained Derivations

```js
const query = new Signal('');

// Filter items based on query
const filteredItems = new Signal([]);

// Count filtered items
const filteredCount = new Signal(0);

function updateFiltered() {
  const results = items.get().filter(item => item.name.includes(query.get()));
  filteredItems.set(results);
  filteredCount.set(results.length);
}

query.subscribe(updateFiltered);
items.subscribe(updateFiltered);
```

## Performance Note: Avoid Circular Dependencies

Don't create loops of subscriptions:

```js
// ❌ AVOID THIS - creates infinite loop
const a = new Signal(1);
const b = new Signal(a.get() + 1);

a.subscribe(() => b.set(b.get() + 1));
b.subscribe(() => a.set(a.get() + 1));

a.set(5); // Infinite loop!
```

Instead, derive from source signals only:

```js
// ✓ GOOD
const a = new Signal(1);
const b = new Signal(a.get() + 1);

a.subscribe(() => b.set(a.get() + 1));
// b never triggers updates to a
```
