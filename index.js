// Reference entry point for the older root-level implementation.
// The canonical demo currently loads zero\index.js from index.html.
import { render } from './last.js';
import Counter from './components/Counter.js';

render(Counter, document.getElementById('root'));
