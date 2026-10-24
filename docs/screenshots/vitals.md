# Screens and vitals

Measured headless with Playwright/Chromium against http://localhost:3001, reduced motion, cold cache per width.
LCP and CLS use PerformanceObserver; INP is not measurable headless and is not reported.

| page | width | TTFB ms | FCP ms | LCP ms | CLS | horizontal overflow |
|---|---|---|---|---|---|---|
| landing | 320 | 21 | 92 | 92 | 0 | none |
| start | 320 | 8 | 52 | 52 | 0 | none |
| home | 320 | 5 | 28 | 56 | 0 | none |
| records | 320 | 3 | 32 | 32 | 0 | none |
| record-detail | 320 | 45 | 60 | 92 | 0 | none |
| record-flow-review | 320 | 19 | 72 | 72 | 0 | none |
| share | 320 | 8 | 52 | 52 | 0 | none |
| settings | 320 | 5 | 20 | 40 | 0 | none |
| employer | 320 | 11 | 24 | 124 | 0 | none |
| verify | 320 | 13 | 24 | 48 | 0 | none |
| landing | 375 | 5 | 32 | 32 | 0 | none |
| start | 375 | 4 | 52 | 52 | 0 | none |
| home | 375 | 5 | 24 | 56 | 0 | none |
| records | 375 | 5 | 52 | 52 | 0 | none |
| record-detail | 375 | 28 | 48 | 96 | 0 | none |
| record-flow-review | 375 | 15 | 60 | 60 | 0 | none |
| share | 375 | 16 | 68 | 68 | 0 | none |
| settings | 375 | 4 | 16 | 36 | 0 | none |
| employer | 375 | 8 | 28 | 84 | 0 | none |
| verify | 375 | 3 | 20 | 28 | 0 | none |
| landing | 768 | 5 | 64 | 64 | 0 | none |
| start | 768 | 3 | 48 | 48 | 0 | none |
| home | 768 | 4 | 24 | 52 | 0 | none |
| records | 768 | 3 | 36 | 36 | 0 | none |
| record-detail | 768 | 12 | 28 | 44 | 0 | none |
| record-flow-review | 768 | 5 | 52 | 52 | 0 | none |
| share | 768 | 7 | 36 | 36 | 0 | none |
| settings | 768 | 5 | 24 | 56 | 0 | none |
| employer | 768 | 8 | 28 | 84 | 0.05 | none |
| verify | 768 | 8 | 28 | 36 | 0 | none |
| landing | 1440 | 9 | 36 | 36 | 0 | none |
| start | 1440 | 8 | 60 | 60 | 0 | none |
| home | 1440 | 5 | 32 | 64 | 0.039 | none |
| records | 1440 | 5 | 44 | 44 | 0 | none |
| record-detail | 1440 | 9 | 24 | 68 | 0.039 | none |
| record-flow-review | 1440 | 4 | 40 | 40 | 0 | none |
| share | 1440 | 3 | 32 | 32 | 0 | none |
| settings | 1440 | 3 | 20 | 36 | 0.039 | none |
| employer | 1440 | 3 | 16 | 48 | 0.017 | none |
| verify | 1440 | 3 | 20 | 32 | 0 | none |
