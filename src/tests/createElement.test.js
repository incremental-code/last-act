import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement } from '../element.js';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const originalWindow = global.window;
const originalDocument = global.document;

before(() => {
    global.window = dom.window;
    global.document = dom.window.document;
    global.Node = dom.window.Node;
    global.HTMLElement = dom.window.HTMLElement;
    global.MutationObserver = dom.window.MutationObserver;
});

after(() => {
    global.window = originalWindow;
    global.document = originalDocument;
});

describe('createElement', () => {
    describe('native element', () => {
        test('creates an element with the given tag', () => {
            const el = createElement('div');
            assert.equal(el.tagName, 'DIV');
            assert(el instanceof dom.window.HTMLElement);
        });

        test('throws for an invalid type', () => {
            assert.throws(() => createElement(123), TypeError);
            assert.throws(() => createElement(null), TypeError);
        });

        test('passes attributes to the element', () => {
            const el = createElement('div', { attributes: { id: 'main', class: 'box' } });
            assert.equal(el.getAttribute('id'), 'main');
            assert.equal(el.getAttribute('class'), 'box');
        });

        test('accepts null props for native elements', () => {
            const el = createElement('div', null, 'hello');
            assert.equal(el.tagName, 'DIV');
            assert.equal(el.textContent, 'hello');
        });

        test('passes non-reserved props as properties', () => {
            const el = createElement('input', { value: 'hello' });
            assert.equal(el.value, 'hello');
        });

        test('sets key as data-key', () => {
            const el = createElement('div', { key: 'k1' });
            assert.equal(el.dataset.key, 'k1');
        });

        test('key, attributes, and children do not leak into setProperties', () => {
            // If any of these leaked, setting element.children would throw
            assert.doesNotThrow(() => {
                createElement('div', {
                    key: 'k',
                    attributes: { class: 'x' },
                    children: ['a', 'b'],
                }, 'c');
            });
        });

        test('appends rest-param children as text nodes', () => {
            const el = createElement('div', {}, 'hello', 'world');
            assert.equal(el.childNodes[0].textContent, 'hello');
            assert.equal(el.childNodes[1].textContent, 'world');
        });

        test('appends props.children as text nodes', () => {
            const el = createElement('div', { children: ['hello', 'world'] });
            assert.equal(el.childNodes[0].textContent, 'hello');
            assert.equal(el.childNodes[1].textContent, 'world');
        });

        test('merges props.children and rest-param children in order', () => {
            const el = createElement('div', { children: ['first'] }, 'second');
            assert.equal(el.childNodes[0].textContent, 'first');
            assert.equal(el.childNodes[1].textContent, 'second');
        });
    });

    describe('function component', () => {
        test('calls the function with destructured props', () => {
            let received;
            const Comp = (props) => { received = props; return dom.window.document.createElement('div'); };
            createElement(Comp, { id: 'x', attributes: { class: 'c' }, key: 'k' });
            assert.equal(received.id, 'x');
            assert.deepEqual(received.attributes, { class: 'c' });
            assert.equal(received.key, 'k');
        });

        test('passes merged children to the component', () => {
            let received;
            const Comp = (props) => { received = props; return dom.window.document.createElement('div'); };
            createElement(Comp, { children: ['a'] }, 'b');
            assert.deepEqual(received.children, ['a', 'b']);
        });

        test('returns the element produced by the component', () => {
            const Comp = () => {
                const el = dom.window.document.createElement('span');
                el.textContent = 'hi';
                return el;
            };
            const el = createElement(Comp);
            assert.equal(el.tagName, 'SPAN');
            assert.equal(el.textContent, 'hi');
        });

        test('passes empty props when a component is called with null props', () => {
            let received;
            const Comp = (props) => { received = props; return dom.window.document.createElement('div'); };
            createElement(Comp, null, 'child');
            assert.equal(received.key, undefined);
            assert.equal(received.attributes, undefined);
            assert.deepEqual(received.children, ['child']);
        });

        test('sets key on the element returned by the component', () => {
            const Comp = () => dom.window.document.createElement('div');
            const el = createElement(Comp, { key: 'comp-key' });
            assert.equal(el.dataset.key, 'comp-key');
        });

        test('supports nested components', () => {
            const Inner = () => dom.window.document.createElement('span');
            const Outer = () => {
                const div = dom.window.document.createElement('div');
                div.appendChild(createElement(Inner));
                return div;
            };
            const el = createElement(Outer);
            assert.equal(el.tagName, 'DIV');
            assert.equal(el.children[0].tagName, 'SPAN');
        });
    });

    describe('integration', () => {
        test('component builds an element using createElement internally', () => {
            const Greeting = ({ name }) =>
                createElement('p', { attributes: { class: 'greeting' } }, `Hello, ${name}!`);
            const el = createElement(Greeting, { name: 'Alice' });
            assert.equal(el.tagName, 'P');
            assert.equal(el.getAttribute('class'), 'greeting');
            assert.equal(el.textContent, 'Hello, Alice!');
        });
    });
});
