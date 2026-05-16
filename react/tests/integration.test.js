// End-to-end: the demo `<App>` in app.js exercises every feature at once —
// conditional rendering keeping state, keyed-list reorder keeping state,
// useEffect with cleanup, context propagation across an unchanged Header.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, tick, tickEffects } from './setup.js';

const dom = setupDom();
const { createRoot, createElement } = await import('../index.js');
const { App } = await import('../../app.js');

function findButton(container, text) {
    for (const b of container.querySelectorAll('button')) {
        if (b.textContent.trim() === text) return b;
    }
    throw new Error('no button with text ' + JSON.stringify(text));
}
function click(btn) {
    btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
}

test('integration: initial render shows every demo section', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    createRoot(container).render(createElement(App));
    const html = container.innerHTML;
    assert.match(html, /Example App/);
    assert.match(html, /Conditional count: 0/);
    assert.match(html, /Stable count: 0/);
    assert.match(html, /Item A: clicked 0 times/);
    assert.match(html, /Elapsed: 0s/);
});

test('integration demo1: hide / show preserves the conditional counter\'s state', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    createRoot(container).render(createElement(App));

    // Bump the conditional counter to 2.
    const condBtn = () => {
        const span = [...container.querySelectorAll('span')].find(s => s.textContent.includes('Conditional count'));
        return span.parentElement.querySelector('button');
    };
    click(condBtn()); await tick();
    click(condBtn()); await tick();
    assert.match(container.textContent, /Conditional count: 2/);

    // Hide → bump the stable counter → show again.
    click(findButton(container, 'Hide'));        await tick();
    assert.equal(container.textContent.includes('Conditional count'), false);

    const stableBtn = () => {
        const span = [...container.querySelectorAll('span')].find(s => s.textContent.includes('Stable count'));
        return span.parentElement.querySelector('button');
    };
    click(stableBtn()); await tick();
    assert.match(container.textContent, /Stable count: 1/);

    click(findButton(container, 'Show')); await tick();
    assert.match(container.textContent, /Conditional count: 2/, 'conditional state restored');
    assert.match(container.textContent, /Stable count: 1/,      'stable state untouched');
});

test('integration demo2: reversing a keyed list keeps each item\'s state', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    createRoot(container).render(createElement(App));

    const incr = label => {
        const li = [...container.querySelectorAll('li')].find(l => l.textContent.includes(label));
        click(li.querySelector('button'));
    };
    incr('Item A'); await tick();
    incr('Item A'); await tick();
    incr('Item B'); await tick();
    assert.match(container.textContent, /Item A: clicked 2 times/);
    assert.match(container.textContent, /Item B: clicked 1 times/);

    click(findButton(container, 'Reverse list'));
    await tick();
    const lis = [...container.querySelectorAll('li')].map(l => l.textContent.replace(/\s+/g, ' ').trim());
    assert.ok(lis[0].startsWith('Item C'), 'order reversed: ' + lis[0]);
    assert.ok(lis.some(t => t.includes('Item A: clicked 2 times')), 'A retained state');
    assert.ok(lis.some(t => t.includes('Item B: clicked 1 times')), 'B retained state');
});

test('integration demo3: useEffect setInterval + cleanup', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    createRoot(container).render(createElement(App));

    click(findButton(container, 'Start'));
    await tickEffects();
    await new Promise(r => setTimeout(r, 1100));
    assert.match(container.textContent, /Elapsed: 1s/);
    assert.match(container.textContent, /interval started/);

    click(findButton(container, 'Pause'));
    await new Promise(r => setTimeout(r, 50));   // setTimeout-deferred effect + setLog re-render
    assert.match(container.textContent, /interval cleared/);
});

test('integration context: theme change reaches Header (props unchanged)', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    createRoot(container).render(createElement(App));

    const headerDiv = () => container.querySelector('h1').parentElement;
    const before = headerDiv().getAttribute('style');
    click(findButton(container, 'Change to dark theme'));
    await tick();
    const after = headerDiv().getAttribute('style');
    assert.notEqual(before, after, 'header style changed via context');
    assert.match(after, /black/);
});
