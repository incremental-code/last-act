// Reference demo for the older root-level implementation.
// Kept to document why conditional hook calls within one component are invalid.
import { render, useState, useEffect, createElement } from './last.js';

/**
 * BROKEN: Component with conditional hook calls within the same component
 * This demonstrates the fundamental issue that cannot be fixed with just per-component fibers
 * 
 * WARNING: This will break hook order and cause bugs!
 */
function BrokenConditionalComponent({ showExtra }) {
  const [count, setCount] = useState(0);
  
  // This hook is always called
  const [alwaysHere, setAlwaysHere] = useState('Always');
  
  // BROKEN: This hook is only called when showExtra is true
  // This will break hook order when showExtra changes!
  if (showExtra) {
    const [conditionalState, setConditionalState] = useState('Conditional');
  }
  
  // This hook will get the wrong state when showExtra is false
  // because hook order changes!
  const [finalState, setFinalState] = useState('Final');
  
  useEffect(() => {
    console.log('Broken component rendered with count:', count);
  }, [count]);
  
  return createElement('div', {
    style: 'padding: 20px; border: 2px solid #dc3545; margin: 10px; background: #fff5f5;'
  },
    createElement('h3', { style: 'color: #dc3545;' }, '⚠️ BROKEN: Conditional Hook Calls'),
    createElement('p', null, `Count: ${count}`),
    createElement('p', null, `Always: ${alwaysHere}`),
    createElement('p', null, `Final: ${finalState}`),
    createElement('p', { style: 'color: #dc3545; font-weight: bold;' }, 
      'This component has conditional hook calls which will break hook order!'
    ),
    createElement('div', { style: 'margin-top: 20px;' },
      createElement('button', {
        onClick: () => setCount(count + 1),
        style: 'margin: 5px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;'
      }, 'Increment Count'),
      createElement('button', {
        onClick: () => setAlwaysHere(alwaysHere + '!'),
        style: 'margin: 5px; padding: 8px 16px; background: #ffc107; color: black; border: none; border-radius: 4px; cursor: pointer;'
      }, 'Update Always'),
      createElement('button', {
        onClick: () => setFinalState(finalState + '!'),
        style: 'margin: 5px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;'
      }, 'Update Final')
    )
  );
}

/**
 * Test component that demonstrates both the broken and working scenarios
 */
function ConditionalTest() {
  const [showBroken, setShowBroken] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  
  return createElement('div', {
    style: 'padding: 20px; border: 1px solid #ccc; margin: 10px;'
  },
    createElement('h2', null, 'Conditional Rendering Test'),
    
    createElement('div', { style: 'margin-bottom: 20px;' },
      createElement('button', {
        onClick: () => setShowBroken(!showBroken),
        style: 'margin: 5px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;'
      }, showBroken ? 'Hide Broken Example' : 'Show Broken Example'),
      createElement('button', {
        onClick: () => setShowExtra(!showExtra),
        style: 'margin: 5px; padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;'
      }, 'Toggle showExtra (triggers conditional hook)')
    ),
    
    // Show the broken component when requested
    showBroken ? createElement(BrokenConditionalComponent, { showExtra }) : null,
    
    createElement('div', {
      style: 'margin-top: 20px; padding: 10px; background: #f8f9fa; border-radius: 4px;'
    }, 
      createElement('h4', null, 'Explanation:'),
      createElement('p', null, 
        'The "Broken Example" shows a component with conditional hook calls within the same component. ' +
        'This will break hook order when the condition changes, causing state to be mixed up between hooks.'
      ),
      createElement('p', null,
        'The fiber system only helps with conditional component rendering (different component instances), ' +
        'not with conditional hook calls within the same component.'
      ),
      createElement('p', { style: 'color: #dc3545; font-weight: bold;' },
        'Rule: Never call hooks conditionally within the same component!'
      )
    )
  );
}

// Render the test component
render(ConditionalTest, document.getElementById('root')); 
