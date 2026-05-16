import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { Signal } from 'signal-polyfill';
import { setAttributes } from '../binding.js';

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

describe('setAttributes', () => {
    test('sets a single string attribute', () => {
        const el = dom.window.document.createElement('div');
        setAttributes(el, { id: 'main' });
        assert.equal(el.getAttribute('id'), 'main');
    });

    test('sets multiple attributes at once', () => {
        const el = dom.window.document.createElement('div');
        setAttributes(el, { id: 'x', class: 'foo', 'data-val': '1' });
        assert.equal(el.getAttribute('id'), 'x');
        assert.equal(el.getAttribute('class'), 'foo');
        assert.equal(el.getAttribute('data-val'), '1');
    });

    test('does nothing when attributes is null', () => {
        const el = dom.window.document.createElement('div');
        assert.doesNotThrow(() => setAttributes(el, null));
    });

    test('does nothing when attributes is undefined', () => {
        const el = dom.window.document.createElement('div');
        assert.doesNotThrow(() => setAttributes(el, undefined));
    });

    test('sets attribute reactively from a Signal', async () => {
        const el = dom.window.document.createElement('div');
        const sig = new Signal.State('initial');
        setAttributes(el, { title: sig });
        assert.equal(el.getAttribute('title'), 'initial');
        sig.set('updated');
        await tick();
        assert.equal(el.getAttribute('title'), 'updated');
    });

    test('mixes static and Signal attributes', async () => {
        const el = dom.window.document.createElement('div');
        const sig = new Signal.State('reactive');
        setAttributes(el, { id: 'static', 'data-label': sig });
        assert.equal(el.getAttribute('id'), 'static');
        assert.equal(el.getAttribute('data-label'), 'reactive');
        sig.set('changed');
        await tick();
        assert.equal(el.getAttribute('data-label'), 'changed');
    });
});
