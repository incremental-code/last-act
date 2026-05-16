import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { Signal } from 'signal-polyfill';
import { setChildrenSignal } from '../binding.js';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
let origWindow, origDocument;

before(() => {
    origWindow = global.window;
    origDocument = global.document;
    global.window = dom.window;
    global.document = dom.window.document;
    global.Node = dom.window.Node;
    global.HTMLElement = dom.window.HTMLElement;
    global.MutationObserver = dom.window.MutationObserver;
});

after(() => {
    global.window = origWindow;
    global.document = origDocument;
});

const tick = () => new Promise(resolve => queueMicrotask(resolve));

describe('setChildrenSignal', () => {
    test('renders initial Node value into element', () => {
        const el = dom.window.document.createElement('div');
        const child = dom.window.document.createElement('span');
        const sig = new Signal.State(child);
        setChildrenSignal(el, sig);
        assert.equal(el.firstChild, child);
    });

    test('replaces child when signal updates to a new Node', async () => {
        const el = dom.window.document.createElement('div');
        const first = dom.window.document.createElement('span');
        const second = dom.window.document.createElement('p');
        const sig = new Signal.State(first);
        setChildrenSignal(el, sig);
        sig.set(second);
        await tick();
        assert.equal(el.children.length, 1);
        assert.equal(el.firstChild, second);
    });

    test('clears existing children when signal updates', async () => {
        const el = dom.window.document.createElement('div');
        const first = dom.window.document.createElement('span');
        const second = dom.window.document.createElement('p');
        const sig = new Signal.State(first);
        setChildrenSignal(el, sig);
        assert.equal(el.children.length, 1);
        sig.set(second);
        await tick();
        assert.equal(el.children.length, 1);
    });

    test('stops updating after element is removed from DOM', async () => {
        const el = dom.window.document.createElement('div');
        dom.window.document.body.appendChild(el);
        const first = dom.window.document.createElement('span');
        const second = dom.window.document.createElement('p');
        const sig = new Signal.State(first);
        setChildrenSignal(el, sig);
        dom.window.document.body.removeChild(el);
        await tick();
        sig.set(second);
        await tick();
        assert.equal(el.firstChild, first);
    });

    describe('array of signals', () => {
        test('renders initial resolved nodes from an array of signals', () => {
            const el = dom.window.document.createElement('div');
            const a = dom.window.document.createElement('span');
            const b = dom.window.document.createElement('p');
            a.dataset.key = 'a';
            b.dataset.key = 'b';
            const sigA = new Signal.State(a);
            const sigB = new Signal.State(b);
            setChildrenSignal(el, [sigA, sigB]);
            assert.equal(el.children[0], a);
            assert.equal(el.children[1], b);
        });

        test('replaces a single slot when one sub-signal updates', async () => {
            const el = dom.window.document.createElement('div');
            const a1 = dom.window.document.createElement('span');
            const a2 = dom.window.document.createElement('span');
            const b = dom.window.document.createElement('p');
            a1.dataset.key = 'a';
            a2.dataset.key = 'a';
            b.dataset.key = 'b';
            const sigA = new Signal.State(a1);
            const sigB = new Signal.State(b);
            setChildrenSignal(el, [sigA, sigB]);
            sigA.set(a2);
            await tick();
            assert.equal(el.children[0], a2);
            assert.equal(el.children[1], b);
        });

        test('mixes plain nodes and signals in the array', () => {
            const el = dom.window.document.createElement('div');
            const a = dom.window.document.createElement('span');
            const b = dom.window.document.createElement('p');
            a.dataset.key = 'a';
            b.dataset.key = 'b';
            const sigA = new Signal.State(a);
            setChildrenSignal(el, [sigA, b]);
            assert.equal(el.children[0], a);
            assert.equal(el.children[1], b);
        });

        test('flattens a signal that resolves to an array of nodes', async () => {
            const el = dom.window.document.createElement('div');
            const a = dom.window.document.createElement('span');
            const b = dom.window.document.createElement('p');
            const c = dom.window.document.createElement('article');
            a.dataset.key = 'a';
            b.dataset.key = 'b';
            c.dataset.key = 'c';
            const list = new Signal.State([a, b]);
            setChildrenSignal(el, [list]);
            assert.deepEqual([...el.children].map(node => node.dataset.key), ['a', 'b']);
            list.set([c, a]);
            await tick();
            assert.deepEqual([...el.children].map(node => node.dataset.key), ['c', 'a']);
        });
    });

    describe('reconciliation — reordering', () => {
        const el = () => dom.window.document.createElement('div');
        const node = (tag, key) => {
            const n = dom.window.document.createElement(tag);
            n.dataset.key = key;
            return n;
        };

        test('reverses a three-item list', async () => {
            const container = el();
            const [a, b, c] = ['a', 'b', 'c'].map(k => node('span', k));
            const sig = new Signal.State([a, b, c]);
            setChildrenSignal(container, sig);
            assert.deepEqual([...container.children].map(n => n.dataset.key), ['a', 'b', 'c']);
            sig.set([c, b, a]);
            await tick();
            assert.deepEqual([...container.children].map(n => n.dataset.key), ['c', 'b', 'a']);
        });

        test('moves first item to last', async () => {
            const container = el();
            const [a, b, c, d] = ['a', 'b', 'c', 'd'].map(k => node('span', k));
            const sig = new Signal.State([a, b, c, d]);
            setChildrenSignal(container, sig);
            sig.set([b, c, d, a]);
            await tick();
            assert.deepEqual([...container.children].map(n => n.dataset.key), ['b', 'c', 'd', 'a']);
        });

        test('moves last item to first', async () => {
            const container = el();
            const [a, b, c, d] = ['a', 'b', 'c', 'd'].map(k => node('span', k));
            const sig = new Signal.State([a, b, c, d]);
            setChildrenSignal(container, sig);
            sig.set([d, a, b, c]);
            await tick();
            assert.deepEqual([...container.children].map(n => n.dataset.key), ['d', 'a', 'b', 'c']);
        });

        test('removes middle items and reorders remaining', async () => {
            const container = el();
            const [a, b, c, d, e] = ['a', 'b', 'c', 'd', 'e'].map(k => node('span', k));
            const sig = new Signal.State([a, b, c, d, e]);
            setChildrenSignal(container, sig);
            // remove b and d, swap a and e
            sig.set([e, c, a]);
            await tick();
            assert.deepEqual([...container.children].map(n => n.dataset.key), ['e', 'c', 'a']);
        });

        test('adds new items into a sorted position', async () => {
            const container = el();
            const [a, c, e] = ['a', 'c', 'e'].map(k => node('span', k));
            const sig = new Signal.State([a, c, e]);
            setChildrenSignal(container, sig);
            const [b, d] = ['b', 'd'].map(k => node('span', k));
            sig.set([a, b, c, d, e]);
            await tick();
            assert.deepEqual([...container.children].map(n => n.dataset.key), ['a', 'b', 'c', 'd', 'e']);
        });

        test('removes all items', async () => {
            const container = el();
            const [a, b, c] = ['a', 'b', 'c'].map(k => node('span', k));
            const sig = new Signal.State([a, b, c]);
            setChildrenSignal(container, sig);
            sig.set([]);
            await tick();
            assert.equal(container.children.length, 0);
        });

        test('replaces entire list with a different set', async () => {
            const container = el();
            const [a, b, c] = ['a', 'b', 'c'].map(k => node('span', k));
            const sig = new Signal.State([a, b, c]);
            setChildrenSignal(container, sig);
            const [d, e, f] = ['d', 'e', 'f'].map(k => node('span', k));
            sig.set([d, e, f]);
            await tick();
            assert.deepEqual([...container.children].map(n => n.dataset.key), ['d', 'e', 'f']);
        });

        test('reuses existing nodes — does not recreate them', async () => {
            const container = el();
            const [a, b, c] = ['a', 'b', 'c'].map(k => node('span', k));
            const sig = new Signal.State([a, b, c]);
            setChildrenSignal(container, sig);
            sig.set([c, a, b]);
            await tick();
            // the actual element references must be the same objects
            assert.equal(container.children[0], c);
            assert.equal(container.children[1], a);
            assert.equal(container.children[2], b);
        });

        test('interleaves new and existing nodes', async () => {
            const container = el();
            const [a, c, e] = ['a', 'c', 'e'].map(k => node('span', k));
            const sig = new Signal.State([a, c, e]);
            setChildrenSignal(container, sig);
            const b = node('span', 'b');
            const d = node('span', 'd');
            sig.set([b, a, d, c, e]);
            await tick();
            assert.deepEqual([...container.children].map(n => n.dataset.key), ['b', 'a', 'd', 'c', 'e']);
            // existing nodes are reused
            assert.equal(container.children[1], a);
            assert.equal(container.children[3], c);
            assert.equal(container.children[4], e);
        });
    });
});
