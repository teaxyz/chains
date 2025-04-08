# Chains Test Project

A comprehensive tool for managing and validating blockchain chain configurations.

## Features

### Chain Configuration Management
- Validate chain configuration files against JSON schema
- Remove deprecated network parameters
- Batch processing with multi-threading support
- Caching for improved performance

### Validation Features
- Chain ID consistency checks
- RPC URL validation
- Explorer URL validation
- Custom validation rules support

### Development Tools
- Dry-run mode for safe testing
- Backup and rollback functionality
- Progress reporting
- Detailed error messages

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/chains-test.git
cd chains-test

# Install dependencies
./gradlew build
```

## Usage

### Schema Validation

Validate chain configuration files:

```bash
./gradlew run --args="schemaCheck"
```

Options:
- `--verbose`: Show detailed validation output
- `--single-chain=<filename>`: Validate a single chain file

### Network Parameter Removal

Remove deprecated network parameters:

```bash
node tools/rmNetwork.js [options]
```

Options:
- `--dry-run`: Test run without making changes
- `--batch-size=<number>`: Set batch size for processing (default: 10)

### Development Workflow

1. Make changes to chain configurations
2. Run validation checks:
   ```bash
   ./gradlew clean run --args="verbose singleChainCheck <filename>"
   ```
3. Run tests with coverage:
   ```bash
   ./gradlew test jacocoTestReport
   ```
4. Check static code analysis:
   ```bash
   ./gradlew detekt
   ```

## CI/CD

The project uses GitHub Actions for continuous integration and deployment:

### Build Workflow
- Matrix builds across multiple OS and Java versions
- Automated tests with coverage reporting
- Static code analysis
- Artifact publishing

### Deployment Workflow
- Security scanning
- Dependency checks
- Automated deployment to GitHub Pages
- Success/failure notifications

## Project Structure

```
.
├── _data/
│   └── chains/          # Chain configuration files
├── tools/
│   ├── schemaCheck.js   # Schema validation tool
│   └── rmNetwork.js     # Network parameter removal tool
├── .github/
│   └── workflows/       # CI/CD configurations
└── gradle/              # Gradle configuration
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Run the test suite
5. Submit a pull request

## Security

- All changes are validated through CI/CD pipeline
- Dependency scanning for vulnerabilities
- Backup creation before any modifications
- Rollback support for failed operations

## License

[Add your license information here]

## Support

For issues and feature requests, please use the GitHub issue tracker.
