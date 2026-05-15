# Conditionals

Showing and hiding elements based on state.

## Simple If/Else

For static conditions at render time, use ternary operators:

```js
const isLoggedIn = new Signal(true);

function renderHeader() {
  return isLoggedIn.get() 
    ? createElement('div', {}, 'Welcome back!')
    : createElement('div', {}, 'Please log in');
}

const header = renderHeader();
```

## Conditional with Reactive Updates

To show/hide elements when state changes, use `computed()` — its value can be a DOM element, and Zero will swap the rendered node in place:

```js
const isVisible = new Signal(true);

const content = computed(() =>
  isVisible.get()
    ? createElement('div', {}, 'Content is visible')
    : null
);

const app = createElement('div', {},
  createElement('button', {
    onclick: () => isVisible.set(!isVisible.get())
  }, 'Toggle'),
  content
);
```

## Toggle Display

```js
const isOpen = new Signal(false);

const dropdown = createElement('div', {},
  createElement('button', {
    onclick: () => isOpen.set(!isOpen.get())
  }, 'Menu'),
  createElement('div', {
    style: { display: isOpen.get() ? 'block' : 'none' }
  },
    'Option 1',
    'Option 2'
  )
);

isOpen.subscribe(() => {
  const menu = dropdown.querySelector('div:last-child');
  menu.style.display = isOpen.get() ? 'block' : 'none';
});
```

## Multiple Conditions

`computed()` auto-tracks every signal it reads — you don't need to list them:

```js
const status = new Signal('loading'); // 'loading' | 'success' | 'error'
const data = new Signal(null);
const error = new Signal(null);

const content = computed(() => {
  switch (status.get()) {
    case 'loading':
      return createElement('div', {}, 'Loading...');
    case 'success':
      return createElement('div', {}, 'Data: ', JSON.stringify(data.get()));
    case 'error':
      return createElement('div', { attributes: { class: 'error' } }, error.get());
  }
});

const app = createElement('div', {}, content);
```

## Switch/Case Pattern

```js
const tab = new Signal('home'); // 'home' | 'about' | 'contact'

const tabContent = computed(() => {
  switch (tab.get()) {
    case 'home':    return createElement('div', {}, 'Home content');
    case 'about':   return createElement('div', {}, 'About content');
    case 'contact': return createElement('div', {}, 'Contact content');
    default:        return null;
  }
});

const app = createElement('div', {},
  createElement('nav', {},
    createElement('button', { onclick: () => tab.set('home') }, 'Home'),
    createElement('button', { onclick: () => tab.set('about') }, 'About'),
    createElement('button', { onclick: () => tab.set('contact') }, 'Contact')
  ),
  tabContent
);
```

## Class Toggling

Use `computed()` to derive the class from state:

```js
const isActive = new Signal(false);
const className = computed(() => isActive.get() ? 'active' : 'inactive');

const button = createElement('button', {
  attributes: { class: className },
  onclick: () => isActive.set(!isActive.get())
}, 'Toggle');
```

## Optional Element

```js
const showDetail = new Signal(false);

const detail = computed(() =>
  showDetail.get() ? createElement('div', {}, 'Details...') : null
);

const app = createElement('div', {},
  createElement('button', {
    onclick: () => showDetail.set(!showDetail.get())
  }, 'Show Details'),
  detail
);
```

## Conditional Attributes

```js
const isDisabled = new Signal(false);

const button = createElement('button', {
  disabled: isDisabled
}, 'Click me');

isDisabled.subscribe(() => {
  button.disabled = isDisabled.get();
});
```

## Rendering Lists Conditionally

```js
const items = new Signal([]);

const content = computed(() => {
  const list = items.get();
  if (list.length === 0) {
    return createElement('div', {}, 'No items');
  }
  return createElement('ul', {},
    ...list.map(item => createElement('li', {}, item))
  );
});

const app = createElement('div', {}, content);
```
