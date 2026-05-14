# Forms

Handling form inputs, validation, and submission with Zero.

## Simple Input Binding

Use signals to track input values:

```js
const email = new Signal('');

const input = createElement('input', {
  value: email,
  onchange: (e) => email.set(e.target.value)
});
```

## Text Input

```js
const username = new Signal('');

const form = createElement('form', {},
  createElement('label', {}, 'Username'),
  createElement('input', {
    type: 'text',
    value: username,
    onchange: (e) => username.set(e.target.value)
  }),
  createElement('p', {}, 'You entered: ', username)
);
```

## Textarea

```js
const message = new Signal('');

const textarea = createElement('textarea', {
  value: message,
  onchange: (e) => message.set(e.target.value)
});
```

## Select Dropdown

```js
const selectedColor = new Signal('red');

const select = createElement('select', {
  value: selectedColor,
  onchange: (e) => selectedColor.set(e.target.value)
},
  createElement('option', { value: 'red' }, 'Red'),
  createElement('option', { value: 'blue' }, 'Blue'),
  createElement('option', { value: 'green' }, 'Green')
);
```

## Checkbox

```js
const agreed = new Signal(false);

const checkbox = createElement('input', {
  type: 'checkbox',
  checked: agreed,
  onchange: (e) => agreed.set(e.target.checked)
});
```

## Radio Buttons

```js
const choice = new Signal('a');

const radios = createElement('div', {},
  createElement('label', {},
    createElement('input', {
      type: 'radio',
      name: 'choice',
      value: 'a',
      checked: choice.get() === 'a',
      onchange: () => choice.set('a')
    }),
    'Option A'
  ),
  createElement('label', {},
    createElement('input', {
      type: 'radio',
      name: 'choice',
      value: 'b',
      checked: choice.get() === 'b',
      onchange: () => choice.set('b')
    }),
    'Option B'
  )
);
```

## Form Submission

```js
const email = new Signal('');
const password = new Signal('');
const isSubmitting = new Signal(false);

function handleSubmit(e) {
  e.preventDefault();
  isSubmitting.set(true);
  
  fetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({
      email: email.get(),
      password: password.get()
    })
  })
    .then(r => r.json())
    .then(data => {
      console.log('Success:', data);
    })
    .catch(err => {
      console.error('Error:', err);
    })
    .finally(() => {
      isSubmitting.set(false);
    });
}

const form = createElement('form', {
  onsubmit: handleSubmit
},
  createElement('input', {
    type: 'email',
    value: email,
    onchange: (e) => email.set(e.target.value),
    disabled: isSubmitting
  }),
  createElement('input', {
    type: 'password',
    value: password,
    onchange: (e) => password.set(e.target.value),
    disabled: isSubmitting
  }),
  createElement('button', {
    type: 'submit',
    disabled: isSubmitting,
    textContent: isSubmitting.get() ? 'Submitting...' : 'Submit'
  })
);

isSubmitting.subscribe(() => {
  const btn = form.querySelector('button');
  btn.textContent = isSubmitting.get() ? 'Submitting...' : 'Submit';
});
```

## Form Validation

```js
const email = new Signal('');
const emailError = new Signal('');

function validateEmail(value) {
  if (!value) return 'Email is required';
  if (!value.includes('@')) return 'Invalid email format';
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
    attributes: { class: 'error' }
  })
);
```

## Multi-Field Form Object

```js
const formData = new Signal({
  name: '',
  email: '',
  message: ''
});

function updateField(field, value) {
  const current = formData.get();
  formData.set({ ...current, [field]: value });
}

const form = createElement('form', {},
  createElement('input', {
    type: 'text',
    placeholder: 'Name',
    value: formData.get().name,
    onchange: (e) => updateField('name', e.target.value)
  }),
  createElement('input', {
    type: 'email',
    placeholder: 'Email',
    value: formData.get().email,
    onchange: (e) => updateField('email', e.target.value)
  }),
  createElement('textarea', {
    placeholder: 'Message',
    value: formData.get().message,
    onchange: (e) => updateField('message', e.target.value)
  })
);
```

## Reset Form

```js
const email = new Signal('');
const password = new Signal('');

function resetForm() {
  email.set('');
  password.set('');
}

const form = createElement('form', {},
  // ... input fields ...
  createElement('button', { type: 'reset', onclick: resetForm }, 'Clear')
);
```
