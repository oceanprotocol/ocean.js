# Copilot Instructions for ocean.js

## Project Overview

ocean.js is a JavaScript/TypeScript client library for Ocean Protocol, enabling secure publishing, exchange, consumption of data and compute-to-data services on the blockchain. The library provides classes and utilities for managing data NFTs, datatokels, compute-to-data operations, and various DeFi features.

**Current Status**: Production-ready library at v5.x, actively maintained with regular updates
**Target Users**: Data providers, consumers, developers building on Ocean Protocol
**Package**: Published as `@oceanprotocol/lib` on npm

## Technology Stack

- **Language**: TypeScript (ES2020 target)
- **Package Manager**: npm
- **Build Tool**: Microbundle
- **Code Formatter**: Prettier
- **Linter**: ESLint with oceanprotocol config
- **Testing**: Mocha + NYC (code coverage)
- **Documentation**: TypeDoc with markdown plugin

## Repository Structure

```
src/
  @types/       - TypeScript type definitions and interfaces
  config/       - Configuration management
  contracts/    - Contract interactions and ABI definitions
  services/     - Core services (Aquarius, Provider)
  utils/        - Utility functions and helpers

test/
  unit/         - Unit tests
  integration/  - Integration tests (requires running contracts)
  CodeExamples.test.ts   - Published usage examples
  ComputeExamples.test.ts - Compute-to-data examples

docs/           - Generated TypeDoc documentation
coverage/       - Test coverage reports
scripts/        - Build and deployment scripts
```

## Code Style & Formatting

### Prettier Configuration
- **Print Width**: 90 characters
- **Tab Width**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: Off
- **Trailing Commas**: None

### ESLint Configuration
- **Parser**: @typescript-eslint/parser
- **Base Config**: oceanprotocol
- **Plugins**: prettier/recommended, @typescript-eslint
- **Key Rules**:
  - `no-empty`: Allow empty catch blocks
  - `prefer-destructuring`: Warn on object destructuring
  - `no-unused-vars`: Warn level
  - Constructors and class members: Warn level

### Code Style Guidelines
- Run `npm run lint:fix` before committing to automatically format code
- Run `npm run format` to apply Prettier formatting
- Use TypeScript strict mode where possible
- Prefer `const` over `let` over `var`
- Use destructuring for imports and function parameters
- Use modern ES2020 features (optional chaining, nullish coalescing, etc.)

### Quick Code Standards
- **No implicit `any`**: Always specify types
- **Arrow functions**: Preferred for callbacks and simple functions
- **Template literals**: Use for string interpolation
- **Optional chaining**: Use `?.` instead of null checks
- **Nullish coalescing**: Use `??` for default values

## Development Workflow

### Setup & Build

```bash
npm install              # Install dependencies
npm start               # Start TypeScript compiler in watch mode
npm run build           # Build production bundle (Microbundle)
npm run build:metadata  # Generate metadata.json from contracts
npm run type-check      # Run TypeScript compiler without emitting
```

### Code Quality

```bash
npm run lint            # Run ESLint + TypeScript type checking
npm run lint:fix        # Fix linting errors automatically
npm run format          # Format code with Prettier
npm test                # Run all tests (lint + unit + integration coverage)
npm run test:unit       # Run unit tests only
npm run test:integration # Run integration tests
```

### Documentation

```bash
npm run docs            # Generate TypeDoc documentation
npm run doc:json        # Generate JSON documentation
npm run create:guide    # Extract code examples from tests
npm run create:guidec2d # Extract compute examples from tests
```

## TypeScript Best Practices

1. **Module Resolution**: Use ES modules with `.js` extensions in imports
2. **Type Safety**: Define clear interfaces for all public APIs
3. **Error Handling**: Use specific error types and meaningful error messages
4. **Generics**: Leverage TypeScript generics for reusable, type-safe code
5. **Exports**: Export from barrel files (`index.ts`) to maintain clean API surface

## Key Classes & Services

### Core Services
- **Aquarius**: Integration with decentralized metadata storage
- **Provider**: Interaction with data providers for file download/upload
- **SmartContract**: Base class for contract interactions
- **Config**: Configuration management for network and contract addresses

### Features
- **Data NFT Management**: Creating and managing ERC721 NFTs
- **Datatoken Operations**: ERC20 token management for data access
- **Fixed Rate Exchange**: Fixed-price trading mechanics
- **Dispensers**: Free distribution of datatokens
- **Compute-to-Data**: Running algorithms on datasets
- **VeOcean**: Voting-escrow mechanics for governance

## Testing Standards

