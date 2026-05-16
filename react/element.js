// An element is the immutable description a component returns: `{ type, props }`.
// JSX `<div id="x">hi</div>` compiles to `createElement('div', {id:'x'}, 'hi')`.
// Children passed as trailing args are normalised into props.children; primitives
// become text elements so the rest of the pipeline only ever sees element objects.

const REACT_ELEMENT_TYPE = Symbol.for('react.element');

export function createElement(type, props, ...children) {
    const { key = null, ref = null, ...rest } = props ?? {};
    rest.children = children.flat(Infinity).map(c =>
        c == null || c === false || typeof c === 'object' ? c : createTextElement(c)
    );
    return { $$typeof: REACT_ELEMENT_TYPE, type, key, ref, props: rest };
}

export function createTextElement(text) {
    return {
        $$typeof: REACT_ELEMENT_TYPE,
        type: 'TEXT_ELEMENT',
        key: null,
        ref: null,
        props: { nodeValue: String(text), children: [] },
    };
}
