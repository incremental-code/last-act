import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;

import { Signal, createElement } from './zero.js';

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

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Tests: ${testCount} | Passed: ${passCount} | Failed: ${failCount}`);
console.log(`${'='.repeat(50)}`);

if (failCount > 0) {
  process.exit(1);
}
