import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { Signal } from 'signal-polyfill';
import { setSignalAttribute } from '../binding.js';

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

describe('setSignalAttribute', () => {
    test('sets attribute to the initial signal value', () => {
        const el = dom.window.document.createElement('div');
        const sig = new Signal.State('hello');
        setSignalAttribute(el, 'title', sig);
        assert.equal(el.getAttribute('title'), 'hello');
    });

    test('updates attribute when signal changes', async () => {
        const el = dom.window.document.createElement('div');
        const sig = new Signal.State('v1');
        setSignalAttribute(el, 'data-val', sig);
        sig.set('v2');
        await tick();
        assert.equal(el.getAttribute('data-val'), 'v2');
    });

    test('removes attribute when signal value becomes null', async () => {
        const el = dom.window.document.createElement('div');
        const sig = new Signal.State('present');
        setSignalAttribute(el, 'aria-label', sig);
        sig.set(null);
        await tick();
        assert.equal(el.hasAttribute('aria-label'), false);
    });

    test('removes attribute when signal value becomes undefined', async () => {
        const el = dom.window.document.createElement('div');
        const sig = new Signal.State('present');
        setSignalAttribute(el, 'aria-label', sig);
        sig.set(undefined);
        await tick();
        assert.equal(el.hasAttribute('aria-label'), false);
    });

    test('sets attribute to string when signal value is false', async () => {
        const el = dom.window.document.createElement('div');
        const sig = new Signal.State('present');
        setSignalAttribute(el, 'disabled', sig);
        sig.set(false);
        await tick();
        assert.equal(el.getAttribute('disabled'), 'false');
    });

    test('sets attribute to string when signal value is true', () => {
        const el = dom.window.document.createElement('div');
        const sig = new Signal.State(true);
        setSignalAttribute(el, 'disabled', sig);
        assert.equal(el.getAttribute('disabled'), 'true');
    });

    test('sets attribute from array values joined by space', () => {
        const el = dom.window.document.createElement('div');
        const sig = new Signal.State(['foo', 'bar', 'baz']);
        setSignalAttribute(el, 'class', sig);
        assert.equal(el.getAttribute('class'), 'foo bar baz');
    });

    test('removes attribute when signal value becomes an empty array', async () => {
        const el = dom.window.document.createElement('div');
        const sig = new Signal.State(['foo']);
        setSignalAttribute(el, 'class', sig);
        sig.set([]);
        await tick();
        assert.equal(el.hasAttribute('class'), false);
    });

    test('stops updating attribute after element is removed from DOM', async () => {
        const el = dom.window.document.createElement('div');
        dom.window.document.body.appendChild(el);
        const sig = new Signal.State('initial');
        setSignalAttribute(el, 'data-x', sig);
        dom.window.document.body.removeChild(el);
        await tick();
        sig.set('changed');
        await tick();
        assert.equal(el.getAttribute('data-x'), 'initial');
    });
});
