// createContext / useContext — value reaches descendants, default value works,
// providers nest, value changes propagate to consumers whose own props didn't change.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, tick } from './setup.js';

setupDom();
const { createElement, createRoot, useState, createContext, useContext } = await import('../index.js');

function mount(component, props = null) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(createElement(component, props));
    return { container, root };
}

test('useContext: reads value from nearest Provider', () => {
    const Ctx = createContext();
    const Leaf = () => createElement('p', null, useContext(Ctx));
    const App = () => createElement(Ctx.Provider, { value: 'hello' }, createElement(Leaf));
    const { container } = mount(App);
    assert.match(container.textContent, /hello/);
});

test('useContext: returns default when no Provider is present', () => {
    const Ctx = createContext('default-val');
    const Leaf = () => createElement('p', null, useContext(Ctx));
    const { container } = mount(Leaf);
    assert.match(container.textContent, /default-val/);
});

test('useContext: throws when no Provider and no default', () => {
    const Ctx = createContext();
    const Leaf = () => createElement('p', null, useContext(Ctx));
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    assert.throws(() => root.render(createElement(Leaf)), /no matching Provider/);
});

test('useContext: nested Providers — inner wins', () => {
    const Ctx = createContext();
    const Leaf = () => createElement('p', null, useContext(Ctx));
    const App = () => createElement(Ctx.Provider, { value: 'outer' },
        createElement(Ctx.Provider, { value: 'inner' },
            createElement(Leaf),
        ),
    );
    const { container } = mount(App);
    assert.match(container.textContent, /inner/);
});

test('useContext: provider value change reaches consumer whose props are unchanged', async () => {
    const Ctx = createContext();
    let setTheme;
    const Leaf = () => createElement('p', null, useContext(Ctx));
    const App = () => {
        const [theme, s] = useState('light');
        setTheme = s;
        return createElement(Ctx.Provider, { value: theme }, createElement(Leaf));
    };
    const { container } = mount(App);
    assert.match(container.textContent, /light/);
    setTheme('dark');
    await tick();
    assert.match(container.textContent, /dark/);
});

test('useContext: multiple distinct contexts coexist', () => {
    const A = createContext();
    const B = createContext();
    const Leaf = () => createElement('p', null, `${useContext(A)}|${useContext(B)}`);
    const App = () => createElement(A.Provider, { value: 'a-val' },
        createElement(B.Provider, { value: 'b-val' },
            createElement(Leaf),
        ),
    );
    const { container } = mount(App);
    assert.match(container.textContent, /a-val\|b-val/);
});
