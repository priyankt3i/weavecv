/// <reference types="vite/client" />

declare module '*.png' {
    const value: any;
    export default value;
}

interface ImportMetaEnv {
    readonly VITE_USE_MOCKS?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
