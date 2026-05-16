import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { Signal } from 'signal-polyfill';
import { setChildren } from '../binding.js';

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

describe('setChildren', () => {
    test('sets textContent for a string child', () => {
        const el = dom.window.document.createElement('div');
        setChildren(el, 'hello');
        assert.equal(el.textContent, 'hello');
    });

    test('converts a number child to textContent', () => {
        const el = dom.window.document.createElement('div');
        setChildren(el, 42);
        assert.equal(el.textContent, '42');
    });

    test('appends a Node child', () => {
        const el = dom.window.document.createElement('div');
        const child = dom.window.document.createElement('span');
        setChildren(el, child);
        assert.equal(el.firstChild, child);
    });

    test('does nothing when children is null', () => {
        const el = dom.window.document.createElement('div');
        assert.doesNotThrow(() => setChildren(el, null));
        assert.equal(el.childNodes.length, 0);
    });

    test('does nothing when children is undefined', () => {
        const el = dom.window.document.createElement('div');
        assert.doesNotThrow(() => setChildren(el, undefined));
        assert.equal(el.childNodes.length, 0);
    });

    test('appends text nodes for each string item in an array', () => {
        const el = dom.window.document.createElement('div');
        setChildren(el, ['a', 'b']);
        assert.equal(el.childNodes.length, 2);
        assert.equal(el.childNodes[0].textContent, 'a');
        assert.equal(el.childNodes[1].textContent, 'b');
    });

    test('appends Node elements from an array', () => {
        const el = dom.window.document.createElement('div');
        const span = dom.window.document.createElement('span');
        const p = dom.window.document.createElement('p');
        setChildren(el, [span, p]);
        assert.equal(el.childNodes.length, 2);
        assert.equal(el.childNodes[0], span);
        assert.equal(el.childNodes[1], p);
    });

    test('sets up a reactive binding for a Signal child', async () => {
        const child = dom.window.document.createElement('span');
        const sig = new Signal.State(child);
        const el = dom.window.document.createElement('div');
        setChildren(el, sig);
        await tick();
        assert.equal(el.firstChild, child);
    });

    test('routes an array containing signals to a reactive binding', async () => {
        const a = dom.window.document.createElement('span');
        const b = dom.window.document.createElement('p');
        a.dataset.key = 'a';
        b.dataset.key = 'b';
        const sigA = new Signal.State(a);
        const el = dom.window.document.createElement('div');
        setChildren(el, [sigA, b]);
        await tick();
        assert.equal(el.children[0], a);
        assert.equal(el.children[1], b);
    });
});
