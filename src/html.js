import { createElement } from "./element.js";

/**
 * html`...` — a tagged-template alternative to JSX.
 *
 * Pure-whitespace text segments are dropped (so template indentation never
 * becomes a spurious text node). Whitespace adjacent to non-whitespace is
 * preserved.
 *
 *   html`<div id="x"><h1>Hello ${name}</h1></div>`
 *
 * Rules:
 *   - `name="value"` or `name=${value}` always becomes `attributes.name`.
 *     There is no event-handler or component magic — the form is the meaning.
 *   - `${obj}` between attrs, or `props=${obj}`, spreads into props
 *     (the second arg of createElement). This is how you pass anything
 *     that isn't an HTML attribute — event handlers, keys, signals
 *     bound as DOM properties, component props, etc.
 *   - `<${Component}>` uses the interpolated value as the tag.
 *   - `${value}` in a child position passes through as-is (VirtualNode,
 *     string, number, signal, array, etc.).
 */

const TEXT = 0;
const TAG_NAME = 1;
const ATTR_OR_END = 2;
const ATTR_NAME = 3;
const ATTR_VAL = 4;
const ATTR_QUOTED = 5;
const ATTR_UNQUOTED = 6;

const isWS = (c) => c === " " || c === "\t" || c === "\n" || c === "\r";

export function html(strings, ...values) {
    const root = [];
    const stack = [root];
    const pushChild = (c) => stack[stack.length - 1].push(c);

    let state = TEXT;
    let buf = "";
    let tagName = null;
    let isClosing = false;
    let selfClosing = false;
    let attributes = null;     // bag for parsed name=value attrs
    let props = null;          // bag for spread / props=${...} interpolations
    let attrName = "";
    let attrValue = "";
    let quote = "";

    const flushText = () => {
        if (buf.length === 0) return;
        let allWS = true;
        for (let k = 0; k < buf.length; k++) {
            if (!isWS(buf[k])) { allWS = false; break; }
        }
        if (!allWS) pushChild(buf);
        buf = "";
    };

    const addAttr = (name, value) => {
        (attributes ??= {})[name] = value;
    };

    const mergeProps = (obj) => {
        if (!obj || typeof obj !== "object") return;
        props ??= {};
        for (const k in obj) props[k] = obj[k];
    };

    const resetTag = () => {
        tagName = null; isClosing = false; selfClosing = false;
        attributes = null; props = null;
        attrName = ""; attrValue = ""; quote = "";
    };

    const finishTag = () => {
        if (isClosing) {
            stack.pop();
        } else if (selfClosing) {
            pushChild({ __h: true, tag: tagName, attributes, props, children: [] });
        } else {
            const children = [];
            pushChild({ __h: true, tag: tagName, attributes, props, children });
            stack.push(children);
        }
        resetTag();
        state = TEXT;
    };

    const onChar = (c) => {
        switch (state) {
            case TEXT:
                if (c === "<") { flushText(); state = TAG_NAME; tagName = ""; }
                else buf += c;
                break;
            case TAG_NAME:
                if (tagName === "" && c === "/") isClosing = true;
                else if (isWS(c)) { if (tagName) state = ATTR_OR_END; }
                else if (c === ">") finishTag();
                else if (c === "/") selfClosing = true;
                else tagName += c;
                break;
            case ATTR_OR_END:
                if (isWS(c)) break;
                if (c === ">") finishTag();
                else if (c === "/") selfClosing = true;
                else { attrName = c; state = ATTR_NAME; }
                break;
            case ATTR_NAME:
                if (c === "=") state = ATTR_VAL;
                else if (isWS(c)) { addAttr(attrName, true); attrName = ""; state = ATTR_OR_END; }
                else if (c === ">") { addAttr(attrName, true); attrName = ""; finishTag(); }
                else if (c === "/") { addAttr(attrName, true); attrName = ""; selfClosing = true; state = ATTR_OR_END; }
                else attrName += c;
                break;
            case ATTR_VAL:
                if (c === '"' || c === "'") { quote = c; attrValue = ""; state = ATTR_QUOTED; }
                else if (isWS(c)) { addAttr(attrName, true); attrName = ""; state = ATTR_OR_END; }
                else if (c === ">") { addAttr(attrName, true); attrName = ""; finishTag(); }
                else { attrValue = c; state = ATTR_UNQUOTED; }
                break;
            case ATTR_QUOTED:
                if (c === quote) { addAttr(attrName, attrValue); attrName = ""; attrValue = ""; state = ATTR_OR_END; }
                else attrValue += c;
                break;
            case ATTR_UNQUOTED:
                if (isWS(c)) { addAttr(attrName, attrValue); attrName = ""; attrValue = ""; state = ATTR_OR_END; }
                else if (c === ">") { addAttr(attrName, attrValue); attrName = ""; attrValue = ""; finishTag(); }
                else if (c === "/") { addAttr(attrName, attrValue); attrName = ""; attrValue = ""; selfClosing = true; state = ATTR_OR_END; }
                else attrValue += c;
                break;
        }
    };

    const onValue = (v) => {
        switch (state) {
            case TEXT:
                flushText();
                pushChild(v);
                break;
            case TAG_NAME:
                if (tagName !== "") {
                    throw new Error(`html: interpolated tag name must be the entire name (got literal "${tagName}" before \${...})`);
                }
                tagName = v;
                break;
            case ATTR_OR_END:
                // Bare ${obj} — spread into props.
                mergeProps(v);
                break;
            case ATTR_VAL:
                if (attrName === "props") {
                    // props=${obj} — alternate spelling for spread.
                    mergeProps(v);
                } else {
                    addAttr(attrName, v);
                }
                attrName = "";
                state = ATTR_OR_END;
                break;
            default:
                throw new Error("html: cannot interpolate inside a quoted attribute or attribute name");
        }
    };

    for (let i = 0; i < strings.length; i++) {
        const s = strings[i];
        for (let j = 0; j < s.length; j++) onChar(s[j]);
        if (i < values.length) onValue(values[i]);
    }
    flushText();

    const out = root.map(materialize);
    return out.length === 1 ? out[0] : out;
}

function materialize(node) {
    if (Array.isArray(node)) return node.map(materialize);
    if (node && typeof node === "object" && node.__h) {
        // createElement's second arg is the props bag; we put the parsed
        // attributes under its `attributes` key (createElement honors that),
        // and merge any spread/props=${...} interpolations alongside.
        const combined = node.props ? { ...node.props } : {};
        if (node.attributes) combined.attributes = combined.attributes
            ? { ...combined.attributes, ...node.attributes }
            : node.attributes;
        return createElement(node.tag, combined, ...node.children.map(materialize));
    }
    return node;
}
