#!/bin/bash
# Create markdown file
cp test/integration/ReameFlow.test.ts CodeExamples.md

# Replace comments
sed -i 's/\/\/\/ //' CodeExamples.md