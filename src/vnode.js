export const VIRTUAL_NODE = Symbol('last-act/virtual-node');
export const MOUNTED_NODE = Symbol('last-act/mounted-node');

export function isVirtualNode(value) {
    return !!value && typeof value === 'object' && value[VIRTUAL_NODE] === true;
}

export function createVirtualNode(type, { key, attributes, props, children }) {
    return {
        [VIRTUAL_NODE]: true,
        type,
        key,
        attributes,
        props,
        children,
    };
}
