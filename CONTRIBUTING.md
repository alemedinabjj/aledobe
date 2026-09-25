# Contribuindo com o Aledobe

Valeu pelo interesse! Este guia explica como montar o ambiente, como organizar branch e commits e o que olhamos na revisão de um PR. Leia antes do primeiro PR; economiza ida e volta pros dois lados.

## Antes de começar

- Pra bug, abra uma issue com o passo a passo pra reproduzir, o que você esperava e o que aconteceu. Print ou vídeo ajuda muito.
- Pra funcionalidade nova ou mudança grande (nova ferramenta no editor, mudança no schema, nova rota), abra uma issue antes e descreva a ideia. Assim a gente alinha o formato antes de você investir tempo.
- Correção pequena (typo, estilo, teste faltando) pode ir direto pro PR.
- Vulnerabilidade **não** vai em issue pública. Veja o [SECURITY.md](SECURITY.md).

## Montando o ambiente

O passo a passo está no [README](README.md#rodando-localmente). O mínimo:

```bash
docker compose up -d postgres
cd backend && cp .env.example .env && npm install && npx prisma migrate dev && npm run start:dev
cd frontend && npm install && npm run dev
```

Pra logar localmente, configure um app OAuth seu (Google é o mais rápido) com callback `http://localhost:3000/api/auth/google/callback` e coloque as credenciais no `backend/.env`. O projeto não tem login por e-mail e senha nem login de desenvolvimento, e isso é de propósito: toda sessão nasce de um provedor OAuth.

## Branches

Sempre a partir da `main` atualizada, com prefixo pelo tipo de mudança:

| Prefixo | Quando usar |
| --- | --- |
| `feat/` | funcionalidade nova |
| `fix/` | correção de bug |
| `refactor/` | mudança interna sem alterar comportamento |
| `perf/` | desempenho |
| `test/` | só testes |
| `docs/` | só documentação |
| `ci/` | workflows, Docker, deploy |
| `chore/` | dependências, configs, limpeza |

Exemplo: `feat/editor-boolean-operations`, `fix/autosave-on-tab-close`.

## Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/pt-br/), com o escopo apontando a área:

```
feat(editor): add boolean union and subtract
fix(backend): return 404 for files owned by other users
refactor(shell): move session bootstrap into the store
test(backend): cover account linking with unverified emails
docs: explain the serverless bundle
```

Escopos mais comuns: `editor`, `shell`, `ui`, `backend`, `identity`, `workspace`, `billing`, `ci`.

Regras:

- Mensagem em inglês, no imperativo, com a primeira letra minúscula e sem ponto final.
- Um commit por ideia. Se o PR mistura refactor e feature, separe em commits diferentes.
- Nada de `wip`, `ajustes` ou `fix typo` perdido no histórico. Se precisar, faça squash antes de pedir revisão.

## Padrões de código

Algumas coisas que valem pro projeto inteiro:

- **Sem comentários óbvios.** Nome bom de função e de variável explica o quê; comentário só pra um porquê que não dá pra deduzir do código.
- **Prettier manda na formatação.** Não brigue com ele.
- **TypeScript estrito.** Nada de `any` sem motivo forte.

### Backend

- Respeite as camadas: `domain` não importa Nest, Prisma nem nada de infraestrutura. Regra de negócio vai em entidade, policy ou caso de uso, nunca no controller.
- Um caso de uso por classe, com nome no formato verbo + substantivo + `UseCase`.
- Dependência externa nova entra como porta (classe abstrata) em `application` ou `domain`, com a implementação em `infrastructure`.
- Toda consulta que envolve dado de usuário filtra pelo dono. Recurso de outra pessoa responde 404.
- Proibido `$queryRawUnsafe` e `$executeRawUnsafe` (o CI barra). SQL cru, só com o template seguro do Prisma e só se o Prisma não resolver.
- Toda entrada passa por DTO com class-validator.
- Mudou o schema? Gere a migration com `npx prisma migrate dev --name descricao_curta` e inclua no PR. Não edite migration que já foi pra `main`.

### Frontend

- No editor, lógica vai em `apps/editor/src/core` (sem React) e ganha teste. Os componentes só leem a store e disparam ações.
- Componente reaproveitável entre shell e editor vai pra `packages/ui`.
- Estilo com Tailwind e os tokens do tema; evite cor solta no código.
- Pense no mobile. A landing e o dashboard precisam funcionar de 360px até monitor ultrawide sem scroll horizontal.
- Ícones do `lucide-react`.

## Testes

Rode antes de abrir o PR, nas partes que você mexeu:

```bash
# backend
cd backend
npx prettier --check "src/**/*.ts" "test/**/*.ts"
npm run typecheck
npm test
npm run test:e2e            # precisa do Postgres rodando

# frontend
cd frontend
npx prettier --check "apps/*/src/**/*.{ts,tsx,css}" "packages/*/src/**/*.{ts,tsx,css}"
npm run typecheck
npm test
npx playwright test         # stack no docker compose ou E2E_BACKEND_DIR, veja o README
```

O que esperamos de teste:

- Bug corrigido vem com teste que falhava antes da correção.
- Regra de negócio nova no backend vem com teste unitário do caso de uso.
- Mudança de segurança (auth, permissão, validação) vem com teste na suíte e2e de segurança.
- Lógica nova no núcleo do editor vem com teste em `apps/editor/test`.

## Abrindo o PR

1. Atualize sua branch com a `main` (rebase na sua própria branch tá liberado).
2. Abra o PR contra a `main` e preencha o template, que aparece sozinho.
3. Título no mesmo formato dos commits: `feat(editor): add boolean operations`.
4. Mudou algo visual? Coloque print ou gif de antes e depois, no desktop e no mobile se fizer diferença.
5. Garanta que o CI está verde. Se algo falhar por motivo que não é seu, comente no PR explicando.

### O que olhamos na revisão

- O PR faz uma coisa só e faz bem feito.
- A regra está na camada certa.
- Não abre brecha de segurança: dado de um usuário não vaza pra outro, entrada é validada, nada sensível vai pro log.
- Tem teste pro que importa.
- A interface continua consistente com o resto (espaçamento, tema, atalhos).
- Nada de dependência nova sem necessidade. Se precisar, explique no PR por que ela e não outra.

PR parado há mais de duas semanas sem resposta do autor pode ser fechado. Dá pra reabrir quando quiser.

## Dúvidas

Abra uma issue com a label `question` ou comente no PR. Pergunta nunca é demais.
