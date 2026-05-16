import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { onUnmount, runOnumount } from '../lifecycle.js';

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

describe('runOnumount', () => {
    test('calls all callbacks registered via onUnmount', () => {
        const el = dom.window.document.createElement('div');
        const log = [];
        onUnmount(el, () => log.push('a'));
        onUnmount(el, () => log.push('b'));
        runOnumount(el);
        assert.deepEqual(log, ['a', 'b']);
    });

    test('does nothing when no callbacks are registered', () => {
        const el = dom.window.document.createElement('div');
        assert.doesNotThrow(() => runOnumount(el));
    });

    test('clears callbacks after running so they are not called again', () => {
        const el = dom.window.document.createElement('div');
        let count = 0;
        onUnmount(el, () => count++);
        runOnumount(el);
        runOnumount(el);
        assert.equal(count, 1);
    });

    test('callbacks are called in registration order', () => {
        const el = dom.window.document.createElement('div');
        const order = [];
        onUnmount(el, () => order.push(1));
        onUnmount(el, () => order.push(2));
        onUnmount(el, () => order.push(3));
        runOnumount(el);
        assert.deepEqual(order, [1, 2, 3]);
    });
});
