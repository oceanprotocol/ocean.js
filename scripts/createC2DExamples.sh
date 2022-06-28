#!/bin/bash
# Create markdown file
cp test/integration/C2DExamples.test.ts C2DExamples.md

# Remove unneccessay imports
sed -i "s/import { assert } from 'chai'//" C2DExamples.md


# Replace comments
sed -i 's/}) \/\/\/ //' C2DExamples.md
sed -i 's/}) \/\/\///' C2DExamples.md
sed -i 's/    \/\/\/ //' C2DExamples.md
sed -i 's/  \/\/\/ //' C2DExamples.md
sed -i 's/\/\/\/ //' C2DExamples.md


# Generate titles
sed -i "s/describe('Simple Publish & Consume Flow', async () => {//" C2DExamples.md
sed -i "s/it('/\#\#\# /" C2DExamples.md
sed -i "s/', async () => {//" C2DExamples.md
sed -i "s/before(async () => {//" C2DExamples.md