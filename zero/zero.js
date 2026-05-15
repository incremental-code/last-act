let currentTracker = null;

class Signal {
  constructor(value) {
    this.value = value;
    this.subscribers = new Set();
  }

  get() {
    // Record this access if we're in a tracking context
    if (currentTracker) {
      currentTracker.dependencies.add(this);
    }
    return this.value;
  }

  set(newValue) {
    if (this.value !== newValue) {
      this.value = newValue;
      // Snapshot subscribers so mutations during iteration don't cause re-visits
      const subs = Array.from(this.subscribers);
      subs.forEach(cb => cb(newValue));
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
}

// --- Cleanup infrastructure -------------------------------------------------
// Every signal subscription made on behalf of an element is registered against
// that element under CLEANUPS. When the element is removed from the document
// (detected via a single document-wide MutationObserver), its cleanups run.
// This drops upstream signal subscribers so detached DOM doesn't stay pinned.

const CLEANUPS = Symbol('zero/cleanups');
let observerInstalled = false;

function registerCleanup(element, unsubscribe) {
  if (!element || typeof unsubscribe !== 'function') return;
  (element[CLEANUPS] ??= []).push(unsubscribe);
  installObserver();
}

function runCleanupsDeep(node) {
  if (!node || node.nodeType !== 1) return; // ELEMENT_NODE only
  const cleanups = node[CLEANUPS];
  if (cleanups) {
    for (const fn of cleanups) {
      try { fn(); } catch (e) { /* swallow — one bad cleanup shouldn't block others */ }
    }
    node[CLEANUPS] = null;
  }
  // Recurse into descendants
  for (const child of node.children) {
    runCleanupsDeep(child);
  }
}

function installObserver() {
  if (observerInstalled) return;
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
  observerInstalled = true;

  const observer = new MutationObserver((mutations) => {
    // Collect all removed element nodes first
    const removed = [];
    for (const m of mutations) {
      for (const node of m.removedNodes) {
        if (node.nodeType === 1) removed.push(node);
      }
    }
    if (removed.length === 0) return;

    // Defer cleanup by a microtask, then verify the node really left the DOM
    // (it might have just been moved to another parent within the same task)
    queueMicrotask(() => {
      for (const node of removed) {
        if (!node.isConnected) runCleanupsDeep(node);
      }
    });
  });

  observer.observe(document.documentElement || document, {
    childList: true,
    subtree: true,
  });
}

// Test-only hook: synchronously dispose an element subtree.
// Useful for environments without a working MutationObserver (or for explicit teardown).
function unmount(element) {
  runCleanupsDeep(element);
}

// --- Reactivity primitives --------------------------------------------------

function track(fn) {
  const tracker = { dependencies: new Set() };
  const prevTracker = currentTracker;
  currentTracker = tracker;

  let value;
  try {
    value = fn();
  } finally {
    currentTracker = prevTracker;
  }

  return [value, tracker.dependencies];
}

function reactive(fn) {
  let unsubs = [];
  let cleanup = null;

  const run = () => {
    // Run previous run's cleanup before starting a new run
    if (cleanup) {
      cleanup();
      cleanup = null;
    }

    // Drop old subscriptions
    unsubs.forEach(u => u());
    unsubs = [];

    // Run and capture new dependencies; if fn returns a function, treat it as cleanup
    const [result, dependencies] = track(fn);
    if (typeof result === 'function') {
      cleanup = result;
    }

    // Subscribe to new dependencies
    dependencies.forEach(signal => {
      unsubs.push(signal.subscribe(run));
    });
  };

  run();

  return () => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
    unsubs.forEach(u => u());
    unsubs = [];
  };
}

class ComputedSignal extends Signal {
  constructor(fn) {
    super(undefined);
    this._stop = reactive(() => this.set(fn()));
  }

  stop() {
    this._stop();
  }
}

function computed(fn) {
  return new ComputedSignal(fn);
}

function isSignal(value) {
  return value instanceof Signal;
}

function createElement(type, props = {}, ...children) {
  let element;

  if (typeof type === 'string') {
    element = document.createElement(type);
  } else if (typeof type === 'function') {
    return type(props);
  } else {
    throw new Error(`Invalid element type: ${type}`);
  }

  const propsProxy = new Proxy(props, {
    get(target, prop) {
      const value = target[prop];
      return isSignal(value) ? value.get() : value;
    },
  });

  // Set properties on the element
  for (const [key, value] of Object.entries(props)) {
    setProperty(element, key, value, propsProxy);
  }

  // Handle children
  const flatChildren = children.flat();
  for (const child of flatChildren) {
    if (child != null) {
      if (typeof child === 'string' || typeof child === 'number') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof HTMLElement) {
        element.appendChild(child);
      } else if (isSignal(child)) {
        if (Array.isArray(child.value)) {
          renderArray(element, child, props.key);
        } else {
          renderSignalChild(element, child);
        }
        // If the child is a ComputedSignal, stop it when the element unmounts
        // so it stops reacting to its own upstream signals.
        if (child instanceof ComputedSignal) {
          registerCleanup(element, () => child.stop());
        }
      }
    }
  }

