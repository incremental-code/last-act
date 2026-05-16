import { moveOnUnmount } from './lifecycle.js';
import { setAttributes, setProperties, setChildren, setKey, setChildResolver } from './binding.js';
import { createVirtualNode, isVirtualNode, MOUNTED_NODE } from './vnode.js';

/**
 * createElement creates a virtual node for native tags,
 * or executes a function component that returns a renderable value.
 * 
 * ```
 * const HelloWorld = ({ name }) => {
 *  return createElement(Greeting, null, `Hello ${name}`);
 * }
 * 
 * const Greeting = ({ children }) => {
 *  return createElement('div', { attributes: { class: 'hello-world' } }, children);
 * }
 * ```
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
    let { key, attributes, children: propsChildren, ...restOfProps } = normalizedProps;
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

export function getMountedNode(renderable) {
    if (renderable instanceof Node) {
        return renderable;
    }

    if (isVirtualNode(renderable)) {
        return renderable[MOUNTED_NODE];
    }

    return undefined;
}

function materialize(renderable) {
    if (renderable instanceof Node) {
        return renderable;
    }

    if (isVirtualNode(renderable)) {
        if (renderable[MOUNTED_NODE]) {
            return renderable[MOUNTED_NODE];
        }

        const element = document.createElement(renderable.type);
        setKey(element, renderable.key);
        setAttributes(element, renderable.attributes);
        setProperties(element, renderable.props);
        setChildren(element, renderable.children);
        renderable[MOUNTED_NODE] = element;
        moveOnUnmount(renderable, element);
        return element;
    }

    return document.createTextNode(String(renderable));
}

setChildResolver(materialize);