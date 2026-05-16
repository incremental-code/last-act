// DOM reconciliation — mount, attribute patching, tag swap, listener replacement,
// keyed-list patching, empty slots that hold their siblings' positions.

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

test('mount: basic attributes set on host element', () => {
    const Cmp = () => createElement('div', { id: 'a', className: 'b' });
    const { container } = mount(Cmp);
    const div = container.firstChild;
    assert.equal(div.getAttribute('id'), 'a');
    assert.equal(div.getAttribute('class'), 'b');
});

test('patch: changed attribute is updated, unchanged is left alone', async () => {
    let setX;
    const Cmp = () => {
        const [x, s] = useState('one');
        setX = s;
        return createElement('div', { id: 'fixed', title: x });
    };
    const { container } = mount(Cmp);
    const div = container.firstChild;
    assert.equal(div.getAttribute('title'), 'one');
    setX('two');
    await tick();
    assert.equal(div.getAttribute('title'), 'two');
    assert.equal(div.getAttribute('id'), 'fixed');
    assert.equal(container.firstChild, div, 'same DOM node reused');
});

test('patch: removed prop is removed from the DOM', async () => {
    let setShow;
    const Cmp = () => {
        const [show, s] = useState(true);
        setShow = s;
        return show
            ? createElement('div', { id: 'x', title: 'yes' })
            : createElement('div', { id: 'x' });
    };
    const { container } = mount(Cmp);
    assert.equal(container.firstChild.getAttribute('title'), 'yes');
    setShow(false);
    await tick();
    assert.equal(container.firstChild.getAttribute('title'), null);
});

test('patch: tag change replaces DOM subtree', async () => {
    let setKind;
    const Cmp = () => {
        const [k, s] = useState('p');
        setKind = s;
        return createElement(k, null, 'hi');
    };
    const { container } = mount(Cmp);
    const before = container.firstChild;
    assert.equal(before.tagName, 'P');
    setKind('span');
    await tick();
    assert.equal(container.firstChild.tagName, 'SPAN');
    assert.notEqual(container.firstChild, before, 'DOM node replaced');
});

test('patch: event listener swapped — only new fires', async () => {
    let setStep;
    let oldCalls = 0, newCalls = 0;
    const oldFn = () => oldCalls++;
    const newFn = () => newCalls++;
    const Cmp = () => {
        const [step, s] = useState(0);
        setStep = s;
        return createElement('button', { onClick: step === 0 ? oldFn : newFn }, 'b');
    };
    const { container } = mount(Cmp);
    const btn = container.firstChild;
    btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(oldCalls, 1);
    setStep(1);
    await tick();
    btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(newCalls, 1, 'new listener fired');
    assert.equal(oldCalls, 1, 'old listener detached');
});

test('children: empty slot keeps siblings at stable DOM positions', async () => {
    let setHide;
    const Cmp = () => {
        const [hide, s] = useState(false);
        setHide = s;
        return createElement('div', null,
            createElement('span', null, 'A'),
            hide ? null : createElement('span', null, 'B'),
            createElement('span', null, 'C'),
        );
    };
    const { container } = mount(Cmp);
    assert.equal(container.firstChild.children.length, 3);
    setHide(true);
    await tick();
    const spans = [...container.firstChild.children].map(c => c.textContent);
    assert.deepEqual(spans, ['A', 'C']);
});

test('children: new child inserted in middle', async () => {
    let setShow;
    const Cmp = () => {
        const [show, s] = useState(false);
        setShow = s;
        return createElement('div', null,
            createElement('span', null, 'A'),
            show ? createElement('span', null, 'B') : null,
            createElement('span', null, 'C'),
        );
    };
    const { container } = mount(Cmp);
    setShow(true);
    await tick();
    const spans = [...container.firstChild.children].map(c => c.textContent);
    assert.deepEqual(spans, ['A', 'B', 'C']);
});

test('text node: nodeValue patched in place', async () => {
    let setN;
    const Cmp = () => {
        const [n, s] = useState(1);
        setN = s;
        return createElement('p', null, `count=${n}`);
    };
    const { container } = mount(Cmp);
    const p = container.firstChild;
    const textNode = p.firstChild;
    setN(2);
    await tick();
    assert.match(container.textContent, /count=2/);
    assert.equal(p.firstChild, textNode, 'same text node reused');
});
