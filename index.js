import { createRoot, createElement } from './last.js';
import { App } from './app.js';

const root = createRoot(document.querySelector('#root'));
root.render(createElement(App));
