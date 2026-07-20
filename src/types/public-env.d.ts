// oz-next-app/src/types/public-env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    readonly NEXT_PUBLIC_APP_ENV?: string;
  }
}
