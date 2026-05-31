import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Signal } from 'signal-polyfill';
import { createElement } from '../element.js';
import { serialize } from '../serialize.js';

describe('serialize', () => {
    test('serializes nested virtual nodes', () => {
        const tree = createElement('div', { attributes: { id: 'app' } },
            createElement('span', null, 'hello'),
            ' world'
        );

        assert.equal(
            serialize(tree),
            '<div id="app"><span>hello</span> world</div>'
        );
    });

    test('serializes a component with a prebuilt child inserted mid-tree', () => {
        function Comp() {
            const el = createElement('span', { attributes: { id: 'middle' } }, 'middle');
            return createElement('section', null,
                createElement('p', null, 'before'),
                el,
                createElement('p', null, 'after'),
            );
        }

        assert.equal(
            serialize(createElement(Comp)),
            '<section><p>before</p><span id="middle">middle</span><p>after</p></section>'
        );
    });

    test('serializes key as data-key', () => {
        assert.equal(
            serialize(createElement('li', { key: 'k1' }, 'item')),
            '<li data-key="k1">item</li>'
        );
    });

    test('serializes signal attributes using signal attribute semantics', () => {
        const disabled = new Signal.State(true);
        const classNames = new Signal.State(['a', 'b']);
        const hidden = new Signal.State(false);

        const tree = createElement('button', {
            attributes: {
                disabled,
                class: classNames,
                hidden,
                title: 'go',
            },
        }, 'save');

        assert.equal(
            serialize(tree),
            '<button disabled="true" class="a b" hidden="false" title="go">save</button>'
        );
    });

    test('serializes signal children by current value', () => {
        const city = new Signal.State('Cape Town');
        const tree = createElement('div', null, city);

        assert.equal(serialize(tree), '<div>Cape Town</div>');
        city.set('Berlin');
        assert.equal(serialize(tree), '<div>Berlin</div>');
    });

    test('serializes component child arrays that mix primitives and signals', () => {
        function Wrapper({ children }) {
            return createElement('div', null, children);
        }

        const count = new Signal.State(2);
        const tree = createElement(Wrapper, null, 'Count: ', count);
        assert.equal(serialize(tree), '<div>Count: 2</div>');
    });

    test('escapes text and attribute content', () => {
        const tree = createElement('div', {
            attributes: { title: 'a"b&c<d>' },
        }, '<hey&>');

        assert.equal(
            serialize(tree),
            '<div title="a&quot;b&amp;c&lt;d&gt;">&lt;hey&amp;&gt;</div>'
        );
    });

    test('serializes script text without HTML-escaping it', () => {
        const tree = createElement('script', null, 'const fn = () => value < 3 && other > 1;');
        assert.equal(
            serialize(tree),
            '<script>const fn = () => value < 3 && other > 1;</script>',
        );
    });

    test('neutralizes raw-text closing tags inside script and style elements', () => {
        const tree = createElement('div', null,
            createElement('script', null, 'const end = "</script>";'),
            createElement('style', null, 'main > section::after { content: "</style>"; }'),
        );

        assert.equal(
            serialize(tree),
            '<div><script>const end = "<\\/script>";</script><style>main > section::after { content: "<\\/style>"; }</style></div>',
        );
    });

    test('does not serialize non-attribute properties', () => {
        const tree = createElement('button', {
            value: 'ignored',
            onclick: () => {},
        }, 'ok');

        assert.equal(serialize(tree), '<button>ok</button>');
    });
});
