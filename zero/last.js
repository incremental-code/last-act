/**
* LastJS is a customisable functional reactive user interface library.
 * 
 * Requirements:
 * - Function components return plain arrays describing the UI.
 * - Function components can access state from the previous render.
 * - Function components can schedule effects to run after the current render.
 * - Effects will only be rerun when their dependencies change.
 * - Effects can have cleanup functions which will called when ...
 * - Can be rendered on server and hyrdated on client.
 */

const NODE_TYPE = 0;
const PROPS = 1;
const CHILDREN = 2;
const STATE = 3;
const PARENT = 4;
const CONTEXT = 5;

// prevVdom is the previous virtual DOM tree.
// It is used to diff the new virtual DOM tree with the previous one.
// It is set to the previous vdom of the currently rendering component,
// so that the current component execution can access the previous state.
// i.e it is global because it is used by the global useState() and useEfect() functions.
let prevVdomGlobally = null;
let stateIndex = 0;

// currentRoot is used to track the current root container during calls to setState etc,
// so that we can re-render.
let currentRoot = null;

// track context's created.
let maxContextIndex = 0;

// getPrevVdomInChildren finds the matching previous vdom for a child component.
// It matches by key prop if present, otherwise falls back to positional index.
function getPrevVdomInChildren(prevVdom, currentChild, index) {
    if (!prevVdom || !prevVdom[CHILDREN]) return null;
    const key = currentChild[PROPS]?.key;
    if (key !== undefined) {
        return prevVdom[CHILDREN].find(c => c && c[PROPS]?.key === key) ?? null;
    }
    return prevVdom[CHILDREN][index] ?? null;
}

// RootContainer is the entry point for the library.
// It is responsible for rendering the component to the container.
class RootContainer {
    constructor(container) {
        this.container = container;
        this.prevVdom = null;
    }

    // render is the entry point for the library.
    // It takes a component function, props, and renders the component to the container.
    render(component, props) {
        currentRoot = this;
        this.component = component;
        this.props = props;

        const vdom = this.renderComponent(component, props, this.prevVdom);

        // diff the new vdom with the previous vdom
        this.diff(this.prevVdom, vdom, this.container.firstChild);

        // set the prevVdom to the new vdom
        this.prevVdom = vdom;
    }

    rerender() {
        this.render(this.component, this.props);
    }

    // renderComponent takes a component spec returned from a function component
    // and executes the function component to get a vdom spec.
    renderComponent(component, props, prevVdom, parentVdom) {  
        // set the global prevVdom to the prevVdom provided by the caller.
        // the caller has the prevTree because ...
        const originalPrevVdom = prevVdomGlobally;
        prevVdomGlobally = prevVdom || [null, {}, [], [], parentVdom, []];

        // reset the state index
        stateIndex = 0;

        // before the component is executed,
        // we need useState() calls to be able to access the previous state.
        // this is possible because we have a global prevVdom that is set to the previous vdom of the currently rendering component.
        // but we need the setState() function useState() returns to be able to change the state that will be read on next render.

        // execute the component spec to get a vdom spec.
        // during execution, the component can access the previous state via useState (i.e prevVdom).
        const vdom = component(props|| {});

        // copy the state from the prevVdom to the new vdom.
        vdom[STATE] = prevVdomGlobally[STATE];
        vdom[CONTEXT] = prevVdomGlobally[CONTEXT];

        // set the parent of the vdom to the current component.
        vdom[PARENT] = parentVdom;

        // do some basic sanity checks on the vdom spec.
        if (vdom[NODE_TYPE] === undefined) {
            throw new Error('vdom spec must have a node type');
        }
        
        // the component returns a vdom spec.
        // the vdom spec is an array of elements.
        // the elements can be function components or primitive values.
        // if the element is a function component, then we need to render it.
        // we pass componentVdom (the component's root) as parentVdom so that
        // context traversal via PARENT always reaches a vdom with CONTEXT set,
        // even when function components are nested inside plain HTML elements.
        this.processVdomChildren(vdom, prevVdom, vdom);

        // restore preVdom
        prevVdomGlobally = originalPrevVdom;

        return vdom;
    }

