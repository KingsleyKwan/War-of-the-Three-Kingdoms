# 單機三國殺 / War of the Three Kingdoms

E殺風格的網頁單機三國殺（by **sley**）。

- 自由對戰 vs AI（1v1 / 五人身份）
- 卡包設定：標準包 + 可選軍爭
- 劇情模式：曹操傳（9 關）／蜀傳（8 關）／吳傳（6 關）

## Play

GitHub Pages: https://kingsleykwan.github.io/War-of-the-Three-Kingdoms/

## Develop

```bash
npm install
npm run dev
npm run build   # outputs to docs/ for Pages
npm test        # unit tests for skill / targeting / damage logic
npm run test:skills  # longer headless AI match review
```

## Version

Shown on the start screen as `vX.Y.Z` (`src/version.ts`).
