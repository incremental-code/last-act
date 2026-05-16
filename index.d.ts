export type Child =
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | Child[]
  | { get(): unknown };

export type ComponentProps = {
  key?: string | number | null;
  attributes?: Record<string, unknown>;
  children?: Child | Child[];
  [key: string]: unknown;
};

export type Component<P = Record<string, unknown>> = (
  props: P & {
    key?: string | number | null;
    attributes?: Record<string, unknown>;
    children?: Child[];
  }
) => HTMLElement;

export function createElement(
  type: string | Component,
  props?: ComponentProps | null,
  ...children: Child[]
): HTMLElement;

export function effect(callback: () => void | (() => void)): () => void;
export function onUnmount(element: HTMLElement, callback: () => void): void;

declare global {
  namespace JSX {
    type Element = HTMLElement;

    interface ElementChildrenAttribute {
      children: {};
    }

    interface IntrinsicAttributes {
      key?: string | number | null;
    }

    interface IntrinsicElements {
      [elementName: string]: any;
    }
  }
}
