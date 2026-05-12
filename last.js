/**
 * LastJS — a tiny, readable reimplementation of React's core ideas.
 * ============================================================================
 *
 * This file is meant to be *read*. It's the smallest thing that still works
 * like React: components, `useState`, `useEffect`, `useContext`, and a DOM
 * reconciler. If you follow this file end to end you've seen the spine of React.
 *
 * The pipeline, top to bottom:
 *
 *   1. You write components — plain functions that return *elements*. An element
 *      is just a description of UI: `{ type, props }` (see `createElement`).
 *      It's exactly what JSX compiles to. Elements are cheap, immutable, and
 *      thrown away and rebuilt from scratch on every render.
 *
 *   2. `render()` turns the root element into a tree of *host elements* — ones
 *      whose `type` is a DOM tag string like `'div'`. It does that by calling
 *      every function component and splicing the element it returns in place of
 *      the component element. Component nesting collapses away; what's left is a
 *      pure description of DOM.
 *
 *   3. Because elements are rebuilt every render they can't *hold* anything that
 *      must survive — like a `useState` value. So alongside the element tree we
 *      keep a *shadow tree* with the same shape that *does* persist across
 *      renders. Each shadow node owns the state / effect / context slots for one
 *      position in the tree. Hooks read and write "the shadow node for the
 *      component currently rendering" (see the hook globals below).
 *      (React calls the equivalent structure the "fiber tree".)
 *
 *   4. `diff()` walks the new host-element tree against the previous one and
 *      makes the minimal DOM mutations to bring the real DOM in line: create,
 *      replace, patch attributes/listeners, recurse into children.
 *
 *   5. After the DOM is committed, queued `useEffect` callbacks run — deferred
 *      via `setTimeout` so they observe the already-updated DOM, the same
 *      ordering guarantee React gives you.
 *
 *   6. `setState` mutates a shadow slot and asks the root to re-render from the
 *      top. Steps 2–5 run again; the shadow tree carries the state forward, so
 *      components resume exactly where they left off.
 *
 * Deliberately omitted (these are optimizations/ergonomics layered on top of
 * exactly this idea): fibers / interruptible rendering, render batching, a
 * synthetic event system, fragments, error boundaries, and the key-aware DOM
 * *move* algorithm — we use keys to keep component *state* across reorders, but
 * the DOM child patch itself is index-based.
 */

// React stamps every element with this symbol. It's a safety marker: a plain
// object that arrived as JSON (say, from an API) can't forge a Symbol, so a
// renderer can refuse to treat it as an element. We keep it for that reason and
// for drop-in compatibility with JSX tooling that emits `React.createElement`.
const REACT_ELEMENT_TYPE = Symbol.for('react.element');

/**
 * Build an element — the immutable "description of UI" object a component
 * returns. JSX `<div id="x">hi</div>` compiles to `createElement('div', {id:'x'}, 'hi')`.
 *
 *   type      — a DOM tag string (`'div'`) for a host element, or a function for
 *               a component element.
 *   props     — attributes / event handlers / data for the component.
 *   children  — gathered from the trailing arguments and normalised: zero → omit,
 *               one → that child itself, many → an array. `key` and `ref` are
 *               lifted out of props onto the element (just like React).
 */
export function createElement(type, props, ...children) {
    const { key = null, ref = null, ...rest } = props ?? {};
    if (children.length === 1)      rest.children = children[0];
    else if (children.length > 1)   rest.children = children;
    return { $$typeof: REACT_ELEMENT_TYPE, type, key, ref, props: rest };
}

// ── The shadow tree ───────────────────────────────────────────────────────────
//
// Problem: a component's element object is rebuilt from scratch every render, so
// it can't be where `useState` stores its value. Solution: a second tree — the
// shadow tree — shaped like the rendered tree but *surviving* between renders.
// One shadow node ↔ one position in the tree, holding everything that must
// persist there:
//
//   state    — array of useState slots (slot 0 = first useState call, slot 1 = …)
//   effects  — array of useEffect slots (deps + cleanup fn, one per call)
//   context  — values published by a <Context.Provider> rendered at this node
//   parent   — the *enclosing component's* shadow. This intentionally skips host
//              nodes, so useContext can walk straight up the component chain.
//   children — shadow nodes mirroring this element's props.children, by position
//   _key     — copy of the element's `key`, so children can be matched by key
//              across renders (a reordered list keeps each item's state).
function makeShadow(key, parent) {
    return { _key: key, state: [], effects: [], context: [], parent, children: [] };
}

