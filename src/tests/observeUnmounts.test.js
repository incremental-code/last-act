import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { observeUnmounts, onUnmount } from '../lifecycle.js';

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

describe('observeUnmounts', () => {
    test('does not throw when called', () => {
        assert.doesNotThrow(() => observeUnmounts());
    });

    test('is idempotent - calling multiple times does not cause errors', () => {
        assert.doesNotThrow(() => {
            observeUnmounts();
            observeUnmounts();
            observeUnmounts();
        });
    });

    test('triggers onUnmount callbacks when an element is permanently removed', async () => {
        const el = dom.window.document.createElement('div');
        dom.window.document.body.appendChild(el);
        let called = false;
        onUnmount(el, () => { called = true; });
        dom.window.document.body.removeChild(el);
        await tick();
        assert.equal(called, true);
    });

    test('does not trigger callback when element is moved within the DOM', async () => {
        const wrapper = dom.window.document.createElement('div');
        dom.window.document.body.appendChild(wrapper);
        const el = dom.window.document.createElement('span');
        dom.window.document.body.appendChild(el);
        let called = false;
        onUnmount(el, () => { called = true; });
        wrapper.appendChild(el);
        await tick();
        assert.equal(called, false);
        dom.window.document.body.removeChild(wrapper);
    });
});
