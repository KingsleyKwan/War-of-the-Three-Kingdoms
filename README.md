# 單機三國殺 / War of the Three Kingdoms

E殺風格的網頁單機三國殺（by **sley**）。

- 自由對戰 vs AI（1v1 / 五人／八人身份）
- 卡包設定：標準包 + 可選軍爭／風／火／林／山／一將
- 劇情模式：曹操傳／蜀傳／吳傳
- 武將列傳：每名可選武將皆有 1～數關個人列傳；通關解鎖 Q 版造型（預設無 skin）
- 成就系統：列傳完、勢力集齊、劇情通關與對戰勝場

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
