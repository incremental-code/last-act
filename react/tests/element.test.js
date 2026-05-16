// element.js — element-building shape and child normalisation.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from '../element.js';

test('createElement: tag + props + children', () => {
    const el = createElement('div', { id: 'x' }, 'hello');
    assert.equal(el.type, 'div');
    assert.equal(el.props.id, 'x');
    assert.equal(el.props.children.length, 1);
    assert.equal(el.props.children[0].type, 'TEXT_ELEMENT');
    assert.equal(el.props.children[0].props.nodeValue, 'hello');
});

test('createElement: numeric children become text elements', () => {
    const el = createElement('span', null, 42);
    assert.equal(el.props.children[0].type, 'TEXT_ELEMENT');
    assert.equal(el.props.children[0].props.nodeValue, '42');
});

test('createElement: null props is allowed', () => {
    const el = createElement('span', null, 'x');
    assert.equal(el.props.children.length, 1);
});

test('createElement: key and ref are lifted out of props', () => {
    const el = createElement('li', { key: 'a', ref: 'r', id: 'i' });
    assert.equal(el.key, 'a');
    assert.equal(el.ref, 'r');
    assert.equal(el.props.id, 'i');
    assert.equal('key' in el.props, false);
    assert.equal('ref' in el.props, false);
});

test('createElement: nested array children are flattened', () => {
    const el = createElement('ul', null,
        createElement('li', null, 'a'),
        [createElement('li', null, 'b'), createElement('li', null, 'c')],
    );
    assert.equal(el.props.children.length, 3);
    assert.equal(el.props.children[0].type, 'li');
    assert.equal(el.props.children[1].type, 'li');
    assert.equal(el.props.children[2].type, 'li');
});

test('createElement: null/false children are kept (so diff sees empty slots)', () => {
    const el = createElement('div', null, 'a', null, false, 'b');
    assert.equal(el.props.children.length, 4);
    assert.equal(el.props.children[1], null);
    assert.equal(el.props.children[2], false);
});

test('createElement: marks elements with $$typeof symbol', () => {
    const el = createElement('div');
    assert.equal(el.$$typeof, Symbol.for('react.element'));
});
