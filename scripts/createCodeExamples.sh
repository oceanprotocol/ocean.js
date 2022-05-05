#!/bin/bash
# Create markdown file
cp test/integration/CodeExamples.test.ts CodeExamples.md

# Remove unneccessay imports
sed -i "s/import { assert } from 'chai'//" CodeExamples.md


# Replace comments
sed -i 's/}) \/\/\/ //' CodeExamples.md
sed -i 's/    \/\/\/ //' CodeExamples.md
sed -i 's/  \/\/\/ //' CodeExamples.md
sed -i 's/\/\/\/ //' CodeExamples.md


# Generate titles
sed -i "s/describe('Simple Publish & Consume Flow', async () => {//" CodeExamples.md
sed -i "s/it('/\#\#\# /" CodeExamples.md
sed -i "s/', async () => {//" CodeExamples.md
sed -i "s/before(async () => {//" CodeExamples.md