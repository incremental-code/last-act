// useState — one persistent value per call site, plus a setter.
//
// On the first render the slot is `undefined`, so we initialise it (calling the
// initializer if it's a function — the lazy initial state form). On every
// render we return the slot's current value. setState writes the slot and asks
// the scheduler to re-render this component's subtree.
//
// The closure captures `shadow` and `idx` *by value at hook-call time*, so even
// though the module globals march on to other components, this particular
// setState always targets this particular slot.

import * as ctx from './hooks.js';
import { scheduleUpdate } from './scheduler.js';

export function useState(initialValue) {
    if (ctx.currentShadow === null)
        throw new Error('useState called outside a component');

    const shadow = ctx.currentShadow;
    const idx    = ctx.nextStateSlot();

    if (shadow.state[idx] === undefined)
        shadow.state[idx] = typeof initialValue === 'function' ? initialValue() : initialValue;

    const setState = value => {
        shadow.state[idx] = typeof value === 'function' ? value(shadow.state[idx]) : value;
        scheduleUpdate(shadow);
    };

    return [shadow.state[idx], setState];
}
