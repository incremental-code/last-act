import { Signal } from 'signal-polyfill';

/**
 * Shorthand for `new Signal.State(value)`. Same return type and semantics.
 */
export function signal(value) {
    return new Signal.State(value);
}

/**
 * Shorthand for `new Signal.Computed(fn)`. Same return type and semantics.
 */
export function computed(fn) {
    return new Signal.Computed(fn);
}
