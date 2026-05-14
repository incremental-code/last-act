# Zero vs React

Side-by-side comparison of Zero patterns and their React equivalents.

## Signals vs useState

**React:**
```js
const [count, setCount] = useState(0);
```

**Zero:**
```js
const count = new Signal(0);
```

The key difference: React's `useState` hooks into a component lifecycle. Zero's signals are independent reactive values.

## Updating State

**React:**
```js
<button onClick={() => setCount(count + 1)}>Increment</button>
```

**Zero:**
```js
h('button', { onclick: () => count.set(count.get() + 1) }, 'Increment')
```

## Derived Values (useCallback / useMemo)

**React:**
```js
const [firstName, setFirstName] = useState('John');
const [lastName, setLastName] = useState('Doe');

const fullName = useMemo(
  () => `${firstName} ${lastName}`,
  [firstName, lastName]
);
```

**Zero:**
```js
const firstName = new Signal('John');
const lastName = new Signal('Doe');

const fullName = new Signal(`${firstName.get()} ${lastName.get()}`);

firstName.subscribe(() => {
  fullName.set(`${firstName.get()} ${lastName.get()}`);
});

lastName.subscribe(() => {
  fullName.set(`${firstName.get()} ${lastName.get()}`);
});
```

Or with a helper:
```js
function computed(fn, deps) {
  const signal = new Signal(fn());
  deps.forEach(dep => {
    dep.subscribe(() => signal.set(fn()));
  });
  return signal;
}

const fullName = computed(
  () => `${firstName.get()} ${lastName.get()}`,
  [firstName, lastName]
);
```

## Side Effects (useEffect)

### Basic Setup/Cleanup

**React:**
```js
useEffect(() => {
  console.log('Component mounted');
  
  return () => {
    console.log('Component unmounting');
  };
}, []);
```

**Zero:**
```js
function MyComponent() {
  const container = h('div', {}, 'Content');
  
  console.log('Component created');
  
  const originalRemove = container.remove;
  container.remove = function() {
    console.log('Component removing');
    originalRemove.call(this);
  };
  
  return container;
}
```

### Effect Depending on Prop

**React:**
```js
const [user, setUser] = useState(null);

useEffect(() => {
  fetch(`/api/users/${userId}`)
    .then(r => r.json())
    .then(setUser);
}, [userId]);
```

**Zero:**
```js
const userId = new Signal(1);
const user = new Signal(null);

userId.subscribe(async () => {
  const response = await fetch(`/api/users/${userId.get()}`);
  const data = await response.json();
  user.set(data);
});
```

### Effect with Cleanup

**React:**
```js
useEffect(() => {
  const handleResize = () => setWidth(window.innerWidth);
  window.addEventListener('resize', handleResize);
  
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

**Zero:**
```js
const windowWidth = new Signal(window.innerWidth);

const handleResize = () => {
  windowWidth.set(window.innerWidth);
};

window.addEventListener('resize', handleResize);

const container = h('div', {}, 'Content');

const originalRemove = container.remove;
container.remove = function() {
  window.removeEventListener('resize', handleResize);
  originalRemove.call(this);
};

return container;
```

### Multiple Effects

**React:**
```js
useEffect(() => {
  // Setup A
  return () => {
    // Cleanup A
  };
}, [dep1]);

useEffect(() => {
  // Setup B
  return () => {
    // Cleanup B
  };
}, [dep2]);
```

**Zero:**
```js
const cleanups = [];

// Setup A
const unsubscribe1 = dep1.subscribe(() => {
  // Effect A
});
cleanups.push(() => unsubscribe1());

// Setup B
const unsubscribe2 = dep2.subscribe(() => {
  // Effect B
});
cleanups.push(() => unsubscribe2());

const container = h('div', {}, 'Content');

const originalRemove = container.remove;
container.remove = function() {
  cleanups.reverse().forEach(cleanup => cleanup());
  originalRemove.call(this);
};
```

## Conditional Rendering

**React:**
```js
return (
  <div>
    {isVisible && <div>Content</div>}
  </div>
);
```

**Zero:**
```js
const isVisible = new Signal(true);

h('div', {},
  isVisible.get() ? h('div', {}, 'Content') : null
)
```

Or with reactive updates:
```js
function renderContent() {
  return isVisible.get() ? h('div', {}, 'Content') : null;
}

const content = new Signal(renderContent());

isVisible.subscribe(() => {
  content.set(renderContent());
});

h('div', {}, content)
```

## Component Props

**React:**
```js
function Button({ label, onClick }) {
  return <button onClick={onClick}>{label}</button>;
}

function App() {
  const [count, setCount] = useState(0);
  return <Button label={count} onClick={() => setCount(count + 1)} />;
}
```

**Zero:**
```js
function Button({ label, onclick }) {
  return h('button', { onclick }, label);
}

function App() {
  const count = new Signal(0);
  return Button({ label: count.get(), onclick: () => count.set(count.get() + 1) });
}
```

Or pass signal directly:
```js
function Button({ label, onclick }) {
  return h('button', { onclick, textContent: label });
}

function App() {
  const count = new Signal(0);
  return Button({ label: count, onclick: () => count.set(count.get() + 1) });
}
```

## Form Handling

**React:**
```js
const [email, setEmail] = useState('');
const [errors, setErrors] = useState({});

const validateEmail = (value) => {
  if (!value.includes('@')) return 'Invalid email';
  return '';
};

