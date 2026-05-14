# Lazy Rendering

Deferring DOM creation until needed to improve performance and reduce memory usage.

## Render on Demand

Only create elements when they become visible:

```js
function LazyTabs({ tabs }) {
  const activeTab = new Signal(0);
  const renderedTabs = new Signal(new Set([0])); // Track which tabs have been rendered

  function getTabContent(index) {
    const rendered = renderedTabs.get();
    if (!rendered.has(index)) {
      const newSet = new Set(rendered);
      newSet.add(index);
      renderedTabs.set(newSet);
    }

    if (activeTab.get() === index) {
      return tabs[index].render(); // Call render function only when needed
    }
    return null;
  }

  return createElement('div', {},
    createElement('nav', {},
      ...tabs.map((tab, i) =>
        createElement('button', {
          onclick: () => activeTab.set(i),
          attributes: { class: activeTab.get() === i ? 'active' : '' }
        }, tab.label)
      )
    ),
    createElement('div', {},
      ...tabs.map((_, i) => getTabContent(i))
    )
  );
}

// Usage
const tabs = [
  { label: 'Tab 1', render: () => createElement('div', {}, 'Tab 1 expensive content') },
  { label: 'Tab 2', render: () => createElement('div', {}, 'Tab 2 expensive content') }
];

const app = LazyTabs({ tabs });
```

## Virtual Scrolling

Only render visible list items:

```js
function VirtualList({ items, itemHeight = 30, containerHeight = 300 }) {
  const scrollTop = new Signal(0);

  function getVisibleRange() {
    const top = scrollTop.get();
    const bottom = top + containerHeight;
    const startIndex = Math.floor(top / itemHeight);
    const endIndex = Math.ceil(bottom / itemHeight);
    return [startIndex, Math.min(endIndex, items.length)];
  }

  function renderVisibleItems() {
    const [start, end] = getVisibleRange();
    const offsetTop = start * itemHeight;

    return createElement('div', {
      style: { paddingTop: offsetTop }
    },
      ...items.slice(start, end).map((item, i) =>
        createElement('div', {
          style: { height: itemHeight }
        }, item)
      )
    );
  }

  const visibleContent = new Signal(renderVisibleItems());

  return createElement('div', {
    style: { height: containerHeight, overflow: 'auto' },
    onscroll: (e) => {
      scrollTop.set(e.target.scrollTop);
      visibleContent.set(renderVisibleItems());
    }
  }, visibleContent);
}
```

## Intersection Observer

Render when element enters viewport:

```js
function LazyImage({ src, alt }) {
  const isVisible = new Signal(false);
  const img = createElement('img', {
    alt,
    style: { opacity: isVisible ? 1 : 0 }
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        img.src = src;
        isVisible.set(true);
        observer.unobserve(img);
      }
    });
  });

  observer.observe(img);

  return img;
}

function LazySection({ render }) {
  const isVisible = new Signal(false);
  const content = new Signal(null);
  const container = createElement('div', {});

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !isVisible.get()) {
        isVisible.set(true);
        content.set(render());
        observer.unobserve(container);
      }
    });
  });

  observer.observe(container);

  return createElement('div', {},
    container,
    content
  );
}
```

## Progressive Rendering

Render critical content first, then enhance:

```js
function App() {
  const isMounted = new Signal(false);
  const isDeferredReady = new Signal(false);

  setTimeout(() => {
    isMounted.set(true);
  }, 0);

  setTimeout(() => {
    isDeferredReady.set(true);
  }, 1000);

  return createElement('div', {},
    // Always render
    Header(),
    
    // Render after mount
    isMounted.get() ? MainContent() : null,
    
    // Render after deferred delay
    isDeferredReady.get() ? ExpensiveFeature() : null
  );
}
```

## Pagination Instead of Infinite Scroll

Render pages on demand:

```js
function PaginatedList({ allItems, itemsPerPage = 20 }) {
  const currentPage = new Signal(0);

  function getPageItems() {
    const start = currentPage.get() * itemsPerPage;
    const end = start + itemsPerPage;
    return allItems.slice(start, end);
  }

  const visibleItems = new Signal(getPageItems());

  currentPage.subscribe(() => {
    visibleItems.set(getPageItems());
  });

  return createElement('div', {},
    createElement('ul', {},
      ...visibleItems.get().map(item => createElement('li', {}, item))
    ),
    createElement('button', {
      onclick: () => currentPage.set(currentPage.get() + 1),
      disabled: (currentPage.get() + 1) * itemsPerPage >= allItems.length
    }, 'Load More')
  );
}
```

## Delayed Rendering

Render after a timeout to unblock the main thread:

```js
function withLazyRender(Component, delay = 0) {
  return (props) => {
    const isReady = new Signal(delay === 0);

    if (delay > 0) {
      setTimeout(() => isReady.set(true), delay);
    }

    return isReady.get() ? Component(props) : createElement('div', {}, 'Loading...');
  };
}

const LazyComponent = withLazyRender(ExpensiveComponent, 100);
```

## Request Idle Callback

Render when browser is idle:

```js
function withIdleRender(Component) {
  return (props) => {
    const isReady = new Signal(false);

    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => isReady.set(true));
    } else {
      // Fallback
      setTimeout(() => isReady.set(true), 0);
    }

    return isReady.get() ? Component(props) : createElement('div', {}, 'Loading...');
  };
}
```

## Memory Cleanup

Clean up elements you're not rendering:

```js
function LazyModal() {
  const isOpen = new Signal(false);
  let modalElement = null;

  const toggle = () => {
    if (!isOpen.get()) {
      // Create element on open
      modalElement = createElement('div', { attributes: { class: 'modal' } }, 'Modal content');
      document.body.appendChild(modalElement);
      isOpen.set(true);
    } else {
      // Remove element on close
      modalElement?.remove();
      modalElement = null;
      isOpen.set(false);
    }
  };

  return createElement('button', { onclick: toggle }, 'Toggle Modal');
}
```

## Performance Considerations

**Virtual Scrolling** is best for:
- Long lists (100+ items)
- Items with complex content
- Smooth scrolling requirement

**Pagination** is better for:
- Clear page boundaries
- API-paginated data
- Predictable load times

**Lazy Tabs** works well for:
- Heavy per-tab content
- Few tabs (avoid lazy with 20+ tabs)
- User doesn't switch tabs frequently

**Intersection Observer** is ideal for:
- Images and media
- Below-the-fold content
- Tracking analytics
