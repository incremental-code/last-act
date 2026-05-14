# Zero Patterns - Testing & Examples

Complete test suite and interactive examples for all Zero patterns.

## Quick Start

```bash
# Run all tests
npm run test:all

# Run core tests only
npm test

# Run patterns tests only
npm run test:patterns
```

**Results:** 60 tests, 60 passing ✓

## What's Included

### Test Files

**zero.test.js** (32 tests)
- Core Signal and createElement functionality
- Reactive prop binding
- Array children with keys
- Edge cases and DOM manipulation

**patterns.test.js** (28 tests)
- Forms (validation, submission, input binding)
- Local State (counter, toggle, modal)
- Derived State (computed values, filtering)
- Two-Way Binding (select, checkbox)
- Computed Properties (stats, boolean flags)
- Conditionals (if/else, switch/case, reactive)
- Memoization (debouncing, caching)
- Lazy Rendering (tabs, pagination)
- Batching Updates (accordion, list operations)
- Lists with Keys (add/remove/toggle)
- Global State (shared signals, notifications)
- Lifecycle (cleanup, subscriptions)

### Documentation

**docs/patterns/** — 12 detailed pattern guides
- [Forms](docs/patterns/forms.md) — Input validation, submission, multi-field forms
- [Conditionals](docs/patterns/conditionals.md) — Show/hide, switch/case, class toggling
- [Local State](docs/patterns/local-state.md) — Counter, Toggle, Modal, Tabs, Accordion, Dropdown, Pagination
- [Derived State](docs/patterns/derived-state.md) — Computed values, helpers, filtering, memoization
- [Global State](docs/patterns/global-state.md) — Shared signals, event bus, localStorage sync
- [Memoization](docs/patterns/memoization.md) — Caching, debouncing, throttling, batching
- [Lazy Rendering](docs/patterns/lazy-rendering.md) — Tabs, pagination, virtual scrolling, intersection observer
- [Batching Updates](docs/patterns/batching-updates.md) — Grouping changes, transactions, debounced batching
- [Two-Way Binding](docs/patterns/two-way-binding.md) — Form inputs, selects, checkboxes, syncing fields
- [Computed Properties](docs/patterns/computed-properties.md) — Derived signals, aggregation, chaining
- [Lifecycle Patterns](docs/patterns/lifecycle-patterns.md) — Setup, cleanup, timers, fetch, animations, observers
- [Tree Diffing](docs/patterns/tree-diffing.md) — Array diffing with keys, performance considerations
- [Custom Elements](docs/patterns/custom-elements.md) — Web components, shadow DOM, third-party integration
- [React Comparison](docs/patterns/react-comparison.md) — Side-by-side comparison with React hooks

### Interactive Examples

**patterns-example.html** — Working demos of all patterns
- Forms with validation
- Counter, toggle, modal components
- Derived state and computed properties
- Two-way color binding
- Conditional rendering with async
- Debounced search
- Tabs and accordion
- Todo list with add/remove/toggle
- Global notification system

## Test Results

```
Core Library Tests (zero.test.js):
✓ 32 tests passed

Pattern Tests (patterns.test.js):
✓ 28 tests passed

Total: 60/60 ✓
```

## Key Patterns Tested

### 1. Forms
```js
const email = new Signal('');
email.subscribe(value => {
  errors.set(validateEmail(value));
});
```
Tests: Validation, submission state, input binding

### 2. Local State
```js
const count = new Signal(0);
count.set(count.get() + 1);
```
Tests: Counter, toggle, modal visibility

### 3. Derived State
```js
const firstName = new Signal('John');
const lastName = new Signal('Doe');
const fullName = new Signal(`${firstName.get()} ${lastName.get()}`);
firstName.subscribe(() => {
  fullName.set(`${firstName.get()} ${lastName.get()}`);
});
```
Tests: Computed values, filtering, derived signals

### 4. Two-Way Binding
```js
const selectedColor = new Signal('red');
const select = h('select', {
  onchange: (e) => selectedColor.set(e.target.value)
});
```
Tests: Select, checkbox, form syncing

### 5. Computed Properties
```js
const items = new Signal([{price: 10}, {price: 20}]);
const total = new Signal(items.get().reduce((sum, i) => sum + i.price, 0));
items.subscribe(() => {
  total.set(items.get().reduce((sum, i) => sum + i.price, 0));
});
```
Tests: Statistics, aggregation, boolean flags

### 6. Conditionals
```js
function renderContent() {
  return status.get() === 'loading' ? 'Loading...' : 'Done';
}
const content = new Signal(renderContent());
status.subscribe(() => content.set(renderContent()));
```
Tests: If/else, switch/case, reactive updates

### 7. Memoization
```js
let cachedResult = null;
let cachedInput = null;
function memoized(input) {
  if (input === cachedInput) return cachedResult;
  cachedInput = input;
  cachedResult = compute(input);
  return cachedResult;
}
```
Tests: Caching, debouncing, performance

### 8. Lazy Rendering
```js
const activeTab = new Signal(0);
function getPageItems() {
  const start = activeTab.get() * pageSize;
  return items.slice(start, start + pageSize);
}
```
Tests: Tabs, pagination, on-demand rendering

### 9. Batching Updates
```js
function selectMultiple(ids) {
  const current = items.get();
  const updated = current.map(item => ({
    ...item,
    selected: ids.includes(item.id)
  }));
  items.set(updated); // Single update
}
```
Tests: Grouped state changes, transactions

### 10. Lists with Keys
```js
const items = new Signal([
  { id: 1, text: 'A' },
  { id: 2, text: 'B' }
]);
function renderItems() {
  return items.get().map(renderItem);
}
const itemElements = new Signal(renderItems());
items.subscribe(() => {
  itemElements.set(renderItems());
});
```
Tests: Array diffing, add/remove/reorder

### 11. Global State
```js
// store.js
export const theme = new Signal('light');
export const notifications = new Signal([]);

// component.js
import { theme, notifications } from './store.js';
```
Tests: Shared signals, event bus patterns

### 12. Lifecycle
```js
function MyComponent() {
  const element = h('div', {});
  const originalRemove = element.remove;
  element.remove = function() {
    cleanup();
    originalRemove.call(this);
  };
  return element;
}
```
Tests: Setup, cleanup, subscriptions

## Running Tests

### All Tests
```bash
npm run test:all
```

### Specific Test Suite
```bash
npm test                  # Core library
npm run test:patterns     # Pattern implementations
```

### Individual Test
Edit the test file and comment out tests:
```js
// test('Pattern name', () => { ... });
```

## Framework Stats

- **Core Size:** 192 lines
- **Minified:** 1.93 KB
- **Gzipped:** 0.87 KB
- **Test Coverage:** 60 tests across all major patterns
- **Examples:** 13 working pattern examples

## Next Steps

1. **Explore patterns:** Open `patterns-example.html` in browser
2. **Read docs:** Check `docs/patterns/` for detailed guides
3. **Run tests:** `npm run test:all` to verify everything works
4. **Build your app:** Use patterns as templates for your features

## See Also

- [Zero Framework Documentation](docs/index.md)
- [Interactive Patterns Example](patterns-example.html)
- [React Comparison Guide](docs/patterns/react-comparison.md)