  return element;
}

function setProperty(element, key, value, propsProxy) {
  if (key === 'key' || key === 'children') return;

  if (key === 'attributes' && typeof value === 'object') {
    for (const [attrKey, attrValue] of Object.entries(value)) {
      if (isSignal(attrValue)) {
        const signal = attrValue;
        const updateAttr = () => {
          element.setAttribute(attrKey, signal.get());
        };
        updateAttr();
        registerCleanup(element, signal.subscribe(updateAttr));
        if (signal instanceof ComputedSignal) {
          registerCleanup(element, () => signal.stop());
        }
      } else {
        element.setAttribute(attrKey, attrValue);
      }
    }
    return;
  }

  if (key === 'style' && typeof value === 'object') {
    for (const [styleKey, styleValue] of Object.entries(value)) {
      if (isSignal(styleValue)) {
        const signal = styleValue;
        const updateStyle = () => {
          element.style[styleKey] = signal.get();
        };
        updateStyle();
        registerCleanup(element, signal.subscribe(updateStyle));
        if (signal instanceof ComputedSignal) {
          registerCleanup(element, () => signal.stop());
        }
      } else {
        element.style[styleKey] = styleValue;
      }
    }
    return;
  }

  if (isSignal(value)) {
    const signal = value;
    const updateProperty = () => {
      const currentValue = signal.get();
      try {
        element[key] = currentValue;
      } catch (e) {
        console.warn(`Could not set property ${key}:`, e);
      }
    };

    updateProperty();
    registerCleanup(element, signal.subscribe(updateProperty));
    if (signal instanceof ComputedSignal) {
      registerCleanup(element, () => signal.stop());
    }
  } else if (typeof value === 'function') {
    element[key] = value;
  } else {
    try {
      element[key] = value;
    } catch (e) {
      console.warn(`Could not set property ${key}:`, e);
    }
  }
}


function renderSignalChild(container, signal) {
  const makeNode = (value) => {
    if (value instanceof HTMLElement) return value;
    if (value == null) return document.createTextNode('');
    return document.createTextNode(value);
  };

  let currentNode = makeNode(signal.get());
  container.appendChild(currentNode);

  const unsub = signal.subscribe((newValue) => {
    // Same-type fast path for text: just mutate the existing text node
    if (
      !(newValue instanceof HTMLElement) &&
      currentNode.nodeType === 3 // Node.TEXT_NODE
    ) {
      currentNode.nodeValue = newValue == null ? '' : newValue;
      return;
    }

    // Otherwise swap nodes
    const newNode = makeNode(newValue);
    currentNode.replaceWith(newNode);
    currentNode = newNode;
  });
  registerCleanup(container, unsub);
}

function renderArray(container, arraySignal, keyFn) {
  let domMap = new Map(); // Maps key -> DOM node

  const render = () => {
    const array = arraySignal.get();
    const newMap = new Map(); // Maps key -> DOM node for current render

    if (!Array.isArray(array)) {
      container.textContent = '';
      domMap.clear();
      return;
    }

    // Build keysInOrder and track what items exist
    const keysInOrder = [];
    const itemsByKey = new Map();

    array.forEach((item, index) => {
      const key = keyFn ? keyFn(item) : index;
      keysInOrder.push(key);
      itemsByKey.set(key, item);
    });

    // Remove nodes that are no longer in the array
    for (const [key, domNode] of domMap) {
      if (!itemsByKey.has(key)) {
        domNode.remove();
      }
    }

    // Reorder and insert nodes
    let lastNode = null;
    for (const key of keysInOrder) {
      let domNode = domMap.get(key);

      if (!domNode) {
        const item = itemsByKey.get(key);
        domNode = typeof item === 'object' && item instanceof HTMLElement ? item : document.createTextNode(item);
      }

      if (domNode.parentNode !== container) {
        if (lastNode) {
          container.insertBefore(domNode, lastNode.nextSibling);
        } else {
          container.insertBefore(domNode, container.firstChild);
        }
      } else if (lastNode && lastNode.nextSibling !== domNode) {
        container.insertBefore(domNode, lastNode.nextSibling);
      }

      newMap.set(key, domNode);
      lastNode = domNode;
    }

    domMap = newMap;
  };

  render();
  registerCleanup(container, arraySignal.subscribe(render));
}

export { Signal, createElement, track, computed, reactive, unmount };
