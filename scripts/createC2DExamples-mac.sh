#!/bin/bash
# Create markdown file
cp test/integration/C2DExamples.test.ts C2DExamples.md

# Remove unneccessay imports
sed -i '' -e "s/import { assert } from 'chai'//" C2DExamples.md


# Replace comments
sed -i '' -e 's/}) \/\/\/ //' C2DExamples.md
sed -i '' -e 's/}) \/\/\///' C2DExamples.md
sed -i '' -e 's/    \/\/\/ //' C2DExamples.md
sed -i '' -e 's/  \/\/\/ //' C2DExamples.md
sed -i '' -e 's/\/\/\/ //' C2DExamples.md


# Generate titles
sed -i '' -e "s/describe('Simple Publish & Consume Flow', async () => {//" C2DExamples.md
sed -i '' -e "s/it('/\#\#\# /" C2DExamples.md
sed -i '' -e "s/', async () => {//" C2DExamples.md
sed -i '' -e "s/before(async () => {//" C2DExamples.md