// Reconciliation, the *state* half. Given the previous render's shadow for a host
// node and one of this render's children sitting at position `index`, return the
// shadow node that child should reuse. Prefer matching by `key` (survives
// reordering); otherwise fall back to matching by position. `null` means "brand
// new here — start with fresh state".
function getPrevChildShadow(prevShadow, child, index) {
    if (!prevShadow?.children) return null;
    if (child.key != null)
        return prevShadow.children.find(s => s?._key === child.key) ?? null;
    return prevShadow.children[index] ?? null;
}

// ── Hook globals ──────────────────────────────────────────────────────────────
//
// This is the trick behind the "rules of hooks". `useState` / `useEffect` take
// no argument saying *which* component they belong to. Instead, while a component
// function is executing, these module-level variables point at its shadow node
// and at the next slot index to hand out. Each hook call does `index++`, so the
// Nth hook call always lands on the Nth slot. That's exactly why hooks must run
// in the same order every render (no hooks inside `if`/loops): the call order
// *is* the slot's identity.
let prevShadowGlobally = null;  // shadow node of the component currently rendering
let stateIndex  = 0;            // next useState slot to hand out
let effectIndex = 0;            // next useEffect slot to hand out

let currentRoot       = null;   // RootContainer mid-render; setState calls .rerender() on it
let maxContextIndex   = 0;      // monotonic id generator for createContext()
let pendingEffects    = [];     // useEffect callbacks queued this render, flushed after the DOM commit

// ── RootContainer ─────────────────────────────────────────────────────────────
//
// One RootContainer per mount point. Between renders it remembers just enough to
// diff: the last element you asked it to render, the last fully-resolved
// host-element tree, and the last shadow tree.
class RootContainer {
    constructor(container) {
        this.container   = container;   // the real DOM element we render into
        this.rootElement = null;        // last element passed to render() (re-used by rerender())
        this.prevElement = null;        // last resolved host-element tree (the "previous vdom")
        this.prevShadow  = null;        // last shadow tree (carries state/effects/context forward)
    }

    // One full render cycle: resolve → commit → schedule effects.
    render(element) {
        currentRoot       = this;       // so any setState() fired during this render knows who to re-render
        this.rootElement  = element;
        pendingEffects    = [];          // refilled below as components call useEffect

        // RESOLVE: run every function component, producing a tree of pure host
        // elements plus the parallel shadow tree. Passing `this.prevShadow` is
        // what carries state forward; `null` is the root component's parent.
        const [renderedElement, shadow] = this.renderComponent(
            element.type, element.props, this.prevShadow, null
        );

        // COMMIT: reconcile the real DOM against the previous host-element tree.
        // On the first render `prevElement` is null and `firstChild` is null, so
        // diff() just appends; afterwards `firstChild` is last render's root node.
        this.diff(this.prevElement, renderedElement, this.container.firstChild, this.container);
        this.prevElement = renderedElement;
        this.prevShadow  = shadow;

        // EFFECTS: run *after* the DOM is updated. setTimeout(…, 0) defers them to
        // the next macrotask, by which point `this.container` reflects the new tree.
        const effectsToRun = pendingEffects;
        pendingEffects = [];
        setTimeout(() => flushEffects(effectsToRun), 0);
    }

    // setState's entry point: re-render the whole tree from the saved root element.
    // Naive but correct — the shadow tree means components keep their state, and
    // diff() means only changed DOM is touched. No batching: two setState calls in
    // one event handler cause two full renders.
    rerender() {
        this.render(this.rootElement);
    }

