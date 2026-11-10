import { effect } from "./effect.js";
import { Signal } from "signal-polyfill";
import { onUnmount } from "./lifecycle.js";
import { isVirtualNode } from "./vnode.js";
import { attributeValue } from "./attribute.js";

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
 *
 * The `ref` key is special: it is not written to the DOM. Instead it is called
 * with the mounted element (or `.set(element)`-ed if it is a Signal.State).
 * On unmount the ref is invalidated with `null`.
 */
export function setAttributes(element, attributes) {
    if (attributes && typeof attributes === 'object') {
        for (const [key, value] of Object.entries(attributes)) {
            if (key === 'ref') {
                attachRef(element, value);
                continue;
            }

            if (isSignalValue(value)) {
                setSignalAttribute(element, key, value);
                continue;
            }

            const attribute = attributeValue(value);
            if (attribute !== null) {
                element.setAttribute(key, attribute);
            }
        }
    }
}

/**
 * attachRef() invokes the ref with the freshly mounted DOM element and
 * arranges for it to be invalidated with `null` on unmount. Supports two
 * shapes:
 *  - A callback: `(el: HTMLElement | null) => void`
 *  - A Signal.State whose value is set with the element
 */
function attachRef(element, ref) {
    if (!ref) return;

    if (typeof ref === 'function') {
        ref(element);
        onUnmount(element, () => ref(null));
        return;
    }

    if (isSignalValue(ref)) {
        ref.set(element);
        onUnmount(element, () => ref.set(null));
        return;
    }

    console.warn('setAttributes: `ref` must be a function or Signal.State', ref);
}

/**
 * setSignalAttribute() sets an attribute on the element that is updated whenever the signal changes.
 * Values are converted by attributeValue(): null, undefined, false and [] remove the attribute,
 * true sets it to "" (useful for "disabled" or "hidden"), and arrays are joined with spaces.
 *
 * When the element is unmounted, the signal subscription is automatically cleaned up.
 * @param {HTMLElement} element 
 * @param {*string} key 
 * @param {*Signal} signal 
 */
export function setSignalAttribute(element, key, signal) {
    if (!isSignalValue(signal)) {
        return console.warn(`setSignalAttribute: value for ${key} is not a Signal`, signal);
    }

    const stop = effect(() => {
        const attribute = attributeValue(signal.get());

        if (attribute === null) {
            element.removeAttribute(key);
        } else {
            element.setAttribute(key, attribute);
        }
    });

    onUnmount(element, stop);
}

/**
 * setProperties() sets properties on the element. 
 * 
 * This is for setting properties that are not attributes, like "value" or "checked".
 * If the value of a property is a Signal and the element is a DOM Element (HTML or SVG),
 * it will be bound reactively so that the property updates whenever the signal changes.
 * Otherwise, the signal object is passed through as-is.
 * 
 * Children are not included in the props here.
 */
export function setProperties(element, props) {
    if (props && typeof props === 'object') {
        for (const [key, value] of Object.entries(props)) {
            if (isElement(element) && isSignalValue(value)) {
                setSignalProperty(element, key, value);
            } else {
                element[key] = value;
            }
        }
    }
}

/**
 * setSignalProperty() sets a property on the element that is updated whenever the signal changes.
 * @param {HTMLElement} element 
 * @param {string} key 
 * @param {Signal} signal 
 */
function setSignalProperty(element, key, signal) {
    const stop = effect(() => {
        const value = signal.get();
        element[key] = value;
    });

    onUnmount(element, stop);
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
            // Components that pass `children` through createElement double-wrap it
            // (e.g. createElement('span', props, children) where children is already
            // an array). Flatten so signals nested inside aren't missed by the
            // shallow hasSignals check below.
            const flat = children.flat(Infinity);
            const hasSignals = flat.some(isSignalValue);
            if (hasSignals) {
                setChildrenSignal(element, flat);
                return;
            }
            for (const child of normalizeChildren(flat)) {
                element.appendChild(child);
            }
        } else if (children instanceof Node) {
            element.appendChild(children);
        } else if (isVirtualNode(children)) {
            element.appendChild(childResolver(children));
        } else if (isSignalValue(children)) {
            setChildrenSignal(element, children);
        } else {
            element.textContent = String(children);
        }
    }
}

export function setChildrenSignal(element, signal) {
    const isSignal = isSignalValue(signal);
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
            isElement(child) && child.dataset.key
        ));

        if (!canReconcileByKey) {
            element.replaceChildren(...normalizedChildren);
            return;
        }

        // Place each new child at its index, in order. Slots before the index
        // already hold their final child, so moving a node never disturbs them.
        // If the slot is empty or holds a different key, insertBefore places the child
        // there (insertBefore with null appends). If the key matches but the element
        // reference changed (e.g. a computed produced a new node), replaceChild swaps it in-place.
        for (const [index, child] of normalizedChildren.entries()) {
            const current = element.childNodes[index];
            if (current === child) {
                continue;
            }
            if (isElement(current) && current.dataset.key === child.dataset.key) {
                element.replaceChild(child, current);
                continue;
            }
            element.insertBefore(child, current || null);
        }

        // Everything after the placed children is stale: keys that are gone, and old
        // nodes whose key was taken over by a new node.
        while (element.childNodes.length > normalizedChildren.length) {
            element.lastChild.remove();
        }
    });

    onUnmount(element, stop);
}

function resolveChildrenArray(children) {
    return children.flatMap(child => {
        const value = isSignalValue(child)
            ? child.get()
            : child;
        return normalizeChildren([value]);
    });
}

function normalizeChildren(children) {
    return children.flatMap(child => {
        if (child === null || child === undefined || child === false || child === true) {
            return [];
        }

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

// Matches HTML and SVG elements alike (SVGElement is not an HTMLElement).
function isElement(value) {
    return value?.nodeType === Node.ELEMENT_NODE;
}

function isSignalValue(value) {
    if (value == null) {
        return false;
    }

    const type = typeof value;
    if (type !== 'object' && type !== 'function') {
        return false;
    }

    try {
        return Signal.isState(value) || Signal.isComputed(value);
    } catch {
        return false;
    }
}