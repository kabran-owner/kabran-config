# @kabran-tecnologia/kabran-config

Shared quality configurations for Kabran projects. One package to standardize ESLint, Prettier, TypeScript, Commitlint, and lint-staged across all repositories.

> **AI-Native Design:** These configs are optimized for AI agent development workflows.

## Installation

```bash
npm install -D @kabran-tecnologia/kabran-config
```

### Peer Dependencies

Install the required peer dependencies based on what you need:

**For all projects (minimum):**

```bash
npm install --save-dev \
  eslint@^9 \
  @eslint/js@^9 \
  typescript-eslint@^8 \
  eslint-config-prettier@^10 \
  eslint-plugin-import@^2 \
  prettier@^3 \
  typescript@^5 \
  @commitlint/cli@^19 \
  @commitlint/config-conventional@^19 \
  husky@^9 \
  lint-staged@^16
```

**For React projects (additional):**

```bash
npm install --save-dev \
  eslint-plugin-react-hooks@^5 \
  eslint-plugin-react-refresh@^0.4 \
  eslint-plugin-jsx-a11y@^6 \
  prettier-plugin-tailwindcss@^0.5
```

**For JSDoc enforcement (optional):**

```bash
npm install --save-dev eslint-plugin-jsdoc@^50
```

---

## Project Templates (Recommended)

The fastest way to set up a new project with Kabran quality standards.

### Quick Start

```bash
# Install kabran-config
npm install -D @kabran-tecnologia/kabran-config

# Run setup CLI
npx kabran-setup              # Default: Node.js project
npx kabran-setup --type=react # React project
npx kabran-setup --type=base  # Base TypeScript
```

This will create:

- GitHub workflows (`ci.yml`, `commitlint.yml`, `validate-pr-source.yml`)
- Husky hooks (`pre-commit`, `commit-msg`, `pre-push`)
- Config files (`eslint.config.mjs`, `prettier.config.mjs`, `commitlint.config.mjs`, `lint-staged.config.mjs`)
- Quality standard (`docs/quality/001-quality-standard.md`)

### CLI Options

```bash
npx kabran-setup [options]

Options:
  --type=<type>           Project type: node, react, base (default: node)
  --skip-husky            Don't copy husky hooks
  --skip-workflows        Don't copy GitHub workflow files
  --skip-quality-standard Don't create quality-standard.md
  --sync-workflows        Overwrite existing workflow files
  --sync-husky            Overwrite existing husky hooks
  --force                 Overwrite all existing files
  --dry-run               Preview changes without modifying files
  --help                  Show help message
```

---

## Usage

### ESLint

Choose the configuration that matches your project:

**Base (TypeScript only):**

```javascript
// eslint.config.mjs
import kabranConfig from "@kabran-tecnologia/kabran-config/eslint";

export default [...kabranConfig];
```

**Node.js:**

```javascript
// eslint.config.mjs
import kabranConfig from "@kabran-tecnologia/kabran-config/eslint/node";

export default [...kabranConfig];
```

**React:**

```javascript
// eslint.config.mjs
import kabranConfig from "@kabran-tecnologia/kabran-config/eslint/react";

export default [...kabranConfig];
```

**With customizations:**

```javascript
// eslint.config.mjs
import kabranConfig from "@kabran-tecnologia/kabran-config/eslint/react";

export default [
  ...kabranConfig,
  {
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
];
```

---

### Prettier

```javascript
// prettier.config.mjs
export { default } from "@kabran-tecnologia/kabran-config/prettier";
```

**With customizations:**

```javascript
// prettier.config.mjs
import config from "@kabran-tecnologia/kabran-config/prettier";

export default {
  ...config,
  printWidth: 120,
};
```

---

### TypeScript

**Node.js project:**

```json
// tsconfig.json
{
  "extends": "@kabran-tecnologia/kabran-config/tsconfig/node",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**React project (Vite):**

```json
// tsconfig.json
{
  "extends": "@kabran-tecnologia/kabran-config/tsconfig/react",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

---

### Commitlint

```javascript
// commitlint.config.mjs
export { default } from "@kabran-tecnologia/kabran-config/commitlint";
```

**With custom scopes:**

```javascript
// commitlint.config.mjs
import config from "@kabran-tecnologia/kabran-config/commitlint";

export default {
  ...config,
  rules: {
    ...config.rules,
    "scope-enum": [2, "always", ["api", "web", "docs", "ci"]],
  },
};
```

---

### Lint-Staged

Add to your `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{js,jsx,mjs,cjs}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css,scss,yaml,yml}": ["prettier --write"],
    "*.py": ["black"]
  }
}
```

Or use the config file:

```javascript
// lint-staged.config.mjs
export { default } from "@kabran-tecnologia/kabran-config/lint-staged";
```

---

### Husky Setup

```bash
# Initialize Husky
npx husky init

# Add pre-commit hook
echo "npx lint-staged" > .husky/pre-commit

# Add commit-msg hook
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
```

---

## Package Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit",
    "license:check": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/license-check.mjs",
    "deps:report": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/dependency-report.mjs",
    "deps:check": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/dependency-report.mjs --strict",
    "readme:validate": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/readme-validator.mjs",
    "env:validate": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/env-validator.mjs",
    "quality:validate": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/quality-standard-validator.mjs",
    "prepare": "husky"
  }
}
```

---

## Enforcement Scripts

The package includes compliance and security scripts:

### License Check

Scans dependencies for prohibited licenses (GPL, AGPL) to ensure legal compliance.

```bash
node node_modules/@kabran-tecnologia/kabran-config/src/scripts/license-check.mjs
```

**Blocked licenses:** GPL, AGPL, LGPL, EUPL (viral copyleft)
**Exit code:** 1 if prohibited licenses found, 0 otherwise

---

### Dependency Report

Generates a report of outdated dependencies. Supports both informational and strict modes.

```bash
# Informational mode (default) - always exits 0
node node_modules/@kabran-tecnologia/kabran-config/src/scripts/dependency-report.mjs

