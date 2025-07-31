import { createRoot } from './last.js';
import { App } from './app.js';

//const rootOne = createRoot(document.querySelector('#root-one'));
const rootTwo = createRoot(document.querySelector('#root-two'));

//rootOne.render(App, {});
rootTwo.render(App, {});
