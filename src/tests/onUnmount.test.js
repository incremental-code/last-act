import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { onUnmount } from '../lifecycle.js';

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

describe('onUnmount', () => {
    test('does not call the callback immediately', () => {
        const el = dom.window.document.createElement('div');
        let called = false;
        onUnmount(el, () => { called = true; });
        assert.equal(called, false);
    });

    test('calls callback when element is removed from the DOM', async () => {
        const el = dom.window.document.createElement('div');
        dom.window.document.body.appendChild(el);
        let called = false;
        onUnmount(el, () => { called = true; });
        dom.window.document.body.removeChild(el);
        await tick();
        assert.equal(called, true);
    });

    test('calls all registered callbacks on removal', async () => {
        const el = dom.window.document.createElement('div');
        dom.window.document.body.appendChild(el);
        const log = [];
        onUnmount(el, () => log.push('first'));
        onUnmount(el, () => log.push('second'));
        dom.window.document.body.removeChild(el);
        await tick();
        assert.deepEqual(log, ['first', 'second']);
    });

    test('does not call callback if element is moved rather than truly removed', async () => {
        const container = dom.window.document.createElement('div');
        dom.window.document.body.appendChild(container);
        const el = dom.window.document.createElement('span');
        dom.window.document.body.appendChild(el);
        let called = false;
        onUnmount(el, () => { called = true; });
        // Move to another container (remove + re-append in same microtask)
        container.appendChild(el);
        await tick();
        assert.equal(called, false);
        dom.window.document.body.removeChild(container);
    });
});
