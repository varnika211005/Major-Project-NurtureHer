/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_MOTHER_EMAIL?: string;
  readonly VITE_DEMO_MOTHER_PASSWORD?: string;
  readonly VITE_DEMO_CAREGIVER_EMAIL?: string;
  readonly VITE_DEMO_CAREGIVER_PASSWORD?: string;
  readonly VITE_DEMO_DOCTOR_EMAIL?: string;
  readonly VITE_DEMO_DOCTOR_PASSWORD?: string;
  readonly VITE_DEMO_ADMIN_EMAIL?: string;
  readonly VITE_DEMO_ADMIN_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
