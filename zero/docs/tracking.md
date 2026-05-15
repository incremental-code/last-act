# Automatic Dependency Tracking

Zero provides automatic dependency tracking through the `track()` function, which records which signals are accessed during function execution.

## The Problem

Without dependency tracking, you must manually specify which signals to subscribe to:

```js
const firstName = new Signal('John');
const lastName = new Signal('Doe');
let fullName = 'John Doe';

// ❌ Manual subscriptions - error-prone
firstName.subscribe(() => {
  fullName = firstName.get() + ' ' + lastName.get();
});

lastName.subscribe(() => {
  fullName = firstName.get() + ' ' + lastName.get();
});

// What if you forget a subscription? The derived value won't update.
```

## The Solution: track()

Use `track()` to automatically detect which signals your function accesses:

```js
import { Signal, track } from './zero.js';

const firstName = new Signal('John');
const lastName = new Signal('Doe');

const dependencies = track(() => {
  const first = firstName.get();
  const last = lastName.get();
  console.log(`Full name: ${first} ${last}`);
});

console.log(dependencies.size); // 2 - firstName and lastName
dependencies.forEach(signal => {
  console.log(`Tracked signal`);
});
```

The `track()` function:
1. Creates a tracking context
2. Executes your function
3. Records all signal accesses via `.get()`
4. Returns a Set of all accessed signals

## Example: Auto-subscribing

You can use `track()` to automatically set up subscriptions:

```js
function autoSubscribe(fn) {
  const dependencies = track(fn);
  
  // Subscribe to all accessed signals
  dependencies.forEach(signal => {
    signal.subscribe(fn); // Re-run when signal changes
  });
}

const count = new Signal(0);
const doubled = new Signal(0);

autoSubscribe(() => {
  doubled.set(count.get() * 2);
});

count.set(5);
// Function automatically runs and updates doubled to 10
```

## Example: Computed Values

Create derived values that automatically stay in sync:

```js
const firstName = new Signal('John');
const lastName = new Signal('Doe');
const age = new Signal(30);

function createComputed(fn) {
  let value = null;
  const dependencies = track(() => {
    value = fn();
  });
  
  // Auto-update when any dependency changes
  dependencies.forEach(signal => {
    signal.subscribe(() => {
      track(() => {
        value = fn();
      });
    });
  });
  
  return {
    get() { return value; }
  };
}

const profile = createComputed(() => {
  const first = firstName.get();
  const last = lastName.get();
  const a = age.get();
  return `${first} ${last}, age ${a}`;
});

console.log(profile.get()); // "John Doe, age 30"
firstName.set('Jane');
console.log(profile.get()); // "Jane Doe, age 30" (automatically updated)
```

## Advantages

1. **No dependency lists** — The function itself is the source of truth
2. **Refactoring safe** — Add/remove signal accesses and dependencies update automatically
3. **Less boilerplate** — No manual subscribe/unsubscribe calls
4. **Fewer bugs** — Can't forget to subscribe to a signal

## API

### track(fn)

Executes a function and records which signals it accesses.

**Parameters:**
- `fn` — A function that calls `.get()` on signals

**Returns:**
- `Set<Signal>` — Set of all signals accessed in the function

**Example:**
```js
const deps = track(() => {
  a.get();
  b.get();
});

console.log(deps.size); // 2
```

### reactive(fn)

*Note: The reactive() function is experimental and not yet fully tested. Use track() with your own subscription logic for now.*

## Limitations

- Only accesses within the function are tracked — accessing `.value` directly won't be tracked
- Conditional accesses are tracked (signal is in the set even if not accessed on this run)
- Async operations: Signals accessed after await won't be tracked

## Comparison to React

| Aspect | Zero `track()` | React `useEffect` |
|--------|---|---|
| Dependencies | Automatic | Manual list |
| Refactoring | Safe - deps auto-update | Error-prone - must update list |
| Boilerplate | Minimal | useCallback, useMemo needed |
| Dynamic deps | Detected automatically | Must list all possibilities |
| Performance | Only runs on used signals | Runs on any dep change |
