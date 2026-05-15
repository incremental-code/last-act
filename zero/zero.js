import { Signal as TC39Signal } from 'signal-polyfill';

// ─── Public signal types ──────────────────────────────────────────────────────
// Signal is the TC39 standard Signal.State — create writable signals with new Signal(value).
export const Signal = TC39Signal.State;

// computed: create a lazy derived signal (TC39 Signal.Computed).
export function computed(fn) {
  return new TC39Signal.Computed(fn);
}

// ─── Internal effect system ───────────────────────────────────────────────────
// Effects use TC39 Signal.Computed + Signal.subtle.Watcher.
// The initial run is synchronous; re-runs are scheduled as microtasks.

const { Watcher, introspectSources } = TC39Signal.subtle;

const pendingEffects = new Set();
let flushScheduled = false;

function scheduleFlush() {
  if (!flushScheduled) {
    flushScheduled = true;
    queueMicrotask(processEffects);
  }
}

function processEffects() {
  flushScheduled = false;
  for (const effect of [...pendingEffects]) {
    pendingEffects.delete(effect);
    effect.rerun();
  }
}

class Effect {
  #cleanup = null;
  #computed;
  #watcher;
  #disposed = false;

  constructor(fn) {
    this.#computed = new TC39Signal.Computed(() => {
      if (typeof this.#cleanup === 'function') {
        this.#cleanup();
        this.#cleanup = null;
      }
      const result = fn();
      if (typeof result === 'function') {
        this.#cleanup = result;
      }
    });
    this.#watcher = new Watcher(() => {
      if (!this.#disposed) {
        pendingEffects.add(this);
        scheduleFlush();
      }
    });
    this.#watcher.watch(this.#computed);
    this.#computed.get(); // Synchronous initial evaluation
  }

  rerun() {
    if (this.#disposed) return;
    this.#computed.get(); // Re-evaluate; fn() runs and deps are re-tracked
    this.#watcher.watch(); // Reset dirty flag so the next change triggers notify
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    pendingEffects.delete(this);
    this.#watcher.unwatch(this.#computed);
    if (typeof this.#cleanup === 'function') {
      this.#cleanup();
      this.#cleanup = null;
    }
  }
}

// ─── Cleanup infrastructure ───────────────────────────────────────────────────
// Each DOM effect registers a dispose function on the element under CLEANUPS.
// unmount() and the MutationObserver both call runCleanupsDeep to dispose them.

const CLEANUPS = Symbol('zero/cleanups');
let observerInstalled = false;

function registerCleanup(element, disposeFn) {
  if (!element || typeof disposeFn !== 'function') return;
  (element[CLEANUPS] ??= []).push(disposeFn);
  installObserver();
}

function runCleanupsDeep(node) {
  if (!node || node.nodeType !== 1) return;
  const cleanups = node[CLEANUPS];
  if (cleanups) {
    for (const fn of cleanups) {
      try { fn(); } catch (e) { /* swallow — one bad cleanup shouldn't block others */ }
    }
    node[CLEANUPS] = null;
  }
  for (const child of node.children) {
    runCleanupsDeep(child);
  }
}

