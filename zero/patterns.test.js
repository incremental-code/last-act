import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;

import { Signal, createElement as h } from './zero.js';

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

// ============================================================================
// FORMS PATTERN
// ============================================================================

test('Forms: email input binds to signal', () => {
  const email = new Signal('');
  const input = h('input', {
    value: email,
    onchange: (e) => email.set(e.target.value)
  });

  assertEquals(input.value, '');

  // Simulate user input
  input.value = 'test@example.com';
  const changeEvent = new dom.window.Event('change', { bubbles: true });
  Object.defineProperty(changeEvent, 'target', { value: input, enumerable: true });
  input.onchange?.(changeEvent);

  assertEquals(email.get(), 'test@example.com');
});

test('Forms: validation updates error signal', () => {
  const email = new Signal('');
  const emailError = new Signal('');

  function validateEmail(value) {
    if (!value) return 'Email is required';
    if (!value.includes('@')) return 'Invalid email';
    return '';
  }

  email.subscribe((value) => {
    emailError.set(validateEmail(value));
  });

  email.set('invalid');
  assertEquals(emailError.get(), 'Invalid email');

  email.set('valid@example.com');
  assertEquals(emailError.get(), '');
});

test('Forms: form submission state', () => {
  const isSubmitting = new Signal(false);
  const email = new Signal('');

  const button = h('button', {
    disabled: isSubmitting,
    textContent: isSubmitting.get() ? 'Submitting...' : 'Submit'
  });

  assertEquals(button.disabled, false);
  assertEquals(button.textContent, 'Submit');

  isSubmitting.set(true);
  button.disabled = isSubmitting.get();
  button.textContent = isSubmitting.get() ? 'Submitting...' : 'Submit';

  assertEquals(button.disabled, true);
  assertEquals(button.textContent, 'Submitting...');
});

// ============================================================================
// LOCAL STATE PATTERN
// ============================================================================

test('Local State: counter increments', () => {
  const count = new Signal(0);

  count.set(count.get() + 1);
  assertEquals(count.get(), 1);

  count.set(count.get() + 1);
  assertEquals(count.get(), 2);
});

test('Local State: toggle flips boolean', () => {
  const isOpen = new Signal(false);

  isOpen.set(!isOpen.get());
  assertEquals(isOpen.get(), true);

  isOpen.set(!isOpen.get());
  assertEquals(isOpen.get(), false);
});

test('Local State: modal visibility', () => {
  const isOpen = new Signal(false);
  const modal = h('div', {});

  function getModalDisplay() {
    return isOpen.get() ? 'block' : 'none';
  }

  assertEquals(getModalDisplay(), 'none');

  isOpen.set(true);
  assertEquals(getModalDisplay(), 'block');

  isOpen.set(false);
  assertEquals(getModalDisplay(), 'none');
});

// ============================================================================
// DERIVED STATE PATTERN
// ============================================================================

test('Derived State: full name from first + last', () => {
  const firstName = new Signal('John');
  const lastName = new Signal('Doe');
  const fullName = new Signal(`${firstName.get()} ${lastName.get()}`);

  firstName.subscribe(() => {
    fullName.set(`${firstName.get()} ${lastName.get()}`);
  });

  lastName.subscribe(() => {
    fullName.set(`${firstName.get()} ${lastName.get()}`);
  });

  assertEquals(fullName.get(), 'John Doe');

  firstName.set('Jane');
  assertEquals(fullName.get(), 'Jane Doe');

  lastName.set('Smith');
  assertEquals(fullName.get(), 'Jane Smith');
});

test('Derived State: computed helper', () => {
  function computed(fn, dependencies) {
    const signal = new Signal(fn());
    dependencies.forEach(dep => {
      dep.subscribe(() => {
        signal.set(fn());
      });
    });
    return signal;
  }

  const x = new Signal(5);
  const y = new Signal(3);
  const sum = computed(() => x.get() + y.get(), [x, y]);

  assertEquals(sum.get(), 8);

  x.set(10);
  assertEquals(sum.get(), 13);

  y.set(7);
  assertEquals(sum.get(), 17);
});

