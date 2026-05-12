/**
 * LastJS - a customisable functional reactive user interface library.
 *
 * Components return plain array specs:  [nodeType, props, children]
 * State persists across renders in the vdom tree.
 */

// vdom tuple indices
const NODE_TYPE = 0;
const PROPS = 1;
const CHILDREN = 2;
const STATE = 3;
const PARENT = 4;
const CONTEXT = 5;
const EFFECTS = 6;

// Set during component execution so that useState/useEffect/useContext can access
// the previous vdom (and therefore previous state/effects) for the current component.
let prevVdomGlobally = null;
let stateIndex = 0;
let effectIndex = 0;

// The RootContainer currently being rendered — used by setState to schedule rerenders.
let currentRoot = null;

let maxContextIndex = 0;

// Populated during render, flushed asynchronously after each diff.
let pendingEffects = [];

// Returns the previous vdom for a child, matching by key if present.
function getPrevVdomInChildren(prevVdom, currentChild, index) {
    if (!prevVdom || !prevVdom[CHILDREN]) return null;
    const key = currentChild[PROPS]?.key;
    if (key !== undefined) {
        return prevVdom[CHILDREN].find(c => c && c[PROPS]?.key === key) ?? null;
    }
    return prevVdom[CHILDREN][index] ?? null;
}

class RootContainer {
    constructor(container) {
        this.container = container;
        this.prevVdom = null;
    }

    render(component, props) {
        currentRoot = this;
        this.component = component;
        this.props = props;
        pendingEffects = [];

        const vdom = this.renderComponent(component, props, this.prevVdom);
        this.diff(this.prevVdom, vdom, this.container.firstChild, this.container);
        this.prevVdom = vdom;

        const effectsToRun = pendingEffects;
        pendingEffects = [];
        setTimeout(() => flushEffects(effectsToRun), 0);
    }

    rerender() {
        this.render(this.component, this.props);
    }

    // Executes a function component, wiring up hook globals and copying state/effects
    // from the previous vdom into the new one.
    renderComponent(component, props, prevVdom, parentVdom) {
        const originalPrevVdom = prevVdomGlobally;
        prevVdomGlobally = prevVdom || [null, {}, [], [], parentVdom, [], []];
        stateIndex = 0;
        effectIndex = 0;

        const vdom = component(props || {});

        // Propagate state/effects/context arrays by reference so that setState and
        // effect cleanup closures always operate on the live slot.
        vdom[STATE] = prevVdomGlobally[STATE];
        vdom[CONTEXT] = prevVdomGlobally[CONTEXT];
        vdom[EFFECTS] = prevVdomGlobally[EFFECTS] || [];
        vdom[PARENT] = parentVdom;

        if (vdom[NODE_TYPE] === undefined) {
            throw new Error('component must return a vdom spec with a node type');
        }

        this.processVdomChildren(vdom, prevVdom, vdom);

        prevVdomGlobally = originalPrevVdom;
        return vdom;
    }

    // Recursively processes all children of a vdom node, rendering any function
    // components found at any depth inside plain HTML element children.
    // componentVdom is the root vdom of the component currently being rendered;
    // it is kept constant as we descend through HTML elements so that PARENT always
    // points to a vdom that has CONTEXT set, enabling correct context traversal.
    processVdomChildren(vdom, prevVdom, componentVdom) {
        for (const i in (vdom[CHILDREN] || [])) {
            if (!vdom[CHILDREN][i]) continue;
            const child = vdom[CHILDREN][i];
            if (typeof child[NODE_TYPE] === 'function') {
                vdom[CHILDREN][i] = this.renderComponent(
                    child[NODE_TYPE],
                    { ...child[PROPS], children: child[CHILDREN] },
                    getPrevVdomInChildren(prevVdom, child, i),
                    componentVdom
                );
            } else if (child[CHILDREN] instanceof Array) {
                const prevChild = prevVdom ? (prevVdom[CHILDREN]?.[i] ?? null) : null;
                this.processVdomChildren(child, prevChild, componentVdom);
            }
        }
    }

    diff(prevVdom, vdom, prevNode, parentNode) {
        if (prevVdom === null) {
            parentNode.appendChild(this.createDom(vdom));
            return;
        }
        if (prevVdom === vdom) return;
        if (prevVdom[NODE_TYPE] !== vdom[NODE_TYPE]) {
            parentNode.replaceChild(this.createDom(vdom), prevNode);
            return;
        }
        this.updateNode(prevNode, prevVdom, vdom);
    }

