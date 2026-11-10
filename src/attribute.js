/**
 * attributeValue() converts a value to the string written to the DOM or to
 * serialized HTML, or null when the attribute should be absent.
 *
 *  - null, undefined, false and [] mean no attribute, so `disabled` can be
 *    switched off by passing false.
 *  - true means a present, valueless attribute ("").
 *  - Arrays are joined with spaces (useful for "class" or "rel").
 *
 * Attributes that need the literal strings "true"/"false" (aria-*, draggable,
 * contenteditable) must be passed those strings.
 */
export function attributeValue(value) {
    if (value === null || value === undefined || value === false) return null;
    if (value === true) return '';
    if (Array.isArray(value)) return value.length === 0 ? null : value.join(' ');
    return String(value);
}
