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
    renderComponent(component, props, prevVdom) {  
        // set the global prevVdom to the prevVdom provided by the caller.
        // the caller has the prevTree because ...
        const originalPrevVdom = prevVdomGlobally;
        prevVdomGlobally = prevVdom || [];

        // reset the state index
        stateIndex = 0;

        // before the component is executed,
        // we need useState() calls to be able to access the previous state.
        // this is possible because we have a global prevVdom that is set to the previous vdom of the currently rendering component.
        // but we need the setState() function useState() returns to be able to change the state that will be read on next render.

        // execute the component spec to get a vdom spec.
        // during execution, the component can access the previous state via useState (i.e prevVdom).
        const vdom = component(props);

        // copy the state from the prevVdom to the new vdom.
        vdom[STATE] = prevVdomGlobally[STATE];

        // do some basic sanity checks on the vdom spec.
        if (vdom[NODE_TYPE] === undefined) {
            throw new Error('vdom spec must have a node type');
        }
        if (vdom[PROPS] === undefined) {
            throw new Error('vdom spec must have props');
        }
        
        // the component returns a vdom spec.
        // the vdom spec is an array of elements.
        // the elements can be function components or primitive values.
        // if the element is a function component, then we need to render it.
        for (const i in (vdom[CHILDREN] || [])) {
            if (typeof vdom[CHILDREN][i][NODE_TYPE] === 'function') {
                vdom[CHILDREN][i] = this.renderComponent(vdom[CHILDREN][i][NODE_TYPE], vdom[CHILDREN][i][PROPS], prevVdom ? prevVdom[CHILDREN][i] : null);
            }
        }

        // restore preVdom
        prevVdomGlobally = originalPrevVdom;

        return vdom;
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
            for (let i = 0; i < vdom[CHILDREN].length; i++) {
                const child = vdom[CHILDREN][i];
                this.diff(prevVdom[CHILDREN][i], child, prevNode.children[i]);
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