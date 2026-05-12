/**
 * LastJS - a customisable functional reactive user interface library.
 *
 * Components return React-compatible element objects: { $$typeof, type, key, ref, props }
 * Internal state persists across renders in a parallel shadow tree.
 */

const REACT_ELEMENT_TYPE = Symbol.for('react.element');

// Creates a React-compatible element descriptor.
// Extra children args are collected into props.children; a single child is unwrapped.
export function createElement(type, props, ...children) {
    const { key = null, ref = null, ...rest } = props ?? {};
    if (children.length === 1)      rest.children = children[0];
    else if (children.length > 1)   rest.children = children;
    return { $$typeof: REACT_ELEMENT_TYPE, type, key, ref, props: rest };
}

// ── Shadow tree ───────────────────────────────────────────────────────────────
// A shadow node lives alongside every rendered element and carries all
// internal bookkeeping that must not appear on the public element object.
//
//   state    — useState slots for this component position
//   effects  — useEffect slots for this component position
//   context  — context values set by a Provider at this position
//   parent   — enclosing component shadow (skips host elements; used by useContext)
//   children — shadow children parallel to the rendered element's props.children
//   _key     — copy of element.key for key-based child matching

function makeShadow(key, parent) {
    return { _key: key, state: [], effects: [], context: [], parent, children: [] };
}

// Returns the previous child shadow for position i, preferring key-based lookup.
function getPrevChildShadow(prevShadow, child, index) {
    if (!prevShadow?.children) return null;
    if (child.key != null)
        return prevShadow.children.find(s => s?._key === child.key) ?? null;
    return prevShadow.children[index] ?? null;
}

// ── Hook globals ──────────────────────────────────────────────────────────────
// Set during component execution so that useState / useEffect / useContext
// can access the current component's shadow.

let prevShadowGlobally = null;
let stateIndex  = 0;
let effectIndex = 0;

let currentRoot       = null;   // RootContainer being rendered; used by setState
let maxContextIndex   = 0;
let pendingEffects    = [];     // populated during render, flushed after diff

// ── RootContainer ─────────────────────────────────────────────────────────────

class RootContainer {
    constructor(container) {
        this.container   = container;
        this.rootElement = null;  // last element passed to render()
        this.prevElement = null;  // last resolved host-element tree
        this.prevShadow  = null;  // last shadow tree
    }

    render(element) {
        currentRoot       = this;
        this.rootElement  = element;
        pendingEffects    = [];

        const [renderedElement, shadow] = this.renderComponent(
            element.type, element.props, this.prevShadow, null
        );

        this.diff(this.prevElement, renderedElement, this.container.firstChild, this.container);
        this.prevElement = renderedElement;
        this.prevShadow  = shadow;

        const effectsToRun = pendingEffects;
        pendingEffects = [];
        setTimeout(() => flushEffects(effectsToRun), 0);
    }

    rerender() {
        this.render(this.rootElement);
    }

    // Executes a function component, wiring up hook globals and building the
    // shadow tree in parallel with the returned element tree.
    renderComponent(type, props, prevShadow, parentShadow) {
        const shadow = makeShadow(props?.key ?? null, parentShadow);
        shadow.state   = prevShadow?.state   ?? [];
        shadow.effects = prevShadow?.effects ?? [];
        shadow.context = prevShadow?.context ?? [];

        const savedPrevShadow = prevShadowGlobally;
        prevShadowGlobally = shadow;
        stateIndex  = 0;
        effectIndex = 0;

        const element = type(props ?? {});

        // Walk the host-element tree that the component returned, resolving any
        // nested function components and mirroring the structure in shadow.children.
        this.processChildren(element, prevShadow, shadow, shadow);

        prevShadowGlobally = savedPrevShadow;
        return [element, shadow];
    }

