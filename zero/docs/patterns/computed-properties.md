# Computed Properties

Creating and caching derived values that depend on other signals.

## Basic Computed Value

```js
const x = new Signal(5);
const y = new Signal(3);
const sum = new Signal(x.get() + y.get());

x.subscribe(() => sum.set(x.get() + y.get()));
y.subscribe(() => sum.set(x.get() + y.get()));

x.set(10); // sum becomes 13
```

## Computed Helper

Create a reusable pattern:

```js
function computed(computeFn, dependencies) {
  const signal = new Signal(computeFn());

  dependencies.forEach(dep => {
    dep.subscribe(() => {
      signal.set(computeFn());
    });
  });

  return signal;
}

// Usage
const x = new Signal(5);
const y = new Signal(3);
const sum = computed(() => x.get() + y.get(), [x, y]);
const product = computed(() => x.get() * y.get(), [x, y]);
```

## Computed with Dependencies

```js
const firstName = new Signal('John');
const lastName = new Signal('Doe');

const fullName = computed(
  () => `${firstName.get()} ${lastName.get()}`,
  [firstName, lastName]
);

const initials = computed(
  () => fullName.get().split(' ').map(n => n[0]).join('.'),
  [fullName]
);
```

## Memoized Computed Value

Only recompute if dependencies actually changed:

```js
class ComputedSignal {
  constructor(computeFn, dependencies) {
    this.computeFn = computeFn;
    this.signal = new Signal(computeFn());
    this.lastDeps = dependencies.map(d => d.get());

    dependencies.forEach(dep => {
      dep.subscribe(() => {
        const newDeps = dependencies.map(d => d.get());
        
        // Only recompute if something changed
        if (JSON.stringify(newDeps) !== JSON.stringify(this.lastDeps)) {
          this.lastDeps = newDeps;
          this.signal.set(this.computeFn());
        }
      });
    });
  }

  get() {
    return this.signal.get();
  }

  subscribe(fn) {
    return this.signal.subscribe(fn);
  }
}

// Usage
const items = new Signal([
  { id: 1, done: false },
  { id: 2, done: true }
]);

const doneCount = new ComputedSignal(
  () => items.get().filter(i => i.done).length,
  [items]
);
```

## Conditional Computed

```js
const user = new Signal(null);
const isAdmin = new Signal(false);

user.subscribe(() => {
  const u = user.get();
  isAdmin.set(u && u.role === 'admin');
});

const canDelete = computed(
  () => isAdmin.get() ? true : false,
  [isAdmin]
);
```

## Transformed Array

```js
const items = new Signal([
  { id: 1, price: 10 },
  { id: 2, price: 20 }
]);

const total = computed(
  () => items.get().reduce((sum, item) => sum + item.price, 0),
  [items]
);

const averagePrice = computed(
  () => {
    const list = items.get();
    return list.length > 0 ? total.get() / list.length : 0;
  },
  [items, total]
);
```

## Filtered and Mapped

```js
const todos = new Signal([
  { id: 1, title: 'Task 1', done: false },
  { id: 2, title: 'Task 2', done: true },
  { id: 3, title: 'Task 3', done: false }
]);

const activeTodos = computed(
  () => todos.get().filter(t => !t.done),
  [todos]
);

const todoTitles = computed(
  () => activeTodos.get().map(t => t.title),
  [activeTodos]
);
```

## Computed with Validation

```js
const email = new Signal('');
const password = new Signal('');

const isFormValid = computed(
  () => {
    const e = email.get();
    const p = password.get();
    return e.includes('@') && p.length >= 8;
  },
  [email, password]
);

const submitButton = createElement('button', {
  disabled: isFormValid,
  textContent: 'Submit'
});
```

## Nested Computed Values

```js
const user = new Signal({
  name: 'John',
  address: {
    city: 'NYC',
    country: 'USA'
  }
});

const city = computed(() => user.get().address.city, [user]);
const country = computed(() => user.get().address.country, [user]);

const location = computed(
  () => `${city.get()}, ${country.get()}`,
  [city, country]
);
```

## Computed with Side Effects

```js
const count = new Signal(0);

const doubled = computed(() => count.get() * 2, [count]);

// Side effect: log when doubled changes
doubled.subscribe(() => {
  console.log('Doubled is now:', doubled.get());
  // Could trigger animations, API calls, etc.
});
```

## Asynchronous Computed Values

```js
const userId = new Signal(1);
const userData = new Signal(null);
const isLoading = new Signal(false);

userId.subscribe(async () => {
  isLoading.set(true);
  try {
    const response = await fetch(`/api/users/${userId.get()}`);
    const data = await response.json();
    userData.set(data);
  } finally {
    isLoading.set(false);
  }
});
```

## Computed with Caching

```js
class CachedComputed {
  constructor(computeFn, dependencies) {
    this.computeFn = computeFn;
    this.cache = new Map();
    this.signal = new Signal(computeFn());

    dependencies.forEach(dep => {
      dep.subscribe(() => {
        const cacheKey = JSON.stringify(dependencies.map(d => d.get()));
        
        if (this.cache.has(cacheKey)) {
          this.signal.set(this.cache.get(cacheKey));
        } else {
          const result = computeFn();
          this.cache.set(cacheKey, result);
          this.signal.set(result);
        }
      });
    });
  }

  get() {
    return this.signal.get();
  }

  subscribe(fn) {
    return this.signal.subscribe(fn);
  }

  clearCache() {
    this.cache.clear();
  }
}
```

## Computed Getters

```js
class Store {
  constructor() {
    this.items = new Signal([]);
    this.filter = new Signal('');
  }

  get filteredItems() {
    return computed(
      () => this.items.get().filter(item => 
        item.name.includes(this.filter.get())
      ),
      [this.items, this.filter]
    );
  }

  get itemCount() {
    return computed(
      () => this.items.get().length,
      [this.items]
    );
  }

  get isEmpty() {
    return computed(
      () => this.itemCount.get() === 0,
      [this.itemCount]
    );
  }
}
```

## Reactive Sum/Average Pattern

```js
function createListStats(items, valueExtractor) {
  const sum = computed(
    () => items.get().reduce((acc, item) => acc + valueExtractor(item), 0),
    [items]
  );

  const count = computed(
    () => items.get().length,
    [items]
  );

  const average = computed(
    () => count.get() > 0 ? sum.get() / count.get() : 0,
    [sum, count]
  );

  return { sum, count, average };
}

// Usage
const prices = new Signal([
  { item: 'Apple', price: 1.50 },
  { item: 'Banana', price: 0.75 }
]);

const stats = createListStats(prices, item => item.price);

const display = createElement('div', {},
  `Total: $${stats.sum}`,
  `Average: $${stats.average.toFixed(2)}`
);
```

## Performance: When to Use Computed

Use computed when:
- The derivation is **expensive** (filtering, sorting, mapping large arrays)
- The value is **used multiple times** (avoid recomputing)
- The value is **observed by multiple subscribers** (updates propagate once)

Avoid when:
- The computation is **trivial** (simple addition, comparison)
- The value is **rarely used** (caching overhead exceeds cost)
- The value is **only used once** (inline the computation)
