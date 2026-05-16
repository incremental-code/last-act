// Hook-call context. `useState` / `useEffect` / `useContext` take no argument
// saying *which* component they belong to — instead, while a component function
// runs, these module-level variables point at its shadow node and at the next
// slot index to hand out. Each hook call does `index++`, so the Nth call always
// lands on the Nth slot. That's why hooks must run in the same order every
// render (no hooks in `if` / loops): call order *is* slot identity.
//
// Other modules import these via `import * as ctx from './hooks.js'` so they
// always read the live value, never a captured snapshot.

export let currentShadow  = null;
export let stateIndex     = 0;
export let effectIndex    = 0;
export let pendingEffects = [];

// Enter a component: point the globals at its shadow, reset the slot counters.
// Returns the previous shadow so the caller can restore it on exit (renders nest).
export function enterComponent(shadow) {
    const prev = currentShadow;
    currentShadow = shadow;
    stateIndex    = 0;
    effectIndex   = 0;
    return prev;
}

export function leaveComponent(prev) {
    currentShadow = prev;
}

export function nextStateSlot()  { return stateIndex++; }
export function nextEffectSlot() { return effectIndex++; }

export function queueEffect(record) { pendingEffects.push(record); }
export function takePendingEffects() {
    const e = pendingEffects;
    pendingEffects = [];
    return e;
}
