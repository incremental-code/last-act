# Zero Framework - Complete

## Overview

Zero is a **minimal, signal-based UI framework** (199 lines, 0.87 KB gzipped). Components render once, props update reactively via signals.

## What's New: Reactive Signal Children

✨ **Major improvement:** Signals now work reactively as children and in props throughout the framework.

```js
// Clean, intuitive API
const count = new Signal(0);
h('div', {}, 'Count: ', count)  // Updates automatically

count.set(5); // Text updates to "Count: 5"
```

## Complete Package

### Core Library
- **zero.js** — 199 lines, complete framework
- **dist/zero.min.js** — 1.93 KB minified
- **dist/zero.min.js.gz** — 0.87 KB gzipped

### Tests (60/60 passing ✓)
- **zero.test.js** — 32 core library tests
- **patterns.test.js** — 28 pattern tests

### Documentation
- **docs/** — Complete API reference
  - Signals, Components, Props, Lists
- **docs/patterns/** — 13 detailed pattern guides
  - Forms, State, Binding, Performance, Advanced
  - React comparison included

### Examples
- **patterns-example.html** — Interactive 12-pattern demo
- **example.html** — Simple counter/todo example

## Quick Start

### Installation
```bash
npm install
npm run build    # Build minified version
npm run test:all # Run all tests
```

### Basic Usage
```js
import { Signal, createElement as h } from './zero.js';

const count = new Signal(0);

const app = h('div', {},
  h('p', {}, 'Count: ', count),
  h('button', { onclick: () => count.set(count.get() + 1) }, '+')
);

document.body.appendChild(app);
```

### Signals Work Everywhere
```js
// As children (scalar)
h('div', {}, 'Label: ', signal)

// In props
h('div', { textContent: signal })
h('div', { style: { color: signal } })
h('input', { value: signal })

// In attributes
h('button', { attributes: { 'data-id': signal } })

// As children (arrays)
const items = new Signal(['a', 'b', 'c']);
h('ul', { key: (i) => i }, items)
```

## Patterns Included

| Pattern | Lines | Status |
|---------|-------|--------|
| Forms | 30 | ✓ Complete |
| Local State | 60 | ✓ Complete |
| Derived State | 40 | ✓ Complete |
| Two-Way Binding | 15 | ✓ Complete |
| Computed Properties | 25 | ✓ Complete |
| Conditionals | 35 | ✓ Complete |
| Memoization | 50 | ✓ Complete |
| Lazy Rendering | 45 | ✓ Complete |
| Batching | 35 | ✓ Complete |
| Lists | 40 | ✓ Complete |
| Global State | 50 | ✓ Complete |
| Lifecycle | 55 | ✓ Complete |
| Web Components | 40 | ✓ Complete |

## Framework Characteristics

### ✅ What Zero Does Well
- Direct DOM manipulation (no virtual DOM)
- Minimal API surface
- Reactive signals throughout
- Tiny bundle size
- No dependencies
- Works with web components

### ⚠️ Trade-offs
- No automatic re-render optimization
- No built-in error boundaries
- No synthetic events (raw DOM)
- Requires manual subscriptions for derived state (but signals make this easy)

## File Structure
```
zero/
├── zero.js                    # Framework (199 lines)
├── zero.test.js              # 32 tests
├── patterns.test.js           # 28 tests
├── patterns-example.html      # Interactive examples
├── example.html               # Simple example
├── build.js                   # Build script
├── dist/
│   ├── zero.min.js            # Minified
│   └── zero.min.js.gz         # Gzipped
├── docs/
│   ├── index.md               # API overview
│   ├── signals.md             # Signal guide
│   ├── components.md          # Component guide
│   ├── props.md               # Props guide
│   ├── lists.md               # Lists guide
│   └── patterns/              # 13 pattern guides
└── README.md                  # This file
```

## Commands

```bash
npm run test        # Core tests
npm run test:patterns   # Pattern tests
npm run test:all   # All tests
npm run build      # Build minified version
```

## Key Improvements Made

1. ✅ **Signals in children** — Now reactive (was manual subscription)
2. ✅ **Signal in textContent prop** — Works out of the box
3. ✅ **Signal in style props** — Updates automatically
4. ✅ **60 comprehensive tests** — Full coverage
5. ✅ **13 pattern guides** — Complete documentation
6. ✅ **12 working examples** — Interactive demo
7. ✅ **React comparison** — Side-by-side with hooks

## Zero vs React

| Feature | Zero | React |
|---------|------|-------|
| Virtual DOM | ❌ Direct | ✓ Yes |
| Bundle Size | 0.87 KB | 42 KB |
| API Surface | Signals | Hooks + Context |
| Learning Curve | Minimal | Moderate |
| Ecosystem | None | Huge |
| Performance (simple) | ⚡ Better | Fast |
| Performance (complex) | Good | Better |
| Team Familiarity | New | Widespread |

## Use Zero For

- Simple interactive UIs
- Web components integration
- Learning signal-based reactive programming
- Minimal dependency requirements
- Performance-sensitive applications

## Use React For

- Large SPAs with many features
- Team familiar with React
- Need for extensive tooling/ecosystem
- Complex component optimization
- Server-side rendering

## Next Steps

1. **Explore patterns:** Open `patterns-example.html` in browser
2. **Read documentation:** Start with `docs/index.md`
3. **Try a pattern:** Pick one from `docs/patterns/`
4. **Build something:** Start with `example.html` template
5. **Run tests:** `npm run test:all` to verify everything

## Testing

All tests pass:
- Core library: 32/32 ✓
- Patterns: 28/28 ✓
- Total: 60/60 ✓

## License

MIT - Use freely in any project
