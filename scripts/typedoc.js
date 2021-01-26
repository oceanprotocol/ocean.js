#!/usr/bin/env node

/* eslint-disable security/detect-non-literal-fs-filename */

const fs = require('fs')
const TypeDoc = require('typedoc')
const typescript = require('typescript')
const ora = require('ora')
const libJsPackage = require('../package.json')

const { description, version } = libJsPackage

// Setup our paths, relative to project root
const outPath = './dist/lib.json'
const files = ['./src/lib.ts']

// specifically point to tsconfig, otherwise TypeDoc fails
const config = typescript.findConfigFile('./tsconfig.js', typescript.sys.fileExists)

const generateJson = async () => {
  const spinnerTypedoc = ora('Generating TypeDoc json...').start()

  // Setup our TypeDoc app
  const app = new TypeDoc.Application()
  app.options.addReader(new TypeDoc.TSConfigReader())
  app.options.addReader(new TypeDoc.TypeDocReader())

  app.bootstrap({
    tsconfig: config,
    entryPoints: files
  })

  const src = app.expandInputFiles(files)
  const project = app.convert(src)

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

  spinnerTypedoc.succeed('Generated TypeDoc json.')
}

generateJson().catch(console.error)
