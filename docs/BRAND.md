# Ledgerline brand kit

Ledgerline is a record-keeping tool for people with little power. The brand should feel like a notebook that cannot be edited: calm, exact, trustworthy, never flashy. Nothing about it should look like crypto.

Assets live in `brand/` (SVG sources) and `public/brand/` (rendered PNGs). Re-render with `node scripts/render-brand.cjs`.

## The mark

Three ledger lines inside an ink square. The first two are paper-coloured: entries. The last is green: the one that has been proven. The square is the device the record lives on.

| File | Use |
|---|---|
| `mark.svg` · `ledgerline-mark-{512,192,180,64,32}.png` | App icon, favicon, avatars, social profile images |
| `mark-mono.svg` | Single-colour contexts (print, embossing); uses `currentColor` |
| `mark-outline.svg` | Light paper backgrounds where a solid square is too heavy |
| `wordmark.svg` · `ledgerline-wordmark.png` | Headers, documents, slides on light backgrounds |
| `wordmark-dark.svg` · `ledgerline-wordmark-dark.png` | On ink or dark photography |
| `og.svg` · `ledgerline-og.png` | Link previews (1200×630) |

Clear space: at least the height of one ledger line (a quarter of the square) on every side. Minimum size: 20 px for the mark, 120 px wide for the wordmark. Do not rotate, recolour, add gradients, shadows or outlines, or set the wordmark in another typeface.

## Colour

Warm paper, ink, and one green. The green is reserved for "proven" and for the primary accent; it is never decorative.

| Token | Hex | Role |
|---|---|---|
| Paper | `#F7F5F0` | Page background |
| Paper 2 | `#FFFFFF` | Surfaces, cards |
| Paper 3 | `#EFECE5` | Pressed and selected states, table heads |
| Ink | `#17191C` | Text, primary buttons, the mark |
| Ink 2 | `#4A4F57` | Secondary text |
| Ink 3 | `#7B818B` | Tertiary text, labels |
| Line | `#E3DFD6` | Hairlines |
| Green | `#0F6B4E` | Proven, confirmed, primary accent on light |
| Green (on dark) | `#34D399` | The proven line inside the mark; accents on ink |
| Red | `#B3362B` | Unpaid, disputed, errors |
| Amber | `#9A6A12` | Waiting, warnings; the Due Process accent |
| Blue | `#2457A3` | Links and informational notices only |

Status colours always travel with a word ("Not paid", "Confirmed"), never alone.

## Typography

System sans (`-apple-system, Inter, Segoe UI, Roboto, Helvetica, Arial`) with tabular numerals. Headlines are tight (letter-spacing −0.02 em) and set in sentence case. Scale: 12 / 13 / 15 / 17 / 22 / 28 / 40 px. Body line-height 1.5.

Rules: sentence case everywhere, including buttons. No exclamation marks. Numbers carry units (S$600, 3 days).

## Voice

Concrete, short, respectful. Say what happened and what the person can do next.

- Say "The employer did not confirm within three days", not "Verification pending".
- Say "Your record is saved on this device. Try again", not "Transaction failed".
- Say "Prove from my bank", not "Generate zkTLS attestation".
- Never promise more than the chain gives: "signed by your key", "anyone can verify", "nothing else was disclosed".

Words we use: record, month, paid, not paid, confirm, dispute, proof, bundle, verifier, recovery words.
Words we avoid: wallet, gas, transaction hash, token, on-chain (in user copy), seamless, revolutionary, empower.

## Motion

Subtle and quick (120 to 320 ms, ease-out). Motion communicates state: a row expanding, a stage completing, a sheet rising. Nothing animates for decoration. `prefers-reduced-motion` is respected.

## Due Process (sibling product)

Same square and lines; the top line is shortened to make room for a small amber clock, the appeal clock. Wordmark colours "Process" in amber. Files: `dueprocess-mark.svg`, `dueprocess-wordmark.svg`, `dueprocess-og.svg` and their PNGs. Everything else in this kit applies unchanged.

## Product family rule

Each Ledgerline product keeps the ink square and the three lines, and changes exactly one thing that names what it proves: green line (pay), amber clock (appeal). A third product would add its own single element, never a new shape or palette.
