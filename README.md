# UniMatch — Unilins

Piloto de conexões entre estudantes, com versão web e cliente Android instalável. Projeto independente, não afiliado à instituição.

## APK Android

O APK é um cliente Android leve que abre o piloto online em uma Custom Tab gerenciada pelo navegador do aparelho. A interface de perfis/matches/chat continua sendo a aplicação web; não é uma reimplementação nativa dessas telas nem funciona offline. O login e os cookies ficam no navegador. O cliente não recebe senhas ou tokens, não solicita permissões sensíveis e não contorna o acesso privado do piloto.

- Android 8.0+ (API 26), com navegador HTTPS instalado.
- APK de teste assinado com chave debug; não é publicação na Play Store. A chave debug não deve ser usada para distribuição final.
- Não há versão IPA/iOS neste repositório; iPhone usa a versão web instalável.
- Piloto: https://unimatch-unilins.vicksa.chatgpt.site
- Acesso ainda privado; aprovação acadêmica e moderação precisam ser configuradas antes de receber estudantes reais.

## Estrutura

- `android/`: projeto Java/Android com launcher, informações de privacidade e integração Custom Tabs.
- `web/`: fonte da aplicação web, API, migrações D1, armazenamento R2 e testes.

## Compilar APK

Instale Java 17, Android SDK 35 e build tools 35.0.0. Configure ANDROID_HOME ou um `android/local.properties` local. Então:

```sh
cd android
./gradlew assembleDebug lintDebug
```

APK em `android/app/build/outputs/apk/debug/app-debug.apk`.

O workflow GitHub Actions está configurado para compilar e disponibiliza `UniMatch-debug.apk` como artifact por 30 dias; não publica release ou na Play Store e não usa credenciais de produção.

## Limites de segurança e verificação

A aplicação web tem 30 casos automatizados de domínio/API aprovados, incluindo autorização de chat/fotos, CSRF, match recíproco, bloqueio e exclusão. O cliente Android tem compilação com as ferramentas oficiais do SDK e validação de assinatura/manifesto do APK. Não foi homologado em aparelho físico ou emulador nesta sessão. Login de produção e instalação precisam ser validados no seu celular. Mensagens online não têm criptografia de ponta a ponta.

Sem serviços pagos contratados. Gratuidade de hospedagem e Actions depende de cotas e políticas dos provedores. Não há promessa de operação ilimitada.