function installObserver() {
  if (observerInstalled) return;
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
  observerInstalled = true;

  const observer = new MutationObserver((mutations) => {
    const removed = [];
    for (const m of mutations) {
      for (const node of m.removedNodes) {
        if (node.nodeType === 1) removed.push(node);
      }
    }
    if (removed.length === 0) return;

    // Defer by a microtask so a same-tick move (remove + re-append) is not
    // mistaken for a permanent removal.
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

export function unmount(element) {
  runCleanupsDeep(element);
}

// ─── Reactivity primitives ────────────────────────────────────────────────────

// track: run fn once, capturing its signal dependencies.
// Returns [value, Set<Signal>] where the set contains every signal read by fn.
export function track(fn) {
  const c = new TC39Signal.Computed(fn);
  const value = c.get();
  return [value, new Set(introspectSources(c))];
}

// reactive: create an effect that re-runs when its signal dependencies change.
// The initial run is synchronous; subsequent re-runs happen as microtasks.
// Returns a dispose function that stops the effect and runs any pending cleanup.
export function reactive(fn) {
  const effect = new Effect(fn);
  return () => effect.dispose();
}

// ─── Signal type predicate ────────────────────────────────────────────────────

function isSignal(value) {
  return TC39Signal.isState(value) || TC39Signal.isComputed(value);
}

// ─── DOM ──────────────────────────────────────────────────────────────────────

export function createElement(type, props = {}, ...children) {
  let element;

  if (typeof type === 'string') {
    element = document.createElement(type);
  } else if (typeof type === 'function') {
    return type(props);
  } else {
    throw new Error(`Invalid element type: ${type}`);
  }

  for (const [key, value] of Object.entries(props)) {
    setProperty(element, key, value);
  }

  const flatChildren = children.flat();
  for (const child of flatChildren) {
    if (child != null) {
      if (typeof child === 'string' || typeof child === 'number') {
        element.appendChild(document.createTextNode(String(child)));
      } else if (child instanceof HTMLElement) {
        element.appendChild(child);
      } else if (isSignal(child)) {
        if (Array.isArray(child.get())) {
          renderArray(element, child, props.key);
        } else {
          renderSignalChild(element, child);
        }
      }
    }
  }

  return element;
}

function setProperty(element, key, value) {
  if (key === 'key' || key === 'children') return;

  if (key === 'attributes' && typeof value === 'object') {
    for (const [attrKey, attrValue] of Object.entries(value)) {
      if (isSignal(attrValue)) {
        const signal = attrValue;
        const effect = new Effect(() => element.setAttribute(attrKey, signal.get()));
        registerCleanup(element, () => effect.dispose());
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
        const effect = new Effect(() => { element.style[styleKey] = signal.get(); });
        registerCleanup(element, () => effect.dispose());
      } else {
        element.style[styleKey] = styleValue;
      }
    }
    return;
  }

  if (isSignal(value)) {
    const signal = value;
    const effect = new Effect(() => {
      try {
        element[key] = signal.get();
      } catch (e) {
        console.warn(`Could not set property ${key}:`, e);
      }
    });
    registerCleanup(element, () => effect.dispose());
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
  let currentNode = null;

  const effect = new Effect(() => {
    const newValue = signal.get();

    if (currentNode === null) {
      // First (synchronous) run: create and insert the initial node.
      currentNode = newValue instanceof HTMLElement
        ? newValue
        : document.createTextNode(newValue == null ? '' : String(newValue));
      container.appendChild(currentNode);
      return;
    }

    // Subsequent (async) runs: fast-path text mutation or full swap.
    if (!(newValue instanceof HTMLElement) && currentNode.nodeType === 3) {
      currentNode.nodeValue = newValue == null ? '' : String(newValue);
    } else {
      const newNode = newValue instanceof HTMLElement
        ? newValue
        : document.createTextNode(newValue == null ? '' : String(newValue));
      currentNode.replaceWith(newNode);
      currentNode = newNode;
    }
  });

  registerCleanup(container, () => effect.dispose());
}

function renderArray(container, arraySignal, keyFn) {
  let domMap = new Map();

  const effect = new Effect(() => {
    const array = arraySignal.get();
    const newMap = new Map();

    if (!Array.isArray(array)) {
      container.textContent = '';
      domMap.clear();
      return;
    }

    const keysInOrder = [];
    const itemsByKey = new Map();

    array.forEach((item, index) => {
      const key = keyFn ? keyFn(item) : index;
      keysInOrder.push(key);
      itemsByKey.set(key, item);
    });

    for (const [key, domNode] of domMap) {
      if (!itemsByKey.has(key)) domNode.remove();
    }

    let lastNode = null;
    for (const key of keysInOrder) {
      let domNode = domMap.get(key);

      if (!domNode) {
        const item = itemsByKey.get(key);
        domNode = item instanceof HTMLElement
          ? item
          : document.createTextNode(String(item));
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
  });

  registerCleanup(container, () => effect.dispose());
}