### Unit Tests
- Location: `test/unit/**/*.test.ts`
- Run: `npm run test:unit`
- Focus on isolated functionality without external dependencies
- Use mocks for external services
- Each test should test one thing and have clear assertions

### Integration Tests
- Location: `test/integration/**/*.test.ts`
- Run: `npm run test:integration`
- Requires running smart contracts (usually Docker-based)
- Includes real blockchain interactions and provider calls
- Test end-to-end workflows with actual services

### Coverage
- Target: Maintain >80% code coverage
- View: `coverage/unit/lcov-report/` and `coverage/integration/lcov-report/`
- Command: `npm run test:unit:cover` and `npm run test:integration:cover`
- Check coverage reports before committing

### Test Writing Tips
- Use descriptive test names: `should throw error when asset not found`
- Arrange-Act-Assert pattern for clarity
- Mock external dependencies in unit tests
- Use test fixtures for consistent test data
- Clean up resources after tests (hooks)

## Common Patterns

### Creating a New Service/Class
1. Define interfaces in `src/@types/`
2. Implement the class extending `SmartContract` if needed
3. Export from `src/services/index.ts` or appropriate barrel file
4. Add unit tests in `test/unit/`
5. Add integration tests in `test/integration/` if applicable
6. Update documentation in README or guides as needed

### Adding Configuration
1. Add to `src/config/` directory
2. Update `Config` interface in `src/@types/`
3. Update `ConfigHelper` if needed for dynamic resolution
4. Document in `Config.md` in docs/

### Export Structure
```typescript
// Good: Use barrel exports
export * from './MyClass'
export * from './MyInterface'

// Avoid: Direct exports from many files
import MyClass from 'src/services/MyService'
```

### Async Operations Pattern
```typescript
// Always return Promise for async operations
async fetchAsset(did: string): Promise<Asset> {
  try {
    const response = await this.provider.get(did)
    return response as Asset
  } catch (error) {
    logger.error('Failed to fetch asset', { did })
    throw new Error(`Failed to fetch asset ${did}`)
  }
}
```

### Contract Interaction Pattern
```typescript
// Use SmartContract base class
export class MyContract extends SmartContract {
  async executeMethod(params: Params): Promise<Result> {
    const tx = await this.contract.myMethod(params)
    const receipt = await tx.wait()
    return this.parseReceipt(receipt)
  }
}
```

## Naming Conventions

