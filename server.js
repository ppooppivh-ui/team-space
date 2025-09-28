const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3000;

// 静态文件
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// 上传配置
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// 🔹 读取 data.json
app.get('/data', (req, res) => {
  const dataPath = path.join(__dirname, 'data.json');
  fs.readFile(dataPath, 'utf-8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: '读取数据失败' });
    }
    try {
      res.json(JSON.parse(data));
    } catch (e) {
      res.status(500).json({ error: '解析 JSON 失败' });
    }
  });
});

// 🔹 发布新闻
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

// 🔹 上传媒体（图片/视频）
app.post('/upload', upload.single('file'), (req, res) => {
  const type = req.body.type || 'image'; // 默认为图片
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

// 🔹 许愿池
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

// 🔹 点赞许愿池
app.post('/wish/like', (req, res) => {
  const { id } = req.body;
  const dataPath = path.join(__dirname, 'data.json');
  fs.readFile(dataPath, 'utf-8', (err, data) => {
    if (err) return res.status(500).json({ error: '读取数据失败' });

    let json = JSON.parse(data);
    let wish = json.wishes.find(w => w.id === id);
    if (wish) {
      wish.likes++;
    }

    fs.writeFile(dataPath, JSON.stringify(json, null, 2), err => {
      if (err) return res.status(500).json({ error: '写入失败' });
      res.json({ success: true });
    });
  });
});

// 🔹 静态文件服务（uploads 文件夹）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});