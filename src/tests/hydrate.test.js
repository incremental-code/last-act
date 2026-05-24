import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { Signal } from 'signal-polyfill';
import { createElement, hydrate, getMountedNode } from '../element.js';
import { onUnmount } from '../lifecycle.js';
import { serialize } from '../serialize.js';

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

describe('hydrate', () => {
    test('reuses matching existing DOM nodes', () => {
        dom.window.document.body.innerHTML = '<div id="app"><p>Hello</p></div>';
        const existingRoot = dom.window.document.getElementById('app');
        const existingP = existingRoot.firstChild;

        const child = createElement('p', null, 'Hello');
        const tree = createElement('div', { attributes: { id: 'app' } }, child);
        const hydrated = hydrate(tree, existingRoot);

        assert.equal(hydrated, existingRoot);
        assert.equal(getMountedNode(tree), existingRoot);
        assert.equal(getMountedNode(child), existingP);
        assert.equal(existingRoot.childNodes.length, 1);
        assert.equal(existingRoot.textContent, 'Hello');
    });

    test('hydrates event handlers onto existing elements', () => {
        dom.window.document.body.innerHTML = '<button id="btn">Click</button>';
        const existingButton = dom.window.document.getElementById('btn');
        let clicked = 0;

        const tree = createElement('button', {
            attributes: { id: 'btn' },
            onclick: () => clicked++,
        }, 'Click');

        const hydrated = hydrate(tree, existingButton);
        hydrated.click();
        assert.equal(clicked, 1);
    });

    test('supports onUnmount registered before hydrate', async () => {
        dom.window.document.body.innerHTML = '<div id="node"></div>';
        const existing = dom.window.document.getElementById('node');
        const tree = createElement('div', { attributes: { id: 'node' } });
        let called = false;

        onUnmount(tree, () => { called = true; });
        const hydrated = hydrate(tree, existing);
        dom.window.document.body.removeChild(hydrated);
        await tick();

        assert.equal(called, true);
    });

    test('hydrates signal children bindings onto existing nodes', async () => {
        dom.window.document.body.innerHTML = '<div id="app">Cape Town</div>';
        const existing = dom.window.document.getElementById('app');
        const city = new Signal.State('Cape Town');
        const tree = createElement('div', { attributes: { id: 'app' } }, city);

        const hydrated = hydrate(tree, existing);
        assert.equal(hydrated, existing);
        assert.equal(getMountedNode(tree), existing);
        assert.equal(existing.textContent, 'Cape Town');

        city.set('Berlin');
        await tick();

        assert.equal(existing.textContent, 'Berlin');
    });

    test('hydrates component that inserts a prebuilt child at an arbitrary slot', () => {
        dom.window.document.body.innerHTML = '<section id="root"><p>before</p><span id="middle">middle</span><p>after</p></section>';
        const existing = dom.window.document.getElementById('root');

        function Comp() {
            const el = createElement('span', { attributes: { id: 'middle' } }, 'middle');
            return createElement('section', { attributes: { id: 'root' } },
                createElement('p', null, 'before'),
                el,
                createElement('p', null, 'after'),
            );
        }

        const tree = createElement(Comp);
        const hydrated = hydrate(tree, existing);

        assert.equal(hydrated, existing);
        assert.equal(existing.childNodes.length, 3);
        assert.equal(existing.childNodes[1].id, 'middle');
        assert.equal(existing.childNodes[1].textContent, 'middle');
    });

    test('serializes and hydrates array-of-signals children with conditional nulls', async () => {
        const showA = new Signal.State(true);
        const showB = new Signal.State(false);
        const a = new Signal.Computed(() => showA.get() ? createElement('li', { key: 'a' }, 'A') : null);
        const b = new Signal.Computed(() => showB.get() ? createElement('li', { key: 'b' }, 'B') : null);
        const tree = createElement('ul', { attributes: { id: 'list' }, children: [a, b] });

        const html = serialize(tree);
        dom.window.document.body.innerHTML = html;
        const existing = dom.window.document.getElementById('list');

        const hydrated = hydrate(tree, existing);
        await tick();

        assert.equal(hydrated, existing);
        assert.equal(existing.outerHTML, '<ul id="list"><li data-key="a">A</li></ul>');

        showB.set(true);
        await tick();
        assert.equal(existing.outerHTML, '<ul id="list"><li data-key="a">A</li><li data-key="b">B</li></ul>');

        showA.set(false);
        await tick();
        assert.equal(existing.outerHTML, '<ul id="list"><li data-key="b">B</li></ul>');
    });
});
