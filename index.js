import { createRoot } from './last.js';
import { App } from './app.js';

const root = createRoot(document.querySelector('#root'));
root.render(App, {});