# Strict mode - fails if packages > 2 years old
node node_modules/@kabran-tecnologia/kabran-config/src/scripts/dependency-report.mjs --strict
```

---

### README Validator

Validates that README.md exists and contains required sections.

```bash
node node_modules/@kabran-tecnologia/kabran-config/src/scripts/readme-validator.mjs
```

**Required sections:** Installation, Usage, License
**Exit code:** 1 if required sections missing, 0 otherwise

---

### Environment Variables Validator

Validates .env.example exists (if project uses env vars) and ensures .env is not committed to git.

```bash
node node_modules/@kabran-tecnologia/kabran-config/src/scripts/env-validator.mjs
```

---

### Quality Standard Validator

Validates that projects have a `docs/quality/001-quality-standard.md` file.

```bash
node node_modules/@kabran-tecnologia/kabran-config/src/scripts/quality-standard-validator.mjs
```

---

## CI/CD Scripts

The package provides standardized CI/CD tooling.

### Quick Start

```bash
# Create CI configuration
cat > scripts/ci-config.sh << 'EOF'
#!/usr/bin/env bash
PROJECT_NAME="my-project"
PM="npm"

ci_steps() {
  run_step "lint" "cd '$PROJECT_ROOT' && $PM run lint" || FAILED=1
  run_step "test" "cd '$PROJECT_ROOT' && $PM test" || FAILED=1
  run_step "build" "cd '$PROJECT_ROOT' && $PM run build" || FAILED=2
  return $FAILED
}
EOF

# Create CI wrapper
cat > scripts/ci.sh << 'EOF'
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RUNNER="$PROJECT_ROOT/node_modules/@kabran-tecnologia/kabran-config/src/scripts/ci/ci-runner.sh"

export PROJECT_ROOT="$PROJECT_ROOT"
export CI_CONFIG_FILE="$SCRIPT_DIR/ci-config.sh"
exec bash "$RUNNER" "$@"
EOF

chmod +x scripts/*.sh
```

For detailed migration instructions, see [CI-CD-MIGRATION.md](./CI-CD-MIGRATION.md).

---

## What's Included

| Config             | Description                   |
| ------------------ | ----------------------------- |
| `./eslint`         | Base ESLint for TypeScript    |
| `./eslint/node`    | ESLint for Node.js            |
| `./eslint/react`   | ESLint for React              |
| `./prettier`       | Prettier with Tailwind plugin |
| `./tsconfig/base`  | Base TypeScript (strict mode) |
| `./tsconfig/node`  | TypeScript for Node.js        |
| `./tsconfig/react` | TypeScript for React/Vite     |
| `./commitlint`     | Conventional commits          |
| `./lint-staged`    | Pre-commit lint + format      |
| `./scripts/*`      | Validation and CI/CD scripts  |

---

## AI-Native Design Decisions

These configurations are optimized for AI agent development workflows:

| Decision          | Value           | Rationale                                          |
| ----------------- | --------------- | -------------------------------------------------- |
| `printWidth`      | 120             | Balance between token density (AI) and readability |
| `bracketSpacing`  | false           | AI-First: saves 2 tokens per object at scale       |
| `trailingComma`   | all             | Cleaner diffs, fewer syntax errors                 |
| `no-unused-vars`  | off (ESLint)    | Prevents "Refactor Loop Syndrome"                  |
| `noUnusedLocals`  | true (tsconfig) | Catch unused vars at build time                    |
| Security rules    | error           | Block any code injection                           |
| `no-explicit-any` | error           | Force explicit types                               |

---

## Development & Publishing

This package uses **semantic-release** for automated versioning and publishing.

**Commit types and version impact:**

| Commit Type | Version Bump          | Example                                |
| ----------- | --------------------- | -------------------------------------- |
| `fix:`      | Patch (1.0.0 → 1.0.1) | `fix: correct license check exit code` |
| `feat:`     | Minor (1.0.0 → 1.1.0) | `feat: add quality standard validator` |
| `feat!:`    | Major (1.0.0 → 2.0.0) | `feat!: change config export format`   |

---

## License

MIT
