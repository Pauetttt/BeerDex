export interface R2HttpMetadata {
  contentType?: string;
  cacheControl?: string;
}

export interface R2ObjectLike {
  body: ReadableStream<Uint8Array> | null;
  httpEtag?: string;
  etag?: string;
  size?: number;
  writeHttpMetadata?: (headers: Headers) => void;
}

export interface R2BucketLike {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob | null,
    options?: {
      httpMetadata?: R2HttpMetadata;
    }
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectLike | null>;
  delete(keys: string | string[]): Promise<void>;
}

export interface RuntimeBindingsProvider {
  getEnv?: () => Record<string, unknown>;
  getR2Bucket?: () => R2BucketLike | null;
}

let activeProvider: RuntimeBindingsProvider | null = null;

/** Registra proveedores dinámicos de bindings (ej. Cloudflare Workers env y R2). */
export function setRuntimeBindings(provider: RuntimeBindingsProvider | null): void {
  activeProvider = provider;
}

export function isWorkersRuntime(): boolean {
  return activeProvider !== null;
}

export function getRuntimeEnvValue(key: string): string | undefined {
  if (!activeProvider?.getEnv) return undefined;
  try {
    const runtimeEnv = activeProvider.getEnv();
    const val = runtimeEnv?.[key];
    return typeof val === 'string' ? val : undefined;
  } catch {
    return undefined;
  }
}

export function getR2Bucket(): R2BucketLike | null {
  if (!activeProvider?.getR2Bucket) return null;
  try {
    return activeProvider.getR2Bucket() ?? null;
  } catch {
    return null;
  }
}
