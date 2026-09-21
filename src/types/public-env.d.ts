// oz-next-app/src/types/public-env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    readonly NEXT_PUBLIC_APP_ENV?: string;
    readonly NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY?: string;
    readonly NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?: string;
  }
}