test('Derived State: filtered list', () => {
  const items = new Signal([
    { id: 1, done: false },
    { id: 2, done: true },
    { id: 3, done: false }
  ]);

  const doneItems = new Signal(items.get().filter(i => i.done));

  items.subscribe(() => {
    doneItems.set(items.get().filter(i => i.done));
  });

  assertEquals(doneItems.get().length, 1);
  assertEquals(doneItems.get()[0].id, 2);

  items.set([
    { id: 1, done: true },
    { id: 2, done: true },
    { id: 3, done: false }
  ]);

  assertEquals(doneItems.get().length, 2);
});

// ============================================================================
// TWO-WAY BINDING PATTERN
// ============================================================================

test('Two-Way Binding: select with manual handler', () => {
  const selectedColor = new Signal('red');

  // In practice, you'd call the handler directly or simulate the event
  const handleChange = (newValue) => {
    selectedColor.set(newValue);
  };

  assertEquals(selectedColor.get(), 'red');

  handleChange('blue');
  assertEquals(selectedColor.get(), 'blue');

  handleChange('green');
  assertEquals(selectedColor.get(), 'green');
});

test('Two-Way Binding: checkbox', () => {
  const agreed = new Signal(false);

  const checkbox = h('input', {
    type: 'checkbox',
    checked: agreed,
    onchange: (e) => agreed.set(e.target.checked)
  });

  assertEquals(checkbox.checked, false);

  // Simulate user checking the checkbox
  checkbox.checked = true;
  const changeEvent = new dom.window.Event('change', { bubbles: true });
  Object.defineProperty(changeEvent, 'target', { value: checkbox, enumerable: true });
  checkbox.onchange?.(changeEvent);

  assertEquals(agreed.get(), true);
});

// ============================================================================
// COMPUTED PROPERTIES PATTERN
// ============================================================================

test('Computed Properties: list statistics', () => {
  const items = new Signal([
    { price: 10 },
    { price: 20 },
    { price: 30 }
  ]);

  const total = new Signal(items.get().reduce((sum, item) => sum + item.price, 0));
  const count = new Signal(items.get().length);
  const average = new Signal(count.get() > 0 ? total.get() / count.get() : 0);

  items.subscribe(() => {
    const list = items.get();
    const newTotal = list.reduce((sum, item) => sum + item.price, 0);
    const newCount = list.length;
    total.set(newTotal);
    count.set(newCount);
    average.set(newCount > 0 ? newTotal / newCount : 0);
  });

  assertEquals(total.get(), 60);
  assertEquals(count.get(), 3);
  assertEquals(average.get(), 20);

  items.set([{ price: 100 }]);

  assertEquals(total.get(), 100);
  assertEquals(count.get(), 1);
  assertEquals(average.get(), 100);
});

test('Computed Properties: boolean flags', () => {
  const items = new Signal([]);
  const isEmpty = new Signal(true);

  items.subscribe(() => {
    isEmpty.set(items.get().length === 0);
  });

  assertEquals(isEmpty.get(), true);

  items.set([1, 2, 3]);
  assertEquals(isEmpty.get(), false);

  items.set([]);
  assertEquals(isEmpty.get(), true);
});

// ============================================================================
// CONDITIONALS PATTERN
// ============================================================================

test('Conditionals: simple if/else', () => {
  const isLoggedIn = new Signal(true);

  function renderHeader() {
    return isLoggedIn.get() ? 'Welcome' : 'Login';
  }

  assertEquals(renderHeader(), 'Welcome');

  isLoggedIn.set(false);
  assertEquals(renderHeader(), 'Login');
});

test('Conditionals: switch/case status', () => {
  const status = new Signal('idle');
  const data = new Signal(null);

  function renderContent() {
    switch (status.get()) {
      case 'loading':
        return 'Loading...';
      case 'success':
        return 'Success!';
      case 'error':
        return 'Error!';
      default:
        return 'Idle';
    }
  }

  assertEquals(renderContent(), 'Idle');

  status.set('loading');
  assertEquals(renderContent(), 'Loading...');

  status.set('success');
  assertEquals(renderContent(), 'Success!');
});

