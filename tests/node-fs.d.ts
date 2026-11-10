// Minimal typing for the bits of node:fs the tests use (the app's tsconfig has no Node types).
declare module 'node:fs' {
  export function existsSync(path: string | URL): boolean;
  export function statSync(path: string | URL): { size: number };
}
