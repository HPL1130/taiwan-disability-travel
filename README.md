# 身障旅遊優惠通

查詢台灣收費景點對**身心障礙者本人**與**必要陪同者**的門票優惠。資料涵蓋全台 22 縣市、677 個景點（其中 403 個收費景點），每筆皆附資料來源與查核日期。

- 網頁版（可加入手機主畫面）：https://hpl1130.github.io/taiwan-disability-travel/
- Android 安裝檔（APK）：[Releases → 最新版](../../releases/latest)

## 使用方式

| 方式 | 說明 |
|---|---|
| 網頁 App | 手機瀏覽器開啟網址 → 選單「加入主畫面」，之後像一般 App 開啟，離線也能查詢 |
| APK | 下載 `tw-disability-travel.apk` → 點開安裝（第一次需允許「安裝不明來源應用程式」）。有網路時會自動抓最新資料 |

## 專案結構

```
data/database.xlsx      主資料庫（只需更新這份）
scripts/export.py       xlsx → app/data/attractions.json，並檢查資料
scripts/android_assets.py  APK 圖示與啟動畫面
app/                    App 本體（純前端：HTML/CSS/JS、離線快取）
.github/workflows/
  deploy-web.yml        推送後自動發布網頁版到 GitHub Pages
  build-apk.yml         推送後自動打包 APK 並發布到 Releases
```

## 更新資料

1. 以新版 xlsx 覆蓋 `data/database.xlsx`（檔名保持不變）
2. 提交並推送到 `main`
3. GitHub Actions 會自動：轉檔 → 檢查（筆數一致、無重名、身障/陪同價不高於全票）→ 發布網頁 → 打包 APK

檢查未通過時不會發布，請看 Actions 頁面的錯誤訊息。

本機預覽：`python3 scripts/export.py && python3 -m http.server 8080 --directory app`，開啟 http://localhost:8080

## 第一次設定（只需做一次）

1. **開啟 GitHub Pages**：Settings → Pages → Source 選 **GitHub Actions**
2. **APK 簽章（建議）**：Settings → Secrets and variables → Actions → New repository secret
   - `ANDROID_KEYSTORE_B64`：簽章金鑰檔的 base64 內容
   - `ANDROID_KEYSTORE_PASSWORD`：金鑰密碼

   未設定時會輸出 debug 版 APK，可安裝使用，但每次更新需先移除舊版。金鑰檔請自行妥善保存，遺失後舊版使用者需移除重裝。

## 資料說明

- 依《身心障礙者權益保障法》第59條：公營或公設民營場所，身障者本人憑證明免費；民營場所應予半價。必要陪伴者以 1 人為限，享相同優待。
- 來源分級：政府資料、業者官方、使用者截圖、第三方。
- 票價可能隨時調整，請以現場公告為準。發現錯誤歡迎到 [Issues](../../issues) 回報。

## 授權

- 程式碼：MIT
- 資料：CC BY 4.0（使用請註明「身障旅遊優惠通」及原始來源）
