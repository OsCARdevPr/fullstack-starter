/** Variables read from the repository root `.env`. Only `VITE_*` values reach the browser. */
interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
