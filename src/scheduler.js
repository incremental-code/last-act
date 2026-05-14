// Re-render scheduling. `setState` doesn't re-render synchronously — it adds
// the component's shadow to a Set and queues a microtask. Many setState calls
// fired in the same event handler coalesce into one flush.
//
// Before flushing, drop any shadow whose ancestor is also dirty: re-rendering
// the ancestor will sweep it up anyway. The remaining shadows are the minimal
// set of subtree roots that need to re-render.

import { takePendingEffects } from './hooks.js';
import { runEffects } from './effect.js';

const dirty   = new Set();
let scheduled = false;
let onFlush   = null;     // root.js installs the actual per-shadow re-render fn

export function setOnFlush(fn) { onFlush = fn; }

export function scheduleUpdate(shadow) {
    dirty.add(shadow);
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(flush);
}

function flush() {
    scheduled = false;
    const roots = topAncestors(dirty);
    dirty.clear();
    for (const s of roots) onFlush(s);

    const effects = takePendingEffects();
    if (effects.length) setTimeout(() => runEffects(effects), 0);
}

// Of all dirty shadows, keep only those that don't have a dirty ancestor.
function topAncestors(set) {
    const out = [];
    outer: for (const s of set) {
        for (let p = s.parent; p; p = p.parent) {
            if (set.has(p)) continue outer;
        }
        out.push(s);
    }
    return out;
}
