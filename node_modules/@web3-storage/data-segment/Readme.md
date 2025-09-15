# @web3-storage/data-segment

Implementation of the [FRC-0058] verifiable aggregation scheme.

## API

```ts
import { Piece, MIN_PAYLOAD_SIZE } from "@web3-storage/data-segment"

// input must be >= 65 bytes
const bytes = new Uint8Array(MIN_PAYLOAD_SIZE)

const piece = Piece.fromPayload(bytes)

// bafkzcibbai3tdo4zvruj6zxo6wlt4suu3imi6to4vzmaojh4n475mdp5jcbtg
const cid = piece.link.toSting()
```

## Prior Art

Started as fork of [js-fil-utils] modernizing it to use ES modules and web crypto APIs in place of node APIs.

However, [js-fil-utils] produces different results from the more widely used go implementation which is why it got some heavy lifting inspired by [go-data-segment] and [go-fil-commp-hashhash] libraries.

[go-data-segment]:https://github.com/filecoin-project/go-fil-commp-hashhash/tree/master
[go-fil-commp-hashhash]:https://github.com/filecoin-project/go-data-segment/tree/master
[js-fil-utils]: https://github.com/rvagg/js-fil-utils/tree/master
[FRC-0058]: https://github.com/filecoin-project/FIPs/blob/master/FRCs/frc-0058.md
