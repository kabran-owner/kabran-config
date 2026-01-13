---
title: PROP-001: Project Templates & Setup CLI
id: 01KEVMEDCCMEYVXKE40YH0KQ2S
type: guide
status: active
tags: [documentation, guide]
version: 0.1.0
created_at: 2026-01-13
updated_at: 2026-01-13
---

# PROP-001: Project Templates & Setup CLI

## Metadata

| Field | Value |
|-------|-------|
| **ID** | PROP-001 |
| **Title** | Project Templates & Setup CLI |
| **Status** | Draft |
| **Created** | 2026-01-13 |
| **Target Version** | 1.2.0 |

## Summary

Adicionar templates de projeto e script de setup CLI ao kabran-config para facilitar a configuração de novos projetos com os padrões de qualidade Kabran.

## Motivation

### Problema Atual

Configurar um novo projeto requer múltiplos passos manuais:

1. Criar arquivos de configuração (eslint, prettier, commitlint, etc.)
2. Copiar workflows do GitHub Actions
3. Configurar husky hooks
4. Instalar dependências corretas

Isso causa:

- Inconsistência entre projetos
- Tempo perdido em setup repetitivo
- Projetos iniciados sem todas as proteções de qualidade

### Solução Proposta

Um comando `npx kabran-setup` que automatiza todo o processo, seguindo a estratégia:

| Tipo | Comportamento | Atualização |
|------|---------------|-------------|
| **Config files** | Re-export do pacote | Automática via `npm update` |
| **Workflows** | Copiados uma vez | Manual via `--sync-workflows` |
| **Husky hooks** | Copiados uma vez | Manual via `--sync-husky` |

## Design

### Estratégia de Atualização

**Por que separar configs de workflows/husky?**

1. **Configs (eslint, prettier, etc.)** - Devem estar sempre sincronizados com o padrão. Re-export garante isso automaticamente.

2. **Workflows/Husky** - Podem precisar de customização por projeto (secrets específicos, steps adicionais). Cópia única permite controle local.

### Estrutura Proposta

```
kabran-config/
├── src/
│   └── scripts/
│       └── setup.mjs           # CLI de setup (NEW)
├── templates/                   # NEW directory
│   ├── .github/
│   │   └── workflows/
│   │       ├── ci.yml
│   │       ├── commitlint.yml
│   │       └── validate-pr-source.yml
│   ├── .husky/
│   │   ├── pre-commit
│   │   ├── commit-msg
│   │   └── pre-push
│   └── config/
│       ├── eslint.config.mjs
│       ├── eslint-node.config.mjs
│       ├── eslint-react.config.mjs
│       ├── prettier.config.mjs
│       ├── commitlint.config.mjs
│       └── lint-staged.config.mjs
└── package.json                 # Updated with bin + exports
```

### CLI Interface

```bash
# Setup inicial (projeto novo)
npx kabran-setup                     # Default: Node.js
npx kabran-setup --type=node         # Node.js project
npx kabran-setup --type=react        # React project
npx kabran-setup --type=base         # Base TypeScript

# Sincronização (após npm update kabran-config)
npx kabran-setup --sync-workflows    # Atualiza .github/workflows/
npx kabran-setup --sync-husky        # Atualiza .husky/

# Opções adicionais
npx kabran-setup --skip-husky        # Não configura husky
npx kabran-setup --skip-workflows    # Não copia workflows
npx kabran-setup --force             # Sobrescreve arquivos existentes
npx kabran-setup --dry-run           # Preview sem executar
```

### Arquivos de Config (Re-export)

Os arquivos de config fazem re-export do pacote, garantindo sincronização automática:

```javascript
// prettier.config.mjs (gerado no projeto)
export {default} from '@kabran-tecnologia/kabran-config/prettier';
```

Quando kabran-config é atualizado (`npm update`), o projeto automaticamente usa a nova versão.

### Workflows Template

**ci.yml** - Pipeline de CI padrão:

- lint, type-check, build, test (paralelo)
- ci-success job de verificação
- Concurrency para cancelar runs anteriores
- Cache de npm

**commitlint.yml** - Validação de commits:

- Valida todos os commits do PR
- Usa configuração do kabran-config

**validate-pr-source.yml** - Validação de branch source:

