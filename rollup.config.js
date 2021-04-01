// // rollup.config.js

import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
    input: './out-tsc/index.js',
    output: {
      file: './dist/node/index.js',
      format: 'cjs'
  },
  plugins: [
    commonjs(),
    json(),
    nodeResolve(),
    typescript()
  ]
};