useEffect(() => {
  setErrors({ email: validateEmail(email) });
}, [email]);

return (
  <input 
    value={email} 
    onChange={(e) => setEmail(e.target.value)} 
  />
);
```

**Zero:**
```js
const email = new Signal('');
const emailError = new Signal('');

function validateEmail(value) {
  if (!value.includes('@')) return 'Invalid email';
  return '';
}

email.subscribe((value) => {
  emailError.set(validateEmail(value));
});

h('input', {
  value: email,
  onchange: (e) => email.set(e.target.value)
})
```

## List Rendering

**React:**
```js
const [items, setItems] = useState([
  { id: 1, name: 'A' },
  { id: 2, name: 'B' }
]);

return (
  <ul>
    {items.map(item => (
      <li key={item.id}>{item.name}</li>
    ))}
  </ul>
);
```

**Zero:**
```js
const items = new Signal([
  { id: 1, name: 'A' },
  { id: 2, name: 'B' }
]);

function renderItem(item) {
  return h('li', {}, item.name);
}

function renderItems() {
  return items.get().map(renderItem);
}

const itemElements = new Signal(renderItems());

items.subscribe(() => {
  itemElements.set(renderItems());
});

h('ul', {}, itemElements)
```

## Global State (Context)

**React:**
```js
const ThemeContext = createContext();

function App() {
  const [theme, setTheme] = useState('light');
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Header />
      <Main />
    </ThemeContext.Provider>
  );
}

function Header() {
  const { theme, setTheme } = useContext(ThemeContext);
  return <header>{theme}</header>;
}
```

**Zero:**
```js
// store.js
export const theme = new Signal('light');

// components.js
import { theme } from './store.js';

function Header() {
  return h('header', { textContent: theme });
}

function App() {
  return h('div', {},
    Header(),
    h('button', { onclick: () => theme.set(theme.get() === 'light' ? 'dark' : 'light') }, 'Toggle')
  );
}
```

## Memoization

**React:**
```js
const memoizedValue = useMemo(() => {
  return expensiveComputation(a, b);
}, [a, b]);
```

**Zero:**
```js
let cachedResult = null;
let cachedDeps = null;

function getMemoized() {
  const deps = [a.get(), b.get()];
  
  if (cachedDeps && JSON.stringify(deps) === JSON.stringify(cachedDeps)) {
    return cachedResult;
  }
  
  cachedDeps = deps;
  cachedResult = expensiveComputation(a.get(), b.get());
  return cachedResult;
}

const result = new Signal(getMemoized());

a.subscribe(() => result.set(getMemoized()));
b.subscribe(() => result.set(getMemoized()));
```

## Debouncing

**React:**
```js
const [query, setQuery] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    performSearch(query);
  }, 300);
  
  return () => clearTimeout(timer);
}, [query]);
```

**Zero:**
```js
const query = new Signal('');
let debounceTimer = null;

query.subscribe(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    performSearch(query.get());
  }, 300);
});
```

## Component Lifecycle (useEffect with empty deps)

**React:**
```js
useEffect(() => {
  console.log('Component mounted');
  return () => console.log('Component unmounting');
}, []);
```

**Zero:**
```js
function MyComponent() {
  const element = h('div', {}, 'Content');
  
  console.log('Component created');
  
  const originalRemove = element.remove;
  element.remove = function() {
    console.log('Component removing');
    originalRemove.call(this);
  };
  
  return element;
}
```

## Async Operations

**React:**
```js
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  const abortController = new AbortController();
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(url, { signal: abortController.signal });
      setData(await response.json());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };
  
  fetchData();
  
  return () => abortController.abort();
}, [url]);
```

**Zero:**
```js
const data = new Signal(null);
const loading = new Signal(false);
const error = new Signal(null);
let abortController = null;

const url = new Signal('/api/data');

url.subscribe(async () => {
  loading.set(true);
  error.set(null);
  abortController = new AbortController();
  
  try {
    const response = await fetch(url.get(), { signal: abortController.signal });
    data.set(await response.json());
  } catch (err) {
    if (err.name !== 'AbortError') {
      error.set(err);
    }
  } finally {
    loading.set(false);
  }
});

const container = h('div', {}, 'Content');

const originalRemove = container.remove;
container.remove = function() {
  abortController?.abort();
  originalRemove.call(this);
};
```

## Key Differences Summary

| Aspect | React | Zero |
|--------|-------|------|
| **State** | `useState` hooks | `Signal` objects |
| **Re-renders** | Automatic on state change | Only updates that signal | Direct DOM updates |
| **Side Effects** | `useEffect` hook | Subscribe to signals |
| **Cleanup** | Return function from effect | Override `.remove()` |
| **Derived State** | `useMemo` + deps array | Subscribe and update |
| **Memoization** | `useMemo` / `useCallback` | Manual caching |
| **Context** | Context API | Module-level signals |
| **Performance** | Virtual DOM diffing | Direct DOM mutation |
| **Component Props** | Automatic re-render | Pass signals directly |
| **Lists** | JSX `.map()` | Signal of elements |

## When Zero is Better

- Simple UIs with reactive values
- Fewer dependencies and smaller bundle
- Direct DOM manipulation preferred
- Less boilerplate for state management
- Performance sensitive (no vDOM overhead)

## When React is Better

- Complex component hierarchies
- Automatic optimization (memoization, batching)
- Large ecosystem and libraries
- Team familiarity with hooks
- Server-side rendering needed
