# 岡山大作戰部署筆記

## 推薦方式

這個遊戲需要 Node.js 伺服器、WebSocket 即時同步、檔案資料儲存和錄音檔儲存，不適合只部署到純靜態網站空間。

建議使用 Render / Railway / Fly.io 這類可以常駐 Node 服務的平台。

## Render 設定

- Build Command: `npm install`
- Start Command: `npm start`
- Environment Variable:
  - `GAME_DATA_DIR=/var/data`
- Persistent Disk:
  - Mount path: `/var/data`
  - Size: 1GB 起即可

專案已附 `render.yaml`，可以用 Render Blueprint 建立服務。

## 更新方式

之後修改程式後，重新部署即可。學生網址不需要更換。

如果只是在教師面板新增、修改或刪除題目，資料會存在伺服器資料檔，不需要重新部署。