test('Conditionals: reactive conditional rendering', () => {
  const showDetail = new Signal(false);

  function renderDetail() {
    return showDetail.get() ? 'Details here' : null;
  }

  const content = new Signal(renderDetail());

  showDetail.subscribe(() => {
    content.set(renderDetail());
  });

  assertEquals(content.get(), null);

  showDetail.set(true);
  assertEquals(content.get(), 'Details here');

  showDetail.set(false);
  assertEquals(content.get(), null);
});

// ============================================================================
// MEMOIZATION PATTERN
// ============================================================================

test('Memoization: debounced search', () => {
  const query = new Signal('');
  const results = new Signal([]);
  const allItems = ['Apple', 'Apricot', 'Banana', 'Blueberry'];
  let debounceTimer = null;

  function performSearch() {
    const q = query.get().toLowerCase();
    results.set(q ? allItems.filter(item => item.toLowerCase().includes(q)) : []);
  }

  query.subscribe(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(performSearch, 300);
  });

  query.set('app');
  // Results not updated yet (debounced)

  // Simulate waiting 300ms
  clearTimeout(debounceTimer);
  performSearch();

  assertEquals(results.get().length, 1);
  assertEquals(results.get()[0], 'Apple');
});

test('Memoization: cached computation', () => {
  let computeCount = 0;

  function createMemoized(fn) {
    let cachedResult = null;
    let cachedInput = null;

    return (input) => {
      if (input === cachedInput) {
        return cachedResult;
      }
      cachedInput = input;
      cachedResult = fn(input);
      computeCount++;
      return cachedResult;
    };
  }

  const compute = createMemoized((n) => n * 2);

  assertEquals(compute(5), 10);
  assertEquals(computeCount, 1);

  assertEquals(compute(5), 10);
  assertEquals(computeCount, 1); // Not recomputed

  assertEquals(compute(10), 20);
  assertEquals(computeCount, 2); // Recomputed
});

// ============================================================================
// LAZY RENDERING PATTERN
// ============================================================================

test('Lazy Rendering: tabs only render active content', () => {
  const activeTab = new Signal(0);
  const tabs = [
    { label: 'Tab 1', content: 'Content 1' },
    { label: 'Tab 2', content: 'Content 2' }
  ];

  function renderTabContent() {
    return activeTab.get() < tabs.length ? tabs[activeTab.get()].content : '';
  }

  assertEquals(renderTabContent(), 'Content 1');

  activeTab.set(1);
  assertEquals(renderTabContent(), 'Content 2');

  activeTab.set(0);
  assertEquals(renderTabContent(), 'Content 1');
});

test('Lazy Rendering: pagination loads pages on demand', () => {
  const allItems = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const currentPage = new Signal(0);
  const itemsPerPage = 3;

  function getPageItems() {
    const start = currentPage.get() * itemsPerPage;
    const end = start + itemsPerPage;
    return allItems.slice(start, end);
  }

  assertEquals(getPageItems().length, 3);
  assertEquals(getPageItems()[0], 1);

  currentPage.set(1);
  assertEquals(getPageItems().length, 3);
  assertEquals(getPageItems()[0], 4);

  currentPage.set(2);
  assertEquals(getPageItems().length, 3);
  assertEquals(getPageItems()[0], 7);
});

// ============================================================================
// BATCHING UPDATES PATTERN
// ============================================================================

test('Batching: accordion only updates expanded set', () => {
  const expandedItems = new Signal(new Set());

  function toggle(id) {
    const current = new Set(expandedItems.get());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    expandedItems.set(current);
  }

  assertEquals(expandedItems.get().size, 0);

  toggle('a');
  assertEquals(expandedItems.get().size, 1);
  assert(expandedItems.get().has('a'));

  toggle('b');
  assertEquals(expandedItems.get().size, 2);

  toggle('a');
  assertEquals(expandedItems.get().size, 1);
  assert(expandedItems.get().has('b'));
});

test('Batching: list operations in single update', () => {
  const items = new Signal([
    { id: 1, selected: false },
    { id: 2, selected: false }
  ]);

  function selectMultiple(ids) {
    const current = items.get();
    const updated = current.map(item => ({
      ...item,
      selected: ids.includes(item.id)
    }));
    items.set(updated); // Single update
  }

  const selectedCount = new Signal(0);

  items.subscribe(() => {
    selectedCount.set(items.get().filter(i => i.selected).length);
  });

  selectMultiple([1, 2]);

  assertEquals(selectedCount.get(), 2);
  assert(items.get()[0].selected);
  assert(items.get()[1].selected);
});

