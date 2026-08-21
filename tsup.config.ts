import { defineConfig, type Options } from 'tsup'

// Replaces microbundle (0.15.1, unmaintained since 2022). Output filenames are pinned to
// the ones package.json advertises so the published contract is unchanged:
//   dist/lib.module.mjs  -> "module" + exports["."].import
//   dist/lib.modern.mjs  -> exports["."].default
// The package is ESM-only: a CJS build is impossible because 16 of the 25 runtime
// dependencies (libp2p family, multiformats, uint8arrays) ship no `require` condition.
// Declarations are emitted separately by `tsc --emitDeclarationOnly` (see the build
// script) which keeps the per-file dist/types/**/*.d.ts tree that exports["."].types
// points at; tsup's own `dts` would flatten it into a single file.
const common: Options = {
  entry: { lib: 'src/index.ts' },
  tsconfig: 'tsconfig.json',
  sourcemap: true,
  minify: true,
  treeshake: true,
  splitting: false,
  dts: false,
  clean: false,
  silent: true
}

export default defineConfig([
  {
    ...common,
    format: ['esm'],
    target: 'es2020',
    outExtension: () => ({ js: '.module.mjs' })
  },
  {
    ...common,
    format: ['esm'],
    target: 'esnext',
    outExtension: () => ({ js: '.modern.mjs' })
  }
])
