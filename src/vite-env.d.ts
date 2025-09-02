/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_FEATURE_GST_CLIENT_AUTOFILL: string
  readonly VITE_GOOGLE_CLIENT_ID?: string
  readonly VITE_GOOGLE_CLIENT_SECRET?: string
  readonly VITE_MICROSOFT_CLIENT_ID?: string
  readonly VITE_MICROSOFT_CLIENT_SECRET?: string
  readonly VITE_MICROSOFT_TENANT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
