---
title: PROP-006: JSDoc Traceability Tags
id: 01JH6JSDOC006TRACEABILITY
type: proposal
status: draft
tags: [jsdoc, traceability, spec-driven, documentation]
version: 0.3.1
created_at: 2026-01-13
updated_at: 2026-01-13
---

# PROP-006: JSDoc Traceability Tags

## Metadata

| Field | Value |
|-------|-------|
| **ID** | PROP-006 |
| **Title** | JSDoc Traceability Tags |
| **Status** | Draft |
| **Created** | 2026-01-13 |
| **Target Version** | Global (all projects) |
| **Depends On** | ADR-043 (Fragmented Specs) |
| **Implementation** | kabran-config |

## Summary

Padronizar o uso de JSDoc tags para rastreabilidade bidirecional entre codigo e especificacoes, permitindo que todo codigo seja rastreavel ate sua origem (spec, task, PRD) e que toda spec tenha seu codigo facilmente localizavel.

## Motivation

### Problema Atual

1. **Rastreabilidade inconsistente** - Alguns arquivos usam `@see AGT-xxx`, outros nao documentam origem
2. **Busca ineficiente** - Dificil encontrar todo codigo relacionado a uma spec
3. **Auditoria manual** - Verificar cobertura de ACs requer leitura manual
4. **Onboarding lento** - Novos devs nao sabem qual spec originou cada modulo

### Visao: Codigo Rastreavel

```
┌─────────────────────────────────────────────────────────────────┐
│                    Rastreabilidade Bidirecional                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   PRD (RF-007)                                                  │
│       ↓                                                         │
│   Spec (S25-website-institucional)                              │
│       ↓                                                         │
│   ACs (AC-01, AC-02, ...)                                       │
│       ↓                                                         │
│   Codigo (@spec S25, @implements AC-01)                         │
│                                                                 │
│   Busca: grep -r "@spec S25" → Lista todos arquivos             │
│   Busca: grep -r "@implements AC-01" → Codigo especifico        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Impacto Esperado

| Metrica | Antes | Depois |
|---------|-------|--------|
| Tempo para encontrar codigo de uma spec | ~10 min | ~10 seg |
| Cobertura de ACs verificavel | Manual | Automatizada |
| Onboarding (entender origem do codigo) | Dias | Minutos |
| Code review (verificar spec alignment) | Subjetivo | Objetivo |

## Design

### Tags Padronizadas

| Tag | Proposito | Formato |
|-----|-----------|---------|
| `@spec` | Link para spec (fonte da verdade) | `@spec S25` |
| `@implements` | ACs que o codigo implementa | `@implements AC-01, AC-02` |
| `@task` | Link para task do Linear | `@task AGT-1087` |
| `@prd` | Link para requisito do PRD | `@prd RF-007` |
| `@see` | Referencias externas ou arquivos | `@see RFC 6585` |
| `@deprecated` | Codigo obsoleto | `@deprecated Use X instead` |

**Filosofia:** Todas as tags sao opcionais. Validacao foca em formato correto quando usadas, nao em presenca obrigatoria.

### Formato da Tag @spec

**Decisao:** Usar sempre o ID da spec (prefixo numerico).

**Racional:**

- IDs sao estaveis (nomes podem mudar)
- Busca mais precisa (`@spec S25` vs `@spec S25-website`)
- Consistencia entre projetos

**Formato:**

```typescript
// CORRETO - Usar ID da spec
@spec S25

// EVITAR - Nome completo (pode ficar desatualizado)
@spec S25-website-institucional
```

### Formato de Numeracao de ACs

**Decisao:** Manter ACs com numeracao simples (AC-01, AC-02) dentro de cada spec.

**Racional:**

- ACs sao sempre contextualizados pela tag `@spec`
- Formato `AC-S25-01` seria redundante e verboso
- Busca combinada resolve a localizacao

**Busca combinada:**

```bash
# Encontrar codigo que implementa AC-01 da S25
grep -l "@spec S25" **/*.ts | xargs grep "@implements AC-01"

# Listar todos ACs implementados de uma spec
grep -l "@spec S25" **/*.ts | xargs grep -h "@implements" | sort -u
```

### Edge Cases

#### Multiplas Specs

Quando um arquivo implementa ACs de multiplas specs, usar formato qualificado:

```typescript
/**
 * Shared Analytics Component
 *
 * @spec S25
 * @spec S26
 * @implements S25:AC-01, S25:AC-02
 * @implements S26:AC-03
 */
