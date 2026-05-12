// Reference demo component for the older root-level implementation.
import { createElement } from '../last.js';

export default function Button({ onClick, children }) {
    return createElement('button', {
      onClick,
      style: Button.style,
    }, children);
  }
  
Button.style = `
    margin: 5px;
    padding: 8px 16px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
`;
