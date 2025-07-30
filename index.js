import { render, useState, useEffect, createElement } from './mini-react.js';

function Button({ onClick, children }) {
  return createElement('button', {
    onClick,
    style: 'margin: 5px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;'
  }, children);
}

function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = `Count: ${count}`;
    return () => {
      // Cleanup if needed
    };
  }, [count]);

  return createElement('div', {
    style: 'text-align: center; padding: 20px;'
  },
    createElement('h1', null, `Count: ${count}`),
    Button({
      onClick: () => setCount(count + 1),
      children: 'Increment'
    }),
    Button({
      onClick: () => setCount(count - 1),
      children: 'Decrement'
    }),
    Button({
      onClick: () => setCount(0),
      children: 'Reset'
    })
  );
}

render(Counter, document.getElementById('root'));
