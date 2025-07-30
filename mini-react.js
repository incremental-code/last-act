/**
 * Mini React - A minimal React-like library implementation
 * 
 * This library provides a simplified version of React's core functionality:
 * - Virtual DOM with diffing algorithm
 * - Functional components with hooks
 * - useState and useEffect hooks
 * - Event handling
 * - Component rendering and re-rendering
 * 
 * @author Mini React Implementation
 * @version 1.0.0
 */

// ============================================================================
// GLOBAL STATE MANAGEMENT
// ============================================================================

/** @type {Function|null} Currently executing component function */
let currentComponent = null;

/** @type {number} Index for tracking hook calls within a component */
let hookIndex = 0;

/** @type {Array} Array to store hook state values */
let hooks = [];

/** @type {Array} Array to store useEffect callbacks and metadata */
let effects = [];

/** @type {HTMLElement|null} Root DOM container for the application */
let rootContainer = null;

/** @type {Function|null} Root component function */
let rootComponent = null;

/** @type {Object|null} Previous virtual DOM tree for diffing */
let prevVdom = null;

// ============================================================================
// CORE REACT-LIKE FUNCTIONS
// ============================================================================

/**
 * Creates a virtual DOM element (similar to React.createElement)
 * 
 * @param {string|Function} type - The type of element (tag name or component function)
 * @param {Object|null} props - Properties/attributes for the element
 * @param {...any} children - Child elements or text nodes
 * @returns {Object} Virtual DOM element object
 * 
 * @example
 * createElement('div', { className: 'container' }, 'Hello World')
 * createElement(MyComponent, { title: 'Example' })
 */
export function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      // Flatten children array and filter out null/undefined values
      children: children.flat().filter(child => child != null)
    }
  };
}

/**
 * Renders a component into a DOM container (similar to ReactDOM.render)
 * 
 * @param {Function} component - The root component function to render
 * @param {HTMLElement} container - DOM element to render into
 */
export function render(component, container) {
  rootContainer = container;
  rootComponent = component;
  rerender();
}

// ============================================================================
// DOM CREATION AND MANIPULATION
// ============================================================================

/**
 * Creates a real DOM element from a virtual DOM node
 * 
 * @param {Object|string|number} node - Virtual DOM node or primitive value
 * @returns {HTMLElement|Text} Real DOM element or text node
 */
function createDom(node) {
  // Handle text nodes and numbers
  if (typeof node === 'string' || typeof node === 'number') {
    return document.createTextNode(node);
  }
  
  // Create DOM element
  const el = document.createElement(node.type);
  
  if (node.props) {
    // Set attributes and event listeners
    for (const [key, value] of Object.entries(node.props)) {
      if (key === 'children') continue; // Skip children, handled separately
      
      if (key.startsWith('on') && typeof value === 'function') {
        // Handle event listeners (e.g., onClick -> click)
        const eventName = key.slice(2).toLowerCase();
        el.addEventListener(eventName, value);
      } else {
        // Handle regular attributes
        el.setAttribute(key, value);
      }
    }
    
    // Recursively create child elements
    if (Array.isArray(node.props.children)) {
      node.props.children.forEach(child => {
        el.appendChild(createDom(child));
      });
    } else if (node.props.children) {
      el.appendChild(createDom(node.props.children));
    }
  }
  
  return el;
}

/**
 * Updates the DOM by comparing new and old virtual DOM nodes
 * Implements a simple diffing algorithm for efficient updates
 * 
 * @param {HTMLElement} parent - Parent DOM element
 * @param {Object|null} newNode - New virtual DOM node
 * @param {Object|null} oldNode - Old virtual DOM node
 * @param {number} index - Index of the child in parent
 */
function updateDom(parent, newNode, oldNode, index = 0) {
  // Case 1: New node doesn't exist - remove old node
  if (!oldNode) {
    parent.appendChild(createDom(newNode));
  }
  // Case 2: Old node doesn't exist - remove from DOM
  else if (!newNode) {
    parent.removeChild(parent.childNodes[index]);
  }
  // Case 3: Nodes are different - replace entire node
  else if (changed(newNode, oldNode)) {
    parent.replaceChild(createDom(newNode), parent.childNodes[index]);
  }
  // Case 4: Nodes are the same type - update props and diff children
  else if (newNode.type) {
    // Update element properties
    updateProps(parent.childNodes[index], newNode.props, oldNode.props);
    
    // Recursively diff children
    const newChildren = newNode.props?.children || [];
    const oldChildren = oldNode.props?.children || [];
    const max = Math.max(newChildren.length, oldChildren.length);
    
    for (let i = 0; i < max; i++) {
      updateDom(
        parent.childNodes[index],
        newChildren[i],
        oldChildren[i],
        i
      );
    }
  }
}

/**
 * Compares two virtual DOM nodes to determine if they're different
 * 
 * @param {Object|string|number} node1 - First node
 * @param {Object|string|number} node2 - Second node
 * @returns {boolean} True if nodes are different, false if they're the same
 */
