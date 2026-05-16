import { effect } from "./effect.js";
import { Signal } from "signal-polyfill";
import { onUnmount } from "./lifecycle.js";
import { isVirtualNode } from "./vnode.js";

let childResolver = (child) => child;

export function setChildResolver(resolver) {
    childResolver = resolver;
}

/**
 * setKey() sets a key on the elemen that identifies it in it's siblings,
 * so that when the siblings are updated, the element can be reused instead of recreated. 
 */
 export function setKey(element, key) {
    if (key !== undefined) {
        element.dataset.key = key;
    }
}

/**
 * setAttributes() sets attributes on the element. If the value of an attribute is a Signal,
 * it will be updated whenever the signal changes.
 */
export function setAttributes(element, attributes) {
    if (attributes && typeof attributes === 'object') {
        for (const [key, value] of Object.entries(attributes)) {
            if (Signal.isState(value) || Signal.isComputed(value)) {
                setSignalAttribute(element, key, value);
                continue;
            }

            element.setAttribute(key, value);
        }
    }
}

/**
 * setSignalAttribute() sets an attribute on the element that is updated whenever the signal changes,
 * and is removed when the signal value is null or undefined.
 * 
 * When the signal value is a boolean, the attribute is added when the value is true, and removed when the value is false.
 * This is useful for attributes like "disabled" or "hidden".
 * 
 * When the signal value is an array, the attribute is added with a space-separated list of values when the array is non-empty, and removed when the array is empty.
 * This is useful for attributes like "class" or "rel".
 * 
 * When the element is unmounted, the signal subscription is automatically cleaned up.
 * @param {HTMLElement} element 
 * @param {*string} key 
 * @param {*Signal} signal 
 */
export function setSignalAttribute(element, key, signal) {
    if (!(Signal.isState(signal) || Signal.isComputed(signal))) {
        return console.warn(`setSignalAttribute: value for ${key} is not a Signal`, signal);
    }

    const stop = effect(() => {
        const value = signal.get();

        if (value === null || value === undefined || value === false || (Array.isArray(value) && value.length === 0)) {
            element.removeAttribute(key);
        } else if (typeof value === 'boolean') {
            element.setAttribute(key, '');
        } else if (Array.isArray(value)) {
            element.setAttribute(key, value.join(' '));
        } else {
            element.setAttribute(key, value);
        }
    });

    onUnmount(element, stop);
}

/**
 * setProperties() sets properties on the element. 
 * 
 * This is for setting properties that are not attributes, like "value" or "checked".
 * If the value of a property is a Signal, it will be passed through as is,
 * so that the component can handle it appropriately.
 * 
 * Children are not included in the props here.
 */
export function setProperties(element, props) {
    if (props && typeof props === 'object') {
        for (const [key, value] of Object.entries(props)) {
            element[key] = value;
        }
    }
}

/**
 * 
 * 
 * @param {HTMLElement} element 
 * @param {HTMLElement[]} children 
 */
export function setChildren(element, children) {
    if (children) {
        if (Array.isArray(children)) {
            const hasSignals = children.some(c => Signal.isState(c) || Signal.isComputed(c));
            if (hasSignals) {
                setChildrenSignal(element, children);
                return;
            }
            for (const child of normalizeChildren(children)) {
                element.appendChild(child);
            }
        } else if (children instanceof Node) {
            element.appendChild(children);
        } else if (isVirtualNode(children)) {
            element.appendChild(childResolver(children));
        } else if (Signal.isState(children) || Signal.isComputed(children)) {
            setChildrenSignal(element, children);
        } else {
            element.textContent = String(children);
        }
    }
}

export function setChildrenSignal(element, signal) {
    const isSignal = Signal.isState(signal) || Signal.isComputed(signal);
    const isArray = Array.isArray(signal);
    if (!isSignal && !isArray) {
        return console.warn(`setChildrenSignal: value is not a Signal or array`, signal);
    }

    const stop = effect(() => {
        // If signal is a raw array of (possible) signals, resolve each entry directly
        // inside the effect so sub-signals are tracked as direct dependencies.
        const value = isArray ? resolveChildrenArray(signal) : signal.get();

        // Short-cut if new value is a single node.
        if (value instanceof Node) {
            element.textContent = '';
            element.replaceChildren(value);
            return;
        }

        if (!Array.isArray(value)) {
            element.replaceChildren(...normalizeChildren([value]));
            return;
        }

        const normalizedChildren = normalizeChildren(value);
        const canReconcileByKey = normalizedChildren.every(child => (
            child instanceof HTMLElement && child.dataset.key
        ));

        if (!canReconcileByKey) {
            element.replaceChildren(...normalizedChildren);
            return;
        }

        // This could be the first or subsequent update,
        // so we need to clear children that shouldn't be here anymore.
        // First collect all the existing keys.
        const existingKeys = [];
        for (const child of element.childNodes) {
            if (child instanceof HTMLElement && child.dataset.key) {
                existingKeys.push(child.dataset.key);
            }
        }
        
        // Then remove any chilren that aren't in the new value or have a different key.
        const existingKeysToRemove = existingKeys.filter(key => {
            return !normalizedChildren.find(child => child.dataset.key === key);
        });

        // Remove the children that aren't in the new value or have a different key.
        for (const key of existingKeysToRemove) {
            const childToRemove = element.querySelector(`[data-key="${key}"]`);
            if (childToRemove) {
                element.removeChild(childToRemove);
            }
        }

        // Finally, add or move the new children into the correct order.
        // For each position in value, if the slot is empty or holds a different key,
        // insertBefore places the child there (insertBefore with null appends).
        // If the key matches but the element reference changed (e.g. a sub-signal produced
        // a new node), replaceChild swaps it in-place.
        for (const [index, child] of normalizedChildren.entries()) {
            const current = element.children[index];
            if (current === child) {
                continue;
            }
            if (current && current.dataset.key === child.dataset.key) {
                element.replaceChild(child, current);
                continue;
            }
            element.insertBefore(child, current || null);
        }
    });

    onUnmount(element, stop);
}

function resolveChildrenArray(children) {
    return children.flatMap(child => {
        const value = (Signal.isState(child) || Signal.isComputed(child))
            ? child.get()
            : child;
        return normalizeChildren([value]);
    });
}

function normalizeChildren(children) {
    return children.flatMap(child => {
        if (Array.isArray(child)) {
            return normalizeChildren(child);
        }

        if (child instanceof Node) {
            return [child];
        }

        if (isVirtualNode(child)) {
            return [childResolver(child)];
        }

        return [document.createTextNode(String(child))];
    });
}