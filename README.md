# Math Adventure 數學探險隊

三年級數學先修預習遊戲。四大探險區（比大小 / 數線 / 三位數加法 / 四位數加法），每區 2 種玩法，
答對誇張慶祝、答錯滑稽不批判，跨裝置英雄榜用 Firebase 即時同步。

## 部署到 GitHub Pages

1. 在 GitHub 建立新 repo，例如 `math-adventure`（public）。
2. 把這個資料夾的所有檔案上傳到 repo 根目錄（或用 git push，見下方指令）。
3. repo 設定 → Pages → Source 選 `main` branch、`/ (root)` 資料夾 → Save。
4. 幾分鐘後就能用 `https://<你的帳號>.github.io/math-adventure/` 開啟遊戲。

```bash
cd math-adventure
git init
git add .
git commit -m "Math Adventure 數學探險隊 v1"
git branch -M main
git remote add origin https://github.com/<你的帳號>/math-adventure.git
git push -u origin main
```

## 關於 Firebase

- 已經接好你的 Firebase 專案 `math-adventure-72e92`，英雄榜資料存在 Cloud Firestore 的 `scores` collection。
- 目前 Firestore 規則是「測試模式」，**30 天後會自動失效**（讀寫全部被擋掉）。
  到期前記得到 Firebase 主控台 → Firestore Database → 規則，換成類似下面這種規則（允許任何人新增分數、
  讀取分數，但不能竄改或刪除別人的紀錄）：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scores/{scoreId} {
      allow read: if true;
      allow create: if request.resource.data.name is string
                    && request.resource.data.focusScore is number;
      allow update, delete: if false;
    }
  }
}
```

## 房間代碼 / 英雄榜怎麼用

- 每個孩子在結果畫面可以輸入「房間代碼」，同一組代碼的人會排在同一份榜單裡。
- 沒有輸入就會用預設代碼 `public`，全部人共用同一榜。
- 想跟同學一起玩，就先約好一個代碼（例如班級名稱）再輸入即可。

## 內容涵蓋的數學概念

出題只參考四個單元的「概念」，數字與形式都是程式隨機出，不會跟課本一模一樣：
1. 比大小（跨位數比較、同位數比較、極接近的數字比較）
2. 整數數線（找位置、跳格計算）
3. 三位數加法（含進位）
4. 四位數加一位數（含連續進位）

複習特訓營會收錄玩家答錯過的題目，練到答對就會從複習清單移除。