```

**Regra:** Quando houver multiplas `@spec`, ACs DEVEM ser qualificados com `SPEC:AC-XX`.

#### @implements Orfao

**Regra:** `@implements` sem `@spec` e um ERRO. Validacao deve falhar.

```typescript
// ERRO - @implements sem @spec
/**
 * @implements AC-01  // De qual spec?
 */

// CORRETO
/**
 * @spec S25
 * @implements AC-01
 */
```

### Exemplos de Uso

#### Componente Principal

```typescript
/**
 * Website Header Component
 *
 * Renders the main navigation header with responsive menu.
 *
 * @spec S25
 * @implements AC-01
 * @prd RF-007
 */
export function Header() {
  // ...
}
```

#### Modulo com Multiplos ACs

```typescript
/**
 * SEO Meta Tags Handler
 *
 * Generates meta tags for SEO optimization including
 * Open Graph and Twitter Cards.
 *
 * @spec S25
 * @implements AC-09
 * @see https://ogp.me/ - Open Graph Protocol
 */
export function generateMetaTags(page: PageMeta): MetaTags {
  // ...
}
```

#### Edge Function

```typescript
/**
 * Rate Limiter for Supabase Edge Functions
 *
 * @spec S12-rate-limiting
 * @task AGT-503
 * @prd RNF-004
 * @implements AC-01, AC-02, AC-03
 * @see RFC 6585 - HTTP 429 Too Many Requests
 */
export function createRateLimiter(supabase: SupabaseClient) {
  // ...
}
```

#### Arquivo de Tipos

```typescript
/**
 * Analytics RPC Types
 *
 * Type definitions for analytics-related Supabase RPC functions.
 *
 * @spec S18
 * @task AGT-960
 * @see analytics.service.ts - Frontend service using these RPCs
 */

export interface DashboardStatsRow {
  // ...
}
```

#### Helper Interno (Tags Opcionais)

```typescript
/**
 * Format date for display
 *
 * @param date - Date to format
 * @returns Formatted date string
 */
function formatDate(date: Date): string {
  // Helpers internos nao precisam de @spec/@implements
}
```

### Quando Usar (Recomendacoes)

| Tipo de Arquivo | @spec | @implements | @task |
|-----------------|-------|-------------|-------|
| Componentes React | Recomendado | Recomendado | Opcional |
| Services | Recomendado | Recomendado | Opcional |
| Edge Functions | Recomendado | Recomendado | Opcional |
| Types/Interfaces | Recomendado | Opcional | Opcional |
| Hooks | Recomendado | Recomendado | Opcional |
| Utils/Helpers | Opcional | Opcional | Opcional |
| Tests | Recomendado | Recomendado | Opcional |
| Config files | Opcional | N/A | Opcional |

**Nota:** Estas sao recomendacoes, nao regras. O valor esta na rastreabilidade, nao na conformidade.

### Tooling

#### Script de Validacao

```bash
#!/bin/bash
# validate-traceability.sh
# Valida FORMATO das tags (nao presenca)

# Validar @implements sem @spec (erro de integridade)
echo "=== Verificando @implements orfaos ==="
for file in $(grep -rl "@implements" --include="*.ts" --include="*.tsx"); do
  if ! grep -q "@spec" "$file"; then
    echo "ERROR: $file tem @implements sem @spec"
    exit 1
  fi
done

# Validar formato do @spec (deve ser SXX, nao nome completo)
echo "=== Verificando formato @spec ==="
grep -rn "@spec S[0-9]*-" --include="*.ts" --include="*.tsx" && \
  echo "WARN: Usar apenas ID da spec (@spec S25), nao nome completo"

echo "Validacao concluida"
```

#### Relatorio de Cobertura

```bash
#!/bin/bash
# coverage-report.sh

SPEC=$1  # Ex: S25

echo "=== Cobertura de $SPEC ==="

# Listar arquivos
echo "Arquivos:"
grep -rl "@spec $SPEC" --include="*.ts" --include="*.tsx"

