import { isVirtualNode, MOUNTED_NODE } from './vnode.js';

/**
 * onUnmount() registers a callback to be called when the element is unmounted from the DOM.
 * @param {HTMLElement|object} element - The element or virtual node to watch for unmounting
 * @param {Function} callback - The callback to call when the element is unmounted
 */
export function onUnmount(element, callback) {
    if (isVirtualNode(element)) {
        const mountedNode = element[MOUNTED_NODE];
        if (mountedNode) {
            onUnmount(mountedNode, callback);
            return;
        }
    }

    (element[UNMOUNTS] ??= []).push(callback);
    if (element instanceof Node) {
        observeUnmounts();
    }
}

export function runOnumount(element) {
  const callbacks = element[UNMOUNTS];
  if (callbacks) {
    for (const cb of callbacks) {
      cb();
    }
    delete element[UNMOUNTS];
  }
}

export function moveOnUnmount(from, to) {
  const callbacks = from[UNMOUNTS];
  if (!callbacks || callbacks.length === 0) return;

  for (const cb of callbacks) {
    onUnmount(to, cb);
  }

  delete from[UNMOUNTS];
}

const UNMOUNTS = Symbol('last-act/unmount');
let observerInstalled = false;

export function observeUnmounts() {
  if (observerInstalled) return;
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
        if (!node.isConnected) runOnumount(node);
      }
    });
  });

  observer.observe(document.documentElement || document, {
    childList: true,
    subtree: true,
  });
}