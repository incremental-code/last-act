# Lifecycle Patterns

Managing setup, cleanup, and lifecycle events in Zero components.

## Setup on Mount

Run code when a component is added to the DOM:

```js
function ComponentWithSetup() {
  const isActive = new Signal(false);
  const container = createElement('div', {}, 'Component');

  // Setup
  isActive.set(true);
  console.log('Component mounted');

  // Cleanup (if removed)
  const originalRemove = container.remove;
  container.remove = function() {
    isActive.set(false);
    console.log('Component unmounted');
    originalRemove.call(this);
  };

  return container;
}
```

## Cleanup on Unmount

Use a cleanup function to remove subscriptions:

```js
function withCleanup(componentFn) {
  return function(...args) {
    const cleanups = [];
    const signal = new Signal(null);

    // Track subscriptions
    const registerCleanup = (fn) => {
      cleanups.push(fn);
    };

    const element = componentFn(...args, registerCleanup);

    // Override remove to cleanup
    const originalRemove = element.remove;
    element.remove = function() {
      cleanups.forEach(cleanup => cleanup());
      cleanups.length = 0;
      if (originalRemove) originalRemove.call(this);
    };

    return element;
  };
}

// Usage
const MyComponent = withCleanup((props, cleanup) => {
  const count = new Signal(0);

  const unsubscribe = count.subscribe(() => {
    console.log('Count changed');
  });

  cleanup(() => unsubscribe());

  return createElement('div', {}, count);
});
```

## Interval Lifecycle

Start and stop intervals:

```js
function Timer() {
  const time = new Signal(0);
  let intervalId = null;

  const container = createElement('div', {},
    createElement('p', {}, 'Time: ', time),
    createElement('button', {
      onclick: () => {
        if (!intervalId) {
          intervalId = setInterval(() => {
            time.set(time.get() + 1);
          }, 1000);
        }
      }
    }, 'Start'),
    createElement('button', {
      onclick: () => {
        clearInterval(intervalId);
        intervalId = null;
      }
    }, 'Stop'),
    createElement('button', {
      onclick: () => {
        time.set(0);
        clearInterval(intervalId);
        intervalId = null;
      }
    }, 'Reset')
  );

  // Cleanup on remove
  const originalRemove = container.remove;
  container.remove = function() {
    clearInterval(intervalId);
    originalRemove.call(this);
  };

  return container;
}
```

## Event Listener Lifecycle

Manage event listeners:

```js
function ResponsiveComponent() {
  const windowWidth = new Signal(window.innerWidth);
  const isMobile = new Signal(window.innerWidth < 768);

  const handleResize = () => {
    windowWidth.set(window.innerWidth);
    isMobile.set(window.innerWidth < 768);
  };

  window.addEventListener('resize', handleResize);

  const container = createElement('div', {},
    createElement('p', {}, isMobile.get() ? 'Mobile' : 'Desktop')
  );

  // Update when width changes
  windowWidth.subscribe(() => {
    container.querySelector('p').textContent = isMobile.get() ? 'Mobile' : 'Desktop';
  });

  // Cleanup
  const originalRemove = container.remove;
  container.remove = function() {
    window.removeEventListener('resize', handleResize);
    originalRemove.call(this);
  };

  return container;
}
```

## Timeout Lifecycle

Manage timeouts:

```js
function DelayedMessage() {
  const message = new Signal('');
  let timeoutId = null;

  const showMessage = () => {
    message.set('');
    timeoutId = setTimeout(() => {
      message.set('Delayed message!');
    }, 2000);
  };

  const container = createElement('div', {},
    createElement('p', {}, message),
    createElement('button', { onclick: showMessage }, 'Show Message')
  );

  // Cleanup
  const originalRemove = container.remove;
  container.remove = function() {
    clearTimeout(timeoutId);
    originalRemove.call(this);
  };

  return container;
}
```

## Fetch Lifecycle

Manage async requests:

