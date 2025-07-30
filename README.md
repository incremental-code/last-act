# Mini React

A minimal React-like library that supports `useState` and `useEffect` hooks with virtual DOM diffing.

## Features

- ✅ Functional components
- ✅ `useState` hook for state management
- ✅ `useEffect` hook for side effects
- ✅ Virtual DOM diffing for efficient updates
- ✅ Component composition
- ✅ Event handling

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

The example includes a Counter component that demonstrates:
- State management with `useState`
- Side effects with `useEffect` (updating document title)
- Component composition with a reusable Button component
- Event handling

## How it Works

This mini React implementation includes:
- A simple virtual DOM representation
- Tree diffing algorithm for efficient DOM updates
- Hook system for state and effects
- Component rendering and re-rendering
- Event delegation

## Project Structure

```
├── mini-react.js    # Core library implementation
├── index.js         # Example application
├── index.html       # HTML entry point
├── package.json     # Project configuration
└── README.md        # This file
``` 


## TODO

createElement should support accepting function components.
Renderer should only render if props have changed.
SSR hooks.
Support class components.
Support nested web components.
useContext()
useCallback()
useReducer()