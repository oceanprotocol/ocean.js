#!/bin/bash
# Create markdown file
cp test/integration/MarketplaceFlow.test.ts MarketplaceFlow.md

# Remove unneccessay imports
sed -i '' -e "s/import { assert } from 'chai'//" MarketplaceFlow.md


# Replace comments
sed -i '' -e 's/}) \/\/\/ //' MarketplaceFlow.md
sed -i '' -e 's/    \/\/\/ //' MarketplaceFlow.md
sed -i '' -e 's/  \/\/\/ //' MarketplaceFlow.md
sed -i '' -e 's/\/\/\/ //' MarketplaceFlow.md


# Generate titles
sed -i '' -e "s/describe('Simple Publish & Consume Flow', async () => {//" MarketplaceFlow.md
sed -i '' -e "s/it('/\#\#\# /" MarketplaceFlow.md
sed -i '' -e "s/', async () => {//" MarketplaceFlow.md
sed -i '' -e "s/before(async () => {//" MarketplaceFlow.md

