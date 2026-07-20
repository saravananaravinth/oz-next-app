// oz-next-app/src/lib/types/json.ts
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue | undefined };
export type MaybePromise<T> = T | Promise<T>;
export type Prettify<T> = { [K in keyof T]: T[K] } & {};
