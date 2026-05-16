import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { setProperties } from '../binding.js';

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

describe('setProperties', () => {
    test('sets a property on the element', () => {
        const el = dom.window.document.createElement('input');
        setProperties(el, { value: 'hello' });
        assert.equal(el.value, 'hello');
    });

    test('sets multiple properties', () => {
        const el = dom.window.document.createElement('input');
        setProperties(el, { type: 'checkbox', checked: true });
        assert.equal(el.type, 'checkbox');
        assert.equal(el.checked, true);
    });

    test('sets a custom arbitrary property', () => {
        const el = dom.window.document.createElement('div');
        setProperties(el, { _customProp: 'custom-value' });
        assert.equal(el._customProp, 'custom-value');
    });

    test('does nothing when props is null', () => {
        const el = dom.window.document.createElement('div');
        assert.doesNotThrow(() => setProperties(el, null));
    });

    test('does nothing when props is undefined', () => {
        const el = dom.window.document.createElement('div');
        assert.doesNotThrow(() => setProperties(el, undefined));
    });

    test('overwrites an existing property', () => {
        const el = dom.window.document.createElement('input');
        el.value = 'old';
        setProperties(el, { value: 'new' });
        assert.equal(el.value, 'new');
    });
});
