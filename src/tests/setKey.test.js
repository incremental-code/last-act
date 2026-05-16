import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { setKey } from '../binding.js';

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

describe('setKey', () => {
    test('sets data-key when key is a string', () => {
        const el = dom.window.document.createElement('div');
        setKey(el, 'item-1');
        assert.equal(el.dataset.key, 'item-1');
    });

    test('does not set data-key when key is undefined', () => {
        const el = dom.window.document.createElement('div');
        setKey(el, undefined);
        assert.equal(el.dataset.key, undefined);
    });

    test('converts a numeric key to string', () => {
        const el = dom.window.document.createElement('div');
        setKey(el, 7);
        assert.equal(el.dataset.key, '7');
    });

    test('overwrites an existing key', () => {
        const el = dom.window.document.createElement('div');
        setKey(el, 'first');
        setKey(el, 'second');
        assert.equal(el.dataset.key, 'second');
    });

    test('sets data-key to string "null" when key is null (null is not undefined)', () => {
        const el = dom.window.document.createElement('div');
        setKey(el, null);
        assert.equal(el.dataset.key, 'null');
    });
});
