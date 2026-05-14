# Two-Way Binding

Keeping form inputs and state synchronized bidirectionally.

## Simple Two-Way Binding

```js
const name = new Signal('');

const input = createElement('input', {
  value: name,
  onchange: (e) => name.set(e.target.value)
});

const display = createElement('div', {}, 'Name: ', name);

// Changes to input update name signal
// Changes to name signal update display
```

## Helper for Two-Way Binding

```js
function bind(signal, element, eventType = 'onchange') {
  // Set initial value
  if (element.type === 'checkbox') {
    element.checked = signal.get();
  } else {
    element.value = signal.get();
  }

  // Update element when signal changes
  signal.subscribe(() => {
    if (element.type === 'checkbox') {
      element.checked = signal.get();
    } else {
      element.value = signal.get();
    }
  });

  // Update signal when element changes
  element.addEventListener(eventType === 'onchange' ? 'change' : eventType.slice(2), (e) => {
    if (element.type === 'checkbox') {
      signal.set(e.target.checked);
    } else {
      signal.set(e.target.value);
    }
  });

  return element;
}

// Usage
const email = new Signal('');
const emailInput = createElement('input', { type: 'email' });
bind(email, emailInput);
```

## Form Object Two-Way Binding

```js
const formData = new Signal({
  name: '',
  email: '',
  age: '',
  agreed: false
});

function bindForm(formElement, dataSignal) {
  const inputs = formElement.querySelectorAll('[name]');

  inputs.forEach(input => {
    const fieldName = input.name;
    const currentData = dataSignal.get();

    // Set initial value
    if (input.type === 'checkbox') {
      input.checked = currentData[fieldName] || false;
    } else {
      input.value = currentData[fieldName] || '';
    }

    // Update signal when input changes
    input.addEventListener('change', (e) => {
      const newData = { ...dataSignal.get() };
      newData[fieldName] = input.type === 'checkbox' ? e.target.checked : e.target.value;
      dataSignal.set(newData);
    });
  });

  // Update inputs when signal changes
  dataSignal.subscribe(() => {
    inputs.forEach(input => {
      const fieldName = input.name;
      const value = dataSignal.get()[fieldName];
      if (input.type === 'checkbox') {
        input.checked = value || false;
      } else {
        input.value = value || '';
      }
    });
  });
}

const form = createElement('form', {},
  createElement('input', { name: 'name', type: 'text' }),
  createElement('input', { name: 'email', type: 'email' }),
  createElement('input', { name: 'age', type: 'number' }),
  createElement('input', { name: 'agreed', type: 'checkbox' })
);

bindForm(form, formData);
```

## Real-Time Validation with Two-Way Binding

```js
const email = new Signal('');
const emailError = new Signal('');

function validateEmail(value) {
  if (!value) return '';
  if (!value.includes('@')) return 'Must include @';
  if (!value.includes('.')) return 'Must include domain';
  return '';
}

email.subscribe((value) => {
  emailError.set(validateEmail(value));
});

const form = createElement('div', {},
  createElement('input', {
    type: 'email',
    value: email,
    onchange: (e) => email.set(e.target.value)
  }),
  createElement('span', {
    textContent: emailError,
    attributes: { class: emailError.get() ? 'error' : '' }
  })
);
```

## Select Dropdown Two-Way Binding

```js
const selectedColor = new Signal('red');

const select = createElement('select', {
  value: selectedColor,
  onchange: (e) => selectedColor.set(e.target.value)
},
  createElement('option', { value: 'red' }, 'Red'),
  createElement('option', { value: 'green' }, 'Green'),
  createElement('option', { value: 'blue' }, 'Blue')
);

const preview = createElement('div', {
  style: { 
    background: selectedColor,
    width: '100px',
    height: '100px'
  }
});

selectedColor.subscribe(() => {
  preview.style.background = selectedColor.get();
});
```

## Radio Button Group Two-Way Binding

