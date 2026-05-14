// After the initial mount builds a DOM tree from the resolved host-element tree,
// walk shadow / resolved-element / DOM in parallel and stamp each shadow with
// its DOM node + DOM parent. From then on a setState anywhere can re-render
// just that component's subtree: we know exactly which DOM node to diff against.

export function linkShadowDom(shadow, resolved, dom) {
    if (shadow) {
        shadow.dom       = dom;
        shadow.parentDom = dom.parentNode;
    }
    const children = resolved?.props?.children;
    if (!Array.isArray(children)) return;

    const shadowChildren = shadow?.children ?? [];
    let domIndex = 0;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child == null || child === false) continue;
        const childDom = dom.childNodes[domIndex++];
        linkShadowDom(shadowChildren[i], child, childDom);
    }
}