    // Recursively resolves function-component children inside a host element.
    //
    //   element          — host element whose children we are walking
    //   prevHostShadow   — shadow from the previous render of this host element
    //                      (used to find prev child shadows by index / key)
    //   componentShadow  — enclosing component shadow; stays constant as we
    //                      descend through host elements (used as parent for new components)
    //   hostShadow       — new shadow for this host element; we populate its .children
    processChildren(element, prevHostShadow, componentShadow, hostShadow) {
        const children = element.props?.children;
        if (!Array.isArray(children)) return;

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (!child || typeof child !== 'object') continue;

            if (typeof child.type === 'function') {
                // Function component — render it and splice the result back in.
                const prevChildShadow = getPrevChildShadow(prevHostShadow, child, i);
                const [rendered, childShadow] = this.renderComponent(
                    child.type, child.props, prevChildShadow, componentShadow
                );
                children[i]           = rendered;
                hostShadow.children[i] = childShadow;
            } else {
                // Host element — create a shadow for it and recurse into its children.
                const prevChildShadow = prevHostShadow?.children?.[i] ?? null;
                const childShadow     = makeShadow(child.key ?? null, componentShadow);
                hostShadow.children[i] = childShadow;
                this.processChildren(child, prevChildShadow, componentShadow, childShadow);
            }
        }
    }

    // ── DOM diffing ───────────────────────────────────────────────────────────

    diff(prevElement, element, prevNode, parentNode) {
        if (prevElement === null) {
            parentNode.appendChild(this.createDom(element));
            return;
        }
        if (prevElement === element) return;
        if (prevElement.type !== element.type) {
            parentNode.replaceChild(this.createDom(element), prevNode);
            return;
        }
        this.updateNode(prevNode, prevElement, element);
    }

    createDom(element) {
        const dom   = document.createElement(element.type);
        const props = element.props ?? {};

        for (const [key, value] of Object.entries(props)) {
            if (key === 'children') continue;
            if (key.startsWith('on')) {
                dom.addEventListener(key.slice(2).toLowerCase(), value);
            } else if (key !== 'key' && key !== 'ref') {
                dom.setAttribute(key === 'className' ? 'class' : key, value);
            }
        }

        const { children } = props;
        if (Array.isArray(children)) {
            for (const child of children) {
                if (child == null) continue;
                dom.appendChild(this.createDom(child));
            }
        } else if (children != null) {
            dom.textContent = String(children);
        }

        return dom;
    }

    updateNode(node, prevElement, element) {
        const oldProps = prevElement.props ?? {};
        const newProps = element.props   ?? {};

        for (const key of Object.keys(oldProps)) {
            if (key === 'children') continue;
            if (key.startsWith('on')) {
                if (!(key in newProps) || newProps[key] !== oldProps[key])
                    node.removeEventListener(key.slice(2).toLowerCase(), oldProps[key]);
            } else if (key !== 'key' && key !== 'ref' && !(key in newProps)) {
                node.removeAttribute(key === 'className' ? 'class' : key);
            }
        }

        for (const [key, value] of Object.entries(newProps)) {
            if (key === 'children') continue;
            if (key.startsWith('on')) {
                if (!(key in oldProps) || value !== oldProps[key])
                    node.addEventListener(key.slice(2).toLowerCase(), value);
            } else if (key !== 'key' && key !== 'ref') {
                const attr = key === 'className' ? 'class' : key;
                if (node.getAttribute(attr) !== String(value))
                    node.setAttribute(attr, value);
            }
        }

        const newChildren = newProps.children;
        const oldChildren = oldProps.children;

        if (Array.isArray(newChildren)) {
            let domIndex = 0;
            for (let i = 0; i < newChildren.length; i++) {
                const child     = newChildren[i];
                const prevChild = Array.isArray(oldChildren) ? oldChildren[i] : null;
                if (!child && !prevChild) {
                    // stable absent slot — nothing to do
                } else if (!child && prevChild) {
                    node.removeChild(node.children[domIndex]);
                } else if (child && !prevChild) {
                    node.insertBefore(this.createDom(child), node.children[domIndex] ?? null);
                    domIndex++;
                } else {
                    this.diff(prevChild, child, node.children[domIndex], node);
                    domIndex++;
                }
            }
        } else if (newChildren != null) {
            node.textContent = String(newChildren);
        }
    }
}

// ── Effects ───────────────────────────────────────────────────────────────────

function flushEffects(effects) {
    for (const { slot, fn, deps } of effects) {
        if (!slot.hasRun || !depsAreSame(deps, slot.deps)) {
            if (slot.cleanup) slot.cleanup();
            slot.cleanup = fn() ?? null;
            slot.deps    = deps ? [...deps] : undefined;
            slot.hasRun  = true;
        }
    }
}

function depsAreSame(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function createRoot(container) {
    return new RootContainer(container);
}

export function render(element, container) {
    const root = new RootContainer(container);
    root.render(element);
}

export function useState(initialValue) {
    if (currentRoot === null) throw new Error('useState called outside a component');

    const rootRef   = currentRoot;
    const shadowRef = prevShadowGlobally;
    const idx       = stateIndex++;

    if (shadowRef.state[idx] === undefined)
        shadowRef.state[idx] = typeof initialValue === 'function' ? initialValue() : initialValue;

    const setState = value => {
        shadowRef.state[idx] = typeof value === 'function' ? value(shadowRef.state[idx]) : value;
        rootRef.rerender();
    };

    return [shadowRef.state[idx], setState];
}

// Schedules a side effect to run after the current render.
// fn runs when deps change (compared by reference equality).
// If fn returns a function, that function is called as cleanup before the next run.
// Passing no deps array means the effect runs after every render.
// Passing an empty deps array means the effect runs once, on mount.
export function useEffect(fn, deps) {
    if (currentRoot === null) throw new Error('useEffect called outside a component');

    const idx = effectIndex++;
    if (!prevShadowGlobally.effects[idx])
        prevShadowGlobally.effects[idx] = { hasRun: false, deps: undefined, cleanup: null };

    pendingEffects.push({ slot: prevShadowGlobally.effects[idx], fn, deps });
}

export function createContext() {
    const index = maxContextIndex++;
    return {
        index,
        Provider: ({ value, children }) => {
            prevShadowGlobally.context[index] = value;
            return createElement('div', null, children);
        },
    };
}

export function useContext(context) {
    let shadow = prevShadowGlobally;
    while (shadow !== null) {
        if (shadow.context[context.index] !== undefined) return shadow.context[context.index];
        shadow = shadow.parent;
    }
    throw new Error('useContext: no matching Provider found');
}
