// COMMIT — walk the new host-element tree against the previous one and make
// the minimal DOM mutations to bring the real DOM in line: create, replace,
// patch attributes/listeners, recurse into children.
//
// Children are reconciled positionally (by index). Empty slots — null / false /
// a hidden conditional child — don't shift their siblings' DOM positions,
// because we track `domIndex` separately from the element index `i`. Keys are
// used for state continuity (see findPrevChildShadow), not for DOM moves.

import { createDomNode, setProperty, removeProperty } from './dom.js';

// Reconcile one element against whatever was at the same spot last render.
// Returns the DOM node now sitting at this spot.
//   prev   — old element (null ⇒ mount)
//   next   — new element
//   node   — current DOM node at this spot (when prev != null)
//   parent — DOM parent, needed for append / replace
export function reconcile(prev, next, node, parent) {
    if (prev == null) {
        const fresh = createDomNode(next);
        parent.appendChild(fresh);
        return fresh;
    }
    if (prev === next) return node;
    if (prev.type !== next.type) {
        const fresh = createDomNode(next);
        parent.replaceChild(fresh, node);
        return fresh;
    }
    if (next.type === 'TEXT_ELEMENT') {
        if (prev.props.nodeValue !== next.props.nodeValue)
            node.nodeValue = next.props.nodeValue;
        return node;
    }
    patchProps(node, prev.props, next.props);
    patchChildren(node, prev.props.children, next.props.children);
    return node;
}

function patchProps(node, oldProps, newProps) {
    // Remove props that are gone, and listeners about to be replaced.
    for (const key of Object.keys(oldProps)) {
        if (key === 'children') continue;
        const oldVal = oldProps[key];
        if (key.startsWith('on')) {
            if (newProps[key] !== oldVal) removeProperty(node, key, oldVal);
        } else if (!(key in newProps)) {
            removeProperty(node, key, oldVal);
        }
    }
    // Add or update changed props.
    for (const [key, value] of Object.entries(newProps)) {
        if (key === 'children') continue;
        const oldVal = oldProps[key];
        if (value === oldVal) continue;
        if (key.startsWith('on')) {
            setProperty(node, key, value);                 // listener: attach the new one
        } else if (node.getAttribute(key === 'className' ? 'class' : key) !== String(value)) {
            setProperty(node, key, value);
        }
    }
}

// Reconcile children positionally. `domIndex` tracks the real-DOM child position,
// which drifts away from element index `i` whenever a slot is empty — that's how
// a conditionally-rendered child keeps its siblings at stable positions while
// it's hidden.
function patchChildren(node, oldChildren, newChildren) {
    let domIndex = 0;
    const max = Math.max(oldChildren.length, newChildren.length);
    for (let i = 0; i < max; i++) {
        const prev = oldChildren[i];
        const next = newChildren[i];
        const empty = v => v == null || v === false;
        if (empty(prev) && empty(next)) {
            // nothing was here, nothing is here
        } else if (empty(next)) {
            node.removeChild(node.childNodes[domIndex]);
        } else if (empty(prev)) {
            const fresh = createDomNode(next);
            const ref = node.childNodes[domIndex] ?? null;
            node.insertBefore(fresh, ref);
            domIndex++;
        } else {
            reconcile(prev, next, node.childNodes[domIndex], node);
            domIndex++;
        }
    }
}
