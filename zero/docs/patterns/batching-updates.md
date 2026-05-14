# Batching Updates

Grouping multiple signal changes to optimize performance and reduce render cycles.

## Batch Multiple Updates

Execute multiple signal changes with only one notification round:

```js
function batch(fn) {
  // Collect all updates
  const updates = [];
  const originalSubscriptions = new Map();

  // Store original subscribers temporarily
  const originalSet = Signal.prototype.set;
  Signal.prototype.set = function(newValue) {
    if (newValue !== this.value) {
      this.value = newValue;
      updates.push(() => {
        this.subscribers.forEach(cb => cb(newValue));
      });
    }
  };

  try {
    fn();
  } finally {
    // Restore original behavior
    Signal.prototype.set = originalSet;
    
    // Execute all notifications once
    updates.forEach(update => update());
  }
}

// Usage
const firstName = new Signal('John');
const lastName = new Signal('Doe');
const fullName = new Signal('John Doe');

fullName.subscribe(() => {
  console.log('Full name changed:', fullName.get());
});

batch(() => {
  firstName.set('Jane');
  lastName.set('Smith');
  // Only one "Full name changed" log
});
```

## Batch Form Updates

Avoid updating derived state on every keystroke:

```js
const email = new Signal('');
const password = new Signal('');
const formValid = new Signal(false);
const errors = new Signal({});

function validateForm() {
  const newErrors = {};
  if (!email.get().includes('@')) {
    newErrors.email = 'Invalid email';
  }
  if (password.get().length < 8) {
    newErrors.password = 'Password too short';
  }

  errors.set(newErrors);
  formValid.set(Object.keys(newErrors).length === 0);
}

// Batch validation on blur
const emailInput = createElement('input', {
  onchange: (e) => email.set(e.target.value),
  onblur: validateForm
});

const passwordInput = createElement('input', {
  onchange: (e) => password.set(e.target.value),
  onblur: validateForm
});
```

## Batch List Operations

Update a list once instead of item by item:

```js
const items = new Signal([
  { id: 1, name: 'Item 1', selected: false },
  { id: 2, name: 'Item 2', selected: false }
]);

function selectMultiple(ids) {
  const current = items.get();
  const updated = current.map(item => ({
    ...item,
    selected: ids.includes(item.id)
  }));
  items.set(updated); // Single update
}

selectMultiple([1, 2]);
```

## Deferred State Update

Queue updates to happen later:

```js
class DeferredSignal {
  constructor(value) {
    this.signal = new Signal(value);
    this.pendingUpdates = [];
    this.isProcessing = false;
  }

  defer(fn) {
    this.pendingUpdates.push(fn);
  }

  flush() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const updates = this.pendingUpdates;
    this.pendingUpdates = [];

    updates.forEach(fn => fn());

    this.isProcessing = false;
  }

  get() {
    return this.signal.get();
  }

  set(value) {
    this.signal.set(value);
  }
}

// Usage
const todoList = new DeferredSignal([]);

function addTodos(newTodos) {
  const deferred = todoList;
  newTodos.forEach(todo => {
    deferred.defer(() => {
      const current = deferred.get();
      deferred.set([...current, todo]);
    });
  });
  deferred.flush(); // All updates at once
}
```

## Batch API Operations

```js
const selectedIds = new Signal(new Set());
const isDeleting = new Signal(false);

async function deleteSelected() {
  const ids = Array.from(selectedIds.get());
  
  if (ids.length === 0) return;

  isDeleting.set(true);

  try {
    // Delete all items at once
    const response = await fetch('/api/items/delete', {
      method: 'POST',
      body: JSON.stringify({ ids })
    });

    if (response.ok) {
      // Update UI once after all deletions
      batch(() => {
        selectedIds.set(new Set());
        // Update items list
        items.set(items.get().filter(item => !ids.includes(item.id)));
      });
    }
  } finally {
    isDeleting.set(false);
  }
}
```

## Transaction Pattern

Group related updates that should all succeed or all fail:

```js
class Transaction {
  constructor() {
    this.updates = [];
    this.isActive = true;
  }

  update(signal, value) {
    if (!this.isActive) throw new Error('Transaction is closed');
    this.updates.push(() => signal.set(value));
  }

  commit() {
    this.isActive = false;
    this.updates.forEach(update => update());
    this.updates = [];
  }

  rollback() {
    this.isActive = false;
    this.updates = [];
  }
}

// Usage
const user = new Signal(null);
const notifications = new Signal([]);

const transaction = new Transaction();

try {
  transaction.update(user, { name: 'John', email: 'john@example.com' });
  transaction.update(notifications, [{ id: 1, message: 'User created' }]);
  transaction.commit();
} catch (error) {
  transaction.rollback();
  console.error('Transaction failed:', error);
}
```

## Microtask Batch

Use Promise microtasks to batch updates:

```js
class BatchedSignal extends Signal {
  constructor(value) {
    super(value);
    this.isBatching = false;
    this.pendingUpdate = null;
  }

  set(newValue) {
    this.pendingUpdate = newValue;

    if (!this.isBatching) {
      this.isBatching = true;
      
      // Defer to microtask queue
      Promise.resolve().then(() => {
        this.isBatching = false;
        if (this.pendingUpdate !== null) {
          super.set(this.pendingUpdate);
          this.pendingUpdate = null;
        }
      });
    }
  }
}

// Usage
const counter = new BatchedSignal(0);

counter.set(1);
counter.set(2);
counter.set(3);
// Only one notification: value goes to 3
```

## Debounced Batch Updates

Batch updates that occur rapidly:

```js
function createBatchedSignal(initialValue, delay = 0) {
  const signal = new Signal(initialValue);
  let timeoutId = null;
  const pendingUpdates = [];

  return {
    get() {
      return signal.get();
    },

    set(value) {
      pendingUpdates.push(value);

      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Apply last pending update
        signal.set(pendingUpdates[pendingUpdates.length - 1]);
        pendingUpdates.length = 0;
      }, delay);
    },

    subscribe(fn) {
      return signal.subscribe(fn);
    }
  };
}

const searchQuery = createBatchedSignal('', 300);

// Only notifies after 300ms of inactivity
searchQuery.set('a');
searchQuery.set('ab');
searchQuery.set('abc');
// Notifies once with 'abc'
```

## Performance Benefits

Batching helps when:
- **Multiple dependent signals** — Reduces cascading updates
- **High-frequency updates** — Throttles notification calls
- **Complex derivations** — Avoids recomputing multiple times
- **Large lists** — Single DOM update vs many

Batching overhead occurs with:
- **Single signal updates** — Batching mechanism costs more than the update
- **Simple operations** — The batching wrapper is slower than direct update
- **Rare updates** — Complexity isn't justified

Profile before batching. Start with simple updates and batch only hot paths.
