#!/bin/bash
# Create markdown file
cp test/integration/ReameFlow.test.ts CodeExamples.md

# Replace comments
sed -i 's/}) \/\/\/ //' CodeExamples.md
sed -i 's/\/\/\/ //' CodeExamples.md


# Generate titles
sed -i "s/describe('/\#\# /" CodeExamples.md
sed -i "s/it('/\#\#\# /" CodeExamples.md
sed -i "s/', async () => {//" CodeExamples.md
sed -i "s/before(async () => {//" CodeExamples.md
