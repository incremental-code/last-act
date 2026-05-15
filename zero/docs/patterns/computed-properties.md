# Computed Properties

Creating derived values that depend on other signals with the built-in `computed()` function.

## Basics

```js
import { Signal, computed } from './zero.js';

const x = new Signal(5);
const y = new Signal(3);

const sum = computed(() => x.get() + y.get());

console.log(sum.get()); // 8
x.set(10);
console.log(sum.get()); // 13
```

`computed()` returns a `Signal`. It auto-tracks every signal accessed inside the function and re-runs when any of them change.

## Computed in the DOM

Computed signals work directly in `createElement` as children, attributes, or styles:

```js
const firstName = new Signal('John');
const lastName = new Signal('Doe');
const fullName = computed(() => `${firstName.get()} ${lastName.get()}`);

const greeting = createElement('p', {}, 'Hello, ', fullName);
document.body.appendChild(greeting);

firstName.set('Jane'); // DOM updates: "Hello, Jane Doe"
```

```js
const count = new Signal(0);
const color = computed(() => count.get() > 10 ? 'red' : 'blue');

const display = createElement('div', { style: { color } }, count);
count.set(15); // text and color both update
```

## Chained Computed Values

A `computed` can depend on other `computed` signals — updates cascade automatically:

```js
const firstName = new Signal('John');
const lastName = new Signal('Doe');

const fullName = computed(() => `${firstName.get()} ${lastName.get()}`);
const initials = computed(() => fullName.get().split(' ').map(n => n[0]).join('.'));

console.log(initials.get()); // "J.D"
firstName.set('Jane');
console.log(initials.get()); // "J.D" (still J.D, both start with J)
lastName.set('Smith');
console.log(initials.get()); // "J.S"
```

## Filtered Lists

```js
const todos = new Signal([
  { id: 1, title: 'Task 1', done: false },
  { id: 2, title: 'Task 2', done: true },
  { id: 3, title: 'Task 3', done: false }
]);

const activeTodos = computed(() => todos.get().filter(t => !t.done));
const completedCount = computed(() => todos.get().filter(t => t.done).length);
```

## Validation

A natural fit for form state:

```js
const email = new Signal('');
const password = new Signal('');

const isFormValid = computed(() => {
  return email.get().includes('@') && password.get().length >= 8;
});

const submitButton = createElement('button', {
  disabled: computed(() => !isFormValid.get()),
}, 'Submit');
```

## Aggregated Statistics

```js
const prices = new Signal([
  { item: 'Apple', price: 1.50 },
  { item: 'Banana', price: 0.75 }
]);

const total = computed(() =>
  prices.get().reduce((sum, p) => sum + p.price, 0)
);

const average = computed(() => {
  const list = prices.get();
  return list.length > 0 ? total.get() / list.length : 0;
});
```

Note that `average` depends on `total`, which depends on `prices`. Changing `prices` flows through both automatically.

## Conditional Dependencies

`computed()` re-tracks on every run, so signals only accessed in a branch are tracked only when that branch executes:

```js
const useFullName = new Signal(true);
const firstName = new Signal('John');
const lastName = new Signal('Doe');

const display = computed(() => {
  if (useFullName.get()) {
    return `${firstName.get()} ${lastName.get()}`;
  } else {
    return firstName.get();
  }
});

// While useFullName is false, changing lastName does NOT trigger recompute
useFullName.set(false);
lastName.set('Smith'); // no recompute, display still "John"

useFullName.set(true); // recompute, lastName now tracked
lastName.set('Jones'); // recompute, display now "John Jones"
```

## Computed Getters on Stores

Useful when you have a store class:

```js
class TodoStore {
  constructor() {
    this.items = new Signal([]);
    this.filter = new Signal('');

    this.filteredItems = computed(() =>
      this.items.get().filter(item => item.name.includes(this.filter.get()))
    );

    this.itemCount = computed(() => this.items.get().length);
    this.isEmpty = computed(() => this.itemCount.get() === 0);
  }
}

const store = new TodoStore();
```

## Side Effects on Computed Values

`computed()` is for *deriving* values. For side effects, subscribe to the result:

```js
const count = new Signal(0);
const doubled = computed(() => count.get() * 2);

doubled.subscribe((value) => {
  console.log('Doubled is now:', value);
  // Trigger animations, API calls, etc.
});
```

## Async Values

`computed()` is synchronous. For async-derived state, subscribe to the source and write to a regular signal:

```js
const userId = new Signal(1);
const userData = new Signal(null);
const isLoading = new Signal(false);

userId.subscribe(async () => {
  isLoading.set(true);
  try {
    const response = await fetch(`/api/users/${userId.get()}`);
    userData.set(await response.json());
  } finally {
    isLoading.set(false);
  }
});
```

## When to Use Computed

Reach for `computed()` when:
- The value is **derived** from other signals (filter, map, sum, format)
- Multiple things consume the derived value (compute once, share)
- The function reads from signals that may grow or shrink over time (auto-tracking handles it)

Skip it when:
- You need a side effect (use `subscribe()` instead)
- The value is async (use `subscribe()` + a regular signal)
- The computation is trivial and used once inline
