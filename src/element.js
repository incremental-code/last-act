import { Signal } from 'signal-polyfill';
import { onUnmount } from './lifecycle.js';
import { setAttributes, setSignalAttribute, setProperties, setChildren, setKey } from './binding.js';

/**
 * createElement can be called to construct a native HTMLElement,
 * or to execute a function component.
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
 * @returns HTMLElement
 */
export function createElement(type, props = {}, ...children) {
    if (typeof type !== 'string' && typeof type !== 'function') {
        throw new TypeError(`createElement: invalid type "${type}"`);
    }

    let { key, attributes, children: propsChildren, ...restOfProps } = props;
    const propsChildrenArray = propsChildren != null
        ? (Array.isArray(propsChildren) ? propsChildren : [propsChildren])
        : [];
    const allChildren = [...propsChildrenArray, ...children];

    if (typeof type === 'string') {
        const element = document.createElement(type);
        setKey(element, key);
        setAttributes(element, attributes);
        setProperties(element, restOfProps);
        setChildren(element, allChildren);
        return element;
    }

    if (typeof type === 'function') {
        const element = type({ key, attributes, children: allChildren, ...restOfProps });
        setKey(element, key);
        return element;
    }
}