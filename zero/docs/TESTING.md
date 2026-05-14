# Testing Patterns

Zero includes comprehensive test suites for core functionality and common patterns.

## Running Tests

**Core library tests:**
```bash
npm test
```

**Pattern tests:**
```bash
npm run test:patterns
```

**All tests:**
```bash
npm run test:all
```

## Test Suites

### zero.test.js (32 tests)

Tests the core Zero framework:
- **Signal tests** — Creation, updates, subscriptions, unsubscribe behavior
- **Element creation** — DOM element creation, property/style/attribute setting, event handlers, children rendering
- **Reactive props** — Signals in properties, styles, attributes, updates on changes
- **Array children** — Initial rendering, adding/removing/reordering items, key functions, empty arrays
- **Edge cases** — Mixed children types, nested structures, undefined properties

All pass ✓

### patterns.test.js (28 tests)

Tests all major patterns demonstrated in the library:

**Forms (3 tests)**
- Input binding to signals
- Email validation
- Form submission state

**Local State (3 tests)**
- Counter increments
- Toggle boolean
- Modal visibility

**Derived State (3 tests)**
- Full name from first + last name
- Computed helper function
- Filtered lists

**Two-Way Binding (2 tests)**
- Select input handling
- Checkbox binding

**Computed Properties (2 tests)**
- List statistics (total, count, average)
- Boolean flags

**Conditionals (3 tests)**
- Simple if/else
- Switch/case status
- Reactive conditional rendering

**Memoization (2 tests)**
- Debounced search
- Cached computation

**Lazy Rendering (2 tests)**
- Tabs only showing active content
- Pagination loading pages

**Batching Updates (2 tests)**
- Accordion with batch state
- List operations in single update

**Lists with Keys (2 tests)**
- Array children with key function
- Todo add/remove/toggle

**Global State (2 tests)**
- Shared signals across components
- Notification system

**Lifecycle (2 tests)**
- Element removal cleanup
- Subscription cleanup

All pass ✓

## Test Coverage

The tests cover:

✓ Signal creation and updates  
✓ Reactive prop binding  
✓ Array diffing with keys  
✓ Form validation  
✓ State management patterns  
✓ Derived values  
✓ Conditional rendering  
✓ Performance optimizations (debouncing, memoization)  
✓ Lazy rendering  
✓ Batched updates  
✓ List management  
✓ Global state  
✓ Lifecycle and cleanup  

## Using Tests as Examples

Each test file contains working code examples you can reference:
- `zero.test.js` — Usage of core Signal and createElement APIs
- `patterns.test.js` — Implementation of all major patterns

## Testing in Your Projects

When testing Zero apps:

**1. Create signals directly:**
```js
const count = new Signal(0);
count.set(5);
assert(count.get() === 5);
```

**2. Test derived values:**
```js
const result = new Signal(compute(input.get()));
input.subscribe(() => result.set(compute(input.get())));

input.set(10);
assert(result.get() === expectedValue);
```

**3. Test conditional rendering:**
```js
function renderContent() {
  return isVisible.get() ? 'visible' : null;
}

const content = new Signal(renderContent());
isVisible.subscribe(() => content.set(renderContent()));

isVisible.set(true);
assert(content.get() === 'visible');
```

**4. Test list operations:**
```js
const items = new Signal([]);
items.set([...items.get(), newItem]);
assert(items.get().length === 1);
```

## Why Not Use Existing Testing Frameworks?

Zero's test approach is minimal because:
- Tests can be run standalone with Node + jsdom
- No test runner configuration needed
- Tests are easy to read and debug
- Perfect for validating patterns and behavior

For larger projects, you can integrate Zero with Jest, Vitest, or any test framework that supports jsdom.

## Tips for Testing Zero Code

1. **Test signals, not components** — Since components render once, test the state/signals directly
2. **Subscribe to verify updates** — Manually call subscribers to test derived state
3. **Mock side effects** — Use setTimeout/promises to test async patterns
4. **Verify DOM state** — Check that element properties update when signals change
5. **Test cleanup** — Ensure subscriptions are unsubscribed and elements are removed

## Next Steps

- Run the tests: `npm run test:all`
- Review [patterns-example.html](../patterns-example.html) for interactive examples
- Check [patterns/](../patterns/) directory for detailed pattern guides
