# gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/liuyue449-spec/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/liuyue449-spec/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Sunset Cover Maker — a static, offline web app that turns your own photo and a caption into poster cover art: multi-panel layouts (trio bands, four panels, solo shot), sunset / neon / noir colour grades, per-panel zoom and pan, bold display lettering, and a PNG export in the three common post sizes (1080 × 1080, 1080 × 1350, 1920 × 1080). Photos are read on your own machine and never uploaded; every script, image and font the app loads is a file under `app/`.

## Run it

```sh
node serve.ts   # serves the app at http://localhost:8080
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # copies app/ + screenshots/ to out/ and writes out/dossier.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=y9xqfw0n&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
