import { Signal } from 'signal-polyfill';
import { isVirtualNode } from './vnode.js';

const VOID_TAGS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

export function serialize(renderable) {
    return serializeRenderable(renderable);
}

function serializeRenderable(renderable) {
    if (isSignal(renderable)) {
        return serializeRenderable(renderable.get());
    }

    if (isVirtualNode(renderable)) {
        return serializeVirtualNode(renderable);
    }

    if (Array.isArray(renderable)) {
        return serializeTokens(normalizeChildrenTokens(renderable));
    }

    if (isDomNode(renderable)) {
        return serializeDomNode(renderable);
    }

    return escapeText(String(renderable));
}

function serializeVirtualNode(vnode) {
    const attributes = serializeAttributes(vnode);
    const openingTag = `<${vnode.type}${attributes}>`;

    if (VOID_TAGS.has(vnode.type)) {
        return openingTag;
    }

    const children = resolveChildren(vnode.children);
    if (isRawTextElement(vnode.type)) {
        return `${openingTag}${serializeRawText(children, vnode.type)}</${vnode.type}>`;
    }
    const inner = serializeTokens(children);
    return `${openingTag}${inner}</${vnode.type}>`;
}

function serializeAttributes(vnode) {
    const attributes = new Map();
    if (vnode.key !== undefined) {
        attributes.set('data-key', String(vnode.key));
    }

    if (vnode.attributes && typeof vnode.attributes === 'object') {
        for (const [key, rawValue] of Object.entries(vnode.attributes)) {
            if (isSignal(rawValue)) {
                const signalValue = rawValue.get();
                if (
                    signalValue === null ||
                    signalValue === undefined ||
                    signalValue === false ||
                    (Array.isArray(signalValue) && signalValue.length === 0)
                ) {
                    attributes.delete(key);
                    continue;
                }

                if (typeof signalValue === 'boolean') {
                    attributes.set(key, '');
                    continue;
                }

                if (Array.isArray(signalValue)) {
                    attributes.set(key, signalValue.join(' '));
                    continue;
                }

                attributes.set(key, String(signalValue));
                continue;
            }

            // Skip null/undefined static attributes
            if (rawValue === null || rawValue === undefined) {
                continue;
            }

            attributes.set(key, String(rawValue));
        }
    }

    if (attributes.size === 0) return '';
    return [...attributes.entries()]
        .map(([key, value]) => ` ${key}="${escapeAttribute(value)}"`)
        .join('');
}

function resolveChildren(children) {
    if (!children) {
        return [];
    }

    if (Array.isArray(children)) {
        const hasSignals = children.some(child => isSignal(child));
        if (hasSignals) {
            return resolveChildrenArray(children);
        }
        return normalizeChildrenTokens(children);
    }

    if (isSignal(children)) {
        return normalizeChildrenTokens([children.get()]);
    }

    return normalizeChildrenTokens([children]);
}

function resolveChildrenArray(children) {
    return children.flatMap(child => {
        const value = isSignal(child)
            ? child.get()
            : child;
        return normalizeChildrenTokens([value]);
    });
}

function normalizeChildrenTokens(children) {
    return children.flatMap(child => {
        if (child === null || child === undefined || child === false || child === true) {
            return [];
        }

        if (Array.isArray(child)) {
            return normalizeChildrenTokens(child);
        }

        if (isSignal(child)) {
            return normalizeChildrenTokens([child.get()]);
        }

        if (isVirtualNode(child) || isDomNode(child)) {
            return [child];
        }

        return [String(child)];
    });
}

function serializeTokens(tokens) {
    return tokens.map(token => {
        if (isVirtualNode(token)) {
            return serializeVirtualNode(token);
        }

        if (isDomNode(token)) {
            return serializeDomNode(token);
        }

        return escapeText(String(token));
    }).join('');
}

function isSignal(value) {
    if (value == null) return false;
    if (typeof value !== 'object' && typeof value !== 'function') return false;
    return Signal.isState(value) || Signal.isComputed(value);
}

function isDomNode(value) {
    return typeof Node !== 'undefined' && value instanceof Node;
}

function serializeDomNode(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
        return node.outerHTML;
    }

    if (node.nodeType === Node.TEXT_NODE) {
        return escapeText(node.data);
    }

    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        return [...node.childNodes].map(serializeDomNode).join('');
    }

    return '';
}

function escapeText(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

function isRawTextElement(type) {
    return type === 'script' || type === 'style';
}

function serializeRawText(tokens, type) {
    const closingTag = `</${type}`;
    return tokens.map(token => serializeRawTextToken(token, type)).join('').replaceAll(closingTag, `<\\/${type}`);
}

function serializeRawTextToken(token, type) {
    if (isVirtualNode(token)) {
        return '';
    }

    if (isDomNode(token)) {
        return token.textContent || '';
    }

    return String(token);
}

function escapeAttribute(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}
