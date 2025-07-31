# Mini React

A minimal React-like library that supports `useState` and `useEffect` hooks with virtual DOM diffing.

## Features

- ✅ Functional components
- ✅ `useState` hook for state management
- ✅ `useEffect` hook for side effects
- ✅ Virtual DOM diffing for efficient updates
- ✅ Component composition
- ✅ Event handling
- ✅ **Per-component hook state tracking** (fixes conditional component rendering issues)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

## Example

The example includes a ConditionalTest component that demonstrates:
- State management with `useState`
- Side effects with `useEffect` (console logging)
- Conditional component rendering that maintains hook state correctly
- Component composition with reusable Button components
- Event handling

## How it Works

This mini React implementation includes:
- A simple virtual DOM representation
- Tree diffing algorithm for efficient DOM updates
- **Component fiber system** for per-component state tracking
- Hook system for state and effects
- Component rendering and re-rendering
- Event delegation

### Component Fiber System

The library uses a component fiber system (similar to React's fiber architecture) to track state per component instance rather than globally. This ensures that:

- Hook state is isolated per component
- Conditional component rendering doesn't break hook order
- Multiple instances of the same component maintain separate state
- Effects are properly scoped to their components

## Project Structure

```
├── last.js                    # Core library implementation
├── test-conditional.js        # Working conditional component rendering test
├── test-broken-conditional.js # Broken conditional hook calls test
├── index.js                   # Original example application
├── index.html                 # HTML entry point
├── package.json               # Project configuration
└── README.md                  # This file
``` 

## Key Improvements

### Conditional Rendering Fix

The original implementation had a critical flaw where global hook state tracking would break with conditional component rendering:

```javascript
function ParentComponent({ showChild }) {
  const [parentState, setParentState] = useState(0);
  
  return (
    <div>
      <p>Parent: {parentState}</p>
      {showChild && <ChildComponent />}  // This would break with global hooks
    </div>
  );
}

function ChildComponent() {
  const [childState, setChildState] = useState('child');  // Hook order changes!
  return <p>Child: {childState}</p>;
}
```

With the new per-component fiber system, each component instance maintains its own hook state, preventing this issue.

### Important Distinction: Conditional Hooks vs Conditional Components

**❌ BROKEN - Conditional Hook Calls (Cannot be fixed):**
```javascript
function BrokenComponent({ showExtra }) {
  const [count, setCount] = useState(0);
  
  if (showExtra) {
    const [extra, setExtra] = useState('extra');  // Conditional hook call
  }
  
  const [final, setFinal] = useState('final');  // This gets wrong state!
}
```

**✅ FIXED - Conditional Component Rendering:**
```javascript
function WorkingComponent({ showChild }) {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      {showChild && <ChildComponent />}  // Conditional component - works!
    </div>
  );
}
```

The fiber system only fixes the second case. The first case will always break because it violates the Rules of Hooks.

## TODO

- [ ] Support function components in createElement (partially implemented)
- [ ] Optimize rendering to only update when props change
- [ ] Add SSR support
- [ ] Support class components
- [ ] Support nested web components
- [ ] Add useContext() hook
- [ ] Add useCallback() hook
- [ ] Add useReducer() hook
- [ ] Support style objects (not just strings)
- [ ] Add key prop support for efficient list rendering
- [ ] Improve component fiber reuse and cleanup

## Questions

Is it possible to do declarative data dependency specification in NextJS?
