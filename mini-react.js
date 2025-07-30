// Minimal React-like library
let currentComponent = null;
let hookIndex = 0;
let hooks = [];
let effects = [];
let rootContainer = null;
let rootComponent = null;
let prevVdom = null;

function createDom(node) {
  if (typeof node === 'string' || typeof node === 'number') {
    return document.createTextNode(node);
  }
  const el = document.createElement(node.type);
  if (node.props) {
    for (const [key, value] of Object.entries(node.props)) {
      if (key === 'children') continue;
      if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else {
        el.setAttribute(key, value);
      }
    }
    if (Array.isArray(node.props.children)) {
      node.props.children.forEach(child => {
        el.appendChild(createDom(child));
      });
    } else if (node.props.children) {
      el.appendChild(createDom(node.props.children));
    }
  }
  return el;
}

function runEffects() {
  for (const effect of effects) {
    if (!effect.hasRun || !depsAreSame(effect.deps, effect.lastDeps)) {
      if (effect.cleanup) effect.cleanup();
      effect.cleanup = effect.fn();
      effect.lastDeps = effect.deps ? [...effect.deps] : undefined;
      effect.hasRun = true;
    }
  }
}

function depsAreSame(a, b) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function render(component, container) {
  rootContainer = container;
  rootComponent = component;
  rerender();
}

function updateDom(parent, newNode, oldNode, index = 0) {
  if (!oldNode) {
    parent.appendChild(createDom(newNode));
  } else if (!newNode) {
    parent.removeChild(parent.childNodes[index]);
  } else if (changed(newNode, oldNode)) {
    parent.replaceChild(createDom(newNode), parent.childNodes[index]);
  } else if (newNode.type) {
    // Update props
    updateProps(parent.childNodes[index], newNode.props, oldNode.props);
    // Diff children
    const newChildren = newNode.props?.children || [];
    const oldChildren = oldNode.props?.children || [];
    const max = Math.max(newChildren.length, oldChildren.length);
    for (let i = 0; i < max; i++) {
      updateDom(
        parent.childNodes[index],
        newChildren[i],
        oldChildren[i],
        i
      );
    }
  }
}

function changed(node1, node2) {
  return (
    typeof node1 !== typeof node2 ||
    (typeof node1 === 'string' && node1 !== node2) ||
    node1.type !== node2.type
  );
}

function updateProps(dom, newProps = {}, oldProps = {}) {
  // Remove old or changed event listeners
  for (const name in oldProps) {
    if (name.startsWith('on') && (!newProps[name] || newProps[name] !== oldProps[name])) {
      dom.removeEventListener(name.slice(2).toLowerCase(), oldProps[name]);
    }
  }
  // Set new or changed props
  for (const name in newProps) {
    if (name === 'children') continue;
    if (name.startsWith('on')) {
      if (!oldProps[name] || newProps[name] !== oldProps[name]) {
        dom.addEventListener(name.slice(2).toLowerCase(), newProps[name]);
      }
    } else {
      if (dom.getAttribute(name) !== newProps[name]) {
        dom.setAttribute(name, newProps[name]);
      }
    }
  }
  // Remove old props
  for (const name in oldProps) {
    if (name !== 'children' && !(name in newProps)) {
      dom.removeAttribute(name);
    }
  }
}

function rerender() {
  hookIndex = 0;
  effects = [];
  currentComponent = rootComponent;
  const vdom = currentComponent();
  if (prevVdom == null) {
    rootContainer.innerHTML = '';
    rootContainer.appendChild(createDom(vdom));
  } else {
    updateDom(rootContainer, vdom, prevVdom);
  }
  prevVdom = vdom;
  setTimeout(runEffects, 0);
}

export function useState(initialValue) {
  const idx = hookIndex;
  if (hooks.length <= idx) {
    hooks.push(typeof initialValue === 'function' ? initialValue() : initialValue);
  }
  const setState = newValue => {
    hooks[idx] = typeof newValue === 'function' ? newValue(hooks[idx]) : newValue;
    rerender();
  };
  const value = hooks[idx];
  hookIndex++;
  return [value, setState];
}

export function useEffect(fn, deps) {
  effects.push({
    fn,
    deps,
    lastDeps: undefined,
    cleanup: undefined,
    hasRun: false
  });
  hookIndex++;
} 