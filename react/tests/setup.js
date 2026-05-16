// Shared jsdom bootstrap. Every test file calls `setupDom()` at top level to
// install a fresh document/window before importing anything that touches the
// DOM. Returns the jsdom instance so tests can dispatch events with the right
// MouseEvent constructor and a `tick()` helper for flushing microtasks.

import { JSDOM } from 'jsdom';

export function setupDom() {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { url: 'http://localhost/' });
    globalThis.window      = dom.window;
    globalThis.document    = dom.window.document;
    globalThis.HTMLElement = dom.window.HTMLElement;
    return dom;
}

// Flush the microtask queue (the scheduler uses queueMicrotask).
export const tick = () => new Promise(r => setTimeout(r, 0));

// Wait for both microtasks and a setTimeout(…, 0) — needed when an effect runs,
// since effects are dispatched via setTimeout and may themselves call setState.
export const tickEffects = () => new Promise(r => setTimeout(r, 10));
