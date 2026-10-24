# Screens and vitals

Measured headless with Playwright/Chromium against http://localhost:3000, reduced motion, cold cache per width.
LCP and CLS use PerformanceObserver; INP is not measurable headless and is not reported.

| page | width | TTFB ms | FCP ms | LCP ms | CLS | horizontal overflow |
|---|---|---|---|---|---|---|
| landing | 320 | 67 | 96 | 96 | 0 | none |
| start | 320 | 51 | 68 | 396 | 0 | none |
| home | 320 | 55 | 68 | 336 | 0.1 | none |
| records | 320 | 70 | 84 | 384 | 0.1 | none |
| record-detail | 320 | 92 | 108 | 1240 | 0.1 | none |
| record-flow-review | 320 | 137 | 160 | 456 | 0.1 | none |
| share | 320 | 72 | 84 | 352 | 0.1 | none |
| settings | 320 | 56 | 72 | 356 | 0.1 | none |
| employer | 320 | 35 | 48 | 916 | 0 | none |
| verify | 320 | 103 | 120 | 368 | 0 | none |
| landing | 375 | 64 | 84 | 84 | 0 | none |
| start | 375 | 37 | 48 | 348 | 0 | none |
| home | 375 | 47 | 60 | 344 | 0.1 | none |
| records | 375 | 58 | 180 | 476 | 0.1 | none |
| record-detail | 375 | 52 | 72 | 372 | 0.1 | none |
| record-flow-review | 375 | 44 | 60 | 940 | 0.1 | none |
| share | 375 | 98 | 112 | 392 | 0.1 | none |
| settings | 375 | 38 | 52 | 316 | 0.1 | none |
| employer | 375 | 50 | 68 | 352 | 0 | none |
| verify | 375 | 35 | 48 | 300 | 0 | none |
| landing | 768 | 67 | 88 | 88 | 0 | none |
| start | 768 | 33 | 48 | 308 | 0 | none |
| home | 768 | 50 | 68 | 336 | 0.059 | none |
| records | 768 | 4070 | 4100 | 4576 | 0.059 | none |
| record-detail | 768 | 85 | 108 | 436 | 0.059 | none |
| record-flow-review | 768 | 42 | 56 | 336 | 0.059 | none |
| share | 768 | 43 | 60 | 1024 | 0.059 | none |
| settings | 768 | 40 | 60 | 344 | 0.059 | none |
| employer | 768 | 30 | 44 | 328 | 0.05 | none |
| verify | 768 | 36 | 52 | 296 | 0.028 | none |
| landing | 1440 | 51 | 80 | 80 | 0 | none |
| start | 1440 | 27 | 44 | 304 | 0 | none |
| home | 1440 | 54 | 72 | 920 | 0.056 | none |
| records | 1440 | 52 | 68 | 356 | 0.056 | none |
| record-detail | 1440 | 37 | 52 | 368 | 0.056 | none |
| record-flow-review | 1440 | 34 | 52 | 320 | 0.056 | none |
| share | 1440 | 36 | 52 | 856 | 0.056 | none |
| settings | 1440 | 43 | 64 | 340 | 0.056 | none |
| employer | 1440 | 39 | 60 | 372 | 0.017 | none |
| verify | 1440 | 79 | 96 | 360 | 0.009 | none |
