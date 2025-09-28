// server.js (final backend with admin)
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ file: '/uploads/' + req.file.filename });
});

const DATA_FILE = path.join(__dirname, 'data.json');
function readData() {
  if (!fs.existsSync(DATA_FILE)) return { news: [], wishes: [] };
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/data', (req, res) => res.json(readData()));

app.post('/news', (req, res) => {
  const { adminName, adminPass } = req.body;
  if (adminName !== 'guangminghui' || adminPass !== 'guangminghui888') {
    return res.status(403).json({ success: false });
  }
  const data = readData();
  data.news.push({ ...req.body, id: Date.now(), type: 'news' });
  writeData(data);
  res.json({ success: true });
});

app.post('/wish', (req, res) => {
  const data = readData();
  data.wishes.push({ ...req.body, id: Date.now(), type: 'wish' });
  writeData(data);
  res.json({ success: true });
});

app.post('/delete', (req, res) => {
  const { type, id, adminName, adminPass } = req.body;
  if (adminName !== 'guangminghui' || adminPass !== 'guangminghui888') {
    return res.status(403).json({ success: false });
  }
  const data = readData();
  if (type === 'news') data.news = data.news.filter(n => n.id !== id);
  if (type === 'wish') data.wishes = data.wishes.filter(w => w.id !== id);
  writeData(data);
  res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
