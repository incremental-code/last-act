import { Signal } from 'signal-polyfill';
import { moveOnUnmount } from './lifecycle.js';
import { setAttributes, setProperties, setChildren, setKey, setChildResolver } from './binding.js';
import { createVirtualNode, isVirtualNode, MOUNTED_NODE } from './vnode.js';

/**
 * createElement creates a virtual node for native tags,
 * or executes a function component that returns a renderable value.
 *
 * @param {string|function} type
 * @param {*} props
 * @param  {...HTMLElement} children
 * @returns {object|Node}
 */
export function createElement(type, props = {}, ...children) {
    if (typeof type !== 'string' && typeof type !== 'function') {
        throw new TypeError(`createElement: invalid type "${type}"`);
    }

    const normalizedProps = props ?? {};
    const { key, attributes, children: propsChildren, ...restOfProps } = normalizedProps;
    const propsChildrenArray = propsChildren != null
        ? (Array.isArray(propsChildren) ? propsChildren : [propsChildren])
        : [];
    const allChildren = [...propsChildrenArray, ...children];

    if (typeof type === 'string') {
        return createVirtualNode(type, {
            key,
            attributes,
            props: restOfProps,
            children: allChildren,
        });
    }

    const rendered = type({ key, attributes, children: allChildren, ...restOfProps });
    if (key === undefined) return rendered;

    if (isVirtualNode(rendered)) {
        rendered.key = key;
        return rendered;
    }

    if (rendered instanceof Node) {
        setKey(rendered, key);
    }

    return rendered;
}

export function mount(renderable, parent) {
    const node = materialize(renderable);
    if (parent) {
        parent.appendChild(node);
    }
    return node;
}

export function hydrate(renderable, existingNode) {
    if (!(existingNode instanceof Node)) {
        throw new TypeError('hydrate: existingNode must be a DOM Node');
    }
    return materialize(renderable, { hydrateNode: existingNode });
}

export function getMountedNode(renderable) {
    if (renderable instanceof Node) {
        return renderable;
    }

    if (isVirtualNode(renderable)) {
        return renderable[MOUNTED_NODE];
    }

    return undefined;
}

function materialize(renderable, options = {}) {
    if (renderable instanceof Node) {
        return options.hydrateNode instanceof Node ? options.hydrateNode : renderable;
    }

    if (isVirtualNode(renderable)) {
        if (renderable[MOUNTED_NODE]) {
            return renderable[MOUNTED_NODE];
        }

        const element = resolveElementForVNode(renderable, options.hydrateNode);
        setKey(element, renderable.key);
        setAttributes(element, renderable.attributes);
        setProperties(element, renderable.props);

        if (options.hydrateNode && !containsSignal(renderable.children)) {
            hydrateStaticChildren(element, renderable.children);
        } else {
            setChildren(element, renderable.children);
        }

        renderable[MOUNTED_NODE] = element;
        moveOnUnmount(renderable, element);
        return element;
    }

    const textValue = String(renderable);
    if (options.hydrateNode?.nodeType === Node.TEXT_NODE) {
        options.hydrateNode.data = textValue;
        return options.hydrateNode;
    }

    return document.createTextNode(textValue);
}

function resolveElementForVNode(vnode, hydrateNode) {
    if (hydrateNode == null) {
        return document.createElement(vnode.type);
    }

    if (!(hydrateNode instanceof HTMLElement)) {
        throw new Error(`hydrate: expected <${vnode.type}> but found non-element node`);
    }

    const foundTag = hydrateNode.tagName.toLowerCase();
    if (foundTag !== vnode.type) {
        throw new Error(`hydrate: expected <${vnode.type}> but found <${foundTag}>`);
    }

    return hydrateNode;
}

function containsSignal(children) {
    if (Signal.isState(children) || Signal.isComputed(children)) {
        return true;
    }
    if (!Array.isArray(children)) {
        return false;
    }
    return children.some(child => containsSignal(child));
}

function hydrateStaticChildren(parent, children) {
    const tokens = flattenChildren(children);
    const existing = [...parent.childNodes];
    const desiredNodes = [];

    for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        const existingChild = existing[index];

        if (isVirtualNode(token)) {
            desiredNodes.push(materialize(token, { hydrateNode: existingChild }));
            continue;
        }

        if (token instanceof Node) {
            desiredNodes.push(token);
            continue;
        }

        if (existingChild?.nodeType === Node.TEXT_NODE) {
            existingChild.data = token;
            desiredNodes.push(existingChild);
            continue;
        }

        desiredNodes.push(document.createTextNode(token));
    }

    for (let index = 0; index < desiredNodes.length; index++) {
        const desired = desiredNodes[index];
        const current = parent.childNodes[index];
        if (current !== desired) {
            parent.insertBefore(desired, current || null);
        }
    }

    while (parent.childNodes.length > desiredNodes.length) {
        parent.removeChild(parent.lastChild);
    }
}

function flattenChildren(children) {
    if (!Array.isArray(children)) {
        if (isBlank(children)) return [];
        return [flattenSingleChild(children)];
    }

    return children.flatMap(child => {
        if (isBlank(child)) return [];
        if (Array.isArray(child)) {
            return flattenChildren(child);
        }
        return [flattenSingleChild(child)];
    });
}

function flattenSingleChild(child) {
    if (isVirtualNode(child) || child instanceof Node) {
        return child;
    }
    return String(child);
}

function isBlank(child) {
    return child === null || child === undefined || child === false || child === true;
}

setChildResolver((child) => materialize(child));
