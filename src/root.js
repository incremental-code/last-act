// One Root per mount point. Owns the top of the shadow tree and the DOM anchor.
// All re-rendering flows through here:
//
//   first call to render(element)   → resolve + mount + link shadow-to-DOM
//   later setState somewhere inside → scheduler.update(componentShadow)
//                                     → re-runs *just that subtree*, diffs against
//                                       its previous output, re-links shadow-to-DOM.

import { renderComponent } from './exec.js';
import { reconcile } from './diff.js';
import { createDomNode } from './dom.js';
import { linkShadowDom } from './link.js';
import { setOnFlush } from './scheduler.js';
import { takePendingEffects } from './hooks.js';
import { runEffects } from './effect.js';

class Root {
    constructor(container) {
        this.container  = container;
        this.rootShadow = null;
    }

    render(element) {
        if (this.rootShadow === null) this.mount(element);
        else                          this.updateRoot(element);
        flushPendingEffects();
    }

    mount(element) {
        const [resolved, shadow] = renderComponent(element, null, null, this);
        const dom = createDomNode(resolved);
        this.container.appendChild(dom);
        linkShadowDom(shadow, resolved, dom);
        shadow.parentDom = this.container;
        this.rootShadow  = shadow;
    }

    updateRoot(element) {
        this.rootShadow.element = element;
        this.update(this.rootShadow);
    }

    // Re-render the subtree rooted at `shadow`. Called by the scheduler and by
    // updateRoot. Re-runs the component, diffs the resulting host tree against
    // the previous one, then re-links shadows to (possibly new) DOM nodes.
    update(shadow) {
        const prevResolved = shadow.rendered;
        const prevDom      = shadow.dom;
        const parentDom    = shadow.parentDom;

        const [resolved] = renderComponent(shadow.element, shadow, shadow.parent, this);

        const newDom = reconcile(prevResolved, resolved, prevDom, parentDom);
        linkShadowDom(shadow, resolved, newDom);
        shadow.parentDom = parentDom;
    }
}

setOnFlush(shadow => shadow._root.update(shadow));

function flushPendingEffects() {
    const effects = takePendingEffects();
    if (effects.length) setTimeout(() => runEffects(effects), 0);
}

export function createRoot(container) { return new Root(container); }
export function render(element, container) {
    const root = new Root(container);
    root.render(element);
    return root;
}
