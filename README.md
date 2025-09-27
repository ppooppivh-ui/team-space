团队新闻空间 - 打包项目
======================

包含：
- 后端（Express）: `server.js`  
  - 提供文件上传（/api/media, /api/news）、同步接口（/api/state）和管理接口（/api/delete）等
  - 文件保存在 `uploads/`
  - 数据保存在 `data.json`

- 前端：`public/index.html`（已集成：轮询同步、图片压缩上传、100MB 限制、进度条、管理员功能）

如何运行（在你的机器或服务器上）：
1. 确保已安装 Node.js（>=14）。
2. 在项目根目录执行：
   ```
   npm install
   npm start
   ```
3. 打开浏览器访问 `http://localhost:3000`

说明：
- 管理员：用户名 `admin` 可使用管理删除接口（前端有管理员 UI）。
- 同步：前端默认每 3 秒调用 `/api/state?since=<ts>` 来检查更新。
- 文件限制：100MB（由 multer 限制）。
- 若你需要把这个部署到云服务器（比如 VPS / Heroku / Railway），只需把整个项目上传并运行 `npm install && npm start`。

注意：我已把项目打包为 team-space.zip（见下方下载链接）。