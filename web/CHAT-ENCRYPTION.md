# UniMatch conversation encryption

New real messages are encrypted and signed on the user's device before upload. There is no plaintext fallback. The server stores an envelope with an empty `messages.body`, and checks the authenticated sender, conversation membership, current match instance, registered recipient keys and signature. Demo messages remain local and are explicitly identified as demonstrations.

## Keys and recovery

Each account generates independent RSA-OAEP (3072-bit, SHA-256) encryption and ECDSA (P-256, SHA-256) signing keys using Web Crypto. Public SPKI keys are registered once and cannot be overwritten through the API. Private keys are imported as non-extractable `CryptoKey` objects and cached in IndexedDB, scoped to the Clerk user ID. Logout removes the local account keys.

A random 256-bit recovery code is generated on the device. HKDF-SHA-256, with a random 32-byte salt and account/key context, derives an AES-256-GCM key to encrypt the private-key backup. Only the encrypted backup, nonce, salt and public keys reach the server. The recovery code is never uploaded or stored in localStorage. The activation UI requires the user to confirm that they saved it. A new device needs this code; a login password cannot decrypt the backup. Lost code plus lost device access means the service cannot recover the encrypted history.

## Message format and verification

Every message uses a fresh random AES-256-GCM key and 12-byte nonce. The AES key is wrapped separately for the two accounts using their RSA-OAEP public keys. Both sender and recipient can reopen the message on devices that possess the same account private key.

Authenticated data binds protocol version, match ID, random `matches.crypto_context`, message UUID, authenticated sender, sender key ID and the ordered pair of recipient identities/key IDs. An ECDSA signature covers this context, nonce, ciphertext and wrapped keys. Both API and receiving device verify the signature; the receiving device also verifies the AES-GCM tag. Duplicate retries of the same signed UUID are idempotent; changing an existing UUID is rejected. Ending and recreating a match generates a fresh context, so an old envelope cannot be replayed into the new instance.

Contacts' fingerprints are pinned locally on first contact. An unexpected change blocks sending until the user explicitly confirms the new security codes. Users can compare the displayed SHA-256 fingerprints over another channel. First-contact key authenticity relies on this comparison or trust in the initial key directory. A trusted web build and uncompromised devices remain prerequisites.

## Existing messages

The additive migration preserves older plaintext messages and marks them as version 0. Once both accounts activate their keys, opening a conversation retrieves batches of up to 20 older messages belonging to the current sender, encrypts and signs them locally, and replaces their plaintext through a sender-restricted endpoint. This includes messages outside the current 100-message display window. The receiver cannot rewrite the sender's history. Converted records retain an explicit historical label.

Older messages remain plaintext until their sender opens the conversation with both keys available. Converting a record does not retroactively protect prior server copies or backups. No migration deletes user history or invents encryption for messages originally sent in plaintext.

## Scope and limits

- Text content is encrypted. Sender IDs, participants, timestamps and approximate message sizes remain visible to the service.
- The recovery backup contains ciphertext, not a key usable by the server. Exports include the user's encrypted records and encrypted key backup.
- This construction does not implement Signal's double ratchet, forward secrecy or post-compromise security. Compromise of an account's private encryption key can expose previously captured envelopes for that account.
- HTTPS, Clerk authentication, participant checks, suspension/blocking rules and rate limits continue to apply. Encryption does not replace those controls.
- This implementation has automated cryptographic, API, migration and browser tests; it has not undergone an independent cryptographic audit or physical Android device validation.

## Validation

Tests cover two-party decryption, third-party rejection, tampering, sender forgery, conversation/context replay, Unicode bounds, non-extractable keys, backup recovery, wrong-code/account rejection, immutable public keys, private-backup access, removal/blocking, idempotent message retries and original-sender-only legacy conversion. PostgreSQL integration tests use transaction-scoped isolated schemas and verify that encrypted records contain no plaintext body.
