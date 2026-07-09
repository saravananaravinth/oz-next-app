// oz-next-app/src/types/react-jsx-compat.d.ts
import type { JSX as ReactJSX } from "react";

/**
 * Temporary React 19 compatibility shim.
 *
 * React 19 scopes JSX types under `React.JSX` instead of relying on the legacy global
 * `JSX` namespace. Keep this file only while project code or third-party type
 * declarations still reference `JSX.*`.
 *
 * New application code should prefer:
 *   import type { JSX } from 'react';
 *   type View = JSX.Element;
 *
 * Do not add application-domain types, ERP API schemas, Cloudflare bindings, or globals here.
 */
declare global {
  namespace JSX {
    type Element = ReactJSX.Element;
    type ElementType = ReactJSX.ElementType;

    type ElementClass = ReactJSX.ElementClass;
    type ElementAttributesProperty = ReactJSX.ElementAttributesProperty;
    type ElementChildrenAttribute = ReactJSX.ElementChildrenAttribute;

    type LibraryManagedAttributes<C, P> = ReactJSX.LibraryManagedAttributes<
      C,
      P
    >;

    type IntrinsicAttributes = ReactJSX.IntrinsicAttributes;
    type IntrinsicClassAttributes<T> = ReactJSX.IntrinsicClassAttributes<T>;
    type IntrinsicElements = ReactJSX.IntrinsicElements;
  }
}

export {};
