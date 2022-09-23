#!/bin/bash
# We get the path to the test script that we want to use as a template
inputfile=$1
# We check if the input file exists
if [ ! -f "$inputfile" ]; then
  echo "File $inputfile does not exist"
  exit 1
fi

# We get the path to the output file
outputfile="$(basename -a -s .test.js $inputfile).md"

# Create markdown file
cp $inputfile $outputfile

# Parameters of sed command depending on the OS
if [[ $(uname) == 'Darwin' ]]; then
  # if platform is Mac OS X
  params="-i '' -e "
else
  params="-i "
fi

# Remove unneccessay imports
eval "sed $params \"s/import { assert } from 'chai'//\" $outputfile"

# Change imports
eval "sed $params \"s/} from '..\/..\/src'/} from '@oceanprotocol\/lib'/\" $outputfile"
eval "sed $params \"s/} from '..\/config'/} from '@oceanprotocol\/lib\/dist\/test\/config'/\" $outputfile"

# Replace comments
eval "sed $params \"s/}) \/\/\/ //\" $outputfile"
eval "sed $params \"s/}) \/\/\///\" $outputfile"
eval "sed $params \"s/    \/\/\/ //\" $outputfile"
eval "sed $params \"s/  \/\/\/ //\" $outputfile"
eval "sed $params \"s/\/\/\/ //\" $outputfile"

# Generate titles
eval "sed $params \"s/describe('Simple Publish & Consume Flow', async () => {//\" $outputfile"
eval "sed $params \"s/it('/\#\#\# /\" $outputfile"
eval "sed $params \"s/', async () => {//\" $outputfile"
eval "sed $params \"s/before(async () => {//\" $outputfile"