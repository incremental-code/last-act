// Build a real DOM subtree from a resolved *host* element. By the time we get
// here, exec.js has already replaced every function-component element in the
// tree with its rendered output — so `element.type` is always either a tag
// string ('div', 'button', …) or 'TEXT_ELEMENT'.

export function createDomNode(element) {
    if (element.type === 'TEXT_ELEMENT')
        return document.createTextNode(element.props.nodeValue);

    const dom = document.createElement(element.type);
    for (const [key, value] of Object.entries(element.props)) {
        if (key === 'children') continue;
        setProperty(dom, key, value);
    }
    for (const child of element.props.children) {
        if (child == null) continue;
        dom.appendChild(createDomNode(child));
    }
    return dom;
}

export function setProperty(dom, key, value) {
    if (key.startsWith('on')) {
        dom.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'className') {
        dom.setAttribute('class', value);
    } else {
        dom.setAttribute(key, value);
    }
}

export function removeProperty(dom, key, value) {
    if (key.startsWith('on')) {
        dom.removeEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'className') {
        dom.removeAttribute('class');
    } else {
        dom.removeAttribute(key);
    }
}
