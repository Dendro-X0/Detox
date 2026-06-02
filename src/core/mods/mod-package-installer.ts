import { MOD_CATALOG } from '../../mods/mod-manifest';
import { deleteModAssets, getModAsset, hasAllModAssets, storeModAsset } from './mod-asset-store';
import { manifestToPayload, sha256Hex, verifyModPackageSignature } from './mod-package-crypto';
import { getInstalledMod, removeInstalledMod, upsertInstalledMod } from './installed-mod-store';
import type {
    ModInstallProgress,
    ModPackageManifest,
    ModPackagePayload,
} from './mod-package-types';
import { MOD_PACKAGE_FORMAT } from './mod-package-types';

export type InstallModResult =
    | { readonly ok: true; readonly modId: string }
    | { readonly ok: false; readonly error: string };

function emit(
    onProgress: ((progress: ModInstallProgress) => void) | undefined,
    progress: ModInstallProgress
): void {
    onProgress?.(progress);
}

export function parseModPackageManifest(raw: unknown): ModPackageManifest | null {
    if (typeof raw !== 'object' || raw === null) return null;
    const record = raw as Record<string, unknown>;
    if (
        record.format !== MOD_PACKAGE_FORMAT ||
        typeof record.modId !== 'string' ||
        typeof record.version !== 'string' ||
        typeof record.name !== 'string' ||
        typeof record.kind !== 'string' ||
        typeof record.signature !== 'string'
    ) {
        return null;
    }
    return raw as ModPackageManifest;
}

export function validateModPackagePayload(payload: ModPackagePayload): string | null {
    const catalogEntry = MOD_CATALOG.find((mod) => mod.id === payload.modId);
    if (!catalogEntry) return `Unknown mod id: ${payload.modId}`;
    if (catalogEntry.kind !== payload.kind) {
        return `Kind mismatch: catalog has ${catalogEntry.kind}, package has ${payload.kind}`;
    }
    if (payload.files) {
        for (const file of payload.files) {
            if (!file.relativePath || !file.url || !file.sha256 || file.sizeBytes <= 0) {
                return `Invalid file entry for ${file.relativePath || '(missing path)'}`;
            }
        }
    }
    return null;
}

async function downloadWithProgress(
    url: string,
    sizeBytes: number,
    onBytes: (loaded: number, total: number) => void
): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Download failed (${response.status})`);
    }
    const total = Number(response.headers.get('content-length')) || sizeBytes;
    const reader = response.body?.getReader();
    if (!reader) {
        const buffer = await response.arrayBuffer();
        onBytes(buffer.byteLength, total);
        return buffer;
    }

    const chunks: Uint8Array[] = [];
    let loaded = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
            chunks.push(value);
            loaded += value.byteLength;
            onBytes(loaded, total);
        }
    }

    const merged = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return merged.buffer;
}

export async function installModPackage(
    manifest: ModPackageManifest,
    onProgress?: (progress: ModInstallProgress) => void
): Promise<InstallModResult> {
    const modId = manifest.modId;
    emit(onProgress, { modId, phase: 'verify', bytesLoaded: 0, bytesTotal: 0 });

    const payload = manifestToPayload(manifest);
    const validationError = validateModPackagePayload(payload);
    if (validationError) {
        emit(onProgress, { modId, phase: 'error', bytesLoaded: 0, bytesTotal: 0, message: validationError });
        return { ok: false, error: validationError };
    }

    const valid = await verifyModPackageSignature(manifest);
    if (!valid) {
        emit(onProgress, { modId, phase: 'error', bytesLoaded: 0, bytesTotal: 0, message: 'Invalid signature' });
        return { ok: false, error: 'Package signature verification failed' };
    }

    const files = manifest.files ?? [];
    const downloadedFiles: {
        readonly relativePath: string;
        readonly sha256: string;
        readonly sizeBytes: number;
        readonly downloadedAt: string;
    }[] = [];

    let totalBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0);
    let loadedBytes = 0;

    for (const file of files) {
        emit(onProgress, {
            modId,
            phase: 'download',
            filePath: file.relativePath,
            bytesLoaded: loadedBytes,
            bytesTotal: totalBytes,
        });

        const existing = await getModAsset(modId, file.relativePath);
        if (existing) {
            const existingHash = await sha256Hex(existing);
            if (existingHash === file.sha256.toLowerCase()) {
                loadedBytes += file.sizeBytes;
                downloadedFiles.push({
                    relativePath: file.relativePath,
                    sha256: file.sha256,
                    sizeBytes: file.sizeBytes,
                    downloadedAt: new Date().toISOString(),
                });
                continue;
            }
        }

        try {
            const buffer = await downloadWithProgress(file.url, file.sizeBytes, (loaded, total) => {
                emit(onProgress, {
                    modId,
                    phase: 'download',
                    filePath: file.relativePath,
                    bytesLoaded: loadedBytes + loaded,
                    bytesTotal: totalBytes || total,
                });
            });
            const hash = await sha256Hex(buffer);
            if (hash !== file.sha256.toLowerCase()) {
                const message = `Hash mismatch for ${file.relativePath}`;
                emit(onProgress, { modId, phase: 'error', bytesLoaded: loadedBytes, bytesTotal: totalBytes, message });
                return { ok: false, error: message };
            }
            await storeModAsset(modId, file.relativePath, buffer);
            loadedBytes += buffer.byteLength;
            downloadedFiles.push({
                relativePath: file.relativePath,
                sha256: file.sha256,
                sizeBytes: file.sizeBytes,
                downloadedAt: new Date().toISOString(),
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Download failed';
            emit(onProgress, { modId, phase: 'error', bytesLoaded: loadedBytes, bytesTotal: totalBytes, message });
            return { ok: false, error: message };
        }
    }

    await upsertInstalledMod({
        modId,
        version: manifest.version,
        name: manifest.name,
        kind: manifest.kind,
        installedAt: new Date().toISOString(),
        files: downloadedFiles,
    });

    emit(onProgress, { modId, phase: 'complete', bytesLoaded: totalBytes, bytesTotal: totalBytes });
    return { ok: true, modId };
}

export async function uninstallModPackage(modId: string): Promise<void> {
    await deleteModAssets(modId);
    await removeInstalledMod(modId);
}

export async function ensureInstalledModAssets(modId: string): Promise<boolean> {
    const record = getInstalledMod(modId);
    if (!record || record.files.length === 0) return true;
    return hasAllModAssets(
        modId,
        record.files.map((file) => file.relativePath)
    );
}

export async function installModPackageFromJson(
    raw: unknown,
    onProgress?: (progress: ModInstallProgress) => void
): Promise<InstallModResult> {
    const manifest = parseModPackageManifest(raw);
    if (!manifest) {
        return { ok: false, error: 'Invalid mod package JSON' };
    }
    return installModPackage(manifest, onProgress);
}
