// Scheduler — batches multiple setState calls into one re-render, drops
// children whose ancestor is also dirty, only the targeted subtree re-runs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, tick } from './setup.js';

setupDom();
const { createElement, createRoot, useState } = await import('../index.js');

function mount(component, props = null) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(createElement(component, props));
    return { container, root };
}

test('batching: many setStates in one tick produce one render', async () => {
    let renders = 0;
    let setA, setB, setC;
    const Cmp = () => {
        renders++;
        const [a, sA] = useState(0);
        const [b, sB] = useState(0);
        const [c, sC] = useState(0);
        setA = sA; setB = sB; setC = sC;
        return createElement('p', null, `${a}+${b}+${c}`);
    };
    const { container } = mount(Cmp);
    assert.equal(renders, 1);
    setA(1); setB(2); setC(3);
    await tick();
    assert.equal(renders, 2, 'three setStates batched into one re-render');
    assert.match(container.textContent, /1\+2\+3/);
});

test('subtree update: only the dirty component re-runs, not its parent', async () => {
    let parentRenders = 0, childRenders = 0;
    let setChild;
    const Child = () => {
        childRenders++;
        const [n, s] = useState(0);
        setChild = s;
        return createElement('span', null, `child=${n}`);
    };
    const Parent = () => {
        parentRenders++;
        return createElement('div', null,
            createElement('span', null, 'parent'),
            createElement(Child),
        );
    };
    const { container } = mount(Parent);
    assert.equal(parentRenders, 1);
    assert.equal(childRenders, 1);
    setChild(5);
    await tick();
    assert.equal(parentRenders, 1, 'parent did NOT re-render');
    assert.equal(childRenders, 2, 'child re-rendered');
    assert.match(container.textContent, /child=5/);
});

test('ancestor dedup: parent dirty + child dirty → child not re-run twice', async () => {
    let parentRenders = 0, childRenders = 0;
    let setParent, setChild;
    const Child = () => {
        childRenders++;
        const [n, s] = useState(0);
        setChild = s;
        return createElement('span', null, `child=${n}`);
    };
    const Parent = () => {
        parentRenders++;
        const [n, s] = useState(0);
        setParent = s;
        return createElement('div', null,
            createElement('span', null, `parent=${n}`),
            createElement(Child),
        );
    };
    mount(Parent);
    setChild(1);
    setParent(1);
    await tick();
    // Parent's subtree re-render sweeps Child up; Child is not also re-rendered
    // independently afterward, because the scheduler dropped it.
    assert.equal(parentRenders, 2);
    assert.equal(childRenders, 2);
});
