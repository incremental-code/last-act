// Demo entry point: bind a root to the #root container in demo.html and render
// the <App> element into it. `root` keeps the previous element + shadow trees,
// so every setState inside the app re-renders through this same root.
import { createRoot, createElement } from './src/index.js';
import { App } from './app.js';

const root = createRoot(document.querySelector('#root'));
root.render(createElement(App));