- **Classes**: PascalCase (e.g., `FixedRateExchange`, `ComputeJob`)
- **Functions/Methods**: camelCase (e.g., `publishAsset`, `startComputeJob`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_TIMEOUT`, `DEFAULT_CONFIG`)
- **Private Methods**: Prefix with `_` (e.g., `_validateInput`)
- **Interfaces**: Start with capital letter, often prefixed with `I` or no prefix (e.g., `ComputeJob`, `OrderParams`)
- **File Names**: Match exported class/interface (e.g., `FixedRateExchange.ts`)

## Commit Message Guidelines

- Use conventional commits: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Examples:
  - `feat(compute): add job status polling`
  - `fix(datatokens): resolve transfer approval issue`
  - `docs: update compute examples`- Keep scope concise and lowercase
- Use imperative mood ("add" not "added")
- Reference issue numbers when applicable: `fixes #123`
## Documentation Standards

1. **JSDoc Comments**: Add for all public APIs
   ```typescript
   /**
    * Publishes a new data asset
    * @param {PublishAssetParams} params - Asset parameters
    * @returns {Promise<string>} - Asset DID
    * @throws {Error} If asset creation fails
    */
   async publishAsset(params: PublishAssetParams): Promise<string>
   ```

2. **README Updates**: Maintain examples and setup instructions
3. **Code Examples**: Add to `CodeExamples.test.ts` for user-facing features
4. **Compute Examples**: Add to `ComputeExamples.test.ts` for C2D features
5. **TypeDoc**: Automatically generated from JSDoc comments
6. **Inline Comments**: Explain "why", not "what" (code already shows what)
7. **Parameter Documentation**: Always document optional vs required params

## Security Considerations

- **Private Keys**: Never log or expose private keys
- **Wallet Management**: Guide users to secure key management practices
- **Smart Contract Interactions**: Verify contract addresses match configured networks
- **Input Validation**: Always validate user inputs before blockchain operations
- **Error Messages**: Avoid leaking sensitive information in error messages

## Performance Tips

1. **Bundle Size**: Monitor with Microbundle, use tree-shaking where possible
2. **Async Operations**: Use async/await patterns consistently
3. **Caching**: Consider caching metadata from Aquarius
4. **Batch Operations**: Provide batch functions for repeated operations
5. **Network Calls**: Minimize redundant provider calls

## Known Limitations

- Node.js 18+ recommended
- Requires specific TypeScript config options for compatibility
- Integration tests require Docker and running Ocean contracts
- Sapphire integration tests run separately due to specific environment needs

## Release Process

1. Update version in `package.json`
2. Run `npm run changelog` to generate changelog entry
3. Commit changes with conventional commit message
4. Create git tag matching version
5. Push to GitHub; CI/CD handles publishing to npm
6. Document breaking changes and new features in release notes

## Resources

- [Ocean Protocol Documentation](https://docs.oceanprotocol.com/)
- [Code Examples](CodeExamples.md)
- [Compute-to-Data Examples](ComputeExamples.md)
- [Cheatsheet](Cheatsheet.md)
- [Generated API Documentation](docs/)
- [Discord Community](https://discord.gg/TnXjkR5)

## When Implementing Features

1. ✅ Follow TypeScript strict mode
2. ✅ Add both unit and integration tests
3. ✅ Update TypeDoc comments
4. ✅ Run full lint and format check
5. ✅ Maintain backward compatibility unless major version bump
6. ✅ Update relevant documentation (README, guides)
7. ✅ Consider bundle size impact
8. ✅ Add examples if user-facing feature

## Debugging & Troubleshooting

### Common Issues

**TypeScript Errors in IDE**:
- Run `npm run build:metadata` to regenerate metadata
- Ensure `tsconfig.json` is properly configured in project root
- Check that all dependencies are installed (`npm install`)

**Test Failures**:
- Integration tests require Docker and running Ocean contracts
- Check contract addresses in `src/config/` match your network
- Run tests individually with `npm run test:unit -- test/unit/specific.test.ts`

**Build Issues**:
- Clear cache: `npm run clean && npm install && npm run build`
- Check Node version: `node --version` (should be 18+)
- Verify all peer dependencies are installed

### Logging

```typescript
// Use logger from config for debugging
import { Logger } from './Logger'
const logger = new Logger()
logger.debug('Message', { context: 'data' })
```

## Development Checklist

Before creating a PR, verify:
- [ ] Code follows project style guidelines (`npm run lint:fix && npm run format`)
- [ ] All tests pass (`npm test`)
- [ ] New public APIs have JSDoc comments
- [ ] No breaking changes without major version bump
- [ ] Bundle size impact is acceptable
- [ ] Examples added for user-facing features
- [ ] TypeDoc comments follow existing patterns
- [ ] No hardcoded values; use config instead

## File Naming & Organization

**Service Classes**: Place in `src/services/ClassName.ts`
```typescript
export class MyService extends SmartContract {
  // implementation
}
```

**Types/Interfaces**: Place in `src/@types/ClassName.ts`
```typescript
export interface MyInterface {
  // definition
}
```

**Utilities**: Place in `src/utils/` with clear names (e.g., `validators.ts`, `helpers.ts`)

**Tests**: Mirror src structure
- `test/unit/services/ClassName.test.ts`
- `test/unit/@types/ClassName.test.ts`
- `test/integration/ClassName.test.ts`

## Key Dependencies to Understand

- **@oceanprotocol/contracts**: Smart contract ABIs and deployment addresses
- **ethers.js**: Blockchain interactions (web3 provider, contract calls)
- **ddo.js**: DID Document standard handling
- **Aquarius**: Decentralized metadata indexer (part of [Ocean Node](https://github.com/oceanprotocol/ocean-node))
- **Provider**: File management and compute job orchestration (part of [Ocean Node](https://github.com/oceanprotocol/ocean-node))

## Error Handling Patterns

```typescript
// Provide context-specific error messages
if (!asset) {
  throw new Error('Asset not found with DID: ' + did)
}

// Use specific error types when available
try {
  // operation
} catch (error) {
  // Log context, but don't expose sensitive info
  logger.error('Operation failed', { userId: account })
  throw new Error('Failed to complete operation')
}
```

## Performance Optimization Tips

- Use `const` and avoid unnecessary reassignments
- Leverage async/await over promise chains for readability
- Consider caching repeated Aquarius queries
- Batch blockchain calls when possible
- Profile bundle size: `npm run build --analyze` (if supported)
- Minimize external dependencies unless essential

## Network & Environment Configuration

- Supports: Ethereum, Polygon, Arbitrum, Base, and more
- Configuration: Check `src/config/` for supported networks
- Environment variables: Documented in `.env.example` (if exists)
- Contract addresses: Auto-loaded from `@oceanprotocol/contracts`

## Version Management

- **Major**: Breaking changes to public APIs
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, performance improvements
- Use `npm version` to bump versions before release
