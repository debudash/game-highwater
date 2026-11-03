// The few Node APIs the tests use (art.test.ts, ghosts.test.ts). The repo has no @types/node (tsconfig "types": []),
// so these are declared here instead of adding a dependency for three functions.
declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, encoding: 'utf-8'): string;
  export function readFileSync(path: string): Uint8Array;
  export function statSync(path: string): { size: number };
  export function writeFileSync(path: string, data: string): void;
}
declare const process: { cwd(): string; env: Record<string, string | undefined> };
