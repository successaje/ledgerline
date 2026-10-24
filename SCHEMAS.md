# Registered schemas (Base Sepolia, chain id 84532)

Registry: `0x4200000000000000000000000000000000000020` · EAS: `0x4200000000000000000000000000000000000021`

| Schema | UID | Definition |
|---|---|---|
| PayEvent v1 (read only; earlier records) | `0x727cb593e24f6443adeab5c76f7d32346bee1946f2f655f596df75bd86129e5c` | `bytes32 workerId, bytes32 employerId, uint32 period, uint256 amountCents, uint8 status, bytes32 detailHash` |
| PayEvent v2 (written since 24 Oct 2026) | `0xb30a394de0f0e18c20ca0710fcc8f6670587d7247e653cc98f32c99c22e9bb30` | `bytes32 workerId, bytes32 employerId, uint32 period, uint256 expectedCents, uint256 receivedCents, uint8 status, bytes32 detailHash, bytes32 supersedes` |
| Countersign | `0x41a9799c98f850f33f146251c65f65d2b36be5833dc4936fcd88a0a59dac65c2` | `bytes32 payEventUID, uint8 decision, bytes32 noteHash` |
| BankProof | `0xf5956e3b0cc6f69c8f93f008b75e7de329b84fdd3bc45db96bee7167bce503df` | `bytes32 payEventUID, bytes32 predicateHash, bytes32 proofHash, uint8 method, bool satisfied` |

Explorer: https://base-sepolia.easscan.org/schema/view/<uid>

v2 notes: `receivedCents` is 0 for an unpaid month and equals `expectedCents` for a month paid in full; `supersedes` is the UID of the PayEvent a correction replaces, or zero. The app reads both versions and writes v2 when `NEXT_PUBLIC_SCHEMA_PAYEVENT_V2` is set.

Encodings: `status` 1 paid, 2 unpaid, 3 partial · `decision` 1 confirm, 2 dispute · `method` 1 zkTLS (Reclaim zkFetch), 2 signed attestor stand-in. Countersign and BankProof set `refUID` to the PayEvent they reference. Attester of a PayEvent is the worker's key; attester of a Countersign is the employer's key (delegated attestations, relayer pays gas).
