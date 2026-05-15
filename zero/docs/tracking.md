# Automatic Dependency Tracking

Zero builds reactivity in three layers, each adding one capability on top of the previous:

| Function | What it does | Returns |
|---|---|---|
| `track(fn)` | Runs `fn` once, records which signals it reads | `[value, dependencies]` |
| `reactive(fn)` | Runs `fn`, then re-runs it whenever any tracked signal changes | `unsubscribe()` function |
| `computed(fn)` | Same as `reactive()` but stores the return value in a `Signal` | A `Signal` with `.stop()` |

## The Problem

Without dependency tracking, you must manually subscribe to every signal a function reads:

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

// Forget a subscription? The derived value won't update.
```

## Layer 1: `track(fn)`

The primitive. Runs the function once, and tells you what signals it accessed:

```js
import { Signal, track } from './zero.js';

const firstName = new Signal('John');
const lastName = new Signal('Doe');

const [value, deps] = track(() => {
  return firstName.get() + ' ' + lastName.get();
});

console.log(value);    // "John Doe"
console.log(deps.size); // 2
console.log(deps.has(firstName)); // true
```

Returns a `[value, dependencies]` tuple. `dependencies` is a `Set<Signal>`.

You almost never use `track()` directly — it's the building block for `reactive()` and `computed()`.

## Layer 2: `reactive(fn)`

`track()` + auto re-run. Use when you want a side effect to re-run whenever its inputs change:

```js
import { Signal, reactive } from './zero.js';

const count = new Signal(0);

const unsubscribe = reactive(() => {
  console.log('Count is:', count.get());
});
// Prints: "Count is: 0"

count.set(5);
// Prints: "Count is: 5"

count.set(10);
// Prints: "Count is: 10"

unsubscribe(); // Stop re-running
count.set(99); // (nothing prints)
```

`reactive()` returns an unsubscribe function. Call it to stop the effect.

### Dynamic Dependencies

Because `reactive()` re-tracks on every run, a branch-only access only counts as a dependency while that branch is active:

```js
const which = new Signal('a');
const a = new Signal(1);
const b = new Signal(10);

reactive(() => {
  console.log(which.get() === 'a' ? a.get() : b.get());
});

b.set(99); // Doesn't trigger — b isn't a dependency right now
which.set('b'); // Re-runs. Now b is a dependency, a is not.
a.set(42); // Doesn't trigger.
b.set(100); // Triggers.
```

### Cleanup (React-style)

If your effect allocates resources — event listeners, timers, sockets, fetch aborts — return a cleanup function from the effect. Zero will call it **before the next re-run** and **once more when the effect is torn down**:

```js
const userId = new Signal(1);

const unsubscribe = reactive(() => {
  const socket = new WebSocket(`/users/${userId.get()}/feed`);

  return () => socket.close();
});

userId.set(2); // closes socket #1, opens socket #2
userId.set(3); // closes socket #2, opens socket #3
unsubscribe();  // closes socket #3, no more runs
```

Each run's cleanup is captured as a closure at run time, so it sees the resources allocated **during that run** — not later ones. You always have exactly one resource alive at a time.

Common patterns:

```js
// Event listener
reactive(() => {
  const handler = (e) => log(currentTarget.get(), e);
  window.addEventListener('click', handler);
  return () => window.removeEventListener('click', handler);
});

// Interval timer
reactive(() => {
  const id = setInterval(() => refresh(userId.get()), 5000);
  return () => clearInterval(id);
});

// Abortable fetch
reactive(() => {
  const controller = new AbortController();
  fetch(`/api/users/${userId.get()}`, { signal: controller.signal })
    .then(r => r.json())
    .then(data => userData.set(data));
  return () => controller.abort();
});
```

Without cleanup, rapid signal updates would pile up listeners, timers, or in-flight requests. The cleanup hook gives each run a paired teardown.

If your effect doesn't return anything (or returns something that isn't a function), no cleanup runs — the return-a-function contract is fully opt-in.

## Layer 3: `computed(fn)`

`reactive()` + a `Signal` to hold the result. Use when you want a *derived value* you can pass around, render, or subscribe to:

```js
import { Signal, computed } from './zero.js';

const firstName = new Signal('John');
const lastName = new Signal('Doe');

const fullName = computed(() => firstName.get() + ' ' + lastName.get());

console.log(fullName.get()); // "John Doe"
firstName.set('Jane');
console.log(fullName.get()); // "Jane Doe"
```

`computed()` returns a `Signal`. You can use it anywhere a signal works — inline in `createElement`, subscribed to, passed to another `computed()`, etc:

```js
// Inline in JSX-like markup — no destructuring needed
createElement('p', {}, 'Hello, ', computed(() => name.get().toUpperCase()));
```

### Cleanup

The returned signal has a `.stop()` method that disconnects it from its dependencies:

```js
const doubled = computed(() => count.get() * 2);
// ... use it ...
doubled.stop(); // Stop reacting to count changes
```

After `.stop()`, the signal keeps its last value but no longer updates when its dependencies change. Downstream subscribers (consumers of `doubled`) are not affected — they remain subscribed.

## Conceptual Model

```
track       → "what signals does this function read?"
reactive    → "rerun this function whenever its signals change"
computed    → "give me a signal whose value is always the result of this function"
```

Each layer is implemented in terms of the previous:

```js
class ComputedSignal extends Signal {
  constructor(fn) {
    super(undefined);
    this._stop = reactive(() => this.set(fn()));
  }
  stop() { this._stop(); }
}

function computed(fn) {
  return new ComputedSignal(fn);
}
```

## Limitations

- Only `.get()` accesses are tracked — reading `signal.value` directly skips tracking.
- Async operations: signals accessed after an `await` won't be tracked, because the tracking context has already been torn down.

## Comparison to React

| Aspect | Zero `computed()` | React `useMemo` |
|---|---|---|
| Dependencies | Automatic | Manual list |
| Refactoring | Safe — deps auto-update | Error-prone — must update list |
| Dynamic deps | Detected automatically | Must enumerate all possibilities |
| Re-render scope | Just this value | Entire component |
| Tear-down | `.stop()` | Tied to component lifecycle |
