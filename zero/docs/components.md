# Components

Components are functions that return DOM elements. Zero supports both plain HTML elements and custom components.

## Function Components

A component is any function that returns an element.

```js
function Button({ label, onclick }) {
  return createElement('button', { onclick }, label);
}

const btn = Button({ label: 'Click me', onclick: () => console.log('clicked') });
```

## Props

Props are passed as an object to the component. Inside the component, you have full access to all prop values.

```js
function Card({ title, content }) {
  return createElement('div', {
    attributes: { class: 'card' }
  },
    createElement('h2', {}, title),
    createElement('p', {}, content)
  );
}

const card = Card({
  title: 'Welcome',
  content: 'This is the card content'
});
```

## Props with Signals

Pass signals as props and the component will have reactive values.

```js
const isLoading = new Signal(false);

function LoadingButton({ loading, onClick }) {
  return createElement('button', {
    disabled: loading,
    onclick: onClick
  },
    loading ? 'Loading...' : 'Click me'
  );
}

const btn = LoadingButton({
  loading: isLoading,
  onClick: () => { /* ... */ }
});

isLoading.set(true);  // Button updates
```

## Rendering Elements

Inside a component, use `createElement` (or `h` if you alias it) to create elements. Children are passed after the props.

```js
function List({ title, items }) {
  return createElement('div', {},
    createElement('h1', {}, title),
    createElement('ul', {},
      ...items.map(item => 
        createElement('li', {}, item)
      )
    )
  );
}
```

## Array Children Pattern

For dynamic lists, create elements from items and pass them as a signal:

```js
const items = new Signal([
  { id: 1, name: 'Apple' },
  { id: 2, name: 'Banana' }
]);

function renderItem(item) {
  return createElement('div', {
    attributes: { class: 'item' }
  }, item.name);
}

function renderItems() {
  return items.get().map(renderItem);
}

const itemElements = new Signal(renderItems());

// Update the list when items change
items.subscribe(() => {
  itemElements.set(renderItems());
});

const list = createElement('div', {}, itemElements);
```

## No Component State

Components render once—there's no `useState` or re-renders. Use signals for state outside the component, or create internal signals if needed.

```js
function Counter() {
  const count = new Signal(0);
  
  return createElement('div', {},
    createElement('p', {}, 'Count: '),
    createElement('span', { textContent: count }),
    createElement('button', {
      onclick: () => count.set(count.get() + 1)
    }, 'Increment')
  );
}
```

## JSX Support

When transpiled, Zero supports JSX syntax:

```jsx
function Button({ label, onclick }) {
  return <button onclick={onclick}>{label}</button>;
}

const btn = <Button label="Click" onclick={() => alert('hi')} />;
```

This requires a transpiler to convert JSX to `createElement` calls.
