const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// 静态文件
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// 确保 uploads 目录存在
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer 存储配置（避免 EEXIST 错误）
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// --- 读取 data.json ---
app.get('/data', (req, res) => {
  const dataPath = path.join(__dirname, 'data.json');
  fs.readFile(dataPath, 'utf-8', (err, data) => {
    if (err) return res.status(500).json({ error: '读取数据失败' });
    try {
      res.json(JSON.parse(data));
    } catch (e) {
      res.status(500).json({ error: '解析 JSON 失败' });
    }
  });
});

// --- 发布新闻 ---
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
      date: new Date().toISOString().split('T')[0],
      views: 0
    });

    fs.writeFile(dataPath, JSON.stringify(json, null, 2), err => {
      if (err) return res.status(500).json({ error: '写入失败' });
      res.json({ success: true });
    });
  });
});

// --- 上传媒体（图片/视频） ---
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
      date: new Date().toISOString().split('T')[0],
      views: 0
    });

    fs.writeFile(dataPath, JSON.stringify(json, null, 2), err => {
      if (err) return res.status(500).json({ error: '写入失败' });
      res.json({ success: true, file: '/uploads/' + req.file.filename });
    });
  });
});

// --- 添加愿望 ---
app.post('/wish', (req, res) => {
  const { text } = req.body;
  const dataPath = path.join(__dirname, 'data.json');
  fs.readFile(dataPath, 'utf-8', (err, data) => {
    if (err) return res.status(500).json({ error: '读取数据失败' });

    let json = JSON.parse(data);
    json.wish.unshift({
      id: Date.now(),
      text,
      date: new Date().toISOString().split('T')[0],
      likes: 0
    });

    fs.writeFile(dataPath, JSON.stringify(json, null, 2), err => {
      if (err) return res.status(500).json({ error: '写入失败' });
      res.json({ success: true });
    });
  });
});

// --- 删除新闻 ---
app.delete('/news/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const dataPath = path.join(__dirname, 'data.json');
  fs.readFile(dataPath, 'utf-8', (err, data) => {
    if (err) return res.status(500).json({ error: '读取数据失败' });

    let json = JSON.parse(data);
    json.news = json.news.filter(n => n.id !== id);

    fs.writeFile(dataPath, JSON.stringify(json, null, 2), err => {
      if (err) return res.status(500).json({ error: '写入失败' });
      res.json({ success: true });
    });
  });
});

// --- 删除媒体 ---
app.delete('/media/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const dataPath = path.join(__dirname, 'data.json');
  fs.readFile(dataPath, 'utf-8', (err, data) => {
    if (err) return res.status(500).json({ error: '读取数据失败' });

    let json = JSON.parse(data);
    json.media = json.media.filter(m => m.id !== id);

    fs.writeFile(dataPath, JSON.stringify(json, null, 2), err => {
      if (err) return res.status(500).json({ error: '写入失败' });
      res.json({ success: true });
    });
  });
});

// --- 删除愿望 ---
app.delete('/wish/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const dataPath = path.join(__dirname, 'data.json');
  fs.readFile(dataPath, 'utf-8', (err, data) => {
    if (err) return res.status(500).json({ error: '读取数据失败' });

    let json = JSON.parse(data);
    json.wish = json.wish.filter(w => w.id !== id);

    fs.writeFile(dataPath, JSON.stringify(json, null, 2), err => {
      if (err) return res.status(500).json({ error: '写入失败' });
      res.json({ success: true });
    });
  });
});

// --- 启动服务 ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
