/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_FEATURE_GST_CLIENT_AUTOFILL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
