// useEffect — runs after commit, deps-controlled re-runs, cleanup before re-run.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, tick, tickEffects } from './setup.js';

setupDom();
const { createElement, createRoot, useState, useEffect } = await import('../index.js');

function mount(component, props = null) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(createElement(component, props));
    return { container, root };
}

test('useEffect: runs once after mount with empty deps', async () => {
    let calls = 0;
    const Cmp = () => {
        useEffect(() => { calls++; }, []);
        return createElement('p', null, 'x');
    };
    mount(Cmp);
    await tickEffects();
    assert.equal(calls, 1);
});

test('useEffect: dep change triggers re-run; equal deps do not', async () => {
    let calls = 0;
    let setN;
    const Cmp = () => {
        const [n, s] = useState(0);
        setN = s;
        useEffect(() => { calls++; }, [n]);
        return createElement('p', null, String(n));
    };
    mount(Cmp);
    await tickEffects();
    assert.equal(calls, 1, 'mount run');

    setN(1); await tickEffects();
    assert.equal(calls, 2, 'dep change reran');

    setN(1); await tickEffects();
    assert.equal(calls, 2, 'same value did not re-run');
});

test('useEffect: cleanup runs before next effect and on unmount-like re-run', async () => {
    const events = [];
    let setN;
    const Cmp = () => {
        const [n, s] = useState(0);
        setN = s;
        useEffect(() => {
            events.push(`run:${n}`);
            return () => events.push(`cleanup:${n}`);
        }, [n]);
        return createElement('p', null, String(n));
    };
    mount(Cmp);
    await tickEffects();
    setN(1); await tickEffects();
    setN(2); await tickEffects();
    assert.deepEqual(events, ['run:0', 'cleanup:0', 'run:1', 'cleanup:1', 'run:2']);
});

test('useEffect: no deps array — runs every render', async () => {
    let calls = 0;
    let setN;
    const Cmp = () => {
        const [, s] = useState(0);
        setN = s;
        useEffect(() => { calls++; });
        return createElement('p', null, 'x');
    };
    mount(Cmp);
    await tickEffects();
    setN(1); await tickEffects();
    setN(2); await tickEffects();
    assert.equal(calls, 3);
});

test('useEffect: outside a component throws', () => {
    assert.throws(() => useEffect(() => {}, []), /outside a component/);
});
