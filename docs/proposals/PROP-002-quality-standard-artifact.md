---
title: PROP-002: Quality Standard Artifact
id: 01JH5PQRS8T9VWXYZ3ABC4DEF5
type: proposal
status: draft
tags: [quality, enforcement, documentation]
version: 0.1.1
created_at: 2026-01-13
updated_at: 2026-01-13
---

# PROP-002: Quality Standard Artifact

## Metadata

| Field | Value |
|-------|-------|
| **ID** | PROP-002 |
| **Title** | Quality Standard Artifact |
| **Status** | Draft |
| **Created** | 2026-01-13 |
| **Target Version** | 1.2.0 |
| **Depends On** | PROP-001 (Setup CLI) |

## Summary

Todo projeto Kabran deve ter um artefato `docs/quality/001-quality-standard.md` que documenta a configuração de qualidade aplicada e quaisquer overrides com suas justificativas.

## Motivation

### Problema Atual

1. **Overrides não rastreados** - Quando regras são relaxadas, a justificativa fica apenas em comentários no código (ou nem isso)
2. **Falta de visibilidade** - Não há como saber rapidamente quais exceções um projeto tem
3. **Auditoria difícil** - Verificar compliance requer ler múltiplos arquivos de config
4. **Accountability ausente** - Não há registro de quem aprovou exceções e quando

### Solução Proposta

Um artefato obrigatório que:

1. Documenta a versão do kabran-config em uso
2. Lista todos os overrides aplicados com justificativa formal
3. Registra responsável e data de cada exceção
4. Define condição de remoção para exceções temporárias

## Design

### Estrutura do Artefato

```
projeto/
├── docs/
│   └── quality/
│       └── 001-quality-standard.md   # Artefato obrigatório
├── eslint.config.mjs
├── prettier.config.mjs
└── ...
```

### Template do Artefato

```markdown
---
title: Quality Standard
id: <ULID>
type: quality
status: active
version: 1.0.0
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
---

# Quality Standard

> Este documento define a configuração de qualidade do projeto e documenta quaisquer exceções aos padrões Kabran.

## Configuracao Base

| Item | Valor |
|------|-------|
| **Pacote** | @kabran-tecnologia/kabran-config |
| **Versao** | X.Y.Z |
| **Preset ESLint** | node \| react \| base |
| **Preset TypeScript** | node \| react \| base |

## Arquivos de Configuracao

| Arquivo | Status |
|---------|--------|
| `eslint.config.mjs` | Configurado |
| `prettier.config.mjs` | Configurado |
| `tsconfig.json` | Configurado |
| `commitlint.config.mjs` | Configurado |
| `.husky/pre-commit` | Configurado |
| `.husky/commit-msg` | Configurado |

## Overrides Aplicados

> **Principio:** Nenhum padrao de qualidade pode ser relaxado sem justificativa tecnica documentada.

### Nenhum override aplicado

Este projeto segue 100% dos padroes definidos no kabran-config.

<!-- OU, se houver overrides:

### OVR-001: [Nome da Regra]

| Campo | Valor |
|-------|-------|
| **Regra** | `@typescript-eslint/no-unsafe-assignment` |
| **Severidade Original** | error |
| **Severidade Aplicada** | off |
| **Arquivo** | `eslint.config.mjs` |

**Motivo:**
Biblioteca `xyz` v2.3 exporta tipos com `any` implicito em suas definicoes TypeScript.
Nao ha como contornar sem fazer type casting extensivo.

**Tracking:**
- Issue: KAB-123
- Aprovado por: @joao
- Data: 2026-01-13

**Condicao de Remocao:**
Remover quando biblioteca `xyz` atualizar para v3.0 (issue upstream: xyz/xyz#456)

-->

## Validacao

Scripts de validacao configurados:

| Script | Comando | Status |
|--------|---------|--------|
| Lint | `npm run lint` | Ativo |
| Type Check | `npm run type-check` | Ativo |
| Format | `npm run format:check` | Ativo |
| License | `npm run license:check` | Ativo |
| Dependencies | `npm run deps:check` | Ativo |
| README | `npm run readme:validate` | Ativo |
| Environment | `npm run env:validate` | Ativo |

## Historico

| Data | Versao | Descricao |
|------|--------|-----------|
| YYYY-MM-DD | 1.0.0 | Setup inicial |

---

**Referencia:** [Guide 001 - Kabran Config Setup](link-para-nexus)
```

