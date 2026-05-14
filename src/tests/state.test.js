// useState — initial value, setter, lazy init, functional updates, slot identity.
// Renders happen through a real Root + jsdom so the full pipeline is exercised.

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

test('useState: initial value renders', () => {
    const Cmp = () => {
        const [n] = useState(7);
        return createElement('p', null, `n=${n}`);
    };
    const { container } = mount(Cmp);
    assert.match(container.textContent, /n=7/);
});

test('useState: setter triggers re-render with new value', async () => {
    let setterRef;
    const Cmp = () => {
        const [n, set] = useState(0);
        setterRef = set;
        return createElement('p', null, `n=${n}`);
    };
    const { container } = mount(Cmp);
    setterRef(5);
    await tick();
    assert.match(container.textContent, /n=5/);
});

test('useState: functional updater receives previous value', async () => {
    let setterRef;
    const Cmp = () => {
        const [n, set] = useState(10);
        setterRef = set;
        return createElement('p', null, `n=${n}`);
    };
    const { container } = mount(Cmp);
    setterRef(prev => prev + 1);
    setterRef(prev => prev + 1);
    setterRef(prev => prev + 1);
    await tick();
    assert.match(container.textContent, /n=13/);
});

test('useState: lazy initial value (function form) called once', () => {
    let calls = 0;
    const Cmp = () => {
        const [n] = useState(() => { calls++; return 99; });
        return createElement('p', null, `n=${n}`);
    };
    const { container } = mount(Cmp);
    assert.equal(calls, 1);
    assert.match(container.textContent, /n=99/);
});

test('useState: multiple slots in one component', async () => {
    let setA, setB;
    const Cmp = () => {
        const [a, sA] = useState('a');
        const [b, sB] = useState('b');
        setA = sA; setB = sB;
        return createElement('p', null, `${a}|${b}`);
    };
    const { container } = mount(Cmp);
    assert.match(container.textContent, /a\|b/);
    setA('A');
    await tick();
    assert.match(container.textContent, /A\|b/);
    setB('B');
    await tick();
    assert.match(container.textContent, /A\|B/);
});

test('useState: 0 and empty string are valid initial values (no falsy bug)', () => {
    const Cmp = () => {
        const [n] = useState(0);
        const [s] = useState('');
        const [f] = useState(false);
        return createElement('p', null, `${n}|${s}|${f}`);
    };
    const { container } = mount(Cmp);
    assert.equal(container.textContent.trim(), '0||false');
});
