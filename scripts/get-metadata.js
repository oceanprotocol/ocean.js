#!/usr/bin/env node
'use strict'

const packageInfo = require('../package.json')
const execSync = require('child_process').execSync

process.stdout.write(
  JSON.stringify(
    {
      version: require('../package.json').version,
      commit: execSync(`git rev-parse HEAD`).toString().trim()
    },
    null,
    '  '
  )
)
