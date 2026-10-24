# Registered schemas (Base Sepolia, chain id 84532)

Registry: `0x4200000000000000000000000000000000000020` · EAS: `0x4200000000000000000000000000000000000021`

| Schema | UID | Definition |
|---|---|---|
| PayEvent | `0x727cb593e24f6443adeab5c76f7d32346bee1946f2f655f596df75bd86129e5c` | `bytes32 workerId, bytes32 employerId, uint32 period, uint256 amountCents, uint8 status, bytes32 detailHash` |
| Countersign | `0x41a9799c98f850f33f146251c65f65d2b36be5833dc4936fcd88a0a59dac65c2` | `bytes32 payEventUID, uint8 decision, bytes32 noteHash` |
| BankProof | `0xf5956e3b0cc6f69c8f93f008b75e7de329b84fdd3bc45db96bee7167bce503df` | `bytes32 payEventUID, bytes32 predicateHash, bytes32 proofHash, uint8 method, bool satisfied` |

Explorer: https://base-sepolia.easscan.org/schema/view/<uid>

Encodings: `status` 1 paid, 2 unpaid, 3 partial · `decision` 1 confirm, 2 dispute · `method` 1 zkTLS (Reclaim zkFetch), 2 signed attestor stand-in. Countersign and BankProof set `refUID` to the PayEvent they reference. Attester of a PayEvent is the worker's key; attester of a Countersign is the employer's key (delegated attestations, relayer pays gas).
