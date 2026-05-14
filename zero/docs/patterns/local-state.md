# Local State

Managing state within a component or isolated scope.

## Counter Component

The simplest local state pattern—a signal created within a component:

```js
function Counter() {
  const count = new Signal(0);

  return createElement('div', {},
    createElement('p', {}, 'Count: ', count),
    createElement('button', {
      onclick: () => count.set(count.get() + 1)
    }, 'Increment')
  );
}

const counter = Counter();
document.body.appendChild(counter);
```

## Toggle Component

```js
function Toggle({ initialState = false }) {
  const isOpen = new Signal(initialState);

  return createElement('div', {},
    createElement('button', {
      onclick: () => isOpen.set(!isOpen.get()),
      textContent: isOpen.get() ? 'Close' : 'Open'
    }),
    createElement('div', {
      style: { display: isOpen.get() ? 'block' : 'none' }
    }, 'Collapsed content')
  );
}
```

## Form Component

```js
function LoginForm() {
  const email = new Signal('');
  const password = new Signal('');
  const errors = new Signal({});

  function handleSubmit(e) {
    e.preventDefault();
    
    const newErrors = {};
    if (!email.get()) newErrors.email = 'Email required';
    if (!password.get()) newErrors.password = 'Password required';
    
    errors.set(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      console.log('Form submitted:', { email: email.get(), password: password.get() });
      email.set('');
      password.set('');
    }
  }

  return createElement('form', { onsubmit: handleSubmit },
    createElement('div', {},
      createElement('label', {}, 'Email'),
      createElement('input', {
        type: 'email',
        value: email,
        onchange: (e) => email.set(e.target.value)
      }),
      errors.get().email ? createElement('span', { attributes: { class: 'error' } }, errors.get().email) : null
    ),
    createElement('div', {},
      createElement('label', {}, 'Password'),
      createElement('input', {
        type: 'password',
        value: password,
        onchange: (e) => password.set(e.target.value)
      }),
      errors.get().password ? createElement('span', { attributes: { class: 'error' } }, errors.get().password) : null
    ),
    createElement('button', { type: 'submit' }, 'Login')
  );
}
```

## Modal Component

```js
function Modal({ title, onClose }) {
  const isOpen = new Signal(true);

  function close() {
    isOpen.set(false);
    onClose?.();
  }

  return createElement('div', {
    style: { display: isOpen.get() ? 'block' : 'none' }
  },
    createElement('div', { attributes: { class: 'modal-overlay' }, onclick: close }),
    createElement('div', { attributes: { class: 'modal' } },
      createElement('h2', {}, title),
      createElement('button', { onclick: close }, 'Close')
    )
  );
}
```

## Tabs Component

```js
function Tabs({ tabs }) {
  const activeTab = new Signal(0);

  function renderTab(index) {
    return activeTab.get() === index ? createElement('div', {}, tabs[index].content) : null;
  }

  const tabElements = tabs.map((_, index) => 
    createElement('div', {}, renderTab(index))
  );

  activeTab.subscribe(() => {
    tabs.forEach((_, index) => {
      const tabDiv = tabElements[index];
      tabDiv.innerHTML = activeTab.get() === index ? tabs[index].content : '';
    });
  });

  return createElement('div', {},
    createElement('div', { attributes: { class: 'tabs-nav' } },
      ...tabs.map((tab, index) =>
        createElement('button', {
          onclick: () => activeTab.set(index),
          attributes: { class: activeTab.get() === index ? 'active' : '' }
        }, tab.label)
      )
    ),
    createElement('div', { attributes: { class: 'tabs-content' } }, ...tabElements)
  );
}
```

## Dropdown Component

```js
function Dropdown({ label, options }) {
  const isOpen = new Signal(false);
  const selected = new Signal(null);

  return createElement('div', { attributes: { class: 'dropdown' } },
    createElement('button', {
      onclick: () => isOpen.set(!isOpen.get())
    }, label),
    createElement('ul', {
      style: { display: isOpen.get() ? 'block' : 'none' }
    },
      ...options.map(option =>
        createElement('li', {
          onclick: () => {
            selected.set(option);
            isOpen.set(false);
          }
        }, option)
      )
    ),
    selected ? createElement('p', {}, 'Selected: ', selected) : null
  );
}
```

## Pagination Component

```js
function Pagination({ items, itemsPerPage = 10 }) {
  const currentPage = new Signal(0);
  
  function getTotalPages() {
    return Math.ceil(items.length / itemsPerPage);
  }

  function getCurrentItems() {
    const start = currentPage.get() * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }

  return createElement('div', {},
    createElement('ul', {},
      ...getCurrentItems().map(item => createElement('li', {}, item))
    ),
    createElement('div', { attributes: { class: 'pagination' } },
      createElement('button', {
        disabled: currentPage.get() === 0,
        onclick: () => currentPage.set(Math.max(0, currentPage.get() - 1))
      }, 'Previous'),
      createElement('span', {}, `Page ${currentPage.get() + 1} of ${getTotalPages()}`),
      createElement('button', {
        disabled: currentPage.get() >= getTotalPages() - 1,
        onclick: () => currentPage.set(currentPage.get() + 1)
      }, 'Next')
    )
  );
}
```

## Accordion Component

```js
function Accordion({ items }) {
  const expandedItems = new Signal(new Set());

  function toggle(index) {
    const current = expandedItems.get();
    if (current.has(index)) {
      current.delete(index);
    } else {
      current.add(index);
    }
    expandedItems.set(new Set(current));
  }

  return createElement('div', { attributes: { class: 'accordion' } },
    ...items.map((item, index) =>
      createElement('div', { attributes: { class: 'accordion-item' } },
        createElement('button', {
          onclick: () => toggle(index)
        }, item.title),
        createElement('div', {
          style: { display: expandedItems.get().has(index) ? 'block' : 'none' }
        }, item.content)
      )
    )
  );
}
```
