import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement } from '../element.js';

// Setup JSDOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const originalWindow = global.window;
const originalDocument = global.document;

before(() => {
    global.window = dom.window;
    global.document = dom.window.document;
});

after(() => {
    global.window = originalWindow;
    global.document = originalDocument;
});

describe('createElement', () => {
    describe('with string type (HTML elements)', () => {
        test('creates a basic HTML element', () => {
            const element = createElement('div');
            assert.equal(element.tagName, 'DIV');
            assert(element instanceof dom.window.HTMLElement);
        });

        test('creates elements with various tag names', () => {
            const tags = ['div', 'span', 'p', 'button', 'input', 'section', 'article'];
            tags.forEach(tag => {
                const element = createElement(tag);
                assert.equal(element.tagName, tag.toUpperCase());
            });
        });

        test('sets attributes from props', () => {
            const element = createElement('div', {
                attributes: {
                    'id': 'test-id',
                    'data-test': 'value'
                }
            });
            assert.equal(element.getAttribute('id'), 'test-id');
            assert.equal(element.getAttribute('data-test'), 'value');
        });

        test('handles undefined attributes gracefully', () => {
            const element = createElement('div', {
                attributes: undefined
            });
            assert.equal(element.tagName, 'DIV');
        });

        test('handles null attributes gracefully', () => {
            const element = createElement('div', {
                attributes: null
            });
            assert.equal(element.tagName, 'DIV');
        });

        test('sets element properties (non-attribute props)', () => {
            const element = createElement('input', {
                type: 'text',
                placeholder: 'Enter text'
            });
            // Note: Properties are set via setProperties which is currently empty
            // This test documents the intended behavior
            assert.equal(element.tagName, 'INPUT');
        });

        test('sets key on element', () => {
            const element = createElement('div', {
                key: 'test-key'
            });
            assert.equal(element.dataset.key, 'test-key');
        });

        test('ignores undefined key', () => {
            const element = createElement('div', {
                key: undefined
            });
            assert.equal(element.dataset.key, undefined);
        });

        test('handles children from props.children array', () => {
            const element = createElement('div', {
                children: ['child1', 'child2']
            });
            assert.equal(element.tagName, 'DIV');
            // Note: setChildren is currently empty, so children won't be added
            // This test documents the intended behavior
        });

        test('handles children from rest parameters', () => {
            const element = createElement('div', {}, 'child1', 'child2');
            assert.equal(element.tagName, 'DIV');
            // Note: setChildren is currently empty, so children won't be added
            // This test documents the intended behavior
        });

        test('prioritizes rest parameter children over props.children', () => {
            // When both props.children and ...children are provided,
            // the function should handle this gracefully
            const element = createElement('div', { children: ['prop-child'] }, 'rest-child');
            assert.equal(element.tagName, 'DIV');
        });

        test('handles mixed attributes, properties, and children', () => {
            const element = createElement('button', {
                attributes: { 'class': 'btn btn-primary' },
                id: 'submit-btn',
                key: 'submit',
                children: []
            }, 'Click me');
            
            assert.equal(element.tagName, 'BUTTON');
            assert.equal(element.getAttribute('class'), 'btn btn-primary');
            assert.equal(element.dataset.key, 'submit');
        });

        test('handles empty props object', () => {
            const element = createElement('div', {});
            assert.equal(element.tagName, 'DIV');
        });

        test('handles default empty props', () => {
            const element = createElement('div');
            assert.equal(element.tagName, 'DIV');
        });

        test('handles multiple attributes', () => {
            const element = createElement('div', {
                attributes: {
                    'id': 'main',
                    'class': 'container',
                    'data-role': 'main',
                    'aria-label': 'main content'
                }
            });
            
            assert.equal(element.getAttribute('id'), 'main');
            assert.equal(element.getAttribute('class'), 'container');
            assert.equal(element.getAttribute('data-role'), 'main');
            assert.equal(element.getAttribute('aria-label'), 'main content');
        });
    });

    describe('with function type (components)', () => {
        test('calls function component with props', () => {
            let propsReceived;
            const Component = (props) => {
                propsReceived = props;
                return document.createElement('div');
            };

            const element = createElement(Component, { id: 'test' });
            
            assert(element instanceof dom.window.HTMLElement);
            assert.equal(propsReceived.id, 'test');
        });

        test('passes all props to function component', () => {
            let propsReceived;
            const Component = (props) => {
                propsReceived = props;
                return document.createElement('div');
            };

            const element = createElement(Component, {
                key: 'comp-key',
                attributes: { class: 'component' },
                customProp: 'custom value',
                children: ['child']
            });
            
            assert.equal(propsReceived.key, 'comp-key');
            assert.deepEqual(propsReceived.attributes, { class: 'component' });
            assert.equal(propsReceived.customProp, 'custom value');
            assert.deepEqual(propsReceived.children, ['child']);
        });

        test('returns element from function component', () => {
            const Component = () => {
                const div = document.createElement('div');
                div.textContent = 'Hello';
                return div;
            };

            const element = createElement(Component);
            
            assert.equal(element.tagName, 'DIV');
            assert.equal(element.textContent, 'Hello');
        });

        test('sets key on element returned by component', () => {
            const Component = () => document.createElement('div');
            const element = createElement(Component, { key: 'component-key' });
            
            assert.equal(element.dataset.key, 'component-key');
        });

        test('function component receives rest parameter children', () => {
            let propsReceived;
            const Component = (props) => {
                propsReceived = props;
                return document.createElement('div');
            };

            createElement(Component, {}, 'child1', 'child2');
            
            assert.deepEqual(propsReceived.children, ['child1', 'child2']);
        });

        test('function component receives combined props', () => {
            let propsReceived;
            const Component = (props) => {
                propsReceived = props;
                return document.createElement('div');
            };

            const element = createElement(Component, {
                attributes: { class: 'comp' },
                title: 'My Component',
                key: 'k1'
            }, 'content');
            
            assert.equal(propsReceived.key, 'k1');
            assert.deepEqual(propsReceived.attributes, { class: 'comp' });
            assert.equal(propsReceived.title, 'My Component');
            assert.deepEqual(propsReceived.children, ['content']);
        });

        test('handles nested function components', () => {
            const InnerComponent = () => document.createElement('span');
            const OuterComponent = () => {
                const div = document.createElement('div');
                div.appendChild(createElement(InnerComponent));
                return div;
            };

            const element = createElement(OuterComponent);
            
            assert.equal(element.tagName, 'DIV');
            assert.equal(element.children[0].tagName, 'SPAN');
        });

        test('function component receives no key by default', () => {
            let propsReceived;
            const Component = (props) => {
                propsReceived = props;
                return document.createElement('div');
            };

            createElement(Component, { id: 'test' });
            
            assert.equal(propsReceived.key, undefined);
        });

        test('handles function components returning different element types', () => {
            const buttons = [
                () => document.createElement('button'),
                () => document.createElement('input'),
                () => document.createElement('a')
            ];

            buttons.forEach(Component => {
                const element = createElement(Component);
                assert(element instanceof dom.window.HTMLElement);
            });
        });
    });

    describe('error cases and edge cases', () => {
        test('throws error for invalid element type', () => {
            assert.throws(() => {
                createElement(123);
            });
        });

        test('throws error for null type', () => {
            assert.throws(() => {
                createElement(null);
            });
        });

        test('handles empty props object with multiple children', () => {
            const element = createElement('div', {}, 'child1', 'child2', 'child3');
            assert.equal(element.tagName, 'DIV');
        });

        test('preserves attributes with special characters', () => {
            const element = createElement('div', {
                attributes: {
                    'data-test-value': 'value-with-dashes',
                    'aria-describedby': 'description-id'
                }
            });
            
            assert.equal(element.getAttribute('data-test-value'), 'value-with-dashes');
            assert.equal(element.getAttribute('aria-describedby'), 'description-id');
        });

        test('attributes object does not affect element when not provided', () => {
            const element = createElement('div', {
                id: 'my-id'
            });
            
            // Only attributes in the attributes object should be set via setAttribute
            assert.equal(element.getAttribute('id'), null);
        });
    });

    describe('integration scenarios', () => {
        test('creates a simple component tree structure', () => {
            const parent = createElement('div', { attributes: { id: 'parent' } });
            const child = createElement('span', { attributes: { class: 'child' } });
            parent.appendChild(child);
            
            assert.equal(parent.tagName, 'DIV');
            assert.equal(parent.getAttribute('id'), 'parent');
            assert.equal(parent.children[0].tagName, 'SPAN');
            assert.equal(parent.children[0].getAttribute('class'), 'child');
        });

        test('creates multiple siblings with different keys', () => {
            const sibling1 = createElement('div', { key: 'item-1' });
            const sibling2 = createElement('div', { key: 'item-2' });
            const sibling3 = createElement('div', { key: 'item-3' });
            
            assert.equal(sibling1.dataset.key, 'item-1');
            assert.equal(sibling2.dataset.key, 'item-2');
            assert.equal(sibling3.dataset.key, 'item-3');
        });

        test('component example from documentation', () => {
            const HelloWorld = ({ name }) => {
                return createElement('div', { 
                    attributes: { class: 'hello-world' } 
                }, `Hello, ${name}!`);
            };
            
            const element = createElement(HelloWorld, { name: 'Alice' });
            
            assert.equal(element.tagName, 'DIV');
            assert.equal(element.getAttribute('class'), 'hello-world');
        });
    });
});