### Script de Validacao

Novo script `quality-standard-validator.mjs` que verifica:

1. Artefato existe em `docs/quality/001-quality-standard.md`
2. Frontmatter valido
3. Secoes obrigatorias presentes
4. Overrides no artefato correspondem aos overrides no codigo

```bash
# Uso
npm run quality:validate

# Ou diretamente
node node_modules/@kabran-tecnologia/kabran-config/src/scripts/quality-standard-validator.mjs
```

### Integracao com Setup CLI

O comando `npx kabran-setup` (PROP-001) deve:

1. Criar `docs/quality/001-quality-standard.md` a partir do template
2. Preencher automaticamente versao do pacote e preset detectado
3. Marcar arquivos de configuracao como "Configurado"

```bash
# Setup completo incluindo quality-standard
npx kabran-setup --type=node

# Resultado:
# Created: eslint.config.mjs
# Created: prettier.config.mjs
# Created: commitlint.config.mjs
# Created: tsconfig.json
# Created: .husky/pre-commit
# Created: .husky/commit-msg
# Created: docs/quality/001-quality-standard.md   # <-- Novo
```

## Implementation

### Fase 1: Template

**Tasks:**

1. **Criar template do artefato**
   - `templates/docs/quality/001-quality-standard.md`
   - Placeholders para valores dinamicos (`{{PACKAGE_VERSION}}`, `{{PRESET}}`)

2. **Adicionar ao package.json exports**

   ```json
   {
     "exports": {
       "./templates/quality-standard": "./templates/docs/quality/001-quality-standard.md"
     }
   }
   ```

### Fase 2: Validator Script

**Tasks:**

1. **Criar script quality-standard-validator.mjs**
   - Verificar existencia do arquivo
   - Parsear frontmatter
   - Validar secoes obrigatorias
   - Comparar overrides documentados vs overrides no codigo

2. **Adicionar ao package.json exports**

   ```json
   {
     "exports": {
       "./scripts/quality-standard-validator": "./src/scripts/quality-standard-validator.mjs"
     }
   }
   ```

### Fase 3: Integracao com Setup CLI

**Tasks:**

1. **Atualizar setup.mjs (PROP-001)**
   - Adicionar criacao do quality-standard.md
   - Detectar preset usado e preencher template
   - Ler versao do pacote instalado

2. **Adicionar flag --skip-quality-standard**
   - Para casos onde usuario quer criar manualmente

### Fase 4: Testes

**Tasks:**

1. **Testes para quality-standard-validator.mjs**
   - Test: arquivo existe e e valido
   - Test: arquivo nao existe (falha)
   - Test: secoes faltando (falha)
   - Test: override no codigo sem documentacao (warning)
   - Test: override documentado mas nao existe no codigo (warning)

2. **Fixtures**
   - `mock-project-valid/` - Projeto com quality-standard valido
   - `mock-project-missing/` - Projeto sem quality-standard
   - `mock-project-incomplete/` - Projeto com quality-standard incompleto

### Fase 5: Documentacao

**Tasks:**

1. **Atualizar README.md**
   - Documentar quality-standard como artefato obrigatorio
   - Documentar script de validacao
   - Exemplo de override documentado

2. **Atualizar Guide 001 (Nexus)**
   - Adicionar secao sobre quality-standard.md
   - Referenciar template do pacote

## Acceptance Criteria

### Must Have

- [ ] Template existe em `templates/docs/quality/001-quality-standard.md`
- [ ] Script `quality-standard-validator.mjs` valida existencia e estrutura
- [ ] `npx kabran-setup` cria o artefato automaticamente
- [ ] Validador detecta overrides nao documentados (warning)
- [ ] Todos os testes passam
- [ ] Documentacao atualizada

