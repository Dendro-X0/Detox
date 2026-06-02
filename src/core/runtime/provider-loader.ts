/** Optional hook registered by mod loader to lazy-load ONNX providers. */
let localPackLoader: (() => Promise<void>) | null = null;

export function setLocalPackLoader(loader: () => Promise<void>): void {
    localPackLoader = loader;
}

export async function ensureLocalPackProviders(): Promise<void> {
    if (localPackLoader !== null) {
        await localPackLoader();
    }
}
