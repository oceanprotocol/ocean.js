#!/usr/bin/env node
'use strict';

import { execSync } from 'child_process';
import packageInfo from '../package.json' with { type: 'json' };
let commitHash = 'unknown';
try {
  commitHash = execSync('git rev-parse HEAD').toString().trim();
} catch (e) {
  console.warn('Not a git repository, skipping commit hash metadata.');
}
process.stdout.write(
  JSON.stringify(
    {
      version: packageInfo.version,
      commit: commitHash
    },
    null,
    2
  )
);
