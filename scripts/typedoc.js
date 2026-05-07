#!/usr/bin/env node

/* eslint-disable security/detect-non-literal-fs-filename */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const fs = require('fs')
const TypeDoc = require('typedoc')
const typescript = require('typescript')
const libJsPackage = require('../package.json')

const { description, version } = libJsPackage

// Setup our paths, relative to project root
const outPath = './dist/lib.json'
const files = ['./src/index.ts']

// specifically point to tsconfig, otherwise TypeDoc fails
const config = typescript.findConfigFile('./tsconfig.js', typescript.sys.fileExists)

const generateJson = async () => {
  process.stdout.write('Generating TypeDoc json...\n')

  const app = await TypeDoc.Application.bootstrap({
    tsconfig: config,
    entryPoints: files
  })

  const project = await app.convert()
  if (!project) {
    throw new Error('TypeDoc conversion failed.')
  }

  // Generate the JSON file
  await app.generateJson(project, outPath)

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

  process.stdout.write('Generated TypeDoc json.\n')
}

generateJson().catch(console.error)
