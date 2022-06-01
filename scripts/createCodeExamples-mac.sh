#!/bin/bash
# Create markdown file
cp test/integration/CodeExamples.test.ts CodeExamples.md

# Remove unneccessay imports
sed -i '' -e "s/import { assert } from 'chai'//" CodeExamples.md


# Replace comments
sed -i '' -e 's/}) \/\/\/ //' CodeExamples.md
sed -i '' -e 's/}) \/\/\///' CodeExamples.md
sed -i '' -e 's/    \/\/\/ //' CodeExamples.md
sed -i '' -e 's/  \/\/\/ //' CodeExamples.md
sed -i '' -e 's/\/\/\/ //' CodeExamples.md


# Generate titles
sed -i '' -e "s/describe('Simple Publish & Consume Flow', async () => {//" CodeExamples.md
sed -i '' -e "s/it('/\#\#\# /" CodeExamples.md
sed -i '' -e "s/', async () => {//" CodeExamples.md
sed -i '' -e "s/before(async () => {//" CodeExamples.md