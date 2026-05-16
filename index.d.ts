export type Child =
  | VirtualNode
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
) => Renderable;

export type VirtualNode = {
  type: string;
  key?: string | number | null;
  attributes?: Record<string, unknown>;
  props?: Record<string, unknown>;
  children?: Child[];
};

export type Renderable = VirtualNode | Node | string | number | boolean | null | undefined;

export function createElement(
  type: string | Component,
  props?: ComponentProps | null,
  ...children: Child[]
): Renderable;

export function mount(renderable: Renderable, parent?: Node): Node;
export function getMountedNode(renderable: Renderable): Node | undefined;

export function effect(callback: () => void | (() => void)): () => void;
export function onUnmount(element: VirtualNode | Node, callback: () => void): void;

declare global {
  namespace JSX {
    type Element = Renderable;

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