```js
const choice = new Signal('a');

function createRadioGroup(name, options, signal) {
  return options.map(option =>
    createElement('label', {},
      createElement('input', {
        type: 'radio',
        name,
        value: option.value,
        checked: signal.get() === option.value,
        onchange: () => signal.set(option.value)
      }),
      option.label
    )
  );
}

const radioGroup = createElement('div', {},
  ...createRadioGroup('choice', [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' }
  ], choice)
);

choice.subscribe(() => {
  const inputs = radioGroup.querySelectorAll('input');
  inputs.forEach(input => {
    input.checked = input.value === choice.get();
  });
});
```

## Textarea Two-Way Binding

```js
const note = new Signal('');

const textarea = createElement('textarea', {
  value: note,
  onchange: (e) => note.set(e.target.value)
});

const preview = createElement('div', {
  textContent: note
});

note.subscribe(() => {
  preview.textContent = note.get();
});
```

## Range Slider Two-Way Binding

```js
const volume = new Signal(50);

const slider = createElement('input', {
  type: 'range',
  min: '0',
  max: '100',
  value: volume,
  onchange: (e) => volume.set(parseInt(e.target.value))
});

const volumeDisplay = createElement('span', {
  textContent: volume.get() + '%'
});

volume.subscribe(() => {
  slider.value = volume.get();
  volumeDisplay.textContent = volume.get() + '%';
});
```

## Conditional Two-Way Binding

Bind different inputs based on state:

```js
const bindingType = new Signal('text'); // 'text' | 'checkbox' | 'select'
const value = new Signal('');

function createInput() {
  const type = bindingType.get();

  if (type === 'text') {
    return createElement('input', {
      type: 'text',
      value: value,
      onchange: (e) => value.set(e.target.value)
    });
  } else if (type === 'checkbox') {
    return createElement('input', {
      type: 'checkbox',
      checked: value,
      onchange: (e) => value.set(e.target.checked)
    });
  } else if (type === 'select') {
    return createElement('select', {
      value: value,
      onchange: (e) => value.set(e.target.value)
    },
      createElement('option', {}, 'Option 1'),
      createElement('option', {}, 'Option 2')
    );
  }
}

const input = new Signal(createInput());

bindingType.subscribe(() => {
  input.set(createInput());
});
```

## Syncing Multiple Fields

Update one field based on another:

```js
const firstName = new Signal('');
const lastName = new Signal('');
const fullName = new Signal('');

firstName.subscribe(() => {
  fullName.set(`${firstName.get()} ${lastName.get()}`);
});

lastName.subscribe(() => {
  fullName.set(`${firstName.get()} ${lastName.get()}`);
});

// Also support editing fullName and splitting
fullName.subscribe(() => {
  const parts = fullName.get().split(' ');
  if (parts.length === 2) {
    firstName.set(parts[0]);
    lastName.set(parts[1]);
  }
});

const form = createElement('form', {},
  createElement('input', {
    placeholder: 'First Name',
    value: firstName,
    onchange: (e) => firstName.set(e.target.value)
  }),
  createElement('input', {
    placeholder: 'Last Name',
    value: lastName,
    onchange: (e) => lastName.set(e.target.value)
  }),
  createElement('input', {
    placeholder: 'Full Name',
    value: fullName,
    onchange: (e) => fullName.set(e.target.value)
  })
);
```

## Performance: Avoid Circular Updates

Be careful with circular bindings to prevent loops:

```js
// ❌ AVOID - can create loops
const a = new Signal('a');
const b = new Signal('b');

a.subscribe(() => b.set(a.get()));
b.subscribe(() => a.set(b.get()));

a.set('x'); // Infinite loop!

// ✓ GOOD - one-directional flow
const source = new Signal('a');
const derived = new Signal(source.get());

source.subscribe(() => {
  derived.set(source.get());
});
// derived doesn't update source
```
