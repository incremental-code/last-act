# Memoization

Optimizing performance by caching expensive computations and avoiding unnecessary updates.

## Memoize Computed Values

Cache the result of expensive functions:

```js
function createMemoized(fn) {
  let cachedResult = null;
  let cachedInput = null;

  return (input) => {
    if (input === cachedInput) {
      return cachedResult;
    }
    cachedInput = input;
    cachedResult = fn(input);
    return cachedResult;
  };
}

const expensiveCompute = createMemoized((n) => {
  // Simulate heavy computation
  let sum = 0;
  for (let i = 0; i < n * 1000000; i++) sum += i;
  return sum;
});

const input = new Signal(10);
const result = computed(() => expensiveCompute(input.get()));
```

## Memoize with Multiple Dependencies

```js
function createMemoized(fn, getKeys) {
  let cachedResult = null;
  let cachedKeys = null;

  return (...args) => {
    const keys = getKeys(...args);
    
    if (cachedKeys && JSON.stringify(keys) === JSON.stringify(cachedKeys)) {
      return cachedResult;
    }
    
    cachedKeys = keys;
    cachedResult = fn(...args);
    return cachedResult;
  };
}

const filterAndSort = createMemoized(
  (items, query, sortBy) => {
    const filtered = items.filter(item => item.name.includes(query));
    return filtered.sort((a, b) => a[sortBy].localeCompare(b[sortBy]));
  },
  (items, query, sortBy) => [items.length, query, sortBy]
);

const items = new Signal([...]);
const query = new Signal('');
const sortBy = new Signal('name');

const results = computed(() =>
  filterAndSort(items.get(), query.get(), sortBy.get())
);
```

## Debounced Updates

Avoid updating on every keystroke. Use `oninput` to capture changes immediately, but debounce the expensive operation:

```js
function debounce(fn, delay) {
  let timeoutId = null;

  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

const searchQuery = new Signal('');
const searchResults = new Signal([]);
let debounceTimer = null;

function performSearch() {
  const query = searchQuery.get();
  const results = query
    ? items.filter(item => item.toLowerCase().includes(query.toLowerCase()))
    : items;
  searchResults.set(results);
}

// Use oninput for real-time signal updates
const searchInput = createElement('input', {
  type: 'text',
  placeholder: 'Search...',
  oninput: (e) => searchQuery.set(e.target.value)
});

// Debounce the actual search operation
searchQuery.subscribe(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(performSearch, 300);
});

// Perform initial search
performSearch();
```

**Key:** Use `oninput` (fires on every keystroke) instead of `onchange` (fires only on blur), then debounce the expensive operation inside the subscription.

## Throttled Updates

Limit update frequency:

```js
function throttle(fn, delay) {
  let lastTime = 0;

  return (...args) => {
    const now = Date.now();
    if (now - lastTime >= delay) {
      lastTime = now;
      fn(...args);
    }
  };
}

const windowWidth = new Signal(window.innerWidth);
const onResize = throttle(() => {
  windowWidth.set(window.innerWidth);
}, 100);

window.addEventListener('resize', onResize);
```

## Lazy Computation

Only compute when needed:

```js
function createLazySignal(fn) {
  let cached = null;
  let isDirty = true;

  return {
    get() {
      if (isDirty) {
        cached = fn();
        isDirty = false;
      }
      return cached;
    },
    
    invalidate() {
      isDirty = true;
    }
  };
}

const expensiveValue = createLazySignal(() => {
  console.log('Computing...');
  // Heavy computation
  return Math.random();
});

console.log(expensiveValue.get()); // "Computing..." + value
console.log(expensiveValue.get()); // Just returns cached value
expensiveValue.invalidate();
console.log(expensiveValue.get()); // "Computing..." again
```

## Batch Updates

Group multiple signal changes before subscribers react:

```js
function batch(fn) {
  const updates = [];
  
  // Temporarily collect updates
  const originalSet = Signal.prototype.set;
  Signal.prototype.set = function(newValue) {
    updates.push(() => originalSet.call(this, newValue));
  };

  fn();

  // Restore and execute all updates
  Signal.prototype.set = originalSet;
  updates.forEach(update => update());
}

const first = new Signal(0);
const last = new Signal(0);
const fullName = new Signal('');

batch(() => {
  first.set('John');
  last.set('Doe');
  // fullName subscribers only fire once after this block
});
```

## Conditional Subscription

Only subscribe when needed:

```js
const items = new Signal([]);
const filter = new Signal('');
let filterSubscription = null;

function enableFiltering() {
  if (!filterSubscription) {
    filterSubscription = filter.subscribe(() => {
      // Update filtered results
    });
  }
}

function disableFiltering() {
  if (filterSubscription) {
    filterSubscription();
    filterSubscription = null;
  }
}
```

## Cache HTTP Requests

```js
const cache = new Map();

async function fetchWithCache(url) {
  if (cache.has(url)) {
    return cache.get(url);
  }

  const response = await fetch(url);
  const data = await response.json();
  cache.set(url, data);
  return data;
}

const userId = new Signal(1);
const user = new Signal(null);

userId.subscribe(async () => {
  user.set(await fetchWithCache(`/api/users/${userId.get()}`));
});
```

## Signal Pooling for Transient States

Reuse signals to avoid creating new ones constantly:

```js
class SignalPool {
  constructor(initialValue) {
    this.signals = [];
    this.nextIndex = 0;
  }

  acquire(value) {
    if (this.nextIndex < this.signals.length) {
      const signal = this.signals[this.nextIndex];
      signal.set(value);
      this.nextIndex++;
      return signal;
    } else {
      const signal = new Signal(value);
      this.signals.push(signal);
      this.nextIndex++;
      return signal;
    }
  }

  reset() {
    this.nextIndex = 0;
  }
}

const pool = new SignalPool(null);

function renderItems(items) {
  pool.reset();
  return items.map(item => {
    const signal = pool.acquire(item);
    return createElement('div', {}, signal);
  });
}
```

## Performance Note: When Memoization Helps

Memoization is valuable for:
- **Complex calculations** — Computing on every update is expensive
- **Frequent subscriptions** — Multiple components use the same derived value
- **Network requests** — Avoid duplicate API calls
- **Large list filtering/sorting** — Operations on thousands of items

Memoization adds overhead for:
- **Simple operations** — The memoization cache lookup can be slower than just recomputing
- **Rarely-used values** — The cache invalidation cost outweighs benefits
- **Unique inputs** — If inputs change constantly, the cache never hits

Profile first, memoize second.
