import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;

import { Signal, createElement, track, computed, reactive } from './zero.js';

let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  testCount++;
  try {
    fn();
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

test('Signal: notifies subscribers on change', () => {
  const signal = new Signal(0);
  let callCount = 0;
  let lastValue;

  signal.subscribe((value) => {
    callCount++;
    lastValue = value;
  });

  signal.set(5);
  assertEquals(callCount, 1);
  assertEquals(lastValue, 5);
});

test('Signal: does not notify if value unchanged', () => {
  const signal = new Signal(5);
  let callCount = 0;

  signal.subscribe(() => {
    callCount++;
  });

  signal.set(5);
  assertEquals(callCount, 0);
});

test('Signal: unsubscribe works', () => {
  const signal = new Signal(0);
  let callCount = 0;

  const unsubscribe = signal.subscribe(() => {
    callCount++;
  });

  signal.set(1);
  unsubscribe();
  signal.set(2);

  assertEquals(callCount, 1);
});

test('Signal: multiple subscribers', () => {
  const signal = new Signal(0);
  let count1 = 0;
  let count2 = 0;

  signal.subscribe(() => count1++);
  signal.subscribe(() => count2++);

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
test('Reactive props: signal in property updates element', () => {
  const color = new Signal('red');
  const div = createElement('div', { style: { color } });
  assertEquals(div.style.color, 'red');

  color.set('blue');
  assertEquals(div.style.color, 'blue');
});

test('Reactive props: signal in attribute updates element', () => {
  const label = new Signal('initial');
  const div = createElement('div', { attributes: { 'data-value': label } });
  assertEquals(div.getAttribute('data-value'), 'initial');

  label.set('updated');
  assertEquals(div.getAttribute('data-value'), 'updated');
});

test('Reactive props: multiple signals on same element', () => {
  const color = new Signal('red');
  const fontSize = new Signal('12px');

  const div = createElement('div', {
    style: { color, fontSize }
  });

  assertEquals(div.style.color, 'red');
  assertEquals(div.style.fontSize, '12px');

  color.set('blue');
  fontSize.set('16px');

  assertEquals(div.style.color, 'blue');
  assertEquals(div.style.fontSize, '16px');
});

test('Reactive props: scalar signal as child updates reactively', () => {
  const text = new Signal('Hello');
  const div = createElement('div', {}, text);
  assertEquals(div.textContent, 'Hello');

  text.set('World');
  assertEquals(div.textContent, 'World');
});

// Array Children Tests
test('Array children: renders initial array of strings', () => {
  const items = new Signal(['A', 'B']);

  const div = createElement('div', { key: (item) => item }, items);
  assertEquals(div.childNodes.length, 2);
  assertEquals(div.textContent, 'AB');
});

test('Array children: adds item to array', () => {
  const items = new Signal(['A']);

  const div = createElement('div', { key: (item) => item }, items);
  assertEquals(div.childNodes.length, 1);

  items.set(['A', 'B']);

  assertEquals(div.childNodes.length, 2);
  assertEquals(div.textContent, 'AB');
});

test('Array children: removes item from array', () => {
  const items = new Signal(['A', 'B']);

  const div = createElement('div', { key: (item) => item }, items);
  assertEquals(div.childNodes.length, 2);

  items.set(['A']);
  assertEquals(div.childNodes.length, 1);
  assertEquals(div.textContent, 'A');
});

test('Array children: reorders items', () => {
  const items = new Signal(['A', 'B', 'C']);

  const div = createElement('div', { key: (item) => item }, items);
  const firstNode = div.childNodes[0];

  items.set(['C', 'A', 'B']);

  // First node should still be the same DOM node, but in different position
  assertEquals(div.childNodes[1], firstNode);
});

test('Array children: uses index as key when key not provided', () => {
  const items = new Signal(['a', 'b', 'c']);

  const div = createElement('div', {}, items);
  assertEquals(div.childNodes.length, 3);
  assertEquals(div.textContent, 'abc');

  items.set(['a', 'b', 'c', 'd']);
  assertEquals(div.childNodes.length, 4);
  assertEquals(div.textContent, 'abcd');
});

test('Array children: handles empty array', () => {
  const items = new Signal([]);

  const div = createElement('div', { key: (item) => item }, items);
  assertEquals(div.childNodes.length, 0);

  items.set(['A']);
  assertEquals(div.childNodes.length, 1);
  assertEquals(div.textContent, 'A');
});

test('Array children: handles clearing array', () => {
  const items = new Signal(['A', 'B']);

  const div = createElement('div', { key: (item) => item }, items);
  assertEquals(div.childNodes.length, 2);

  items.set([]);
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

test('reactive: re-runs when dependencies change', () => {
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
  assertEquals(runs, 2);
  assertEquals(lastValue, 5);

  a.set(10);
  assertEquals(runs, 3);
  assertEquals(lastValue, 10);
});

test('reactive: returns unsubscribe that stops further runs', () => {
  const a = new Signal(1);
  let runs = 0;
  const unsubscribe = reactive(() => {
    a.get();
    runs++;
  });
  assertEquals(runs, 1);

  a.set(2);
  assertEquals(runs, 2);

  unsubscribe();
  a.set(3);
  assertEquals(runs, 2); // No further runs
});

test('reactive: cleanup runs before next re-run', () => {
  const dep = new Signal(1);
  const events = [];

  reactive(() => {
    const value = dep.get();
    events.push(`run:${value}`);
    return () => events.push(`cleanup:${value}`);
  });

  assertEquals(events.join(','), 'run:1');

  dep.set(2);
  assertEquals(events.join(','), 'run:1,cleanup:1,run:2');

  dep.set(3);
  assertEquals(events.join(','), 'run:1,cleanup:1,run:2,cleanup:2,run:3');
});

test('reactive: cleanup runs on unsubscribe', () => {
  const dep = new Signal(1);
  const events = [];

  const unsubscribe = reactive(() => {
    const value = dep.get();
    events.push(`run:${value}`);
    return () => events.push(`cleanup:${value}`);
  });

  dep.set(2);
  unsubscribe();
  assertEquals(events.join(','), 'run:1,cleanup:1,run:2,cleanup:2');

  // No further runs or cleanups after unsubscribe
  dep.set(3);
  assertEquals(events.join(','), 'run:1,cleanup:1,run:2,cleanup:2');
});

test('reactive: cleanup is optional', () => {
  const dep = new Signal(1);
  let runs = 0;

  // Function that returns nothing should not throw
  const unsubscribe = reactive(() => {
    dep.get();
    runs++;
  });

  dep.set(2);
  assertEquals(runs, 2);

  unsubscribe(); // should not throw
});

test('reactive: cleanup captures fresh closure each run', () => {
  // Verify that the cleanup function captured on run N references the
  // values that were in scope during run N, not later runs
  const dep = new Signal(10);
  const capturedAtCleanup = [];

  reactive(() => {
    const snapshot = dep.get();
    return () => capturedAtCleanup.push(snapshot);
  });

  dep.set(20);
  dep.set(30);

  // First cleanup fires before second run (when dep=20)
  // Second cleanup fires before third run (when dep=30)
  // Cleanups captured snapshots at run time: 10, 20
  assertEquals(capturedAtCleanup.join(','), '10,20');
});

test('reactive: tracks dynamic dependencies across runs', () => {
  const which = new Signal('a');
  const a = new Signal(1);
  const b = new Signal(10);

  let lastValue;
  reactive(() => {
    lastValue = which.get() === 'a' ? a.get() : b.get();
  });
  assertEquals(lastValue, 1);

  // While which === 'a', updates to b should not trigger reactive
  let runsBeforeBSet = lastValue;
  b.set(99);
  assertEquals(lastValue, runsBeforeBSet); // unchanged

  // Switch to tracking b
  which.set('b');
  assertEquals(lastValue, 99);

  // Now updates to a should not trigger
  a.set(42);
  assertEquals(lastValue, 99);

  // Updates to b should
  b.set(100);
  assertEquals(lastValue, 100);
});

// Computed Tests
test('computed: creates signal with computed value', () => {
  const a = new Signal(5);
  const b = new Signal(3);

  const sum = computed(() => {
    return a.get() + b.get();
  });

  assert(sum instanceof Signal);
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

test('computed: returns Signal that can be used as child', () => {
  const count = new Signal(0);
  const doubled = computed(() => count.get() * 2);

  const div = createElement('div', {}, doubled);
  assertEquals(div.textContent, '0');

  count.set(5);
  assertEquals(div.textContent, '10');

  count.set(20);
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

test('Signal child: swaps element when signal value changes', () => {
  const a = createElement('span', {}, 'A');
  const b = createElement('em', {}, 'B');
  const child = new Signal(a);
  const div = createElement('div', {}, child);

  assertEquals(div.childNodes[0], a);
  child.set(b);
  assertEquals(div.childNodes[0], b);
  assertEquals(div.childNodes.length, 1);
});

test('Signal child: swaps between text and element', () => {
  const elem = createElement('strong', {}, 'bold');
  const child = new Signal('text value');
  const div = createElement('div', {}, 'before-', child, '-after');

  assertEquals(div.textContent, 'before-text value-after');

  child.set(elem);
  assertEquals(div.childNodes.length, 3);
  assertEquals(div.childNodes[1], elem);
  assertEquals(div.innerHTML, 'before-<strong>bold</strong>-after');

  child.set('back to text');
  assertEquals(div.textContent, 'before-back to text-after');
});

test('Signal child: computed returning element rerenders on dependency change', () => {
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
  assertEquals(app.querySelector('#hidden').textContent, 'H');
  assert(!app.querySelector('#visible'));
});

test('computed: stop() halts further recomputation', () => {
  const a = new Signal(1);
  const doubled = computed(() => a.get() * 2);

  assertEquals(doubled.get(), 2);
  a.set(5);
  assertEquals(doubled.get(), 10);

  doubled.stop();
  a.set(100);
  assertEquals(doubled.get(), 10); // Stays at last computed value
});

test('computed: result is instanceof Signal (works with existing checks)', () => {
  const a = new Signal(1);
  const c = computed(() => a.get() * 2);
  assert(c instanceof Signal);
});

test('computed: can be used inline as createElement child without destructuring', () => {
  const count = new Signal(3);
  const div = createElement('div', {}, computed(() => count.get() * 2));
  assertEquals(div.textContent, '6');
  count.set(5);
  assertEquals(div.textContent, '10');
});

test('computed: notifies its own subscribers', () => {
  const a = new Signal(1);
  const doubled = computed(() => a.get() * 2);

  let notified = 0;
  let lastValue;
  doubled.subscribe((v) => {
    notified++;
    lastValue = v;
  });

  a.set(5);
  assertEquals(notified, 1);
  assertEquals(lastValue, 10);

  a.set(10);
  assertEquals(notified, 2);
  assertEquals(lastValue, 20);
});

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Tests: ${testCount} | Passed: ${passCount} | Failed: ${failCount}`);
console.log(`${'='.repeat(50)}`);

if (failCount > 0) {
  process.exit(1);
}
