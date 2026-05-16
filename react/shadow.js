// The shadow tree — a parallel tree of nodes that survives across renders.
//
// A component's element is rebuilt every render, so it can't be where useState
// stores its value. Instead, each position in the resolved tree gets a shadow
// node that *does* persist, holding everything that must survive:
//
//   state    — useState slots (index 0 = first useState call, etc.)
//   effects  — useEffect slots (deps + cleanup fn, one per call)
//   context  — values published by a <Context.Provider> rendered at this node
//   parent   — the enclosing *component's* shadow (skips host nodes), so
//              useContext can walk straight up the component chain.
//   children — shadow nodes mirroring this element's props.children, by position
//   _key     — copy of the element's `key`, so list items can be matched by key
//              across renders (a reordered list keeps each item's state).
//
//   element  — the component element this shadow was rendered from (for re-render)
//   rendered — the resolved host element it produced (the "vdom" at this slot)
//   dom      — the real DOM node for that resolved element (root component only;
//              children's DOM lives inside their parent's tree). Set by mount().
//   parentDom — the DOM parent the component's output lives under.
//   _root    — back-pointer to the Root so setState/scheduleUpdate can find it.
//   _dirty   — set by scheduler; true while queued for re-render.

export function makeShadow(key, parent) {
    return {
        _key: key, parent, children: [],
        state: [], effects: [], context: [],
        element: null, rendered: null,
        dom: null, parentDom: null,
        _root: null,
    };
}

// When a host element has children, each child gets its own shadow. For a child
// that's a component element, that shadow holds the component's hook slots; for
// a child that's a host element, the shadow is just a placeholder so the tree
// shape mirrors the resolved element tree. Either way we need to find the
// previous render's shadow for the same slot, so state carries forward.
//
// Match by key first (so a reordered list keeps each item's state); fall back to
// matching by position. Returns null for "brand new here — fresh state".
export function findPrevChildShadow(prevShadow, child, index) {
    if (!prevShadow?.children) return null;
    if (child && child.key != null)
        return prevShadow.children.find(s => s?._key === child.key) ?? null;
    return prevShadow.children[index] ?? null;
}