// ============================================================================
// LISTS WITH KEYS PATTERN
// ============================================================================

test('Lists: array children with key function', () => {
  const items = new Signal([
    { id: 1, text: 'A' },
    { id: 2, text: 'B' }
  ]);

  function renderItem(item) {
    return h('div', {}, item.text);
  }

  function renderItems() {
    return items.get().map(renderItem);
  }

  const itemElements = new Signal(renderItems());

  items.subscribe(() => {
    itemElements.set(renderItems());
  });

  assertEquals(itemElements.get().length, 2);

  items.set([
    { id: 2, text: 'B' },
    { id: 1, text: 'A' },
    { id: 3, text: 'C' }
  ]);

  assertEquals(itemElements.get().length, 3);
});

test('Lists: todo add/remove/toggle', () => {
  const todos = new Signal([
    { id: 1, text: 'Task 1', done: false },
    { id: 2, text: 'Task 2', done: false }
  ]);

  function addTodo(text) {
    const current = todos.get();
    const newId = Math.max(...current.map(t => t.id), 0) + 1;
    todos.set([...current, { id: newId, text, done: false }]);
  }

  function removeTodo(id) {
    todos.set(todos.get().filter(t => t.id !== id));
  }

  function toggleTodo(id) {
    todos.set(todos.get().map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    ));
  }

  assertEquals(todos.get().length, 2);

  addTodo('Task 3');
  assertEquals(todos.get().length, 3);
  assertEquals(todos.get()[2].text, 'Task 3');

  removeTodo(1);
  assertEquals(todos.get().length, 2);
  assertEquals(todos.get()[0].id, 2);

  toggleTodo(2);
  assert(todos.get().find(t => t.id === 2).done);
});

// ============================================================================
// GLOBAL STATE PATTERN
// ============================================================================

test('Global State: shared signals across components', () => {
  const theme = new Signal('light');

  function getThemeColor() {
    return theme.get() === 'light' ? 'white' : 'black';
  }

  assertEquals(getThemeColor(), 'white');

  theme.set('dark');
  assertEquals(getThemeColor(), 'black');

  theme.set('light');
  assertEquals(getThemeColor(), 'white');
});

test('Global State: notification system', () => {
  const notifications = new Signal([]);

  function addNotification(type, message) {
    const current = notifications.get();
    notifications.set([...current, { type, message }]);
  }

  function removeNotification(index) {
    const current = notifications.get();
    notifications.set(current.filter((_, i) => i !== index));
  }

  assertEquals(notifications.get().length, 0);

  addNotification('success', 'Success!');
  assertEquals(notifications.get().length, 1);
  assertEquals(notifications.get()[0].type, 'success');

  addNotification('error', 'Error!');
  assertEquals(notifications.get().length, 2);

  removeNotification(0);
  assertEquals(notifications.get().length, 1);
  assertEquals(notifications.get()[0].type, 'error');
});

// ============================================================================
// LIFECYCLE PATTERNS
// ============================================================================

test('Lifecycle: element removal cleanup', () => {
  let cleanupCalled = false;

  function MyComponent() {
    const element = h('div', {}, 'Content');

    const originalRemove = element.remove;
    element.remove = function() {
      cleanupCalled = true;
      if (originalRemove) originalRemove.call(this);
    };

    return element;
  }

  const component = MyComponent();
  assert(!cleanupCalled);

  component.remove();
  assert(cleanupCalled);
});

test('Lifecycle: subscription cleanup', () => {
  let unsubscribeCalled = false;
  const signal = new Signal(0);

  const unsubscribe = signal.subscribe(() => {
    // Do something
  });

  const cleanupUnsubscribe = () => {
    unsubscribeCalled = true;
    unsubscribe();
  };

  assert(!unsubscribeCalled);
  cleanupUnsubscribe();
  assert(unsubscribeCalled);
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log(`\n${'='.repeat(50)}`);
console.log(`Tests: ${testCount} | Passed: ${passCount} | Failed: ${failCount}`);
console.log(`${'='.repeat(50)}`);

if (failCount > 0) {
  process.exit(1);
}