    // Run a single function component and resolve everything it returned.
    //
    //   type / props  — the component function and the props to call it with
    //   prevShadow    — that component's shadow from the previous render, or null
    //                   if it's mounting now (→ fresh state/effects/context)
    //   parentShadow  — the enclosing component's shadow; becomes `shadow.parent`,
    //                   the link useContext walks up
    //
    // Returns `[resolvedElement, shadow]` — `resolvedElement` is the host element
    // the component returned, with any nested components inside it already resolved.
    renderComponent(type, props, prevShadow, parentShadow) {
        // New shadow node for this render — but adopt the *same* state/effects/
        // context arrays the previous shadow used. They're shared by reference, so
        // the slots (and the values the previous setState closed over) stay live.
        const shadow = makeShadow(props?.key ?? null, parentShadow);
        shadow.state   = prevShadow?.state   ?? [];
        shadow.effects = prevShadow?.effects ?? [];
        shadow.context = prevShadow?.context ?? [];

        // Point the hook globals at this component, reset the slot counters, then
        // call it. Every useState/useEffect/useContext inside runs *now*, in order.
        // Save/restore the previous global so nested renderComponent calls nest.
        const savedPrevShadow = prevShadowGlobally;
        prevShadowGlobally = shadow;
        stateIndex  = 0;
        effectIndex = 0;

        const element = type(props ?? {});

        // The component returned a host element (or a tree of them) — but that tree
        // may still contain nested <Component/> elements. Walk it, resolve those too,
        // and mirror the structure into `shadow.children` as we go.
        this.processChildren(element, prevShadow, shadow, shadow);

        prevShadowGlobally = savedPrevShadow;
        return [element, shadow];
    }

