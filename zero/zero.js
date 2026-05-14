class Signal {
  constructor(value) {
    this.value = value;
    this.subscribers = new Set();
  }

  get() {
    return this.value;
  }

  set(newValue) {
    if (this.value !== newValue) {
      this.value = newValue;
      this.subscribers.forEach(cb => cb(newValue));
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
}

function isSignal(value) {
  return value instanceof Signal;
}

function createElement(type, props = {}, ...children) {
  let element;

  if (typeof type === 'string') {
    element = document.createElement(type);
  } else if (typeof type === 'function') {
    return type(props);
  } else {
    throw new Error(`Invalid element type: ${type}`);
  }

  const propsProxy = new Proxy(props, {
    get(target, prop) {
      const value = target[prop];
      return isSignal(value) ? value.get() : value;
    },
  });

  // Set properties on the element
  for (const [key, value] of Object.entries(props)) {
    setProperty(element, key, value, propsProxy);
  }

  // Handle children
  const flatChildren = children.flat();
  for (const child of flatChildren) {
    if (child != null) {
      if (typeof child === 'string' || typeof child === 'number') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof HTMLElement) {
        element.appendChild(child);
      } else if (isSignal(child)) {
        // Check if signal contains an array or scalar value
        if (Array.isArray(child.value)) {
          renderArray(element, child, props.key);
        } else {
          // Handle scalar signal - create text node and update on changes
          const textNode = document.createTextNode(child.get());
          element.appendChild(textNode);
          child.subscribe((newValue) => {
            textNode.nodeValue = newValue;
          });
        }
      }
    }
  }

  return element;
}

function setProperty(element, key, value, propsProxy) {
  if (key === 'key' || key === 'children') return;

  if (key === 'attributes' && typeof value === 'object') {
    for (const [attrKey, attrValue] of Object.entries(value)) {
      if (isSignal(attrValue)) {
        const signal = attrValue;
        const updateAttr = () => {
          element.setAttribute(attrKey, signal.get());
        };
        updateAttr();
        signal.subscribe(updateAttr);
      } else {
        element.setAttribute(attrKey, attrValue);
      }
    }
    return;
  }

  if (key === 'style' && typeof value === 'object') {
    for (const [styleKey, styleValue] of Object.entries(value)) {
      if (isSignal(styleValue)) {
        const signal = styleValue;
        const updateStyle = () => {
          element.style[styleKey] = signal.get();
        };
        updateStyle();
        signal.subscribe(updateStyle);
      } else {
        element.style[styleKey] = styleValue;
      }
    }
    return;
  }

  if (isSignal(value)) {
    const signal = value;
    const updateProperty = () => {
      const currentValue = signal.get();
      try {
        element[key] = currentValue;
      } catch (e) {
        console.warn(`Could not set property ${key}:`, e);
      }
    };

    updateProperty();
    signal.subscribe(updateProperty);
  } else if (typeof value === 'function') {
    element[key] = value;
  } else {
    try {
      element[key] = value;
    } catch (e) {
      console.warn(`Could not set property ${key}:`, e);
    }
  }
}


function renderArray(container, arraySignal, keyFn) {
  let domMap = new Map(); // Maps key -> DOM node

  const render = () => {
    const array = arraySignal.get();
    const newMap = new Map(); // Maps key -> DOM node for current render

    if (!Array.isArray(array)) {
      container.textContent = '';
      domMap.clear();
      return;
    }

    // Build keysInOrder and track what items exist
    const keysInOrder = [];
    const itemsByKey = new Map();

    array.forEach((item, index) => {
      const key = keyFn ? keyFn(item) : index;
      keysInOrder.push(key);
      itemsByKey.set(key, item);
    });

    // Remove nodes that are no longer in the array
    for (const [key, domNode] of domMap) {
      if (!itemsByKey.has(key)) {
        domNode.remove();
      }
    }

    // Reorder and insert nodes
    let lastNode = null;
    for (const key of keysInOrder) {
      let domNode = domMap.get(key);

      if (!domNode) {
        const item = itemsByKey.get(key);
        domNode = typeof item === 'object' && item instanceof HTMLElement ? item : document.createTextNode(item);
      }

      if (domNode.parentNode !== container) {
        if (lastNode) {
          container.insertBefore(domNode, lastNode.nextSibling);
        } else {
          container.insertBefore(domNode, container.firstChild);
        }
      } else if (lastNode && lastNode.nextSibling !== domNode) {
        container.insertBefore(domNode, lastNode.nextSibling);
      }

      newMap.set(key, domNode);
      lastNode = domNode;
    }

    domMap = newMap;
  };

  render();
  arraySignal.subscribe(render);
}

export { Signal, createElement };