- PRs para `main` só de `staging` ou `hotfix/*`
- Enforça fluxo GitFlow

### Husky Hooks Template

**pre-commit:**

```bash
npx lint-staged
```

**commit-msg:**

```bash
npx --no -- commitlint --edit $1
```

**pre-push:**

```bash
npm run lint
npm run type-check
npm test
npm run build
```

## Implementation

### Fase 1: Estrutura Base

**Tasks:**

1. **Criar estrutura templates/**
   - Criar diretório `templates/`
   - Criar subdiretórios `.github/workflows/`, `.husky/`, `config/`

2. **Criar templates de workflows**
   - `ci.yml` - CI pipeline padrão
   - `commitlint.yml` - Validação de commits
   - `validate-pr-source.yml` - Validação de branch source

3. **Criar templates de husky**
   - `pre-commit` - lint-staged
   - `commit-msg` - commitlint
   - `pre-push` - quality gate

4. **Criar templates de config**
   - `eslint.config.mjs` - Base ESLint (re-export)
   - `eslint-node.config.mjs` - Node.js ESLint (re-export)
   - `eslint-react.config.mjs` - React ESLint (re-export)
   - `prettier.config.mjs` - Prettier (re-export)
   - `commitlint.config.mjs` - Commitlint (re-export)
   - `lint-staged.config.mjs` - Lint-staged (re-export)

### Fase 2: Setup CLI

**Tasks:**

1. **Criar script setup.mjs**
   - Parse de argumentos (--type, --skip-*, --sync-*, --force, --dry-run)
   - Lógica de cópia com verificação de existência
   - Modo sync para workflows e husky
   - Output colorido e informativo

2. **Atualizar package.json**
   - Adicionar `bin.kabran-setup`
   - Adicionar export `./scripts/setup`
   - Adicionar `templates` em `files`

### Fase 3: Testes

**Tasks:**

1. **Criar testes para setup.mjs**
   - Test: setup em projeto novo
   - Test: setup com arquivos existentes (skip)
   - Test: sync-workflows sobrescreve
   - Test: sync-husky sobrescreve
   - Test: --dry-run não modifica arquivos
   - Test: --force sobrescreve tudo
   - Test: --type=react usa template correto

2. **Criar fixtures de teste**
   - `mock-empty-project/` - Projeto vazio
   - `mock-existing-project/` - Projeto com configs existentes

### Fase 4: Documentação

**Tasks:**

1. **Atualizar README.md**
   - Seção "Project Templates"
   - Documentar estratégia de atualização
   - Exemplos de uso do CLI
   - Post-setup checklist

2. **Atualizar CHANGELOG.md**
    - Entry para versão 1.2.0
    - Documentar nova feature

## Testing Strategy

### Unit Tests (Vitest)

```javascript
// tests/node/setup.test.mjs

describe('setup CLI', () => {
  describe('setup mode', () => {
    it('should create config files in empty project');
    it('should skip existing config files');
    it('should copy workflows');
    it('should copy husky hooks');
    it('should use correct eslint template for --type=react');
    it('should use correct eslint template for --type=node');
  });

  describe('sync mode', () => {
    it('should overwrite workflows with --sync-workflows');
    it('should overwrite husky with --sync-husky');
    it('should not modify configs in sync mode');
  });

  describe('options', () => {
    it('should not modify files with --dry-run');
    it('should overwrite all with --force');
    it('should skip husky with --skip-husky');
    it('should skip workflows with --skip-workflows');
  });
});
```

### Integration Tests

```javascript
// tests/node/setup-integration.test.mjs

describe('setup integration', () => {
  it('should setup a complete Node.js project');
  it('should setup a complete React project');
  it('should be idempotent (run twice produces same result)');
});
```

### Fixtures

```
tests/fixtures/
├── mock-empty-project/
│   └── package.json
├── mock-existing-project/
│   ├── package.json
│   ├── eslint.config.mjs      # Existing config
│   └── .github/workflows/
│       └── ci.yml             # Existing workflow
└── mock-setup-expected/
    ├── node/                  # Expected output for --type=node
    └── react/                 # Expected output for --type=react
```

## Acceptance Criteria

### Must Have

- [ ] `npx kabran-setup` funciona em projeto vazio
- [ ] `npx kabran-setup --type=react` usa template React
- [ ] `npx kabran-setup --type=node` usa template Node.js
- [ ] Configs existentes NÃO são sobrescritos por padrão
- [ ] `--sync-workflows` sobrescreve workflows
- [ ] `--sync-husky` sobrescreve husky hooks
- [ ] `--dry-run` mostra preview sem modificar
- [ ] `--force` sobrescreve tudo
- [ ] Todos os testes passam
- [ ] Documentação atualizada

### Should Have

- [ ] Output colorido e informativo
- [ ] Mensagens de erro claras
- [ ] Help (`--help`) documentado

### Nice to Have

- [ ] Detecção automática de tipo de projeto
- [ ] Validação de package.json antes do setup

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Usuário perde customização ao usar --force | Alto | Warning claro no output; recomendação de backup |
| Workflow template não funciona para todos os projetos | Médio | Documentar que templates são ponto de partida |
| Conflito com configs existentes | Médio | Política padrão de não sobrescrever |

## Timeline

| Fase | Estimativa | Dependências |
|------|------------|--------------|
| Fase 1: Estrutura Base | 2h | - |
| Fase 2: Setup CLI | 3h | Fase 1 |
| Fase 3: Testes | 2h | Fase 2 |
| Fase 4: Documentação | 1h | Fase 3 |

**Total estimado:** ~8h de desenvolvimento

## References

- [Kabran Quality Standards](nexus/standards/std-001-quality-process.md)
- [Branch Protection Rules](nexus/standards/team-workflow/std-work-003-branch-protection.md)
- [Conventional Commits](https://www.conventionalcommits.org/)

## Appendix

### A. Template: ci.yml

```yaml
name: CI

on:
  pull_request:
    branches: [main, staging]
  push:
    branches: [main, staging]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: "npm"
      - run: npm ci
      - run: npm run lint

  type-check:
    name: Type Check
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: "npm"
      - run: npm ci
      - run: npm run type-check

  build:
    name: Build
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: "npm"
      - run: npm ci
      - run: npm run build

  test:
    name: Test
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: "npm"
      - run: npm ci
      - run: npm test
        env:
          CI: true

  ci-success:
    name: CI Success
    runs-on: ubuntu-latest
    needs: [lint, type-check, build, test]
    if: always()
    steps:
      - name: Check all jobs passed
        run: |
          if [[ "${{ needs.lint.result }}" != "success" ]] ||
             [[ "${{ needs.type-check.result }}" != "success" ]] ||
             [[ "${{ needs.build.result }}" != "success" ]] ||
             [[ "${{ needs.test.result }}" != "success" ]]; then
            echo "One or more jobs failed"
            exit 1
          fi
          echo "All jobs passed!"
```

### B. Template: validate-pr-source.yml

```yaml
name: Validate PR Source

on:
  pull_request:
    branches: [main]

jobs:
  validate-source:
    name: Validate Source Branch
    runs-on: ubuntu-latest
    timeout-minutes: 2
    steps:
      - name: Check PR source branch
        run: |
          SOURCE_BRANCH="${{ github.head_ref }}"

          if [[ "$SOURCE_BRANCH" == "staging" ]] || [[ "$SOURCE_BRANCH" == hotfix/* ]]; then
            echo "✅ Branch permitida: $SOURCE_BRANCH"
            exit 0
          fi

          echo "❌ PRs para main só podem vir de:"
          echo "   - staging"
          echo "   - hotfix/*"
          exit 1
```

### C. Template: commitlint.yml

```yaml
name: Commitlint

on:
  pull_request:
    branches: [main, staging]

jobs:
  commitlint:
    name: Validate Commits
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: "npm"
      - run: npm ci
      - run: npx commitlint --from ${{ github.event.pull_request.base.sha }} --to ${{ github.event.pull_request.head.sha }} --verbose
```

### D. Config Template Example (Re-export)

```javascript
// prettier.config.mjs
export {default} from '@kabran-tecnologia/kabran-config/prettier';
```

```javascript
// eslint.config.mjs (Node.js)
import kabranConfig from '@kabran-tecnologia/kabran-config/eslint/node';

export default [
  ...kabranConfig,
  {
    ignores: ['dist', 'build', 'coverage', 'node_modules'],
  },
];
```
