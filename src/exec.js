// RESOLVE — turn an element tree into a tree of pure *host* elements (whose
// `type` is a DOM tag string), by calling every function component and splicing
// the element it returns in place of the component element. Component nesting
// collapses away; what's left is a description of DOM.
//
// In parallel we maintain the shadow tree. Each shadow position has a single,
// stable shadow object that survives across renders — we look up the existing
// shadow at that position (matched by key for keyed children, otherwise by
// index) and update it in place, so hook slot arrays stay live.

import { makeShadow, findPrevChildShadow } from './shadow.js';
import { enterComponent, leaveComponent } from './hooks.js';

// Render one component. Returns `[resolvedElement, shadow]`.
// If `existingShadow` is provided, it's reused (mutated in place); otherwise a
// new shadow is created. `parentShadow` is the *enclosing* component's shadow —
// becomes `shadow.parent`, which is what useContext walks up.
export function renderComponent(componentElement, existingShadow, parentShadow, root) {
    const shadow = existingShadow ?? makeShadow(componentElement.key, parentShadow);
    shadow.parent   = parentShadow;
    shadow._key     = componentElement.key;
    shadow.element  = componentElement;
    shadow._root    = root;

    const restore = enterComponent(shadow);
    // If a component returns another component element, keep unwrapping until
    // we reach a host element. Each unwrap calls the next component function
    // *with the same shadow active*, so any hooks it calls (e.g. a Provider
    // stamping a context value) land on this shadow.
    let rendered = componentElement.type(componentElement.props ?? {});
    while (rendered && typeof rendered === 'object' && typeof rendered.type === 'function') {
        rendered = rendered.type(rendered.props ?? {});
    }
    resolveChildren(rendered, shadow, shadow, root);
    leaveComponent(restore);

    shadow.rendered = rendered;
    return [rendered, shadow];
}

// Walk the children of a resolved host element, turning any nested
// function-component elements into their rendered host elements, and
// maintaining shadow children alongside.
//
//   hostElement     — host element whose .props.children we're resolving
//   componentShadow — enclosing component's shadow (the `parent` link for any
//                     nested component we discover; doesn't change as we
//                     descend through plain host elements)
//   hostShadow      — shadow for this host element; we fill .children
function resolveChildren(hostElement, componentShadow, hostShadow, root) {
    const children = hostElement?.props?.children;
    if (!Array.isArray(children)) return;

    const prevChildren = hostShadow.children;
    const nextChildren = new Array(children.length);

    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child == null || typeof child !== 'object') {
            // Empty slot — keep the previous shadow if any, so a conditionally
            // hidden child resumes its state when it reappears.
            nextChildren[i] = prevChildren[i];
            continue;
        }

        if (typeof child.type === 'function') {
            const prev = findPrevChildShadow({ children: prevChildren }, child, i);
            const [rendered, childShadow] = renderComponent(child, prev, componentShadow, root);
            children[i]      = rendered;       // splice resolved output back in
            nextChildren[i]  = childShadow;
        } else {
            // Host element — no hooks of its own, but may contain nested components.
            const prev = prevChildren[i];
            const childShadow = prev ?? makeShadow(child.key ?? null, componentShadow);
            childShadow.parent = componentShadow;
            childShadow._key   = child.key ?? null;
            childShadow._root  = root;
            childShadow.children = childShadow.children ?? [];
            nextChildren[i] = childShadow;
            resolveChildren(child, componentShadow, childShadow, root);
        }
    }
    hostShadow.children = nextChildren;
}
