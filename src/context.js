// createContext — make a context channel. Each context gets a stable integer
// slot into the per-shadow `context` array.
//
// <Ctx.Provider value={v}>…</Ctx.Provider> stamps `v` into the Provider's own
// shadow at this context's slot. A descendant calling useContext(Ctx) walks up
// the `shadow.parent` chain until it finds a shadow with a value at that slot.
// Because shadow.parent links *enclosing component* shadows (skipping host
// nodes), the walk lands on the nearest Provider regardless of host nesting.
//
// When a Provider re-renders with a new `value`, its subtree re-renders as part
// of the normal subtree walk, so consumers naturally pick up the new value.

import { createElement } from './element.js';
import * as ctx from './hooks.js';

let nextIndex = 0;

export function createContext(defaultValue) {
    const slot = nextIndex++;
    const context = { slot, defaultValue };
    context.Provider = ({ value, children }) => {
        ctx.currentShadow.context[slot] = value;
        return createElement('div', null, ...(Array.isArray(children) ? children : [children]));
    };
    return context;
}

export function useContext(context) {
    let shadow = ctx.currentShadow;
    while (shadow !== null) {
        if (shadow.context[context.slot] !== undefined) return shadow.context[context.slot];
        shadow = shadow.parent;
    }
    if (context.defaultValue !== undefined) return context.defaultValue;
    throw new Error('useContext: no matching Provider found');
}