### Should Have

- [ ] Validador sugere formato correto para overrides
- [ ] Template pre-preenchido com valores detectados
- [ ] Output colorido e informativo

### Nice to Have

- [ ] Comando `npx kabran-setup add-override` para adicionar override formatado
- [ ] Integracao com CI para bloquear PRs sem quality-standard atualizado

## Validator Logic

### Validacoes Blocking (exit 1)

| Validacao | Mensagem |
|-----------|----------|
| Arquivo nao existe | `Missing required file: docs/quality/001-quality-standard.md` |
| Frontmatter invalido | `Invalid frontmatter in quality-standard.md` |
| Secao "Configuracao Base" ausente | `Missing required section: Configuracao Base` |
| Secao "Overrides Aplicados" ausente | `Missing required section: Overrides Aplicados` |

### Validacoes Warning (exit 0 com aviso)

| Validacao | Mensagem |
|-----------|----------|
| Override no codigo sem documentacao | `Undocumented override found: [rule] in [file]` |
| Override documentado mas nao existe | `Documented override not found in code: [rule]` |
| Versao do pacote desatualizada | `Package version mismatch: documented X.Y.Z, installed A.B.C` |

### Deteccao de Overrides no Codigo

O validador deve:

1. Ler `eslint.config.mjs`
2. Detectar regras customizadas (nao padrao do kabran-config)
3. Comparar com overrides documentados no quality-standard.md

```javascript
// Pseudo-codigo
const documentedOverrides = parseQualityStandard('docs/quality/001-quality-standard.md');
const codeOverrides = detectOverrides('eslint.config.mjs');

for (const override of codeOverrides) {
  if (!documentedOverrides.includes(override)) {
    warn(`Undocumented override: ${override}`);
  }
}

for (const override of documentedOverrides) {
  if (!codeOverrides.includes(override)) {
    warn(`Documented override not in code: ${override}`);
  }
}
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Desenvolvedores ignoram o artefato | Alto | Validador no CI bloqueia merge |
| Artefato fica desatualizado | Medio | Validador detecta divergencias |
| Complexidade de parsing ESLint config | Medio | Usar AST parser, nao regex |

## Timeline

| Fase | Estimativa | Dependencias |
|------|------------|--------------|
| Fase 1: Template | 1h | - |
| Fase 2: Validator | 3h | Fase 1 |
| Fase 3: Setup CLI | 2h | PROP-001, Fase 2 |
| Fase 4: Testes | 2h | Fase 3 |
| Fase 5: Documentacao | 1h | Fase 4 |

**Total estimado:** ~9h de desenvolvimento

## References

- [PROP-001: Project Templates & Setup CLI](./PROP-001-project-templates.md)
- [Guide 001: Kabran Config Setup](nexus/docs/guides/guide-001-kabran-config-setup.md)
- [std-eng-001: Quality Process](nexus/standards/engineering-quality/std-eng-001-quality-process.md)

## Appendix

### A. Template Completo

Ver secao "Template do Artefato" acima.

### B. Exemplo de Override Documentado

```markdown
### OVR-001: no-console

| Campo | Valor |
|-------|-------|
| **Regra** | `no-console` |
| **Severidade Original** | error |
| **Severidade Aplicada** | off |
| **Arquivo** | `eslint.config.mjs` |

**Motivo:**
Este projeto e uma CLI que usa console.log para output ao usuario.
Logs de debug usam biblioteca `debug` e nao console.

**Tracking:**
- Issue: N/A (decisao arquitetural)
- Aprovado por: @joao
- Data: 2026-01-13

**Condicao de Remocao:**
Permanente - natureza do projeto requer console output.
```

### C. Script package.json Completo

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit",
    "license:check": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/license-check.mjs",
    "deps:check": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/dependency-report.mjs --strict",
    "readme:validate": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/readme-validator.mjs",
    "env:validate": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/env-validator.mjs",
    "quality:validate": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/quality-standard-validator.mjs"
  }
}
```
