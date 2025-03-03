#!/usr/bin/env node
'use strict';

import { execSync } from 'child_process';
import packageInfo from '../package.json' assert { type: 'json' };
process.stdout.write(
  JSON.stringify(
    {
      version: packageInfo.version,
      commit: execSync('git rev-parse HEAD').toString().trim(),
    },
    null,
    2
  )
);
