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

    test('name="value" attrs land in attributes', () => {
        const node = html`<div id="main" class="box"></div>`;
        assert.equal(node.attributes.id, 'main');
        assert.equal(node.attributes.class, 'box');
    });

    test('name=${value} attrs land in attributes too', () => {
        const node = html`<div id=${'main'} data-count=${42}></div>`;
        assert.equal(node.attributes.id, 'main');
        assert.equal(node.attributes['data-count'], 42);
    });

    test('on* with name=${fn} also lands in attributes (no magic routing)', () => {
        const fn = () => {};
        const node = html`<button onclick=${fn}>Go</button>`;
        assert.equal(node.attributes.onclick, fn);
        // Not silently lifted into props.
        assert.equal(node.props?.onclick, undefined);
    });

    test('event handlers go through spread', () => {
        const onclick = () => {};
        const node = html`<button ${{ onclick }}>Go</button>`;
        assert.equal(node.props.onclick, onclick);
        assert.equal(node.attributes?.onclick, undefined);
    });

    test('props=${obj} is an alternate spread spelling', () => {
        const onclick = () => {};
        const node = html`<button props=${{ onclick }}>Go</button>`;
        assert.equal(node.props.onclick, onclick);
        assert.equal(node.attributes?.props, undefined);
    });

    test('bare spread and attrs coexist', () => {
        const onclick = () => {};
        const node = html`<div id="a" ${{ onclick, key: 'k' }} class="b"></div>`;
        assert.equal(node.attributes.id, 'a');
        assert.equal(node.attributes.class, 'b');
        assert.equal(node.props.onclick, onclick);
        assert.equal(node.key, 'k');
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
        const list = node.children[0];
        assert.equal(Array.isArray(list), true);
        assert.equal(list.length, 3);
        assert.equal(list[0].type, 'li');
        assert.equal(list[2].children[0], 'c');
    });

    test('interpolated tag name (component)', () => {
        const MyBox = ({ children }) => createElement('section', null, ...children);
        const node = html`<${MyBox}><p>hi</p><//>`;
        assert.equal(node.type, 'section');
        assert.equal(node.children[0].type, 'p');
    });

    test('component props arrive only via spread or props=${...}', () => {
        let captured = null;
        const Comp = (p) => { captured = p; return createElement('div'); };
        // name=${value} → attributes (so the component sees props.attributes.foo)
        html`<${Comp} foo="bar"/>`;
        assert.equal(captured.foo, undefined);
        assert.equal(captured.attributes.foo, 'bar');

        // To pass real props you spread:
        const removeCity = () => {};
        html`<${Comp} ${{ rows: [1, 2], removeCity }}/>`;
        assert.deepEqual(captured.rows, [1, 2]);
        assert.equal(captured.removeCity, removeCity);

        // Or use props=${...}:
        html`<${Comp} props=${{ count: 7 }}/>`;
        assert.equal(captured.count, 7);
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
        assert.equal(node.children.length, 2);
        assert.equal(node.children[0].type, 'header');
        assert.equal(node.children[0].children[0].type, 'h1');
        assert.equal(node.children[0].children[0].children[0], 'Hello');
        assert.equal(node.children[1].children[0].children[0], 'welcome');
    });
});
