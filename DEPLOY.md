# 岡山大作戰部署筆記

## 推薦方式

這個遊戲需要 Node.js 伺服器、WebSocket 即時同步、檔案資料儲存和錄音檔儲存，不適合只部署到純靜態網站空間。

建議使用 Render / Railway / Fly.io 這類可以常駐 Node 服務的平台。

## Render 免費設定

- Build Command: `npm install`
- Start Command: `npm start`
- Environment Variable:
  - `GAME_DATA_DIR=/tmp/gangshan-battle-data`

專案已附 `render.yaml`，可以用 Render Blueprint 建立免費服務。

免費服務限制：

- 服務閒置一段時間後會休眠，學生第一次打開可能要等約一分鐘。
- 免費服務沒有永久磁碟，學生進度、教師面板改題、錄音檔可能在重新部署、重啟或休眠後消失。
- 適合試玩、短期課堂活動；如果要長期保存全班資料，需要改用付費磁碟或雲端資料庫。

## Render 長期保存設定

如果要永久保存學生資料和錄音：

- 把 `render.yaml` 的 `plan` 改成付費方案。
- 設定 `GAME_DATA_DIR=/var/data`。
- 加上 Render Persistent Disk，mount path 設為 `/var/data`，1GB 起即可。

## 更新方式

之後修改程式後，重新部署即可。學生網址不需要更換。

如果只是在教師面板新增、修改或刪除題目，資料會存在伺服器資料檔。免費服務不保證長期保存；付費磁碟才適合長期使用。
