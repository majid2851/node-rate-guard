# Contributing to node-rate-guard

Thank you for your interest in contributing to node-rate-guard! This document provides guidelines and information for contributors.

## Development Setup

1. Fork and clone the repository:
```bash
git clone https://github.com/majid2851/node-rate-guard.git
cd node-rate-guard
npm install
```

2. Run tests to ensure everything works:
```bash
npm test
```

3. Build the project:
```bash
npm run build
```

## Scripts

- `npm test` - Run test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run build` - Build the package
- `npm run lint` - Lint code
- `npm run dev:example` - Run basic example
- `npm run dev:login` - Run login protection example
- `npm run dev:redis` - Run Redis example (requires Redis server)

## Project Structure

```
src/
├── middleware/         # Main rateGuard middleware
├── stores/            # Storage implementations (Memory, Redis)
├── utils/             # Utility functions
└── index.ts           # Public API exports

test/                  # Test files
examples/             # Usage examples
```

## Making Changes

1. Create a feature branch from main:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes and add tests
3. Run the test suite: `npm test`
4. Run linting: `npm run lint`
5. Build the project: `npm run build`

## Testing

- Write tests for new features and bug fixes
- Ensure all tests pass before submitting
- Add integration tests for new store implementations
- Test examples manually when making changes

## Pull Request Process

1. Update the README.md if you're adding new features
2. Add entries to CHANGELOG.md
3. Ensure all tests pass and linting is clean
4. Submit a pull request with a clear description of changes

## Code Style

- Follow the existing TypeScript style
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions focused and small

## Questions?

Feel free to open an issue for questions or discussions about contributing.