```js
function DataFetcher({ url }) {
  const data = new Signal(null);
  const isLoading = new Signal(false);
  const error = new Signal(null);
  let abortController = null;

  const fetch_data = async () => {
    isLoading.set(true);
    error.set(null);

    abortController = new AbortController();

    try {
      const response = await fetch(url, {
        signal: abortController.signal
      });
      const result = await response.json();
      data.set(result);
    } catch (err) {
      if (err.name !== 'AbortError') {
        error.set(err.message);
      }
    } finally {
      isLoading.set(false);
    }
  };

  const container = createElement('div', {},
    createElement('button', { onclick: fetch_data }, 'Fetch'),
    isLoading.get() ? createElement('p', {}, 'Loading...') : null,
    error.get() ? createElement('p', { attributes: { class: 'error' } }, error.get()) : null,
    data.get() ? createElement('pre', {}, JSON.stringify(data.get(), null, 2)) : null
  );

  // Cleanup
  const originalRemove = container.remove;
  container.remove = function() {
    abortController?.abort();
    originalRemove.call(this);
  };

  return container;
}
```

## Animation Lifecycle

Manage animations:

```js
function AnimatedBox() {
  const isOpen = new Signal(false);
  let animationId = null;

  const toggle = () => {
    isOpen.set(!isOpen.get());
  };

  const box = createElement('div', {
    style: {
      width: '100px',
      height: '100px',
      background: 'blue',
      transition: 'all 0.3s ease'
    }
  });

  isOpen.subscribe(() => {
    if (isOpen.get()) {
      box.style.width = '200px';
      box.style.height = '200px';
    } else {
      box.style.width = '100px';
      box.style.height = '100px';
    }
  });

  const container = createElement('div', {},
    box,
    createElement('button', { onclick: toggle }, 'Toggle')
  );

  // Cleanup
  const originalRemove = container.remove;
  container.remove = function() {
    cancelAnimationFrame(animationId);
    originalRemove.call(this);
  };

  return container;
}
```

## Observer Lifecycle

Manage IntersectionObserver, ResizeObserver, etc.:

```js
function ObservedElement() {
  const isVisible = new Signal(false);
  let observer = null;

  const element = createElement('div', {
    style: {
      width: '100px',
      height: '100px',
      background: isVisible.get() ? 'green' : 'red'
    }
  });

  // Setup observer
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      isVisible.set(entry.isIntersecting);
    });
  });

  observer.observe(element);

  // Update color when visibility changes
  isVisible.subscribe(() => {
    element.style.background = isVisible.get() ? 'green' : 'red';
  });

  // Cleanup
  const originalRemove = element.remove;
  element.remove = function() {
    observer?.disconnect();
    originalRemove.call(this);
  };

  return element;
}
```

## Storage Sync Lifecycle

Persist state across sessions:

```js
function PersistentCounter() {
  const count = new Signal(parseInt(localStorage.getItem('count') || '0'));

  const container = createElement('div', {},
    createElement('p', {}, 'Count: ', count),
    createElement('button', {
      onclick: () => count.set(count.get() + 1)
    }, 'Increment')
  );

  // Save to storage
  count.subscribe((value) => {
    localStorage.setItem('count', value);
  });

  // Sync across tabs
  const handleStorageChange = (e) => {
    if (e.key === 'count') {
      count.set(parseInt(e.newValue || '0'));
    }
  };

  window.addEventListener('storage', handleStorageChange);

  // Cleanup
  const originalRemove = container.remove;
  container.remove = function() {
    window.removeEventListener('storage', handleStorageChange);
    originalRemove.call(this);
  };

  return container;
}
```

## Lifecycle Helper

```js
function createComponent(setupFn) {
  return function(...args) {
    const cleanups = [];
    
    const lifecycle = {
      onCleanup: (fn) => cleanups.push(fn)
    };

    const element = setupFn(...args, lifecycle);

    const originalRemove = element.remove || function() {};
    element.remove = function() {
      cleanups.reverse().forEach(cleanup => cleanup());
      if (originalRemove) originalRemove.call(this);
    };

    return element;
  };
}

// Usage
const MyComponent = createComponent((props, { onCleanup }) => {
  const count = new Signal(0);

  const unsubscribe = count.subscribe(() => {
    console.log('Count:', count.get());
  });

  onCleanup(() => unsubscribe());
  onCleanup(() => console.log('Cleaned up MyComponent'));

  return createElement('div', {}, count);
});
```

## Performance: Lifecycle Cleanup

Always clean up:
- **Subscriptions** — Prevent memory leaks
- **Event listeners** — Prevent multiple listeners on elements
- **Timers** — Prevent orphaned intervals/timeouts
- **Observers** — Prevent memory leaks from watching elements
- **Fetch requests** — Abort in-flight requests

Clean up in reverse order of setup to avoid dependency issues.
