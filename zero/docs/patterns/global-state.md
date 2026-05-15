# Global State

Sharing state across multiple components and parts of your application.

## Simple Global Store

Create a module that exports signals:

```js
// store.js
export const user = new Signal(null);
export const notifications = new Signal([]);
export const theme = new Signal('light');

// component.js
import { user, theme } from './store.js';

function Header() {
  return createElement('header', {
    style: { background: theme.get() === 'light' ? 'white' : 'black' }
  },
    user.get() ? `Hello, ${user.get().name}` : 'Not logged in'
  );
}
```

## Store Object Pattern

Encapsulate related state in an object:

```js
// store.js
export const authStore = {
  user: new Signal(null),
  isLoading: new Signal(false),
  error: new Signal(null),

  async login(email, password) {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      this.user.set(data);
    } catch (err) {
      this.error.set(err.message);
    } finally {
      this.isLoading.set(false);
    }
  },

  logout() {
    this.user.set(null);
    this.error.set(null);
  }
};

// Usage
import { authStore } from './store.js';

const loginButton = createElement('button', {
  onclick: () => authStore.login('user@example.com', 'password'),
  disabled: authStore.isLoading
}, 'Login');
```

## Namespace Pattern

Organize global state by feature:

```js
// store.js
export const store = {
  // Auth state
  auth: {
    user: new Signal(null),
    isAuthenticated: new Signal(false)
  },

  // UI state
  ui: {
    sidebarOpen: new Signal(true),
    theme: new Signal('light')
  },

  // App state
  app: {
    items: new Signal([]),
    loading: new Signal(false),
    error: new Signal(null)
  }
};

// component.js
import { store } from './store.js';

function Sidebar() {
  return createElement('aside', {
    style: { display: store.ui.sidebarOpen.get() ? 'block' : 'none' }
  }, '...');
}
```

## Computed Global State

Derive global state from other signals with `computed()`:

```js
import { Signal, computed } from './zero.js';

export const user = new Signal(null);
export const isAdmin = computed(() => user.get()?.role === 'admin');
export const username = computed(() => user.get()?.name || 'Guest');
```

## Context Provider Pattern

Pass state through a component tree:

```js
function App() {
  const theme = new Signal('light');
  const user = new Signal(null);

  return createElement('div', {},
    // Pass signals as props to context-aware components
    Header({ theme, user }),
    Main({ theme, user }),
    Footer({ theme, user })
  );
}

function Header({ theme, user }) {
  return createElement('header', {
    style: { background: theme.get() === 'light' ? 'white' : 'black' }
  }, 'Header');
}
```

## Event Bus Pattern

Communicate between distant components via signals:

```js
// events.js
export const eventBus = {
  itemAdded: new Signal(null),
  itemDeleted: new Signal(null),
  userLoggedIn: new Signal(null),

  emit(signal, value) {
    signal.set(value);
  }
};

// component-a.js
import { eventBus } from './events.js';

function AddItemButton() {
  return createElement('button', {
    onclick: () => {
      eventBus.emit(eventBus.itemAdded, { id: 1, name: 'New Item' });
    }
  }, 'Add Item');
}

// component-b.js
import { eventBus } from './events.js';

function ItemList() {
  const items = new Signal([]);

  eventBus.itemAdded.subscribe((newItem) => {
    if (newItem) {
      const current = items.get();
      items.set([...current, newItem]);
    }
  });

  return createElement('ul', {}, ...items.get().map(item => createElement('li', {}, item.name)));
}
```

## Local Storage Sync

Persist and restore global state:

```js
export const user = new Signal(null);

// Load from localStorage
const stored = localStorage.getItem('user');
if (stored) {
  user.set(JSON.parse(stored));
}

// Save to localStorage when updated
user.subscribe((newUser) => {
  if (newUser) {
    localStorage.setItem('user', JSON.stringify(newUser));
  } else {
    localStorage.removeItem('user');
  }
});
```

## Multiple Store Files

For larger apps, split state by domain:

```
src/
  store/
    auth.js      // user, isAuthenticated, login(), logout()
    ui.js        // theme, sidebarOpen, notifications
    data.js      // items, loading, error
    api.js       // API endpoints and caching
  components/
    Header.js
    Sidebar.js
    MainContent.js
```

## Performance: Selective Subscriptions

Only subscribe to the parts you need:

```js
// ✓ GOOD - only subscribe to theme
const Header = ({ themeStore }) => {
  return createElement('header', {
    style: { background: themeStore.get() === 'light' ? 'white' : 'black' }
  });
};

// ❌ AVOID - subscribing to entire store
const Header = ({ store }) => {
  store.subscribe(() => {
    // Re-render even if other parts changed
  });
};
```

## Notifications with Stable IDs

When rendering a list of notifications, each item needs a stable ID for proper keying:

```js
export const notifications = new Signal([]);
let nextNotificationId = 1;

function addNotification(type, message) {
  const current = notifications.get();
  notifications.set([
    ...current,
    { id: nextNotificationId++, type, message }
  ]);
}

function removeNotification(id) {
  const current = notifications.get();
  notifications.set(current.filter(n => n.id !== id));
}

// In a component: derive the element array from notifications with computed()
const notificationElements = computed(() =>
  notifications.get().map(notif =>
    createElement('div', {
      attributes: {
        class: 'notification',
        'data-id': notif.id  // Store ID for keying
      },
      style: { background: notif.type === 'error' ? '#ffebee' : '#e8f5e9' }
    },
      notif.message,
      createElement('button', {
        onclick: () => removeNotification(notif.id)
      }, '✕')
    )
  )
);

// Use the data attribute in the key function
const notificationList = createElement('div', {
  key: (el) => el.getAttribute('data-id')
}, notificationElements);
```

**Key:** Each notification gets a unique, incrementing ID that persists across renders. The key function uses this ID to track which element corresponds to which notification, ensuring correct removal and reordering.

## Testing Global State

Export a function to reset state:

```js
export function resetStore() {
  user.set(null);
  items.set([]);
  notifications.set([]);
  error.set(null);
}

// In tests
beforeEach(() => {
  resetStore();
});
```