    // Depth-first walk over the host-element tree a component returned, turning
    // every nested function-component element into its rendered host element and
    // building shadow children alongside.
    //
    //   element          — the host element whose `.props.children` we're walking
    //   prevHostShadow   — the shadow this host element had last render; source of
    //                      the previous child shadows, for state continuity
    //   componentShadow  — the *enclosing component's* shadow. Stays fixed as we
    //                      descend through plain host elements: it's the parent we
    //                      hand to any component we discover, so useContext climbs
    //                      to the right place no matter how deep the host nesting.
    //   hostShadow       — the new shadow for `element`; we fill in its `.children`.
    processChildren(element, prevHostShadow, componentShadow, hostShadow) {
        const children = element.props?.children;
        if (!Array.isArray(children)) return;   // single child / text / nothing — no nested components to resolve

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (!child || typeof child !== 'object') continue;  // text, number, null, false — leave as-is

            if (typeof child.type === 'function') {
                // A component element. Render it, swap its rendered output into the
                // children array in place, and record its shadow at the same index.
                const prevChildShadow = getPrevChildShadow(prevHostShadow, child, i);
                const [rendered, childShadow] = this.renderComponent(
                    child.type, child.props, prevChildShadow, componentShadow
                );
                children[i]           = rendered;
                hostShadow.children[i] = childShadow;
            } else {
                // A host element (e.g. a nested <div>). It has no hooks of its own,
                // but it may *contain* components — give it a shadow and recurse.
                // The enclosing component is unchanged; only the host shadow changes.
                const prevChildShadow = prevHostShadow?.children?.[i] ?? null;
                const childShadow     = makeShadow(child.key ?? null, componentShadow);
                hostShadow.children[i] = childShadow;
                this.processChildren(child, prevChildShadow, componentShadow, childShadow);
            }
        }
    }

    // ── Committing to the DOM ─────────────────────────────────────────────────
    //
    // Everything below works on the resolved host-element tree (no components
    // left). diff() decides — for one node — mount vs. replace vs. update-in-place;
    // updateNode() patches an existing node and recurses into children; createDom()
    // builds a fresh DOM subtree from scratch.

    // Reconcile one element against whatever was at the same spot last render.
    //   prevElement — the old element (null ⇒ nothing was here ⇒ mount)
    //   element     — the new element
    //   prevNode    — the real DOM node currently at this spot (when prevElement != null)
    //   parentNode  — the real DOM parent, needed for append / replace
    diff(prevElement, element, prevNode, parentNode) {
        if (prevElement === null) {                       // 1. mount: build the subtree and append it
            parentNode.appendChild(this.createDom(element));
            return;
        }
        if (prevElement === element) return;              // 2. same object reference ⇒ nothing changed, bail
        if (prevElement.type !== element.type) {          // 3. tag changed ⇒ throw the old subtree away
            parentNode.replaceChild(this.createDom(element), prevNode);
            return;
        }
        this.updateNode(prevNode, prevElement, element);  // 4. same tag ⇒ patch this node, recurse into children
    }

    // Build a real DOM subtree from an element. Used on mount and whenever a
    // subtree must be created wholesale (diff() cases 1 and 3).
    createDom(element) {
        const dom   = document.createElement(element.type);
        const props = element.props ?? {};

        for (const [key, value] of Object.entries(props)) {
            if (key === 'children') continue;                 // children are handled below, not as an attribute
            if (key.startsWith('on')) {
                // `onClick` → addEventListener('click', …). React funnels events
                // through one delegated listener at the root; we attach directly —
                // simpler, and fine at this scale.
                dom.addEventListener(key.slice(2).toLowerCase(), value);
            } else if (key !== 'key' && key !== 'ref') {
                // Everything else is a plain attribute. `className` is JSX's name
                // for the `class` attribute.
                dom.setAttribute(key === 'className' ? 'class' : key, value);
            }
        }

        const { children } = props;
        if (Array.isArray(children)) {
            for (const child of children) {
                if (child == null) continue;                  // null / undefined render nothing
                dom.appendChild(this.createDom(child));
            }
        } else if (children != null) {
            dom.textContent = String(children);               // a lone string/number becomes text content
        }

        return dom;
    }

    // Patch an existing DOM node to match the new element, then reconcile its
    // children. Reached only when the tag is unchanged (diff() case 4).
    updateNode(node, prevElement, element) {
        const oldProps = prevElement.props ?? {};
        const newProps = element.props   ?? {};

        // 1. Drop props that are gone (and listeners that changed): detach stale
        //    event handlers, remove attributes no longer present.
        for (const key of Object.keys(oldProps)) {
            if (key === 'children') continue;
            if (key.startsWith('on')) {
                if (!(key in newProps) || newProps[key] !== oldProps[key])
                    node.removeEventListener(key.slice(2).toLowerCase(), oldProps[key]);
            } else if (key !== 'key' && key !== 'ref' && !(key in newProps)) {
                node.removeAttribute(key === 'className' ? 'class' : key);
            }
        }

        // 2. Add / update the new props: attach new-or-changed listeners, and set
        //    attributes whose value actually differs (skips needless DOM writes).
        for (const [key, value] of Object.entries(newProps)) {
            if (key === 'children') continue;
            if (key.startsWith('on')) {
                if (!(key in oldProps) || value !== oldProps[key])
                    node.addEventListener(key.slice(2).toLowerCase(), value);
            } else if (key !== 'key' && key !== 'ref') {
                const attr = key === 'className' ? 'class' : key;
                if (node.getAttribute(attr) !== String(value))
                    node.setAttribute(attr, value);
            }
        }

        // 3. Reconcile children. Walk new children by index against old children by
        //    index. `domIndex` tracks the position in the *real* child list, which
        //    drifts away from `i` whenever a slot is empty — that's the trick that
        //    lets a conditionally-rendered child (a falsy slot while hidden) keep
        //    its siblings at stable positions instead of shifting them around.
        //    Note this patch is purely positional even for keyed lists: the DOM
        //    node at a slot is *reused and repainted*; it's the component *state*
        //    that follows the key (via getPrevChildShadow during resolve).
        const newChildren = newProps.children;
        const oldChildren = oldProps.children;

        if (Array.isArray(newChildren)) {
            let domIndex = 0;
            for (let i = 0; i < newChildren.length; i++) {
                const child     = newChildren[i];
                const prevChild = Array.isArray(oldChildren) ? oldChildren[i] : null;
                if (!child && !prevChild) {
                    // empty before and after — there's no DOM node for this slot, nothing to do
                } else if (!child && prevChild) {
                    node.removeChild(node.children[domIndex]);          // child disappeared
                } else if (child && !prevChild) {
                    node.insertBefore(this.createDom(child), node.children[domIndex] ?? null);  // child appeared
                    domIndex++;
                } else {
                    this.diff(prevChild, child, node.children[domIndex], node);  // both present — recurse
                    domIndex++;
                }
            }
        } else if (newChildren != null) {
            node.textContent = String(newChildren);   // children collapsed to a single text value
        }
    }
}

// ── Effects ───────────────────────────────────────────────────────────────────
//
// useEffect never runs its callback during render — it pushes a record onto
// `pendingEffects`. After the DOM is committed, flushEffects() walks those
// records and runs the ones whose deps changed (or that have never run).

