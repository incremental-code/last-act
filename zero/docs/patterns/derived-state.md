# Derived State

Computing values from other signals using `computed()`.

## Simple Derived Value

Derive a value from a single signal:

```js
import { Signal, computed } from './zero.js';

const age = new Signal(25);
const nextYear = computed(() => age.get() + 1);

console.log(nextYear.get()); // 26
age.set(30);
console.log(nextYear.get()); // 31
```

## Derived from Multiple Signals

```js
const firstName = new Signal('John');
const lastName = new Signal('Doe');

const fullName = computed(() => `${firstName.get()} ${lastName.get()}`);

console.log(fullName.get()); // "John Doe"
firstName.set('Jane');
console.log(fullName.get()); // "Jane Doe"
```

`computed()` auto-tracks every signal accessed inside the function — no dependency list needed, no manual subscriptions, refactoring stays safe.

## Manual Approach (for reference)

The same thing without `computed()`:

```js
const firstName = new Signal('John');
const lastName = new Signal('Doe');
const fullName = new Signal(`${firstName.get()} ${lastName.get()}`);

const update = () => fullName.set(`${firstName.get()} ${lastName.get()}`);
firstName.subscribe(update);
lastName.subscribe(update);
```

Easy to forget a subscribe, easy to add a dependency without updating the list. Prefer `computed()`.

## Filtered List

```js
const items = new Signal([
  { id: 1, name: 'Apple', done: false },
  { id: 2, name: 'Banana', done: true },
  { id: 3, name: 'Cherry', done: false }
]);

const completedItems = computed(() => items.get().filter(i => i.done));
```

## Sorted List

```js
const items = new Signal([
  { id: 3, name: 'Cherry' },
  { id: 1, name: 'Apple' },
  { id: 2, name: 'Banana' }
]);

const sortedByName = computed(() =>
  [...items.get()].sort((a, b) => a.name.localeCompare(b.name))
);
```

## Aggregated Statistics

```js
const items = new Signal([
  { price: 10 },
  { price: 20 },
  { price: 30 }
]);

const stats = computed(() => {
  const list = items.get();
  const total = list.reduce((sum, item) => sum + item.price, 0);
  return {
    total,
    average: list.length > 0 ? total / list.length : 0,
    count: list.length
  };
});
```

## Boolean Flags from State

```js
const items = new Signal([]);

const isEmpty = computed(() => items.get().length === 0);
const hasItems = computed(() => items.get().length > 0);
```

## Conditional State

```js
const user = new Signal(null);

const isLoggedIn = computed(() => user.get() !== null);
const username = computed(() => user.get()?.name || '');
```

## Chained Derivations

Computed signals can depend on other computed signals:

```js
const items = new Signal([
  { name: 'Apple' },
  { name: 'Banana' },
  { name: 'Cherry' }
]);
const query = new Signal('');

const filteredItems = computed(() =>
  items.get().filter(item => item.name.includes(query.get()))
);

const filteredCount = computed(() => filteredItems.get().length);
const hasResults = computed(() => filteredCount.get() > 0);
```

Changes to `query` or `items` cascade through `filteredItems` → `filteredCount` → `hasResults` automatically.

## Conditional Dependencies

Because `computed()` re-tracks on every run, a signal that's only accessed in one branch becomes a dependency only when that branch executes:

```js
const useFirstName = new Signal(true);
const firstName = new Signal('John');
const lastName = new Signal('Doe');

const displayName = computed(() => {
  return useFirstName.get() ? firstName.get() : lastName.get();
});

// While useFirstName is true, changes to lastName don't trigger recompute
lastName.set('Smith'); // no recompute

useFirstName.set(false); // recompute, now lastName is a dependency
lastName.set('Jones'); // recompute
```

## Avoid Circular Dependencies

Don't have a `computed` write to a signal it reads from — `computed()` is for *deriving* values, not mutating state.

```js
// ❌ AVOID — writes inside a computed
const a = new Signal(1);
const b = computed(() => {
  a.set(a.get() + 1); // don't do this
  return a.get() * 2;
});

// ✓ GOOD — derive only
const a = new Signal(1);
const b = computed(() => a.get() * 2);
```
