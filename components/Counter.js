// Reference demo component for the older root-level implementation.
import { createElement, useState, useEffect } from '../last.js';
import Button from './Button.js';

export default function Counter() {
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
  
