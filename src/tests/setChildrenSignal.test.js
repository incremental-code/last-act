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
});
