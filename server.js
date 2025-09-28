const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 静态文件目录
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// 确保 uploads 目录存在
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 设置 multer 存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// 数据存储文件
const dataFile = path.join(__dirname, 'data.json');

// 初始化 data.json
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify({ news: [], media: [], wishes: [] }, null, 2));
}

// 读取数据
function readData() {
  return JSON.parse(fs.readFileSync(dataFile));
}

// 写入数据
function writeData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// 获取数据
app.get('/data', (req, res) => {
  res.json(readData());
});

// 添加新闻
app.post('/news', (req, res) => {
  const { title, desc, link } = req.body;
  if (!title) return res.status(400).json({ error: '缺少标题' });
  const data = readData();
  data.news.push({ id: Date.now(), title, desc, link });
  writeData(data);
  res.json({ success: true });
});

// 上传媒体
app.post('/upload', upload.single('file'), (req, res) => {
  const data = readData();
  data.media.push({ id: Date.now(), filename: req.file.filename });
  writeData(data);
  res.json({ success: true, filename: req.file.filename });
});

// 添加愿望
app.post('/wish', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: '缺少愿望内容' });
  const data = readData();
  data.wishes.push({ id: Date.now(), text });
  writeData(data);
  res.json({ success: true });
});

// 删除（管理员）
app.post('/delete', (req, res) => {
  const { type, id } = req.body;
  let data = readData();
  if (type === 'news') {
    data.news = data.news.filter(item => item.id !== id);
  } else if (type === 'media') {
    data.media = data.media.filter(item => item.id !== id);
  } else if (type === 'wish') {
    data.wishes = data.wishes.filter(item => item.id !== id);
  } else {
    return res.status(400).json({ error: '类型错误' });
  }
  writeData(data);
  res.json({ success: true });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
