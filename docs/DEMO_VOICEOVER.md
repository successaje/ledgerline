# Demo voice-over

For `public/demo/ledgerline-demo-2.mp4` (2 min 32 s, 1280 × 720, no audio). Timestamps below are positions in that file. The first 41 s is the explainer animation; the rest is the screen recording on the live site.

Rules the script follows: plain words, no legal claims, "test network" and "demo bank data" said out loud where the screen shows them, one idea per sentence, pauses where the screen moves. Each cue has a start time and a hard end time; the narration for a cue must finish before its end time. Spoken at a calm 140 words per minute every cue fits with room to spare.

## Timed script

| # | Start | End | On screen | Narration |
|---|---|---|---|---|
| 1 | 0:00.5 | 0:04.5 | Ledgerline mark | Ledgerline. A pay record you keep yourself. |
| 2 | 0:05.5 | 0:11.5 | "When pay goes missing…" | When pay goes missing, the only record is usually the employer's word. Screenshots and chat messages are easy to dispute. |
| 3 | 0:12.5 | 0:20.5 | Paybook card: S$700, S$500, S$200 short | Each month, you write down what you expected and what you received. Seven hundred expected, five hundred received, two hundred short. It is signed on your phone and written to a public test network, so it cannot be changed later. |
| 4 | 0:21.5 | 0:28.5 | Employer card, Acknowledge | Your employer responds from a link. They acknowledge or disagree. If they do not respond by the deadline, that is recorded too, as silence, not as blame. |
| 5 | 0:29.5 | 0:36.5 | Verifier checks | Share only the months you choose. Anyone with the link re-checks them against the public record and reads a plain sentence. Nothing else about you is shown. |
| 6 | 0:37.5 | 0:41.0 | Three steps, "Here is how it works" | Record, respond, share. Here is how it works. |
| 7 | 0:42.0 | 0:53.0 | Landing page, scroll, "Try a sample" | This is the live app on the Base Sepolia test network. We will use the sample record, so nothing here belongs to a real person. |
| 8 | 0:54.5 | 0:57.0 | Home with October paybook | Home shows the current month: expected, received, and the difference. |
| 9 | 0:58.0 | 1:17.0 | Record flow: month, partly paid, 500 | Recording takes four steps. Choose the month. Say what happened: paid in full, partly paid, or not paid. Enter what you received. |
| 10 | 1:18.0 | 1:27.0 | Note step | Add a note if you want. It stays on the phone. Only a hash of it is published. |
| 11 | 1:28.0 | 1:36.0 | Review, payload preview, consent | Review shows exactly what will be published, and what will not. The record is published only after you tick the box. |
| 12 | 1:37.0 | 1:51.5 | Publishing stages | The record is signed on this device and sent to the test network. A relayer pays the fee, so there is no wallet and no gas to buy. |
| 13 | 1:52.0 | 1:57.0 | "October 2026 recorded", View record | Confirmed. The month now has a record that no one else can rewrite. |
| 14 | 1:58.0 | 2:04.0 | Record detail, "Ask employer to respond" | From the record, you ask the employer to respond. They get a link. |
| 15 | 2:05.0 | 2:14.0 | Employer page | The employer sees what you recorded and the date you asked for a response. Acknowledge means they agree with the statement. A confirmation step says what will be published. |
| 16 | 2:15.5 | 2:19.0 | Employer stages, response recorded | Their response is signed from their own phone. |
| 17 | 2:19.5 | 2:29.0 | Back on the record, "Employer acknowledged" | Back on the worker's record, the response appears next to the month. |
| 18 | 2:30.0 | 2:35.0 | Share page | Sharing is explicit. Nothing is preselected. |
| 19 | 2:36.0 | 2:48.0 | Verifier page | The verifier re-checks the shared month against the public record: the signature, the employer's response, and bank evidence when there is any. In this version the bank data is demo data, and it says so. |
| 20 | 2:48.5 | 2:51.5 | Landing page | Ledgerline. Test network only. No money moves. |

Word count 330. Total speaking time at 140 words per minute: about 2 min 20 s inside a 2 min 32 s video.

## Prompt for the voice tool

Paste this into the text-to-speech or AI video tool, then attach the mp4 and the table above.

```
Add a voice-over to the attached video (ledgerline-demo-2.mp4, 2 min 32 s, 25 fps, no audio track).

Voice: one adult speaker, warm and calm, neutral Singapore or international English, no regional slang. Pace 140 words per minute. Natural pauses at full stops. No background music, no sound effects, no breaths or filler words. Loudness around -16 LUFS, peaks below -1 dBTP.

Timing: use the cue table exactly. Each cue starts at its Start time. If a line would run past its End time, speak it slightly faster rather than shifting the next cue. Never move or overlap cues. Leave silence between cues; do not fill gaps.

Pronunciation: "Ledgerline" as LED-jer-line. "Base Sepolia" as BASE seh-POH-lee-ah. "S$700" as "seven hundred Singapore dollars" the first time it appears (cue 3) and "seven hundred" after that. Read "S$500" and "S$200" the same way.

Do not add, remove or reword any sentence. Do not add an intro, outro, title card or watermark. Do not change the picture, the length, the resolution or the frame rate.

Output: the same video with the narration mixed in as a stereo AAC track at 48 kHz, 1280 × 720, H.264, same duration. Also export the narration alone as a WAV with the same timeline so it can be remixed.
```

## If the tool needs per-cue files instead

Export one audio file per row named `cue-01.wav` … `cue-20.wav`, then place each at its Start time:

```bash
# example for one cue with ffmpeg: offset cue 7 by 42.0 s and mix (repeat the adelay/amix pattern for each cue)
ffmpeg -i public/demo/ledgerline-demo-2.mp4 -i cue-07.wav -filter_complex "[1:a]adelay=42000|42000[a7];[a7]amix=inputs=1[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k out.mp4
```
