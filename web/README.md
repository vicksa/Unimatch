# UniMatch — piloto Unilins

Aplicação web responsiva com manifesto PWA para instalação pelo navegador. Projeto independente, sem afiliação institucional ou integração com portal acadêmico. Não utiliza serviços externos pagos, anúncios ou analytics. A disponibilidade/cotas da hospedagem dependem da plataforma; não se promete operação ilimitada gratuita.

## Fluxos

- Demonstração explicitamente fictícia, com fotos de pessoas sintéticas; estado da demonstração dura somente a sessão da página e não é enviado ao servidor.
- Login delegado ao ChatGPT. O app não recebe nem armazena senhas. Este login não verifica matrícula.
- Perfil persistente em D1 com curso, semestre, idade declarada (18+), interesses, intenção, foto privada R2.
- Cadastro começa pendente; perfil só entra em descoberta após aprovação manual.
- Curtidas recíprocas geram match; mensagens exigem participação no match. Atualização da conversa a cada 8 segundos, sem promessa de push.
- Pausar, denunciar, bloquear, desfazer match, exportar dados, excluir conta. Desfazer match invalida as duas curtidas anteriores e exige novo interesse dos dois lados. Alterar curso ou semestre exige nova aprovação acadêmica.
- Moderação restrita ao identificador de usuário configurado como segredo ADMIN_USER_ID; aprovação/suspensão/encerramento de denúncia registrada em auditoria. Sem administrador configurado, nenhuma conta recebe aprovação automática.

## Segurança implementada

Identidade obtida exclusivamente pelo contexto autenticado do dispatcher Sites, não do corpo da requisição. Escritas verificam origem; consultas SQL usam parâmetros; acesso a mensagens/fotos validado no servidor; API e HTML privados não são cacheados. Limite persistente de 40 escritas/minuto por usuário. Corpos são lidos com limite, incluindo upload sem Content-Length. Uploads reprocessados no navegador, apenas PNG validado com estrutura, CRC e dimensões no servidor, sem metadados e sem payload após IEND. Credenciais não vão ao frontend. Conteúdo de usuário renderizado como texto React, sem HTML arbitrário. Headers de segurança e CSP em produção. Service worker não armazena dados privados.

A CSP permite inline scripts necessários ao framework e não equivale a uma CSP com nonce. Mensagens não têm criptografia de ponta a ponta. Operadores de infraestrutura podem tecnicamente acessar armazenamento. Nenhuma garantia de risco zero ou auditoria externa.

## Antes de receber alunos reais

1. Definir controlador, canal de privacidade e responsável/equipe de moderação; revisar base legal, retenção e procedimento de incidentes com a instituição.
2. Configurar ADMIN_USER_ID com identificador confiável do moderador (obtido do contexto autenticado), sem colocar credencial no código. Não há bootstrap automático de administrador.
3. Definir procedimento autorizado de conferência de matrícula, maioridade e renovação de vínculo. O app não verifica idade ou matrícula automaticamente e não deve coletar senhas/documentos pelo chat.
4. Revisar regras de compartilhamento da hospedagem: este deployment começa privado ao proprietário. Não confundir autenticação ChatGPT com conta institucional.
5. Executar homologação física em iPhone/Safari e Android/Chrome, instalação, login externo, upload e teclado virtual. Não foi executada nesta sessão.
6. Confirmar cotas gratuitas da infraestrutura e retenção de backups. Backups de produção e testes de restauração não foram configurados nesta sessão.
7. Revisar dependências e realizar teste independente de segurança antes do lançamento amplo.

## Verificação executada

- `node --experimental-strip-types --test tests/domain.test.ts`: 14 casos para validação, maioridade declarada, privilégio/identidade injetados, limites, CSRF, participação e PNG.
- `node --test tests/api.integration.mjs`: 19 cenários completos + suíte, executando o código real da API e SQL real em SQLite com identidade e R2 simulados. Inclui cadastro, aprovação, renovação de aprovação após mudanças acadêmicas, match recíproco, revogação de consentimento após desfazer match, IDOR leitura/escrita, mensagem, bloqueio, foto, exportação, exclusão e rate limit.
- `node node_modules/typescript/bin/tsc --noEmit`.
- Build de produção Cloudflare Worker pelo workflow Sites.

Testes usam armazenamento em memória isolado, sem alterar dados de produção. Não substituem testes do dispatcher de autenticação, email institucional, Safari/WebKit/Chromium, aparelhos físicos, desempenho, abuso distribuído, pentest ou conformidade LGPD. A demonstração foi verificada em Chromium com tamanhos de desktop e celular. Login de produção, instalação e aparelho físico ainda exigem homologação.

## Desenvolvimento

Preserve package manager e lockfile. `pnpm dev` / `pnpm build` no ambiente apropriado. Os adaptadores em `build/` fazem parte do código-fonte e devem ser versionados; diretórios de saída do Android continuam ignorados. Setup e publish seguem o workflow Sites. Migrações Drizzle em `drizzle/`; D1 e R2 são declarados em `.openai/hosting.json`. Segredos reais somente na configuração de hospedagem. `.env.example` documenta ADMIN_USER_ID.

## Design

Interface original em branco, grafite e azul, sem degradês. Controles principais com altura mínima 48px, navegação inferior no celular e lateral no desktop, preferência de movimento reduzido respeitada. Referências consultadas: Apple HIG Privacy (https://developer.apple.com/design/human-interface-guidelines/privacy/), Android Touch Target (https://support.google.com/accessibility/android/answer/7101858), catálogo Unilins (https://unilins.edu.br/c-graduacoes/). Os cursos incluem opção Outro; devem ser homologados com a instituição. Fotos demo geradas por IA e rotuladas como fictícias.