function changed(node1, node2) {
  return (
    typeof node1 !== typeof node2 ||
    (typeof node1 === 'string' && node1 !== node2) ||
    node1.type !== node2.type
  );
}

/**
 * Updates DOM element properties by comparing old and new props
 * Handles attribute changes and event listener updates
 * 
 * @param {HTMLElement} dom - DOM element to update
 * @param {Object} newProps - New properties object
 * @param {Object} oldProps - Old properties object
 */
function updateProps(dom, newProps = {}, oldProps = {}) {
  // Remove old or changed event listeners
  for (const name in oldProps) {
    if (name.startsWith('on') && (!newProps[name] || newProps[name] !== oldProps[name])) {
      const eventName = name.slice(2).toLowerCase();
      dom.removeEventListener(eventName, oldProps[name]);
    }
  }
  
  // Set new or changed properties
  for (const name in newProps) {
    if (name === 'children') continue; // Skip children
    
    if (name.startsWith('on')) {
      // Handle event listeners
      if (!oldProps[name] || newProps[name] !== oldProps[name]) {
        const eventName = name.slice(2).toLowerCase();
        dom.addEventListener(eventName, newProps[name]);
      }
    } else {
      // Handle regular attributes
      if (dom.getAttribute(name) !== newProps[name]) {
        dom.setAttribute(name, newProps[name]);
      }
    }
  }
  
  // Remove old attributes that no longer exist
  for (const name in oldProps) {
    if (name !== 'children' && !(name in newProps)) {
      dom.removeAttribute(name);
    }
  }
}

// ============================================================================
// RENDERING AND RE-RENDERING
// ============================================================================

/**
 * Triggers a re-render of the entire component tree
 * Resets hook state and runs effects after rendering
 */
function rerender() {
  // Reset hook state for new render cycle
  hookIndex = 0;
  effects = [];
  currentComponent = rootComponent;
  
  // Generate new virtual DOM
  const vdom = currentComponent();
  
  // Initial render or update existing DOM
  if (prevVdom == null) {
    // First render - clear container and append new DOM
    rootContainer.innerHTML = '';
    rootContainer.appendChild(createDom(vdom));
  } else {
    // Subsequent renders - diff and update existing DOM
    updateDom(rootContainer, vdom, prevVdom);
  }
  
  // Store current VDOM for next diff
  prevVdom = vdom;
  
  // Run effects after DOM updates (similar to React's useEffect timing)
  setTimeout(runEffects, 0);
}

// ============================================================================
// HOOKS IMPLEMENTATION
// ============================================================================

/**
 * useState hook for managing component state
 * Similar to React's useState hook
 * 
 * @param {any|Function} initialValue - Initial state value or function that returns initial value
 * @returns {Array} Array containing [state, setState] tuple
 * 
 * @example
 * const [count, setCount] = useState(0);
 * const [user, setUser] = useState(() => ({ name: 'John', age: 30 }));
 */
export function useState(initialValue) {
  const idx = hookIndex;
  
  // Initialize hook state if it doesn't exist
  if (hooks.length <= idx) {
    const value = typeof initialValue === 'function' ? initialValue() : initialValue;
    hooks.push(value);
  }
  
  // Create setState function
  const setState = newValue => {
    const nextValue = typeof newValue === 'function' ? newValue(hooks[idx]) : newValue;
    hooks[idx] = nextValue;
    rerender(); // Trigger re-render when state changes
  };
  
  const value = hooks[idx];
  hookIndex++; // Move to next hook for this component
  
  return [value, setState];
}

/**
 * useEffect hook for handling side effects
 * Similar to React's useEffect hook
 * 
 * @param {Function} fn - Effect function to run
 * @param {Array} deps - Dependency array (optional)
 * 
 * @example
 * useEffect(() => {
 *   document.title = `Count: ${count}`;
 *   return () => console.log('Cleanup');
 * }, [count]);
 */
export function useEffect(fn, deps) {
  effects.push({
    fn,
    deps,
    lastDeps: undefined,
    cleanup: undefined,
    hasRun: false
  });
  hookIndex++; // Move to next hook for this component
}

// ============================================================================
// EFFECTS MANAGEMENT
// ============================================================================

/**
 * Runs all registered effects, handling cleanup and dependency checking
 * Called after each render cycle
 */
function runEffects() {
  for (const effect of effects) {
    // Check if effect should run (first time or dependencies changed)
    if (!effect.hasRun || !depsAreSame(effect.deps, effect.lastDeps)) {
      // Run cleanup from previous effect if it exists
      if (effect.cleanup) {
        effect.cleanup();
      }
      
      // Run effect and store cleanup function
      effect.cleanup = effect.fn();
      effect.lastDeps = effect.deps ? [...effect.deps] : undefined;
      effect.hasRun = true;
    }
  }
}

/**
 * Compares two dependency arrays to determine if they're the same
 * Used to decide whether useEffect should re-run
 * 
 * @param {Array} a - First dependency array
 * @param {Array} b - Second dependency array
 * @returns {boolean} True if arrays are the same, false otherwise
 */
function depsAreSame(a, b) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  
  // Compare each dependency
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  
  return true;
} 