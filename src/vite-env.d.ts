/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_BUILD_PROFILE: 'core' | 'full';
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