    // processVdomChildren recursively processes all children of a vdom node,
    // rendering any function components it finds at any depth of nesting inside
    // plain HTML element children. componentVdom is the root vdom of the
    // component currently being rendered; it is kept constant as we descend
    // through HTML elements so that PARENT always points to a vdom that has
    // CONTEXT set, enabling correct context traversal.
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
                // Recurse into plain HTML element children to find nested
                // function components (e.g. ListItem inside a <ul>).
                const prevChild = prevVdom ? (prevVdom[CHILDREN]?.[i] ?? null) : null;
                this.processVdomChildren(child, prevChild, componentVdom);
            }
        }
    }

    diff(prevVdom, vdom, prevNode) {
        // diff the new vdom with the previous vdom
        // if the new vdom is different from the previous vdom,
        // then update the container.
        if (prevVdom === null) {
            this.container.appendChild(this.createDom(vdom));
            return;
        }

        // if the new vdom is the same as the previous vdom,
        // then do nothing.
        if (prevVdom === vdom) {
            return;
        }

        // if the new vdom node type is different from the previous vdom,
        // then update the node.
        if (prevVdom[NODE_TYPE] !== vdom[NODE_TYPE]) {
            this.container.replaceChild(this.createDom(vdom), prevNode);
            return;
        }

        // if the new vdom node type is the same as the previous vdom,
        // then update the properties, and event listeners.
        if (prevVdom[NODE_TYPE] === vdom[NODE_TYPE]) {
            this.updateNode(prevNode, prevVdom, vdom);
        }
    }

    createDom(vdom) {
        const dom = document.createElement(vdom[NODE_TYPE]);
        for (const [key, value] of Object.entries(vdom[PROPS] || {})) {
            if (key.startsWith('on')) {
                dom.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                dom.setAttribute(key, value);
            }
        }

        if (vdom[CHILDREN] instanceof Array) {
            for (const child of vdom[CHILDREN]) {
                if (!child) continue;
                dom.appendChild(this.createDom(child));
            }
        } else {
            dom.textContent = vdom[CHILDREN];
        }

        return dom;
    }

    // updateNode updates the properties and event listeners of the node.
    // it also updates the children of the node.
    updateNode(prevNode, prevVdom, vdom) {
        for (const [key, value] of Object.entries(vdom[PROPS] || {})) {
            // TODO: Don't always remove all event listeners.
            if (key.startsWith('on')) {
                prevNode.removeEventListener(key.slice(2).toLowerCase(), prevVdom[PROPS][key]);
                prevNode.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                prevNode.setAttribute(key, value);
            }
        }

        // update the children of the node.
        if (vdom[CHILDREN] instanceof Array) {
            let domIndex = 0;
            for (let i = 0; i < vdom[CHILDREN].length; i++) {
                const child = vdom[CHILDREN][i];
                const prevChild = prevVdom[CHILDREN]?.[i];
                if (!child && !prevChild) {
                    // both falsy, nothing to do
                } else if (!child && prevChild) {
                    // became falsy: remove the DOM node
                    prevNode.removeChild(prevNode.children[domIndex]);
                } else if (child && !prevChild) {
                    // became non-falsy: insert a new DOM node
                    prevNode.insertBefore(this.createDom(child), prevNode.children[domIndex] ?? null);
                    domIndex++;
                } else {
                    this.diff(prevChild, child, prevNode.children[domIndex]);
                    domIndex++;
                }
            }
        } else {
            prevNode.textContent = vdom[CHILDREN].toString();
        }
    }
}

export function createRoot(container) {
    return new RootContainer(container);
}

export function render(component, container, props) {
    const rootContainer = new RootContainer(container);
    rootContainer.render(component, props);
}

export function useState(initialValue) {
    if (currentRoot === null) {
        throw new Error('useState can only be called inside a component');
    }

    if (prevVdomGlobally === null) {
        throw new Error('useState can only be called after the first render');
    }

    if (prevVdomGlobally[STATE] === undefined) {
        prevVdomGlobally[STATE] = [];
    }

    // create reference to prevVdom and stateIndex that we can access later in setState.
    const currentRootPointer = currentRoot;
    const prevVdomPointer = prevVdomGlobally;
    const stateIndexPointer = stateIndex;
    // get or initialize the previous state from the prevVdom.
    const prevState = prevVdomPointer[STATE][stateIndex];
    if (prevState === undefined) {
        prevVdomPointer[STATE][stateIndexPointer] = initialValue;
    }

    const setState = (value) => {
        prevVdomPointer[STATE][stateIndexPointer] = value;
        currentRootPointer.rerender();
    }

    stateIndex++;

    return [prevVdomPointer[STATE][stateIndexPointer], setState];
}

export function createContext() {
    maxContextIndex++;
    
    return {
        index: maxContextIndex - 1,
        Provider: ({ value, children }) => {
            prevVdomGlobally[CONTEXT][maxContextIndex - 1] = value;
            
            return ['div',, children];
        }
    };
}

export function useContext(context) {
    // traverse the parent vdom tree to find the matching context value.
    let vdom = prevVdomGlobally;
    while (vdom !== null || typeof vdom !== 'undefined') {
        if (vdom[CONTEXT] && vdom[CONTEXT][context.index] !== undefined) {
            break;
        }
        vdom = vdom[PARENT];
    }

    if (vdom === null) {
        throw new Error('useContext did not find a provider for context');
    }

    return vdom[CONTEXT][context.index];
}