# Listar ACs implementados
echo ""
echo "ACs implementados:"
grep -rh "@implements" --include="*.ts" --include="*.tsx" \
  $(grep -rl "@spec $SPEC") | \
  sed 's/.*@implements //' | tr ',' '\n' | sort -u
```

#### ESLint Rule (Futuro)

```javascript
// eslint-plugin-kabran/rules/require-spec-tag.js
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require @spec tag in component files',
    },
  },
  create(context) {
    return {
      Program(node) {
        const comments = context.getSourceCode().getAllComments();
        const hasSpecTag = comments.some(c => c.value.includes('@spec'));

        if (!hasSpecTag && isRequiredFile(context.getFilename())) {
          context.report({
            node,
            message: 'Missing @spec JSDoc tag',
          });
        }
      },
    };
  },
};
```

### Integracao com CI

```yaml
# .github/workflows/traceability.yml
traceability-check:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Check @spec tags
      run: |
        ./scripts/validate-traceability.sh
        if [ $? -ne 0 ]; then
          echo "::warning::Some files missing @spec tags"
        fi

    - name: Generate coverage report
      run: |
        for spec in S01 S02 S03; do
          ./scripts/coverage-report.sh $spec >> coverage.md
        done

    - name: Comment PR
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v7
      with:
        script: |
          const fs = require('fs');
          const coverage = fs.readFileSync('coverage.md', 'utf8');
          github.rest.issues.createComment({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: context.issue.number,
            body: '## Spec Traceability\n\n' + coverage
          });
```

## Implementation Phases

### Phase 1: Documentacao (v1.0)

- [x] Criar PROP-006 (este documento)
- [ ] Revisar e aprovar proposta
- [ ] Promover para standard em kabran-config

### Phase 2: Adocao Manual (v1.1)

- [ ] Atualizar CLAUDE.md global com convencao
- [ ] Treinar agentes via prompt engineering
- [ ] Aplicar em novos arquivos de projetos

### Phase 3: Scripts de Validacao (v1.2)

- [ ] Criar validate-traceability.sh em kabran-config
- [ ] Criar coverage-report.sh em kabran-config
- [ ] Integrar no CI template (ci-runner.sh)

### Phase 4: ESLint Plugin (v2.0)

- [ ] Criar eslint-traceability.mjs em kabran-config
- [ ] Implementar require-spec-tag rule
- [ ] Exportar via package.json
- [ ] Integrar em projetos consumidores

### Phase 5: Dashboard de Cobertura (v2.1)

- [ ] API para agregar cobertura cross-project
- [ ] Visualizacao no Quality Dashboard
- [ ] Alertas de specs sem cobertura

## Rollout Strategy

| Tipo de Projeto | Estrategia |
|-----------------|------------|
| **Novos projetos** | Obrigatorio desde o inicio |
| **Projetos ativos** | Adocao gradual (novos arquivos) |
| **Projetos legados** | Opcional (retrofitting sob demanda) |

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Overhead de documentacao | Medium | Low | Tags opcionais para helpers |
| Tags desatualizadas | Medium | Medium | Validacao no CI |
| Resistencia a adocao | Low | Medium | Tooling que facilita |
| Busca lenta em repos grandes | Low | Low | Indices pre-computados |

## Success Metrics

| Metric | Target |
|--------|--------|
| Tags com formato valido | 100% |
| @implements sem @spec (orfaos) | 0 |
| Tempo de busca codigo↔spec | < 30 seg |
| Adocao organica (arquivos com tags) | Crescente |

## References

- [ADR-043 Fragmented Specs](https://github.com/kabran-tecnologia/nexus/blob/main/architecture/adr/adr-043-fragmented-spec-structure.md)
- [JSDoc Reference](https://jsdoc.app/)
- [TSDoc Standard](https://tsdoc.org/)
- [kabran-config Repository](https://github.com/kabran-tecnologia/kabran-config)

---

## Changelog

| Versao | Data | Mudancas |
|--------|------|----------|
| 0.1.0 | 2026-01-13 | Versao inicial - convencao de tags |
| 0.2.0 | 2026-01-13 | Escopo global: removido ref CIE, padronizado formato @spec, adicionado edge cases, rollout strategy |
| 0.3.0 | 2026-01-13 | Filosofia opcional: tags recomendadas (nao obrigatorias), validacao foca em formato e integridade |
