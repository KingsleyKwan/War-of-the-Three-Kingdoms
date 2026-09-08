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

v0.20.0 applies remaining paper 標準＋軍爭／風火林山 skill rules: 觀星頂底分置, 遺計每點觀看兩張交給任意, 好施自選一半, 化身兩張聲明一技能／新生加牌, 蠱惑質疑, 據守摸已損失+2, 制衡含裝備, 志繼回1或摸2, 屯田判定可被鬼才／鬼道替換.

v0.19.0 aligns identity-mode play with paper 標準＋軍爭／風火林山 rules: 主公+1 HP and 主公技, 擊殺反賊摸 3／主公殺忠臣棄所有牌, 判定區後置先判, 鬼才／鬼道（鬼道獲得原判定牌）, 翻面, 桃園按目標無懈, 裸衣少摸, 神速一至兩項, 據守／放逐翻面, 行殤獲得死亡角色的牌, 不屈「創」, 巧變跳過階段, 固政, 好施可選多摸.
