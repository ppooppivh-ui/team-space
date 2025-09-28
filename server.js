const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// 保证 uploads 目录存在
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 静态文件目录
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));
app.use(express.json());

// 上传设置
const upload = multer({ dest: uploadDir });

// 数据文件路径
const dataPath = path.join(__dirname, 'data.json');

// 读取数据
function readData() {
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify({ news: [], media: [], wishes: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
}

// 保存数据
function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

// API - 获取全部数据
app.get('/api/data', (req, res) => {
  res.json(readData());
});

// API - 添加新闻
app.post('/api/news', (req, res) => {
  const { title, desc, link } = req.body;
  let data = readData();
  data.news.unshift({
    id: Date.now(),
    title,
    desc,
    link,
    date: new Date().toISOString().split('T')[0],
    views: 0
  });
  saveData(data);
  res.json({ success: true });
});

// API - 上传媒体（图片/视频）
app.post('/api/upload', upload.single('file'), (req, res) => {
  const type = req.body.type || 'image';
  let data = readData();
  data.media.unshift({
    id: Date.now(),
    type,
    file: '/uploads/' + req.file.filename,
    date: new Date().toISOString().split('T')[0],
    views: 0
  });
  saveData(data);
  res.json({ success: true, file: '/uploads/' + req.file.filename });
});

// API - 添加愿望
app.post('/api/wish', (req, res) => {
  const { text, anonymous } = req.body;
  let data = readData();
  data.wishes.unshift({
    id: Date.now(),
    text,
    anonymous: anonymous || false,
    date: new Date().toISOString().split('T')[0]
  });
  saveData(data);
  res.json({ success: true });
});

// 管理员后台 - 删除新闻/媒体/愿望
app.delete('/api/admin/:type/:id', (req, res) => {
  const { type, id } = req.params;
  let data = readData();
  if (!data[type]) return res.status(400).json({ error: '类型错误' });
  data[type] = data[type].filter(item => item.id != id);
  saveData(data);
  res.json({ success: true });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});