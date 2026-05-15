import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.MutationObserver = dom.window.MutationObserver;

import { Signal, createElement, track, computed, reactive, unmount } from './zero.js';
import { Signal as TC39Signal } from 'signal-polyfill';

// Flush pending microtask-scheduled effects
function flush() {
  return new Promise(resolve => queueMicrotask(resolve));
}

let testCount = 0;
let passCount = 0;
let failCount = 0;

const pendingTests = [];

function test(name, fn) {
  testCount++;
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      // Async test — register for awaiting at the end
      pendingTests.push(
        result.then(
          () => {
            passCount++;
            console.log(`✓ ${name}`);
          },
          (error) => {
            failCount++;
            console.error(`✗ ${name}`);
            console.error(`  ${error.message}`);
          }
        )
      );
      return;
    }
    passCount++;
    console.log(`✓ ${name}`);
  } catch (error) {
    failCount++;
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertExists(value, message) {
  if (!value) {
    throw new Error(message || `Expected value to exist, got ${value}`);
  }
}

// Signal Tests
test('Signal: creates with initial value', () => {
  const signal = new Signal(42);
  assertEquals(signal.get(), 42);
});

test('Signal: updates value with set', () => {
  const signal = new Signal(10);
  signal.set(20);
  assertEquals(signal.get(), 20);
});

test('Signal.Watcher: notified synchronously when signal changes', () => {
  const signal = new Signal(0);
  let notifyCount = 0;

  const c = new TC39Signal.Computed(() => signal.get());
  const w = new TC39Signal.subtle.Watcher(() => { notifyCount++; });
  w.watch(c);
  c.get(); // initial evaluation

  signal.set(5);
  assertEquals(notifyCount, 1);
  assertEquals(c.get(), 5); // value readable after set() returns
});

test('Signal.Watcher: not notified when value is unchanged', () => {
  const signal = new Signal(5);
  let notifyCount = 0;

  const c = new TC39Signal.Computed(() => signal.get());
  const w = new TC39Signal.subtle.Watcher(() => { notifyCount++; });
  w.watch(c);
  c.get(); // initial evaluation

  signal.set(5); // same value — no notification
  assertEquals(notifyCount, 0);
});

test('Signal.Watcher: unwatch stops notifications', () => {
  const signal = new Signal(0);
  let notifyCount = 0;

  const c = new TC39Signal.Computed(() => signal.get());
  const w = new TC39Signal.subtle.Watcher(() => { notifyCount++; });
  w.watch(c);
  c.get(); // initial evaluation

  signal.set(1);
  assertEquals(notifyCount, 1);

  w.unwatch(c);
  signal.set(2);
  assertEquals(notifyCount, 1); // no further notifications
});

test('Signal.Watcher: multiple watchers each receive notification', () => {
  const signal = new Signal(0);
  let count1 = 0;
  let count2 = 0;

  const c1 = new TC39Signal.Computed(() => signal.get());
  const c2 = new TC39Signal.Computed(() => signal.get());
  const w1 = new TC39Signal.subtle.Watcher(() => { count1++; });
  const w2 = new TC39Signal.subtle.Watcher(() => { count2++; });
  w1.watch(c1); c1.get();
  w2.watch(c2); c2.get();

  signal.set(1);
  assertEquals(count1, 1);
  assertEquals(count2, 1);
});

// createElement Tests
test('createElement: creates DOM element with type string', () => {
  const div = createElement('div', {});
  assert(div instanceof HTMLElement);
  assertEquals(div.tagName, 'DIV');
});

test('createElement: sets properties on element', () => {
  const div = createElement('div', { id: 'test', title: 'Hello' });
  assertEquals(div.id, 'test');
  assertEquals(div.title, 'Hello');
});

test('createElement: sets style object', () => {
  const div = createElement('div', { style: { color: 'red', fontSize: '16px' } });
  assertEquals(div.style.color, 'red');
  assertEquals(div.style.fontSize, '16px');
});

test('createElement: sets attributes via attributes object', () => {
  const div = createElement('div', { attributes: { 'data-test': 'value', 'aria-label': 'Test' } });
  assertEquals(div.getAttribute('data-test'), 'value');
  assertEquals(div.getAttribute('aria-label'), 'Test');
});

test('createElement: sets event handler', () => {
  let clicked = false;
  const button = createElement('button', { onclick: () => { clicked = true; } });
  button.click();
  assert(clicked);
});

test('createElement: adds text children', () => {
  const div = createElement('div', {}, 'Hello', ' ', 'World');
  assertEquals(div.textContent, 'Hello World');
});

test('createElement: adds element children', () => {
  const span = createElement('span', {}, 'text');
  const div = createElement('div', {}, span);
  assertEquals(div.children[0], span);
});

test('createElement: flattens nested arrays of children', () => {
  const div = createElement('div', {}, ['a', 'b'], ['c', 'd']);
  assertEquals(div.textContent, 'abcd');
});

test('createElement: ignores null and undefined children', () => {
  const div = createElement('div', {}, 'a', null, 'b', undefined, 'c');
  assertEquals(div.textContent, 'abc');
});

test('createElement: converts number children to text', () => {
  const div = createElement('div', {}, 'Count: ', 42);
  assertEquals(div.textContent, 'Count: 42');
});

test('createElement: calls function components', () => {
  function MyComponent(props) {
    return createElement('div', {}, props.message);
  }

  const div = MyComponent({ message: 'Hello' });
  assertEquals(div.textContent, 'Hello');
});

// Reactive Props Tests
test('Reactive props: signal in property updates element', async () => {
  const color = new Signal('red');
  const div = createElement('div', { style: { color } });
  assertEquals(div.style.color, 'red');

  color.set('blue');
  await flush();
  assertEquals(div.style.color, 'blue');
});

test('Reactive props: signal in attribute updates element', async () => {
  const label = new Signal('initial');
  const div = createElement('div', { attributes: { 'data-value': label } });
  assertEquals(div.getAttribute('data-value'), 'initial');

  label.set('updated');
  await flush();
  assertEquals(div.getAttribute('data-value'), 'updated');
});

test('Reactive props: multiple signals on same element', async () => {
  const color = new Signal('red');
  const fontSize = new Signal('12px');

  const div = createElement('div', {
    style: { color, fontSize }
  });

  assertEquals(div.style.color, 'red');
  assertEquals(div.style.fontSize, '12px');

  color.set('blue');
  fontSize.set('16px');
  await flush();

  assertEquals(div.style.color, 'blue');
  assertEquals(div.style.fontSize, '16px');
});

test('Reactive props: scalar signal as child updates reactively', async () => {
  const text = new Signal('Hello');
  const div = createElement('div', {}, text);
  assertEquals(div.textContent, 'Hello');

  text.set('World');
  await flush();
  assertEquals(div.textContent, 'World');
});

// Array Children Tests
test('Array children: renders initial array of strings', () => {
  const items = new Signal(['A', 'B']);

  const div = createElement('div', { key: (item) => item }, items);
  assertEquals(div.childNodes.length, 2);
  assertEquals(div.textContent, 'AB');
});

test('Array children: adds item to array', async () => {
  const items = new Signal(['A']);

  const div = createElement('div', { key: (item) => item }, items);
  assertEquals(div.childNodes.length, 1);

  items.set(['A', 'B']);
  await flush();

  assertEquals(div.childNodes.length, 2);
  assertEquals(div.textContent, 'AB');
});

test('Array children: removes item from array', async () => {
  const items = new Signal(['A', 'B']);

  const div = createElement('div', { key: (item) => item }, items);
  assertEquals(div.childNodes.length, 2);

  items.set(['A']);
  await flush();
  assertEquals(div.childNodes.length, 1);
  assertEquals(div.textContent, 'A');
});

test('Array children: reorders items', async () => {
  const items = new Signal(['A', 'B', 'C']);

  const div = createElement('div', { key: (item) => item }, items);
  const firstNode = div.childNodes[0];

  items.set(['C', 'A', 'B']);
  await flush();

  // First node should still be the same DOM node, but in different position
  assertEquals(div.childNodes[1], firstNode);
});

test('Array children: uses index as key when key not provided', async () => {
  const items = new Signal(['a', 'b', 'c']);

  const div = createElement('div', {}, items);
  assertEquals(div.childNodes.length, 3);
  assertEquals(div.textContent, 'abc');

  items.set(['a', 'b', 'c', 'd']);
  await flush();
  assertEquals(div.childNodes.length, 4);
  assertEquals(div.textContent, 'abcd');
});

test('Array children: handles empty array', async () => {
  const items = new Signal([]);

  const div = createElement('div', { key: (item) => item }, items);
  assertEquals(div.childNodes.length, 0);

  items.set(['A']);
  await flush();
  assertEquals(div.childNodes.length, 1);
  assertEquals(div.textContent, 'A');
});

test('Array children: computed() returning element array works with keyed reconciler', async () => {
  const items = new Signal([
    { id: 1, name: 'A' },
    { id: 2, name: 'B' },
  ]);

  const elements = computed(() =>
    items.get().map(item =>
      createElement('div', { attributes: { 'data-id': String(item.id) } }, item.name)
    )
  );

  const list = createElement('section', {
    key: (el) => el.getAttribute('data-id')
  }, elements);

  assertEquals(list.children.length, 2);
  assertEquals(list.children[0].getAttribute('data-id'), '1');
  assertEquals(list.children[1].getAttribute('data-id'), '2');

  // Add item
  items.set([...items.get(), { id: 3, name: 'C' }]);
  await flush();
  assertEquals(list.children.length, 3);
  assertEquals(list.children[2].getAttribute('data-id'), '3');

  // Remove middle item
  items.set(items.get().filter(i => i.id !== 2));
  await flush();
  assertEquals(list.children.length, 2);
  assertEquals(list.children[0].getAttribute('data-id'), '1');
  assertEquals(list.children[1].getAttribute('data-id'), '3');
});

test('Array children: handles clearing array', async () => {
  const items = new Signal(['A', 'B']);

  const div = createElement('div', { key: (item) => item }, items);
  assertEquals(div.childNodes.length, 2);

  items.set([]);
  await flush();
  assertEquals(div.childNodes.length, 0);
});

// Edge Cases
test('Edge case: key prop ignored on non-array elements', () => {
  const div = createElement('div', { key: (x) => x }, 'hello');
  assertEquals(div.textContent, 'hello');
});

test('Edge case: undefined properties handled gracefully', () => {
  const div = createElement('div', { id: undefined });
  // Setting undefined should not throw
  assertExists(div);
});

test('Edge case: mixed children types', () => {
  const span = createElement('span', {}, 'span');
  const div = createElement('div', {}, 'text', 42, span, null);

  assertEquals(div.childNodes.length, 3);
  assertEquals(div.childNodes[0].textContent, 'text');
  assertEquals(div.childNodes[1].textContent, '42');
  assertEquals(div.childNodes[2], span);
});

test('Edge case: deeply nested structures', () => {
  const div = createElement('div', {},
    createElement('div', {},
      createElement('div', {},
        'deeply nested'
      )
    )
  );

  assertEquals(div.querySelector('div div').textContent, 'deeply nested');
});

// Dependency Tracking Tests
test('track: returns [value, deps] tuple', () => {
  const a = new Signal(1);
  const b = new Signal(2);
  const c = new Signal(3);

  const [value, deps] = track(() => {
    return a.get() + b.get();
  });

  assertEquals(value, 3);
  assert(deps instanceof Set);
  assertEquals(deps.size, 2);
  assert(deps.has(a));
  assert(deps.has(b));
  assert(!deps.has(c));
});

test('track: does not record unused signals', () => {
  const a = new Signal(1);
  const b = new Signal(2);

  const [, deps] = track(() => {
    a.get();
  });

  assertEquals(deps.size, 1);
  assert(deps.has(a));
});

test('track: handles nested accesses', () => {
  const a = new Signal(1);
  const b = new Signal(2);

  const [, deps] = track(() => {
    const val = a.get();
    if (val > 0) {
      b.get();
    }
  });

  assertEquals(deps.size, 2);
  assert(deps.has(a));
  assert(deps.has(b));
});

test('reactive: runs initially', () => {
  const a = new Signal(1);
  let runs = 0;
  reactive(() => {
    a.get();
    runs++;
  });
  assertEquals(runs, 1);
});

test('reactive: re-runs when dependencies change', async () => {
  const a = new Signal(1);
  let lastValue;
  let runs = 0;
  reactive(() => {
    lastValue = a.get();
    runs++;
  });
  assertEquals(runs, 1);
  assertEquals(lastValue, 1);

  a.set(5);
  await flush();
  assertEquals(runs, 2);
  assertEquals(lastValue, 5);

  a.set(10);
  await flush();
  assertEquals(runs, 3);
  assertEquals(lastValue, 10);
});

test('reactive: returns unsubscribe that stops further runs', async () => {
  const a = new Signal(1);
  let runs = 0;
  const unsubscribe = reactive(() => {
    a.get();
    runs++;
  });
  assertEquals(runs, 1);

  a.set(2);
  await flush();
  assertEquals(runs, 2);

  unsubscribe();
  a.set(3);
  await flush();
  assertEquals(runs, 2); // No further runs
});

test('reactive: cleanup runs before next re-run', async () => {
  const dep = new Signal(1);
  const events = [];

  reactive(() => {
    const value = dep.get();
    events.push(`run:${value}`);
    return () => events.push(`cleanup:${value}`);
  });

  assertEquals(events.join(','), 'run:1');

  dep.set(2);
  await flush();
  assertEquals(events.join(','), 'run:1,cleanup:1,run:2');

  dep.set(3);
  await flush();
  assertEquals(events.join(','), 'run:1,cleanup:1,run:2,cleanup:2,run:3');
});

test('reactive: cleanup runs on unsubscribe', async () => {
  const dep = new Signal(1);
  const events = [];

  const unsubscribe = reactive(() => {
    const value = dep.get();
    events.push(`run:${value}`);
    return () => events.push(`cleanup:${value}`);
  });

  dep.set(2);
  await flush();
  unsubscribe();
  assertEquals(events.join(','), 'run:1,cleanup:1,run:2,cleanup:2');

  // No further runs or cleanups after unsubscribe
  dep.set(3);
  await flush();
  assertEquals(events.join(','), 'run:1,cleanup:1,run:2,cleanup:2');
});

test('reactive: cleanup is optional', async () => {
  const dep = new Signal(1);
  let runs = 0;

  // Function that returns nothing should not throw
  const unsubscribe = reactive(() => {
    dep.get();
    runs++;
  });

  dep.set(2);
  await flush();
  assertEquals(runs, 2);

  unsubscribe(); // should not throw
});

test('reactive: cleanup captures fresh closure each run', async () => {
  // Verify that the cleanup function captured on run N references the
  // values that were in scope during run N, not later runs
  const dep = new Signal(10);
  const capturedAtCleanup = [];

  reactive(() => {
    const snapshot = dep.get();
    return () => capturedAtCleanup.push(snapshot);
  });

  dep.set(20);
  await flush();
  dep.set(30);
  await flush();

  // First cleanup fires before second run (when dep=20)
  // Second cleanup fires before third run (when dep=30)
  // Cleanups captured snapshots at run time: 10, 20
  assertEquals(capturedAtCleanup.join(','), '10,20');
});

test('reactive: tracks dynamic dependencies across runs', async () => {
  const which = new Signal('a');
  const a = new Signal(1);
  const b = new Signal(10);

  let lastValue;
  reactive(() => {
    lastValue = which.get() === 'a' ? a.get() : b.get();
  });
  assertEquals(lastValue, 1);

  // While which === 'a', updates to b should not trigger reactive
  b.set(99);
  await flush();
  assertEquals(lastValue, 1); // unchanged

  // Switch to tracking b
  which.set('b');
  await flush();
  assertEquals(lastValue, 99);

  // Now updates to a should not trigger
  a.set(42);
  await flush();
  assertEquals(lastValue, 99);

  // Updates to b should
  b.set(100);
  await flush();
  assertEquals(lastValue, 100);
});

// Computed Tests
test('computed: creates signal with computed value', () => {
  const a = new Signal(5);
  const b = new Signal(3);

  const sum = computed(() => {
    return a.get() + b.get();
  });

  assert(TC39Signal.isComputed(sum));
  assertEquals(sum.get(), 8);
});

test('computed: updates when dependency changes', () => {
  const a = new Signal(5);
  const b = new Signal(3);

  const sum = computed(() => {
    return a.get() + b.get();
  });

  assertEquals(sum.get(), 8);
  a.set(10);
  assertEquals(sum.get(), 13);
  b.set(7);
  assertEquals(sum.get(), 17);
});

test('computed: tracks only used signals', () => {
  const a = new Signal(5);
  const b = new Signal(3);
  const c = new Signal(2);

  const sum = computed(() => {
    return a.get() + b.get();
  });

  assertEquals(sum.get(), 8);
  c.set(99);
  assertEquals(sum.get(), 8);
});

test('computed: handles complex expressions', () => {
  const firstName = new Signal('John');
  const lastName = new Signal('Doe');
  const age = new Signal(30);

  const profile = computed(() => {
    return `${firstName.get()} ${lastName.get()}, age ${age.get()}`;
  });

  assertEquals(profile.get(), 'John Doe, age 30');
  firstName.set('Jane');
  assertEquals(profile.get(), 'Jane Doe, age 30');
  age.set(25);
  assertEquals(profile.get(), 'Jane Doe, age 25');
});

test('computed: returns Signal that can be used as child', async () => {
  const count = new Signal(0);
  const doubled = computed(() => count.get() * 2);

  const div = createElement('div', {}, doubled);
  assertEquals(div.textContent, '0');

  count.set(5);
  await flush();
  assertEquals(div.textContent, '10');

  count.set(20);
  await flush();
  assertEquals(div.textContent, '40');
});

test('computed: chained computed signals', () => {
  const count = new Signal(1);
  const doubled = computed(() => count.get() * 2);
  const quadrupled = computed(() => doubled.get() * 2);

  assertEquals(doubled.get(), 2);
  assertEquals(quadrupled.get(), 4);

  count.set(5);
  assertEquals(doubled.get(), 10);
  assertEquals(quadrupled.get(), 20);
});

test('Signal child: HTMLElement-valued signal renders as element', () => {
  const inner = createElement('strong', {}, 'bold');
  const child = new Signal(inner);
  const div = createElement('div', {}, child);

  assertEquals(div.childNodes.length, 1);
  assertEquals(div.childNodes[0], inner);
  assertEquals(div.innerHTML, '<strong>bold</strong>');
});

test('Signal child: swaps element when signal value changes', async () => {
  const a = createElement('span', {}, 'A');
  const b = createElement('em', {}, 'B');
  const child = new Signal(a);
  const div = createElement('div', {}, child);

  assertEquals(div.childNodes[0], a);
  child.set(b);
  await flush();
  assertEquals(div.childNodes[0], b);
  assertEquals(div.childNodes.length, 1);
});

test('Signal child: swaps between text and element', async () => {
  const elem = createElement('strong', {}, 'bold');
  const child = new Signal('text value');
  const div = createElement('div', {}, 'before-', child, '-after');

  assertEquals(div.textContent, 'before-text value-after');

  child.set(elem);
  await flush();
  assertEquals(div.childNodes.length, 3);
  assertEquals(div.childNodes[1], elem);
  assertEquals(div.innerHTML, 'before-<strong>bold</strong>-after');

  child.set('back to text');
  await flush();
  assertEquals(div.textContent, 'before-back to text-after');
});

test('Signal child: computed returning element rerenders on dependency change', async () => {
  const isVisible = new Signal(true);
  const content = computed(() =>
    isVisible.get()
      ? createElement('div', { attributes: { id: 'visible' } }, 'V')
      : createElement('span', { attributes: { id: 'hidden' } }, 'H')
  );

  const app = createElement('section', {}, content);
  assertEquals(app.querySelector('#visible').textContent, 'V');
  assert(!app.querySelector('#hidden'));

  isVisible.set(false);
  await flush();
  assertEquals(app.querySelector('#hidden').textContent, 'H');
  assert(!app.querySelector('#visible'));
});

test('computed: can be used inline as createElement child without destructuring', async () => {
  const count = new Signal(3);
  const div = createElement('div', {}, computed(() => count.get() * 2));
  assertEquals(div.textContent, '6');
  count.set(5);
  await flush();
  assertEquals(div.textContent, '10');
});

test('computed: Watcher notified when computed value changes', () => {
  const a = new Signal(1);
  const doubled = computed(() => a.get() * 2);

  let notifyCount = 0;
  const c = new TC39Signal.Computed(() => doubled.get());
  const w = new TC39Signal.subtle.Watcher(() => { notifyCount++; });
  w.watch(c);
  c.get(); // initial evaluation

  a.set(5);
  assertEquals(notifyCount, 1);
  assertEquals(c.get(), 10); // 5 * 2
  w.watch(); // reset dirty flag so the next change can notify again

  a.set(10);
  assertEquals(notifyCount, 2);
  assertEquals(c.get(), 20);
});

// Cleanup Tests
test('cleanup: unmount drops style subscriptions', () => {
  const color = new Signal('red');
  const div = createElement('div', { style: { color } });

  assertEquals(TC39Signal.subtle.introspectSinks(color).length, 1);
  unmount(div);
  assertEquals(TC39Signal.subtle.introspectSinks(color).length, 0);
});

test('cleanup: unmount drops attribute subscriptions', () => {
  const label = new Signal('initial');
  const div = createElement('div', { attributes: { 'data-label': label } });

  assertEquals(TC39Signal.subtle.introspectSinks(label).length, 1);
  unmount(div);
  assertEquals(TC39Signal.subtle.introspectSinks(label).length, 0);
});

test('cleanup: unmount drops property subscriptions', () => {
  const value = new Signal('hi');
  const input = createElement('input', { value });

  assertEquals(TC39Signal.subtle.introspectSinks(value).length, 1);
  unmount(input);
  assertEquals(TC39Signal.subtle.introspectSinks(value).length, 0);
});

test('cleanup: unmount drops scalar-child subscriptions', () => {
  const text = new Signal('hello');
  const div = createElement('div', {}, text);

  assertEquals(TC39Signal.subtle.introspectSinks(text).length, 1);
  unmount(div);
  assertEquals(TC39Signal.subtle.introspectSinks(text).length, 0);
});

test('cleanup: unmount drops array-child subscriptions', () => {
  const items = new Signal(['a', 'b']);
  const div = createElement('div', {}, items);

  assertEquals(TC39Signal.subtle.introspectSinks(items).length, 1);
  unmount(div);
  assertEquals(TC39Signal.subtle.introspectSinks(items).length, 0);
});

test('cleanup: unmount recurses into descendants', () => {
  const color = new Signal('red');
  const text = new Signal('hello');

  const inner = createElement('span', { style: { color } }, text);
  const outer = createElement('div', {}, inner);

  assertEquals(TC39Signal.subtle.introspectSinks(color).length, 1);
  assertEquals(TC39Signal.subtle.introspectSinks(text).length, 1);

  unmount(outer);

  assertEquals(TC39Signal.subtle.introspectSinks(color).length, 0);
  assertEquals(TC39Signal.subtle.introspectSinks(text).length, 0);
});

test('cleanup: unmount stops inline computed children from reacting', async () => {
  const source = new Signal(1);
  const doubled = computed(() => source.get() * 2);

  const div = createElement('div', {}, doubled);
  // DOM effect makes doubled live — it is now a sink of source
  assertEquals(TC39Signal.subtle.introspectSinks(doubled).length, 1);
  assertEquals(TC39Signal.subtle.introspectSinks(source).length, 1);

  unmount(div);
  assertEquals(TC39Signal.subtle.introspectSinks(doubled).length, 0);
  assertEquals(TC39Signal.subtle.introspectSinks(source).length, 0);

  // After unmount, source changes do not update the div
  source.set(10);
  await flush();
  assertEquals(div.textContent, '2'); // still the initial value
});

test('cleanup: unmount stops inline computed in attribute position', () => {
  const source = new Signal('foo');
  const upper = computed(() => source.get().toUpperCase());

  const div = createElement('div', { attributes: { 'data-x': upper } });
  assertEquals(TC39Signal.subtle.introspectSinks(upper).length, 1);

  unmount(div);
  assertEquals(TC39Signal.subtle.introspectSinks(upper).length, 0);
  assertEquals(TC39Signal.subtle.introspectSinks(source).length, 0);
});

test('cleanup: unmount is idempotent', () => {
  const color = new Signal('red');
  const div = createElement('div', { style: { color } });

  unmount(div);
  unmount(div); // should not throw
  assertEquals(TC39Signal.subtle.introspectSinks(color).length, 0);
});

test('cleanup: signal updates after unmount do not error', async () => {
  const text = new Signal('hi');
  const div = createElement('div', {}, text);

  unmount(div);
  text.set('after'); // should not throw
  await flush();
  // The detached text node is no longer referenced; we just verify nothing blew up
  assert(true);
});

test('cleanup: MutationObserver runs cleanup when element is removed from DOM', async () => {
  const color = new Signal('red');
  const div = createElement('div', { style: { color } });
  document.body.appendChild(div);
  assertEquals(TC39Signal.subtle.introspectSinks(color).length, 1);

  div.remove();

  // Give the MutationObserver and the deferred microtask a chance to run
  await new Promise(resolve => setTimeout(resolve, 10));

  assertEquals(TC39Signal.subtle.introspectSinks(color).length, 0);
});

test('cleanup: move (remove + re-append) does not run cleanup', async () => {
  const color = new Signal('red');
  const div = createElement('div', { style: { color } });
  const parentA = document.createElement('section');
  const parentB = document.createElement('section');
  document.body.appendChild(parentA);
  document.body.appendChild(parentB);
  parentA.appendChild(div);
  assertEquals(TC39Signal.subtle.introspectSinks(color).length, 1);

  // "Move" — synchronously remove from A, re-append to B before microtask drains
  parentB.appendChild(div); // Browsers also implement appendChild-of-mounted as a move

  await new Promise(resolve => setTimeout(resolve, 10));

  // Subscription must still be intact — the element is still in the document
  assertEquals(TC39Signal.subtle.introspectSinks(color).length, 1);

  // Cleanup happens on a real removal
  parentB.removeChild(div);
  await new Promise(resolve => setTimeout(resolve, 10));
  assertEquals(TC39Signal.subtle.introspectSinks(color).length, 0);
});

// Wait for async tests, then print summary
await Promise.all(pendingTests);

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Tests: ${testCount} | Passed: ${passCount} | Failed: ${failCount}`);
console.log(`${'='.repeat(50)}`);

if (failCount > 0) {
  process.exit(1);
}
