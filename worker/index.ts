import http from 'node:http';
import { env as cfEnv } from 'cloudflare:workers';
import { handleAsNodeRequest } from 'cloudflare:node';
import { app } from '../backend/src/app';
import { setRuntimeBindings, type R2BucketLike } from '../backend/src/config/runtimeBindings';

const R2_PHOTO_KEY_REGEX = /^photos\/[a-zA-Z0-9._-]+$/;

function bindWorkerEnv(runtimeEnv: unknown): void {
  const record = (runtimeEnv ?? {}) as Record<string, unknown>;
  setRuntimeBindings({
    getEnv: () => record,
    getR2Bucket: () => (record.PHOTOS_BUCKET as R2BucketLike | undefined) ?? null,
  });
}

bindWorkerEnv(cfEnv);

const server = http.createServer(app);
server.listen(8787);

export default {
  async fetch(
    request: Request,
    env: Record<string, unknown>,
    ctx: { waitUntil(promise: Promise<unknown>): void; passThroughOnException(): void }
  ): Promise<Response> {
    bindWorkerEnv(env);

    const url = new URL(request.url);
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      url.pathname.startsWith('/media/')
    ) {
      let decodedKey = '';
      try {
        decodedKey = decodeURIComponent(url.pathname.slice('/media/'.length));
      } catch {
        return Response.json({ error: 'Ruta de imagen inválida.' }, { status: 400 });
      }

      if (!R2_PHOTO_KEY_REGEX.test(decodedKey)) {
        return Response.json({ error: 'Ruta de imagen inválida.' }, { status: 400 });
      }

      const bucket = env.PHOTOS_BUCKET as R2BucketLike | undefined;
      if (!bucket) {
        return Response.json(
          { error: 'Almacenamiento de imágenes R2 no disponible.' },
          { status: 503 }
        );
      }

      const object = await bucket.get(decodedKey);
      if (!object) {
        return Response.json({ error: 'Imagen no encontrada.' }, { status: 404 });
      }

      const ifNoneMatch = request.headers.get('if-none-match');
      if (ifNoneMatch && object.httpEtag && ifNoneMatch === object.httpEtag) {
        return new Response(null, { status: 304 });
      }

      const headers = new Headers();
      if (typeof object.writeHttpMetadata === 'function') {
        object.writeHttpMetadata(headers);
      }
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/octet-stream');
      }
      if (object.httpEtag) {
        headers.set('ETag', object.httpEtag);
      }
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

      return new Response(request.method === 'HEAD' ? null : object.body, {
        status: 200,
        headers,
      });
    }

    return handleAsNodeRequest(8787, request, env, ctx as never);
  },
};
