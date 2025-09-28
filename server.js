const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// 获取数据
app.get('/data', (req, res) => {
  const dataPath = path.join(__dirname, 'data.json');
  fs.readFile(dataPath, 'utf-8', (err, data) => {
    if (err) return res.status(500).json({ error: '读取数据失败' });
    try {
      res.json(JSON.parse(data || '{}'));
    } catch (e) {
      res.status(500).json({ error: '解析 JSON 失败' });
    }
  });
});

// 发布新闻
app.post('/news', (req, res) => {
  const { title, desc, link } = req.body;
  const dataPath = path.join(__dirname, 'data.json');
  fs.readFile(dataPath, 'utf-8', (err, data) => {
    if (err) return res.status(500).json({ error: '读取数据失败' });
    let json = JSON.parse(data);
    json.news.unshift({
      id: Date.now(),
      title,
      desc,
      link,
      date: new Date().toISOString().split('T')[0]
    });
    fs.writeFile(dataPath, JSON.stringify(json, null, 2), err => {
      if (err) return res.status(500).json({ error: '写入失败' });
      res.json({ success: true });
    });
  });
});

// 上传媒体
app.post('/upload', upload.single('file'), (req, res) => {
  const type = req.body.type || 'image';
  const dataPath = path.join(__dirname, 'data.json');
  fs.readFile(dataPath, 'utf-8', (err, data) => {
    if (err) return res.status(500).json({ error: '读取数据失败' });
    let json = JSON.parse(data);
    json.media.unshift({
      id: Date.now(),
      file: '/uploads/' + req.file.filename,
      type,
      date: new Date().toISOString().split('T')[0]
    });
    fs.writeFile(dataPath, JSON.stringify(json, null, 2), err => {
      if (err) return res.status(500).json({ error: '写入失败' });
      res.json({ success: true, file: '/uploads/' + req.file.filename });
    });
  });
});

// 添加愿望
app.post('/wish', (req, res) => {
  const { text } = req.body;
  const dataPath = path.join(__dirname, 'data.json');
  fs.readFile(dataPath, 'utf-8', (err, data) => {
    if (err) return res.status(500).json({ error: '读取数据失败' });
    let json = JSON.parse(data);
    json.wishes.unshift({
      id: Date.now(),
      text,
      likes: 0,
      date: new Date().toISOString().split('T')[0]
    });
    fs.writeFile(dataPath, JSON.stringify(json, null, 2), err => {
      if (err) return res.status(500).json({ error: '写入失败' });
      res.json({ success: true });
    });
  });
});

// 点赞愿望
app.post('/wish/like', (req, res) => {
  const { id } = req.body;
  const dataPath = path.join(__dirname, 'data.json');
  fs.readFile(dataPath, 'utf-8', (err, data) => {
    if (err) return res.status(500).json({ error: '读取数据失败' });
    let json = JSON.parse(data);
    let wish = json.wishes.find(w => w.id === id);
    if (wish) wish.likes++;
    fs.writeFile(dataPath, JSON.stringify(json, null, 2), err => {
      if (err) return res.status(500).json({ error: '写入失败' });
      res.json({ success: true });
    });
  });
});

// 删除内容（管理员）
app.post('/delete', (req, res) => {
  const { type, id } = req.body;
  const dataPath = path.join(__dirname, 'data.json');
  fs.readFile(dataPath, 'utf-8', (err, data) => {
    if (err) return res.status(500).json({ error: '读取数据失败' });
    let json = JSON.parse(data);
    if (type === 'news') json.news = json.news.filter(n => n.id !== id);
    if (type === 'media') json.media = json.media.filter(m => m.id !== id);
    if (type === 'wish') json.wishes = json.wishes.filter(w => w.id !== id);
    fs.writeFile(dataPath, JSON.stringify(json, null, 2), err => {
      if (err) return res.status(500).json({ error: '写入失败' });
      res.json({ success: true });
    });
  });
});

app.use('/uploads', express.static(uploadDir));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
