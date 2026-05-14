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

To show/hide elements when state changes, use a signal to track the rendered element:

```js
const isVisible = new Signal(true);

function renderContent() {
  return isVisible.get()
    ? createElement('div', {}, 'Content is visible')
    : null;
}

const content = new Signal(renderContent());

isVisible.subscribe(() => {
  content.set(renderContent());
});

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

```js
const status = new Signal('loading'); // 'loading' | 'success' | 'error'
const data = new Signal(null);
const error = new Signal(null);

function renderStatus() {
  const s = status.get();
  
  if (s === 'loading') {
    return createElement('div', {}, 'Loading...');
  } else if (s === 'success') {
    return createElement('div', {}, 'Data: ', JSON.stringify(data.get()));
  } else if (s === 'error') {
    return createElement('div', { attributes: { class: 'error' } }, error.get());
  }
}

const content = new Signal(renderStatus());

status.subscribe(() => content.set(renderStatus()));
data.subscribe(() => content.set(renderStatus()));
error.subscribe(() => content.set(renderStatus()));

const app = createElement('div', {}, content);
```

## Switch/Case Pattern

```js
const tab = new Signal('home'); // 'home' | 'about' | 'contact'

function renderTab() {
  switch (tab.get()) {
    case 'home':
      return createElement('div', {}, 'Home content');
    case 'about':
      return createElement('div', {}, 'About content');
    case 'contact':
      return createElement('div', {}, 'Contact content');
    default:
      return null;
  }
}

const tabContent = new Signal(renderTab());

tab.subscribe(() => {
  tabContent.set(renderTab());
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

```js
const isActive = new Signal(false);
const className = new Signal('inactive');

isActive.subscribe(() => {
  className.set(isActive.get() ? 'active' : 'inactive');
});

const button = createElement('button', {
  attributes: { class: className },
  onclick: () => isActive.set(!isActive.get())
}, 'Toggle');
```

## Optional Element

```js
const showDetail = new Signal(false);

function renderDetail() {
  return showDetail.get() ? createElement('div', {}, 'Details...') : null;
}

const detail = new Signal(renderDetail());
showDetail.subscribe(() => detail.set(renderDetail()));

// To render the optional element, check if it exists
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
const isEmpty = new Signal(true);

function renderItems() {
  const list = items.get();
  if (list.length === 0) {
    return createElement('div', {}, 'No items');
  }
  return createElement('ul', {},
    ...list.map(item => createElement('li', {}, item))
  );
}

const content = new Signal(renderItems());

items.subscribe(() => {
  isEmpty.set(items.get().length === 0);
  content.set(renderItems());
});
```
