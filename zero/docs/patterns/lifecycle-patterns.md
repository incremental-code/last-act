# Lifecycle Patterns

Setup, cleanup, and resource management in Zero.

## What Zero cleans up for you automatically

When you mount an element to the document and later remove it, Zero **automatically**:

- Unsubscribes from any signals bound to styles, attributes, properties, or children of that element
- Recursively cleans descendants the same way
- Calls `.stop()` on any `computed()` signals you passed inline (so they stop reacting to their own upstream signals)

This happens via a single document-wide `MutationObserver`. You don't need to do anything for it.

```js
const color = new Signal('red');
const div = createElement('div', { style: { color } });

document.body.appendChild(div);
// color.subscribers.size === 1

div.remove();
// Asynchronously (next microtask): color.subscribers.size === 0
```

For tests or for explicit teardown, you can call `unmount(element)` directly to run the cleanup synchronously.

## What you still need to clean up yourself

Anything you allocated *outside* the framework's subscription bookkeeping:

- `setInterval` / `setTimeout`
- `addEventListener` on `window`, `document`, or external elements
- Open WebSockets, EventSources, or other external resources
- In-flight `fetch` requests
- Third-party library subscriptions

For these, use `reactive()` and return a cleanup function:

## Interval / Timer Lifecycle

```js
import { Signal, reactive } from './zero.js';

const isRunning = new Signal(false);
const time = new Signal(0);

reactive(() => {
  if (!isRunning.get()) return;

  const id = setInterval(() => time.set(time.get() + 1), 1000);
  return () => clearInterval(id);
});
```

When `isRunning` flips:
- false → true: starts the interval
- true → false: cleanup runs → `clearInterval` → re-runs the effect (which immediately returns)

When the whole `reactive()` is torn down (e.g. via its returned unsubscribe), the most recent cleanup runs.

## Event Listener Lifecycle

```js
const windowWidth = new Signal(window.innerWidth);

reactive(() => {
  const handler = () => windowWidth.set(window.innerWidth);
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
});
```

## AbortController-Backed Fetch

```js
const userId = new Signal(1);
const userData = new Signal(null);

reactive(() => {
  const controller = new AbortController();

  fetch(`/api/users/${userId.get()}`, { signal: controller.signal })
    .then(r => r.json())
    .then(data => userData.set(data))
    .catch(err => { if (err.name !== 'AbortError') throw err; });

  return () => controller.abort();
});
```

Rapid changes to `userId` abort the previous request before the next one starts. Only the latest response wins.

## Pairing Reactives with Elements

If a `reactive()` belongs to a specific element's lifecycle, tie them together by capturing the unsubscribe in a cleanup closure on the element. The easiest way is `unmount`:

```js
import { unmount } from './zero.js';

function Counter() {
  const count = new Signal(0);

  const stop = reactive(() => {
    const id = setInterval(() => count.set(count.get() + 1), 1000);
    return () => clearInterval(id);
  });

  const el = createElement('div', {}, count);
  // When the framework cleans up this element, also stop the reactive.
  // (Standard userland trick: register cleanup against the element's symbol-keyed slot.)
  // For most apps, just trusting MutationObserver-driven cleanup is enough.

  return el;
}
```

If the element is removed from the DOM, the MutationObserver fires cleanup for the element — but the `reactive()` you started inside `Counter` isn't owned by that element, so it'll keep running. Until Zero exposes a richer "scope" API, the explicit pattern is:

```js
function Counter() {
  const count = new Signal(0);
  const stop = reactive(() => { /* ... */ });

  const el = createElement('div', {}, count);
  el.addEventListener('zero:cleanup', stop); // or manage stop yourself
  return el;
}
```

For most use cases, putting external resources inside the `reactive()` and letting it tear down naturally when you call its `unsubscribe()` is enough. Long-lived global subscriptions (like `window` resize) typically live for the page lifetime anyway.

## Global Subscriptions

For things meant to live for the whole page (telemetry, global keyboard shortcuts, online/offline detection), just write them at module load:

```js
window.addEventListener('online', () => isOnline.set(true));
window.addEventListener('offline', () => isOnline.set(false));
```

No cleanup needed — they should outlive any individual component.

## Summary

| What you allocate | Who cleans it up |
|---|---|
| `style`/`attribute`/`property` bound to a signal | Zero (on element removal) |
| Signal as a child of an element | Zero (on element removal) |
| `computed()` passed inline to `createElement` | Zero (via `.stop()` on element removal) |
| `setInterval` / `setTimeout` in a `reactive()` | You (return cleanup from the effect) |
| `addEventListener` in a `reactive()` | You (return cleanup from the effect) |
| `fetch` in a `reactive()` | You (return `controller.abort` as cleanup) |
| A top-level `reactive()` not tied to an element | You (call its returned unsubscribe) |
| Module-level globals (resize, online) | Nothing — they live for the page |
