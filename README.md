# UniMatch — Unilins

Piloto de conexões entre estudantes, com versão web e cliente Android instalável. Projeto independente, não afiliado à instituição.

## APK Android

O APK é um cliente Android leve que abre o piloto online em uma Custom Tab gerenciada pelo navegador do aparelho. A interface de perfis/matches/chat continua sendo a aplicação web; não é uma reimplementação nativa dessas telas nem funciona offline. O login e os cookies ficam no navegador. O cliente não recebe senhas ou tokens, não solicita permissões sensíveis.

- Android 8.0+ (API 26), com navegador HTTPS instalado.
- APK de teste assinado com chave debug; não é publicação na Play Store. A chave debug não deve ser usada para distribuição final.
- Não há versão IPA/iOS neste repositório; iPhone usa a versão web instalável.
- Piloto: https://unimatch-unilins.vercel.app
- Login por e-mail e senha via Clerk. Google depende da ativação da conexão na instância Production do Clerk. Configure `ADMIN_USER_ID` com o ID Clerk do responsável para habilitar a moderação.

## Estrutura

- `android/`: projeto Java/Android com launcher, informações de privacidade e integração Custom Tabs.
- `web/`: fonte da aplicação web, API, migrações PostgreSQL/Neon, fotos privadas no Vercel Blob e testes.

## Compilar APK

Instale Java 17, Android SDK 35 e build tools 35.0.0. Configure ANDROID_HOME ou um `android/local.properties` local. Então:

```sh
cd android
./gradlew assembleDebug lintDebug
```

APK em `android/app/build/outputs/apk/debug/app-debug.apk`.

O workflow GitHub Actions está configurado para compilar e disponibiliza `UniMatch-debug.apk` como artifact por 30 dias; não publica release ou na Play Store e não usa credenciais de produção.

## Limites de segurança e verificação

A aplicação web tem 34 casos automatizados (19 cenários de API no Neon real e 15 verificações de domínio/migração) de domínio/API aprovados, incluindo autorização de chat/fotos, CSRF, match recíproco, revogação após desfazer match, cadastro imediato e preservação de suspensões, bloqueio e exclusão. O cliente Android tem compilação com as ferramentas oficiais do SDK e validação de assinatura/manifesto do APK. Não foi homologado em aparelho físico ou emulador nesta sessão. A instalação ainda precisa ser validada no seu celular. Mensagens online não têm criptografia de ponta a ponta.

Sem serviços pagos contratados. Gratuidade de hospedagem e Actions depende de cotas e políticas dos provedores. Não há promessa de operação ilimitada.

## Web na Vercel

Projeto `unimatch`, região `gru1`, Next.js 16 e Node 24. Os planos Vercel Hobby, Neon Free e Clerk Hobby foram usados sem cartão ou upgrades. A Vercel Hobby é para uso pessoal não comercial; ao atingir cotas gratuitas, recursos podem ser suspensos até a renovação. Fotos privadas no Blob também usam cotas gratuitas.

As variáveis `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` e `BLOB_READ_WRITE_TOKEN` são fornecidas pelas integrações. Nunca as versionar. Na pasta `web`:

```sh
pnpm install --frozen-lockfile
vercel env pull .env.local --yes --environment production
pnpm db:migrate
pnpm test
pnpm test:integration
pnpm build
vercel deploy --prod
```

O teste de integração cria e remove um schema PostgreSQL isolado. A migração inicial é idempotente e preserva registros existentes. O piloto antigo permanece intacto; contas ChatGPT e contas Clerk são identidades distintas, e dados antigos não são associados automaticamente por e-mail.

Google: no painel Clerk, abra `unimatch-auth`, selecione Production e habilite Google em SSO connections. Use credenciais OAuth próprias se o painel exigir. Não troque para a instância Development para contornar essa configuração.