function flushEffects(effects) {
    for (const { slot, fn, deps } of effects) {
        // Run when: first time ever, OR no deps array was given (run every render),
        // OR at least one dep changed since the last run.
        if (!slot.hasRun || !depsAreSame(deps, slot.deps)) {
            if (slot.cleanup) slot.cleanup();            // tear down the previous run first
            slot.cleanup = fn() ?? null;                 // a returned function becomes the next cleanup
            slot.deps    = deps ? [...deps] : undefined; // snapshot deps to compare against next time
            slot.hasRun  = true;
        }
    }
}

// Shallow, element-by-element equality. Treats "no deps array on either side" as
// *not* equal, so a depless effect re-runs on every render.
function depsAreSame(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

// ── Public API ────────────────────────────────────────────────────────────────

// Create a root bound to a DOM container; call `.render(element)` on it to (re)render.
export function createRoot(container) {
    return new RootContainer(container);
}

// One-shot convenience: mount `element` into `container`. Each call makes a fresh
// root with no memory of the last, so this is really only for a single render.
export function render(element, container) {
    const root = new RootContainer(container);
    root.render(element);
}

// useState — one persistent value per call site, plus a setter.
//
// On the first render the slot is empty, so we initialise it (calling the
// initializer if it's a function — the "lazy initial state" form). On every
// render we return the slot's current value. setState writes the slot and kicks
// off a re-render. The closure captures `rootRef`, `shadowRef` and `idx` *by
// value at hook-call time*, so even though the module globals march on to other
// components, this particular setState always targets this particular slot.
export function useState(initialValue) {
    if (currentRoot === null) throw new Error('useState called outside a component');

    const rootRef   = currentRoot;
    const shadowRef = prevShadowGlobally;
    const idx       = stateIndex++;          // claim the next slot; call order = slot identity

    if (shadowRef.state[idx] === undefined)
        shadowRef.state[idx] = typeof initialValue === 'function' ? initialValue() : initialValue;

    const setState = value => {
        // Functional update form: setState(n => n + 1). Otherwise store `value` directly.
        shadowRef.state[idx] = typeof value === 'function' ? value(shadowRef.state[idx]) : value;
        rootRef.rerender();
    };

    return [shadowRef.state[idx], setState];
}

// useEffect — register a side effect to run after this render commits.
//   deps omitted    → run after every render
//   deps === []     → run once, after the first render (mount)
//   deps === [a, b] → run again whenever `a` or `b` changes (per-element ===)
// If `fn` returns a function, that becomes the cleanup, run before the next
// re-run. (flushEffects does the actual scheduling; this just queues the record.)
export function useEffect(fn, deps) {
    if (currentRoot === null) throw new Error('useEffect called outside a component');

    const idx = effectIndex++;               // next effect slot; same ordering rule as useState
    if (!prevShadowGlobally.effects[idx])
        prevShadowGlobally.effects[idx] = { hasRun: false, deps: undefined, cleanup: null };

    pendingEffects.push({ slot: prevShadowGlobally.effects[idx], fn, deps });
}

// createContext — make a context channel. Each context gets a stable integer
// `index` into the per-shadow `context` array. (React lets you pass a default
// value here; this minimal version doesn't — useContext throws if nobody provides.)
export function createContext() {
    const index = maxContextIndex++;
    return {
        index,
        // Rendering <Ctx.Provider value={v}>…</Ctx.Provider> stamps `v` into the
        // Provider component's own shadow at this context's index, then renders the
        // children inside a wrapper <div>. Because those children's enclosing
        // component shadow *is* this Provider's shadow, any descendant's
        // useContext(Ctx) finds the value by walking up `shadow.parent`.
        Provider: ({ value, children }) => {
            prevShadowGlobally.context[index] = value;
            return createElement('div', null, children);
        },
    };
}

// useContext — read the nearest provided value for a context. Walk up the
// component shadow chain (`shadow.parent` skips host nodes) until a node has a
// value at this context's index. Throws if there's no Provider above us.
export function useContext(context) {
    let shadow = prevShadowGlobally;
    while (shadow !== null) {
        if (shadow.context[context.index] !== undefined) return shadow.context[context.index];
        shadow = shadow.parent;
    }
    throw new Error('useContext: no matching Provider found');
}
