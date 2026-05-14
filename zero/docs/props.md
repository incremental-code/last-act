# Props

Props are how you configure elements and pass data to components. In Zero, props are set directly as DOM element properties.

## Setting Properties

Common element properties are set directly:

```js
const div = createElement('div', {
  id: 'myDiv',
  title: 'Hover text',
  hidden: false
});
```

## Style

The `style` prop accepts an object:

```js
const div = createElement('div', {
  style: {
    color: 'red',
    fontSize: '16px',
    backgroundColor: 'blue'
  }
});
```

Style properties use camelCase (not kebab-case like CSS).

## Attributes

For HTML attributes, use the `attributes` object:

```js
const div = createElement('div', {
  attributes: {
    'data-id': '123',
    'aria-label': 'Close button',
    'data-testid': 'my-element'
  }
});
```

This is useful for data attributes, ARIA attributes, and custom attributes.

## Event Handlers

Event handlers are set as properties directly:

```js
const button = createElement('button', {
  onclick: () => console.log('clicked'),
  onmouseover: () => console.log('hover'),
  onchange: (event) => console.log(event.target.value)
});
```

All standard DOM event properties work: `onclick`, `onchange`, `onsubmit`, `onkeydown`, etc.

## Reactive Props with Signals

Pass a signal as a prop value and the element updates when the signal changes.

### Reactive Styles

```js
const color = new Signal('red');

const div = createElement('div', {
  style: { color }
});

color.set('blue');  // div.style.color updates
```

### Reactive Text Content

```js
const message = new Signal('Hello');

const span = createElement('span', {
  textContent: message
});

message.set('World');  // span.textContent updates
```

### Reactive Attributes

```js
const label = new Signal('initial');

const div = createElement('div', {
  attributes: { 'data-value': label }
});

label.set('updated');  // div gets data-value="updated"
```

### Reactive Classes

```js
const isActive = new Signal(false);

const button = createElement('button', {
  attributes: { class: isActive }
});

isActive.set(true);  // button gets class="true"
```

For more complex class logic, manage the class attribute in a derived signal:

```js
const isActive = new Signal(false);
const isLoading = new Signal(false);

function getClasses() {
  const classes = [];
  if (isActive.get()) classes.push('active');
  if (isLoading.get()) classes.push('loading');
  return classes.join(' ');
}

const classSignal = new Signal(getClasses());

isActive.subscribe(() => classSignal.set(getClasses()));
isLoading.subscribe(() => classSignal.set(getClasses()));

const button = createElement('button', {
  attributes: { class: classSignal }
});
```

## Array Children

Pass a signal containing an array to render a list:

```js
const items = new Signal(['a', 'b', 'c']);

const div = createElement('div', {}, items);
// div contains text nodes: 'a', 'b', 'c'

items.set(['a', 'b', 'c', 'd']);
// div automatically updates
```

For more control over list rendering, see the [Components guide](./components.md#array-children-pattern).

## Common Patterns

**Conditional Rendering:**
```js
const showDetail = new Signal(false);

function renderDetail() {
  return showDetail.get() ? createElement('div', {}, 'Details...') : null;
}

const detailSignal = new Signal(renderDetail());
showDetail.subscribe(() => detailSignal.set(renderDetail()));
```

**Disable based on State:**
```js
const isSubmitting = new Signal(false);

const button = createElement('button', {
  disabled: isSubmitting
}, 'Submit');
```

**Dynamic Styles:**
```js
const progress = new Signal(50);

const progressBar = createElement('div', {
  style: {
    width: progress.get() + '%'
  }
});

progress.subscribe(() => {
  progressBar.style.width = progress.get() + '%';
});
```
