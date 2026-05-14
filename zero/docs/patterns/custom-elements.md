# Custom Elements

Using web components and custom elements with Zero.

## Defining a Web Component

```js
class MyButton extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  set label(value) {
    this._label = value;
    this.render();
  }

  get label() {
    return this._label;
  }

  render() {
    this.innerHTML = `<button>${this._label}</button>`;
  }
}

customElements.define('my-button', MyButton);
```

## Using Web Components with Zero

Pass props directly to web components:

```js
const buttonLabel = new Signal('Click me');

const button = createElement('my-button', {
  label: buttonLabel
});

buttonLabel.set('Now click me');
```

## Web Component with Reactive Props

```js
class ReactiveCounter extends HTMLElement {
  connectedCallback() {
    this._count = 0;
    this.render();
  }

  set count(value) {
    this._count = value;
    this.render();
  }

  get count() {
    return this._count;
  }

  increment() {
    this.count = this._count + 1;
    this.dispatchEvent(new CustomEvent('count-changed', { detail: this._count }));
  }

  render() {
    this.innerHTML = `
      <div>
        <p>Count: ${this._count}</p>
        <button id="inc">Increment</button>
      </div>
    `;
    
    this.querySelector('#inc')?.addEventListener('click', () => this.increment());
  }
}

customElements.define('reactive-counter', ReactiveCounter);

// Use with Zero
const counter = new Signal(0);

const component = createElement('reactive-counter', {
  count: counter
});

component.addEventListener('count-changed', (e) => {
  counter.set(e.detail);
});
```

## Emitting Custom Events

```js
class DataInput extends HTMLElement {
  connectedCallback() {
    const input = document.createElement('input');
    input.addEventListener('change', (e) => {
      this.dispatchEvent(new CustomEvent('data-changed', {
        detail: e.target.value,
        bubbles: true,
        composed: true
      }));
    });
    this.appendChild(input);
  }
}

customElements.define('data-input', DataInput);

// Use with Zero
const data = new Signal('');

const input = createElement('data-input', {});

input.addEventListener('data-changed', (e) => {
  data.set(e.detail);
});
```

## Shadow DOM Components

```js
class StyledBox extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 20px;
          border: 2px solid #ccc;
        }
      </style>
      <slot></slot>
    `;
  }
}

customElements.define('styled-box', StyledBox);

// Use with Zero
const box = createElement('styled-box', {},
  'Content inside the box'
);
```

## Slot-Based Composition

```js
class Card extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="card">
        <div class="header">
          <slot name="header"></slot>
        </div>
        <div class="body">
          <slot name="body"></slot>
        </div>
      </div>
    `;
  }
}

customElements.define('my-card', Card);

// Use with Zero
const card = createElement('my-card', {},
  createElement('h1', { attributes: { slot: 'header' } }, 'Title'),
  createElement('p', { attributes: { slot: 'body' } }, 'Content')
);
```

## Controlled vs Uncontrolled Components

**Uncontrolled (Web Component manages state):**
```js
const counter = createElement('reactive-counter', {});

counter.addEventListener('count-changed', (e) => {
  console.log('Count is now:', e.detail);
});
```

**Controlled (Zero manages state):**
```js
const count = new Signal(0);

function renderCounter() {
  const counter = createElement('reactive-counter', {
    count: count.get()
  });

  counter.addEventListener('count-changed', (e) => {
    count.set(e.detail);
  });

  return counter;
}

const counterElement = new Signal(renderCounter());

count.subscribe(() => {
  counterElement.set(renderCounter());
});
```

## Form Control Web Component

```js
class CustomInput extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.shadowRoot.querySelector('input').addEventListener('change', (e) => {
      this.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  set value(val) {
    this._value = val;
    if (this.shadowRoot) {
      this.shadowRoot.querySelector('input').value = val;
    }
  }

  get value() {
    return this.shadowRoot?.querySelector('input').value || '';
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        input { padding: 8px; border: 1px solid #ccc; }
      </style>
      <input type="text" value="${this._value || ''}">
    `;
  }
}

customElements.define('custom-input', CustomInput);

// Use with Zero
const inputValue = new Signal('');

const input = createElement('custom-input', {
  value: inputValue
});

input.addEventListener('change', () => {
  inputValue.set(input.value);
});
```

## Attributes vs Properties

Web components accept both attributes and properties:

```js
// Set as property (preferred with Zero)
const button = createElement('my-button', {
  label: 'Click',
  disabled: false
});

// Or set as attribute
const button2 = createElement('my-button', {
  attributes: {
    'label': 'Click',
    'disabled': 'true'
  }
});
```

## Third-Party Web Components

Using libraries like Material Web, Shoelace, etc.:

```js
// Assuming Material Web is loaded
const button = createElement('mwc-button', {
  label: 'Click me',
  raised: true
});

const checkbox = createElement('mwc-checkbox', {
  checked: false
});

const dialog = createElement('mwc-dialog', {
  title: 'My Dialog',
  open: false
});
```

## Building a Composable Component Library

```js
// components/button.js
class ZeroButton extends HTMLElement {
  connectedCallback() {
    this.classList.add('zero-button');
    this.render();
  }

  set variant(value) {
    this._variant = value;
    this.classList.toggle('primary', value === 'primary');
    this.classList.toggle('secondary', value === 'secondary');
  }

  render() {
    this.innerHTML = `<button>${this.textContent}</button>`;
    this.querySelector('button').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('click-custom'));
    });
  }
}

customElements.define('zero-button', ZeroButton);

// Usage with Zero
const button = createElement('zero-button', {
  variant: 'primary'
}, 'Click me');

button.addEventListener('click-custom', () => {
  console.log('Button clicked via custom event');
});
```

## Lifecycle Integration

Web components integrate naturally with Zero's lifecycle:

```js
function ComponentWithWebComponent() {
  const data = new Signal(null);
  const customComponent = createElement('data-processor', {});

  // Setup listener
  customComponent.addEventListener('data-ready', (e) => {
    data.set(e.detail);
  });

  const container = createElement('div', {},
    customComponent,
    data ? createElement('div', {}, 'Processed: ', data) : null
  );

  // Cleanup
  const originalRemove = container.remove;
  container.remove = function() {
    customComponent.removeEventListener('data-ready', handler);
    originalRemove.call(this);
  };

  return container;
}
```

## Performance: Web Components with Zero

Web components work efficiently with Zero because:
- ✓ No vDOM overhead — Web components manage their own DOM
- ✓ Custom events propagate through Zero
- ✓ Props bind directly without serialization
- ✓ Shadow DOM encapsulation doesn't conflict

Considerations:
- ⚠ Some web components may re-render unnecessarily
- ⚠ Attribute/property serialization can be slow for large objects
- ⚠ Custom events may bubble unexpectedly

Use web components for:
- **Complex UI controls** (date pickers, data grids)
- **Third-party integrations** (analytics, payments)
- **Design system components** (buttons, forms)
- **Reusable across frameworks** (library distribution)
