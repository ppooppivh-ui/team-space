
// server.js - Final version with admin auth
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());
app.use(bodyParser.json());

// 静态资源目录
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 首页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 确保上传目录存在
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// 配置 multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const name = Date.now() + '-' + file.originalname;
    cb(null, name);
  }
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB

// 上传接口
app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ file: '/uploads/' + req.file.filename, size: req.file.size });
});

// 数据文件
const DATA_FILE = path.join(__dirname, 'data.json');
function readData() {
  if (!fs.existsSync(DATA_FILE)) return { news: [], wishes: [] };
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// 获取数据
app.get('/data', (req, res) => {
  res.json(readData());
});

// 发布新闻
app.post('/news', (req, res) => {
  const data = readData();
  data.news.push({ ...req.body, id: Date.now() });
  writeData(data);
  res.json({ success: true });
});

// 提交愿望
app.post('/wish', (req, res) => {
  const data = readData();
  data.wishes.push({ ...req.body, id: Date.now() });
  writeData(data);
  res.json({ success: true });
});

// 删除新闻或愿望 (管理员认证)
app.post('/delete', (req, res) => {
  const { type, id, adminName, adminPass } = req.body;
  if (adminName !== "guangminghui" || adminPass !== "guangminghui888") {
    return res.status(403).json({ success: false, message: "无效的管理员凭证" });
  }
  const data = readData();
  if (type === 'news') {
    data.news = data.news.filter(item => item.id !== id);
  } else if (type === 'wish') {
    data.wishes = data.wishes.filter(item => item.id !== id);
  }
  writeData(data);
  res.json({ success: true });
});

// 端口
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Team Space server running on port ${PORT}`));
