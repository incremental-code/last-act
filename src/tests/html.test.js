import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { html } from '../html.js';
import { createElement } from '../element.js';
import { isVirtualNode } from '../vnode.js';
import { signal } from '../signals.js';

describe('html', () => {
    test('parses a single empty tag', () => {
        const node = html`<div></div>`;
        assert.equal(isVirtualNode(node), true);
        assert.equal(node.type, 'div');
        assert.deepEqual(node.children, []);
    });

    test('parses self-closing tags', () => {
        const node = html`<br/>`;
        assert.equal(node.type, 'br');
        assert.deepEqual(node.children, []);
    });

    test('parses literal string attributes into the attributes bag', () => {
        const node = html`<div id="main" class="box"></div>`;
        assert.equal(node.attributes.id, 'main');
        assert.equal(node.attributes.class, 'box');
    });

    test('parses interpolated attribute values', () => {
        const node = html`<div id=${'main'}></div>`;
        assert.equal(node.attributes.id, 'main');
    });

    test('routes on* function attrs to props (event handlers)', () => {
        const onclick = () => {};
        const node = html`<button onclick=${onclick}>Go</button>`;
        assert.equal(node.props.onclick, onclick);
        assert.equal(node.attributes, undefined);
    });

    test('parses nested children', () => {
        const node = html`<div><h1>Hi</h1></div>`;
        assert.equal(node.type, 'div');
        assert.equal(node.children.length, 1);
        assert.equal(node.children[0].type, 'h1');
        assert.equal(node.children[0].children[0], 'Hi');
    });

    test('drops pure-whitespace segments between tags', () => {
        const node = html`
            <div>
                <span>a</span>
                <span>b</span>
            </div>
        `;
        assert.equal(node.type, 'div');
        assert.equal(node.children.length, 2);
        assert.equal(node.children[0].type, 'span');
        assert.equal(node.children[1].type, 'span');
    });

    test('preserves whitespace adjacent to non-whitespace text', () => {
        const node = html`<p>hello world</p>`;
        assert.equal(node.children[0], 'hello world');
    });

    test('mixes text and interpolated children', () => {
        const name = 'world';
        const node = html`<p>hello ${name}!</p>`;
        // Three child entries: 'hello ', 'world', '!'
        assert.equal(node.children.length, 3);
        assert.equal(node.children[0], 'hello ');
        assert.equal(node.children[1], 'world');
        assert.equal(node.children[2], '!');
    });

    test('interpolated child can be a VirtualNode', () => {
        const inner = html`<span>x</span>`;
        const node = html`<div>${inner}</div>`;
        assert.equal(node.children[0], inner);
    });

    test('interpolated child can be an array of VirtualNodes', () => {
        const items = ['a', 'b', 'c'];
        const node = html`<ul>${items.map(x => html`<li>${x}</li>`)}</ul>`;
        const list = node.children[0];   // the array sits as one child entry
        assert.equal(Array.isArray(list), true);
        assert.equal(list.length, 3);
        assert.equal(list[0].type, 'li');
        assert.equal(list[2].children[0], 'c');
    });

    test('interpolated tag name (component)', () => {
        const MyBox = ({ children }) => createElement('section', null, ...children);
        const node = html`<${MyBox}><p>hi</p><//>`;
        // createElement runs the component; result should be the section VirtualNode.
        assert.equal(node.type, 'section');
        assert.equal(node.children[0].type, 'p');
    });

    test('spread props between attrs', () => {
        const onclick = () => {};
        const extra = { attributes: { 'data-x': '1' }, onclick };
        const node = html`<div id="a" ${extra}></div>`;
        assert.equal(node.attributes.id, 'a');
        assert.equal(node.attributes['data-x'], '1');
        assert.equal(node.props.onclick, onclick);
    });

    test('signal as child is passed through unchanged', () => {
        const s = signal('one');
        const node = html`<div>${s}</div>`;
        assert.equal(node.children[0], s);
    });

    test('multiple top-level nodes return an array', () => {
        const out = html`<p>a</p><p>b</p>`;
        assert.equal(Array.isArray(out), true);
        assert.equal(out.length, 2);
        assert.equal(out[0].type, 'p');
        assert.equal(out[1].type, 'p');
    });

    test('boolean (valueless) attribute', () => {
        const node = html`<input disabled/>`;
        assert.equal(node.attributes.disabled, true);
    });

    test('unquoted attribute value', () => {
        const node = html`<div id=main></div>`;
        assert.equal(node.attributes.id, 'main');
    });

    test('deeply nested with interpolated children', () => {
        const title = 'Hello';
        const node = html`
            <div class="page">
                <header><h1>${title}</h1></header>
                <main>
                    <p>welcome</p>
                </main>
            </div>
        `;
        assert.equal(node.type, 'div');
        assert.equal(node.attributes.class, 'page');
        assert.equal(node.children.length, 2);                       // <header> + <main>
        assert.equal(node.children[0].type, 'header');
        assert.equal(node.children[0].children[0].type, 'h1');
        assert.equal(node.children[0].children[0].children[0], 'Hello');
        assert.equal(node.children[1].children[0].children[0], 'welcome');
    });
});
