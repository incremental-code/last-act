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
    let element;
    let { key, attributes, ...restOfProps } = props;
    
    if (typeof type === 'string') {
        element = document.createElement(type);
        setKey(element, key);
        setAttributes(element, attributes);
        setProperties(element, restOfProps);
        setChildren(element, children);
        return element;
    }

    if (typeof type === 'function') {
        element = type({ key, attributes, children, ...restOfProps });
        setKey(element, key);
        return element;
    }
}