    createDom(vdom) {
        const dom = document.createElement(vdom[NODE_TYPE]);
        for (const [key, value] of Object.entries(vdom[PROPS] || {})) {
            if (key.startsWith('on')) {
                dom.addEventListener(key.slice(2).toLowerCase(), value);
            } else if (key !== 'key') {
                dom.setAttribute(key, value);
            }
        }
        if (vdom[CHILDREN] instanceof Array) {
            for (const child of vdom[CHILDREN]) {
                if (!child) continue;
                dom.appendChild(this.createDom(child));
            }
        } else if (vdom[CHILDREN] != null) {
            dom.textContent = String(vdom[CHILDREN]);
        }
        return dom;
    }

    updateNode(node, prevVdom, vdom) {
        const newProps = vdom[PROPS] || {};
        const oldProps = prevVdom[PROPS] || {};

        // Remove event listeners that were removed or changed.
        for (const key of Object.keys(oldProps)) {
            if (key.startsWith('on')) {
                if (!(key in newProps) || newProps[key] !== oldProps[key]) {
                    node.removeEventListener(key.slice(2).toLowerCase(), oldProps[key]);
                }
            } else if (key !== 'key' && !(key in newProps)) {
                node.removeAttribute(key);
            }
        }

        // Add new event listeners and update changed attributes.
        for (const [key, value] of Object.entries(newProps)) {
            if (key.startsWith('on')) {
                if (!(key in oldProps) || value !== oldProps[key]) {
                    node.addEventListener(key.slice(2).toLowerCase(), value);
                }
            } else if (key !== 'key') {
                if (node.getAttribute(key) !== String(value)) {
                    node.setAttribute(key, value);
                }
            }
        }

        if (vdom[CHILDREN] instanceof Array) {
            let domIndex = 0;
            for (let i = 0; i < vdom[CHILDREN].length; i++) {
                const child = vdom[CHILDREN][i];
                const prevChild = prevVdom[CHILDREN]?.[i];
                if (!child && !prevChild) {
                    // both absent — stable falsy slot, nothing to do
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
        } else if (vdom[CHILDREN] != null) {
            node.textContent = String(vdom[CHILDREN]);
        }
    }
}

function flushEffects(effects) {
    for (const { stateRef, fn, deps } of effects) {
        if (!stateRef.hasRun || !depsAreSame(deps, stateRef.deps)) {
            if (stateRef.cleanup) stateRef.cleanup();
            stateRef.cleanup = fn() ?? null;
            stateRef.deps = deps ? [...deps] : undefined;
            stateRef.hasRun = true;
        }
    }
}

function depsAreSame(a, b) {
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

export function createRoot(container) {
    return new RootContainer(container);
}

export function render(component, container, props) {
    const root = new RootContainer(container);
    root.render(component, props);
}

export function useState(initialValue) {
    if (currentRoot === null) throw new Error('useState can only be called inside a component');

    if (!prevVdomGlobally[STATE]) prevVdomGlobally[STATE] = [];

    const rootRef = currentRoot;
    const vdomRef = prevVdomGlobally;
    const idx = stateIndex++;

    if (vdomRef[STATE][idx] === undefined) {
        vdomRef[STATE][idx] = typeof initialValue === 'function' ? initialValue() : initialValue;
    }

    const setState = (value) => {
        vdomRef[STATE][idx] = typeof value === 'function' ? value(vdomRef[STATE][idx]) : value;
        rootRef.rerender();
    };

    return [vdomRef[STATE][idx], setState];
}

// Schedules a side effect to run after the current render.
// fn runs when deps change (compared by reference equality).
// If fn returns a function, that function is called as cleanup before the next run.
// Passing no deps array means the effect runs after every render.
// Passing an empty deps array means the effect runs once, on mount.
export function useEffect(fn, deps) {
    if (currentRoot === null) throw new Error('useEffect can only be called inside a component');

    if (!prevVdomGlobally[EFFECTS]) prevVdomGlobally[EFFECTS] = [];

    const idx = effectIndex++;
    if (!prevVdomGlobally[EFFECTS][idx]) {
        prevVdomGlobally[EFFECTS][idx] = { hasRun: false, deps: undefined, cleanup: null };
    }

    pendingEffects.push({ stateRef: prevVdomGlobally[EFFECTS][idx], fn, deps });
}

export function createContext() {
    const index = maxContextIndex++;
    return {
        index,
        Provider: ({ value, children }) => {
            prevVdomGlobally[CONTEXT][index] = value;
            return ['div',, children];
        }
    };
}

export function useContext(context) {
    let vdom = prevVdomGlobally;
    while (vdom != null) {
        if (vdom[CONTEXT] && vdom[CONTEXT][context.index] !== undefined) break;
        vdom = vdom[PARENT];
    }
    if (vdom == null) throw new Error('useContext did not find a provider for context');
    return vdom[CONTEXT][context.index];
}
