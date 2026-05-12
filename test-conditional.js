// Reference demo for the older root-level implementation.
// Kept to document conditional component rendering behavior while zero\ is the canonical path.
import { render, useState, useEffect, createElement } from './last.js';

/**
 * Component that will be conditionally rendered
 * This demonstrates the real conditional rendering issue
 */
function ConditionalComponent() {
  const [conditionalState, setConditionalState] = useState('Conditional State');
  
  useEffect(() => {
    console.log('ConditionalComponent mounted');
    return () => console.log('ConditionalComponent unmounted');
  }, []);
  
  return createElement('div', {
    style: 'padding: 10px; margin: 10px; background: #e9ecef; border-radius: 4px;'
  },
    createElement('h4', null, 'Conditional Component'),
    createElement('p', null, `State: ${conditionalState}`),
    createElement('button', {
      onClick: () => setConditionalState(conditionalState + '!'),
      style: 'margin: 5px; padding: 8px 16px; background: #6f42c1; color: white; border: none; border-radius: 4px; cursor: pointer;'
    }, 'Update Conditional State')
  );
}

/**
 * Main test component that conditionally renders other components
 * This is the scenario where the fiber system helps - different component instances
 */
function ConditionalTest() {
  const [showConditional, setShowConditional] = useState(false);
  const [count, setCount] = useState(0);
  
  // These hooks are always called in the same order
  const [alwaysHere, setAlwaysHere] = useState('Always');
  const [finalState, setFinalState] = useState('Final');
  
  useEffect(() => {
    console.log('Main component rendered with count:', count);
  }, [count]);
  
  return createElement('div', {
    style: 'padding: 20px; border: 1px solid #ccc; margin: 10px;'
  },
    createElement('h3', null, 'Conditional Component Rendering Test'),
    createElement('p', null, `Count: ${count}`),
    createElement('p', null, `Always: ${alwaysHere}`),
    createElement('p', null, `Final: ${finalState}`),
    
    // Conditional rendering of a separate component
    showConditional ? createElement(ConditionalComponent) : null,
    
    createElement('div', { style: 'margin-top: 20px;' },
      createElement('button', {
        onClick: () => setCount(count + 1),
        style: 'margin: 5px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;'
      }, 'Increment Count'),
      createElement('button', {
        onClick: () => setShowConditional(!showConditional),
        style: 'margin: 5px; padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;'
      }, showConditional ? 'Hide Conditional Component' : 'Show Conditional Component'),
      createElement('button', {
        onClick: () => setAlwaysHere(alwaysHere + '!'),
        style: 'margin: 5px; padding: 8px 16px; background: #ffc107; color: black; border: none; border-radius: 4px; cursor: pointer;'
      }, 'Update Always'),
      createElement('button', {
        onClick: () => setFinalState(finalState + '!'),
        style: 'margin: 5px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;'
      }, 'Update Final')
    ),
    
    createElement('div', {
      style: 'margin-top: 20px; padding: 10px; background: #f8f9fa; border-radius: 4px;'
    }, 
      createElement('h4', null, 'Test Instructions:'),
      createElement('ol', null,
        createElement('li', null, 'Click "Show Conditional Component" to render the conditional component'),
        createElement('li', null, 'Update the conditional component\'s state'),
        createElement('li', null, 'Hide and show the conditional component again'),
        createElement('li', null, 'Verify that the conditional component maintains its state'),
        createElement('li', null, 'Update the main component states and verify they don\'t interfere')
      ),
      createElement('p', null, 
        'This demonstrates that each component instance maintains its own hook state, ' +
        'preventing the conditional rendering issue that would occur with global hook tracking.'
      )
    )
  );
}

// Render the test component
render(ConditionalTest, document.getElementById('root')); 
