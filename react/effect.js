// useEffect — register a side effect to run after this render commits.
//   deps omitted    → run after every render
//   deps === []     → run once, after the first render (mount)
//   deps === [a,b]  → run again whenever a or b changes (per-element ===)
// If `fn` returns a function, that becomes the cleanup, run before the next
// re-run. The actual scheduling lives below; useEffect just queues a record.

import * as ctx from './hooks.js';

export function useEffect(fn, deps) {
    if (ctx.currentShadow === null)
        throw new Error('useEffect called outside a component');

    const idx = ctx.nextEffectSlot();
    if (!ctx.currentShadow.effects[idx])
        ctx.currentShadow.effects[idx] = { hasRun: false, deps: undefined, cleanup: null };

    ctx.queueEffect({ slot: ctx.currentShadow.effects[idx], fn, deps });
}

// After each render, scheduler / root drain pendingEffects and pass them here.
// We run those whose deps changed (or that have never run), tearing down the
// previous run's cleanup first.
export function runEffects(effects) {
    for (const { slot, fn, deps } of effects) {
        if (!slot.hasRun || !depsEqual(deps, slot.deps)) {
            if (slot.cleanup) slot.cleanup();
            slot.cleanup = fn() ?? null;
            slot.deps    = deps ? [...deps] : undefined;
            slot.hasRun  = true;
        }
    }
}

function depsEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}
