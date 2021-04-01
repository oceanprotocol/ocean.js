// // rollup.config.js

// import merge from 'deepmerge';
// import { createBasicConfig } from '@open-wc/building-rollup';

// const baseConfig = createBasicConfig();

// export default merge(baseConfig, {
//     input: './out-tsc/src/index.js',
//     output: {
//         dir: './dist/node',
//     }
//   });

// import babel from 'rollup-plugin-babel';
// import resolve from 'rollup-plugin-node-resolve';

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
