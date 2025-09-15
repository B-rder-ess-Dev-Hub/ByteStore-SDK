# sync-multihash-sha2

Library provides alternative implementation of sha256 and sha512 hashing algorithms for those rare cases where implementation provided by [multiformats] may be prohibitively slow.

> ℹ️ In vast majority of use cases [multiformats] is better choice. In rare instances where [multiformats] does not meet your requirements you could use this library, but please make sure to consider the offered tradeoffs.

## Tradeoffs

tl;dr: This implementation has sync API and is faster in browsers, but more dependencies implies more bytes over the wire and greater risk of supply chain attacks.

### 💚 Faster & Sync

Library provides [`SyncMultihashHasher`][] implementation which provides sync API in browser and node environments. This is accomplished by leveraging [`node:crypto`][] in node and in [`@noble/hashes`][] in browsers.

- It can can be used in synchronous code paths
- It significantly faster in browsers

### 💔 More dependencies

Since this library does not leverage [web crypto APIs][`crypto.subtle.digest`] there is more code to be send over the wire. More dependencies also increase risk of supply chain attacks.

### 💔 Less future proof

[Web crypto APIs][`crypto.subtle.digest`] deliberately provide async APIs, which this library provides sync API. Furthermore, native implementation appears significantly slower, possibly because browsers rate-limit API calls.

Difference in choices may prove problematic in longer.

[multiformats]:https://github.com/multiformats/js-multiformats/
[`SyncMultihashHasher`]:https://github.com/multiformats/js-multiformats/blob/4a36fb7ee49edb4300267b90301ef0e4300cbc46/src/hashes/interface.ts#L60-L72
[`node:crypto`]:https://nodejs.org/api/crypto.html#class-hash
[`@noble/hashes`]:https://www.npmjs.com/package/@noble/hashes
[`crypto.subtle.digest`]:(https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest)
