# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-28

### Added
- Initial release of node-rate-guard
- TypeScript-first rate limiting middleware for Express
- Memory store for single-server deployments
- Redis store for distributed/multi-server deployments
- Standard and legacy rate-limit headers support
- Configurable key generation (IP, user ID, custom)
- Skip functionality for whitelisting requests
- Custom error handlers
- Comprehensive test suite with 31 tests
- Production-ready examples:
  - Basic usage with memory store
  - Route-specific login protection
  - Redis-backed distributed setup
- Full TypeScript support with exported types
- CI/CD pipeline with GitHub Actions
- Comprehensive documentation and examples

### Features
- Zero runtime dependencies (peer dependencies only)
- Support for both CommonJS and ES modules
- Graceful error handling and connection management
- Automatic cleanup of expired entries
- Configurable window sizes and limits
- Production-ready with battle-tested patterns
