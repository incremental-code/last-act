import { createElement } from "./element.js";

/**
 * html`...` — a tagged-template alternative to JSX.
 *
 * Pure-whitespace text segments are dropped (so indentation never becomes a
 * spurious text node). Whitespace adjacent to non-whitespace is preserved.
 *
 *   html`<div id="x"><h1>Hello ${name}</h1></div>`
 *
 * Supports:
 *   - <div>, </div>, <br/>
 *   - <${Component} ...>  — interpolated tag name (component or string)
 *   - id="x"   (literal attribute)        — routed to attributes.id
 *   - id=${v}  (interpolated attribute)   — routed to attributes.id
 *   - onclick=${fn}                       — routed to props.onclick (event handler)
 *   - ${{ key: 'k', attributes: {...} }}  — spread props between attrs
 *   - ${child} as a child position        — passed through as-is (VirtualNode,
 *                                           string, number, signal, array, …)
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
    // Stack of in-progress children arrays. Root holds top-level nodes.
    const root = [];
    const stack = [root];
    const pushChild = (c) => stack[stack.length - 1].push(c);

    let state = TEXT;
    let buf = "";              // text accumulator for TEXT state
    let tagName = null;        // string OR an interpolated value
    let isClosing = false;
    let selfClosing = false;
    let props = null;          // accumulated props for the current open tag
    let attrName = "";
    let attrValue = "";
    let quote = "";

    const flushText = () => {
        if (buf.length === 0) return;
        // Drop wholly-whitespace segments — template indentation never becomes a text node.
        let allWS = true;
        for (let k = 0; k < buf.length; k++) {
            if (!isWS(buf[k])) { allWS = false; break; }
        }
        if (!allWS) pushChild(buf);
        buf = "";
    };

    const setAttr = (name, value) => {
        props ??= {};
        if (name === "key") {
            props.key = value;
        } else if (name.startsWith("on") && typeof value === "function") {
            props[name] = value;
        } else {
            (props.attributes ??= {})[name] = value;
        }
    };

    const resetTag = () => {
        tagName = null; isClosing = false; selfClosing = false;
        props = null; attrName = ""; attrValue = ""; quote = "";
    };

    const finishTag = () => {
        if (isClosing) {
            stack.pop();
        } else if (selfClosing) {
            pushChild({ __h: true, tag: tagName, props, children: [] });
        } else {
            const children = [];
            pushChild({ __h: true, tag: tagName, props, children });
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
                else if (isWS(c)) { setAttr(attrName, true); attrName = ""; state = ATTR_OR_END; }
                else if (c === ">") { setAttr(attrName, true); attrName = ""; finishTag(); }
                else if (c === "/") { setAttr(attrName, true); attrName = ""; selfClosing = true; state = ATTR_OR_END; }
                else attrName += c;
                break;
            case ATTR_VAL:
                if (c === '"' || c === "'") { quote = c; attrValue = ""; state = ATTR_QUOTED; }
                else if (isWS(c)) { setAttr(attrName, true); attrName = ""; state = ATTR_OR_END; }
                else if (c === ">") { setAttr(attrName, true); attrName = ""; finishTag(); }
                else { attrValue = c; state = ATTR_UNQUOTED; }
                break;
            case ATTR_QUOTED:
                if (c === quote) { setAttr(attrName, attrValue); attrName = ""; attrValue = ""; state = ATTR_OR_END; }
                else attrValue += c;
                break;
            case ATTR_UNQUOTED:
                if (isWS(c)) { setAttr(attrName, attrValue); attrName = ""; attrValue = ""; state = ATTR_OR_END; }
                else if (c === ">") { setAttr(attrName, attrValue); attrName = ""; attrValue = ""; finishTag(); }
                else if (c === "/") { setAttr(attrName, attrValue); attrName = ""; attrValue = ""; selfClosing = true; state = ATTR_OR_END; }
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
                // <${Component}> — interpolated tag name must be the entire name.
                if (tagName !== "") {
                    throw new Error(`html: interpolated tag name must be the entire name (got literal "${tagName}" before \${...})`);
                }
                tagName = v;
                break;
            case ATTR_OR_END:
                // Spread props: <div ${{ key, attributes, onclick, ... }}>
                if (v && typeof v === "object") {
                    props ??= {};
                    for (const k in v) {
                        if (k === "attributes" && v[k] && typeof v[k] === "object") {
                            props.attributes = Object.assign(props.attributes ?? {}, v[k]);
                        } else {
                            props[k] = v[k];
                        }
                    }
                }
                break;
            case ATTR_VAL:
                setAttr(attrName, v);
                attrName = "";
                state = ATTR_OR_END;
                break;
            default:
                // Interpolating inside a quoted attribute or mid-name is unsupported.
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
        return createElement(node.tag, node.props, ...node.children.map(materialize));
    }
    return node;
}
