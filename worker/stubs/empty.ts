export default {};

export class Pool {}

export class PGlite {}

export const v2 = {};

export function drizzle(): never {
  throw new Error('Unused database driver in Cloudflare Workers runtime.');
}

export async function getVercelOidcToken(): Promise<string> {
  return '';
}
