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
            '<button disabled="" class="a b" title="go">save</button>'
        );
    });

    test('serializes signal children by current value', () => {
        const city = new Signal.State('Cape Town');
        const tree = createElement('div', null, city);

        assert.equal(serialize(tree), '<div>Cape Town</div>');
        city.set('Berlin');
        assert.equal(serialize(tree), '<div>Berlin</div>');
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

    test('does not serialize non-attribute properties', () => {
        const tree = createElement('button', {
            value: 'ignored',
            onclick: () => {},
        }, 'ok');

        assert.equal(serialize(tree), '<button>ok</button>');
    });
});
