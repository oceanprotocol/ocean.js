#!/usr/bin/env node

/* eslint-disable security/detect-non-literal-fs-filename */

const fs = require('fs')
const ora = require('ora')
const libJsPackage = require('../package.json')
const { spawn } = require('child_process')

const { description, version } = libJsPackage

// Setup our paths, relative to project root
const outPath = './dist/ocean.js.json'
const input = './src/lib.ts'

const generateJson = async () => {
  const spinnerTypedoc = ora('Generating TypeDoc json...').start()

  // Parse and modify json output
  const jsonOrig = await JSON.parse(fs.readFileSync(outPath, 'utf8'))

  const jsonFinal = {
    info: {
      title: 'Ocean.js',
      description,
      version,
      sourceUrl: 'https://github.com/oceanprotocol/ocean.js/blob/main/'
    },
    ...jsonOrig
  }

  fs.writeFileSync(outPath, JSON.stringify(jsonFinal, null, 2))

  spinnerTypedoc.succeed('Generated TypeDoc json.')
}

const child = spawn(`typedoc`, [input, `--json ${outPath}`])

child.on('exit', () => {
  generateJson().catch(console.error)
})
