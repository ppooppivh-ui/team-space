// upgraded server.js - supports news, wishes, media, upload, delete, like, comment, presence
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({limit: '1gb'}));
app.use(express.urlencoded({ extended: true, limit: '1gb' }));

const PUBLIC = path.join(__dirname, 'public');
const UPLOADS = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });
app.use(express.static(PUBLIC));
app.use('/uploads', express.static(UPLOADS));

const DATA_FILE = path.join(__dirname, 'data.json');
let data = { news: [], wishes: [], media: [], likes: {}, comments: {}, presence: {} };
function readData(){ try{ if(fs.existsSync(DATA_FILE)) data = JSON.parse(fs.readFileSync(DATA_FILE,'utf8')); } catch(e){} }
function writeData(){ fs.writeFileSync(DATA_FILE, JSON.stringify(data,null,2),'utf8'); }
readData();

// multer config (300MB limit)
const storage = multer.diskStorage({
  destination: (req,file,cb) => cb(null, UPLOADS),
  filename: (req,file,cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g,'_'))
});
const upload = multer({ storage, limits: { fileSize: 300 * 1024 * 1024 } });

// Helper to create id
function makeId(){ return String(Date.now()) + '-' + Math.floor(Math.random()*10000); }

// GET /data -> returns news, wishes, media, likes, comments, online count
app.get('/data', (req,res) => {
  // compute online count from presence (lastSeen within 45s)
  const now = Date.now();
  const online = Object.entries(data.presence || {}).filter(([k,v]) => (now - v) < 45000).length;
  res.json({ news: data.news, wishes: data.wishes, media: data.media, likes: data.likes, comments: data.comments, online });
});

// UPLOAD endpoint - saves file and registers a media item
app.post('/upload', upload.single('file'), (req,res) => {
  if(!req.file) return res.status(400).json({ error: 'no file' });
  const relPath = '/uploads/' + path.basename(req.file.path);
  // register media entry
  const mimeType = req.file.mimetype || '';
  const entry = { id: makeId(), file: relPath, mimetype: mimeType, ts: Date.now(), type: mimeType };
  data.media.push(entry);
  writeData();
  res.json({ file: relPath, id: entry.id });
});

// POST /news - admin only
app.post('/news', (req,res) => {
  const { adminName, adminPass, text, file, title } = req.body;
  if(adminName !== 'guangminghui' || adminPass !== 'guangminghui888') return res.status(403).json({ error: 'unauthorized' });
  const entry = { id: makeId(), text: text || '', file: file || '', title: title || '', ts: Date.now(), type: 'news' };
  data.news.push(entry);
  writeData();
  res.json({ ok: true, id: entry.id });
});

// POST /wish - any user
app.post('/wish', (req,res) => {
  const { text, user, file } = req.body;
  const entry = { id: makeId(), text: text || '', user: user || '匿名', file: file || '', ts: Date.now(), type: 'wish', likes: 0 };
  data.wishes.push(entry);
  writeData();
  res.json({ ok: true, id: entry.id });
});

// POST /delete - admin only
app.post('/delete', (req,res) => {
  const { type, id, adminName, adminPass } = req.body;
  if(adminName !== 'guangminghui' || adminPass !== 'guangminghui888') return res.status(403).json({ error: 'unauthorized' });
  if(type === 'news') data.news = data.news.filter(i => i.id !== id);
  if(type === 'wish') data.wishes = data.wishes.filter(i => i.id !== id);
  if(type === 'media') data.media = data.media.filter(i => i.id !== id);
  writeData();
  res.json({ ok: true });
});

// POST /like - increments like on wish (or generic id)
app.post('/like', (req,res) => {
  const { id } = req.body;
  if(!id) return res.status(400).json({ error: 'missing id' });
  data.likes[id] = (data.likes[id]||0) + 1;
  writeData();
  res.json({ ok: true, likes: data.likes[id] });
});

// POST /comment - save comment under id
app.post('/comment', (req,res) => {
  const { id, user, text } = req.body;
  if(!id || !text) return res.status(400).json({ error: 'missing' });
  data.comments[id] = data.comments[id] || [];
  data.comments[id].push({ user: user || '匿名', text: text, ts: Date.now() });
  writeData();
  res.json({ ok: true });
});

// POST /presence - client pings to mark online
app.post('/presence', (req,res) => {
  const { user } = req.body;
  if(!user) return res.status(400).json({ error: 'missing user' });
  data.presence = data.presence || {};
  data.presence[user] = Date.now();
  writeData();
  res.json({ ok: true });
});

// GET /presence - returns online count and list (lastSeen within 45s)
app.get('/presence', (req,res) => {
  const now = Date.now();
  const active = Object.entries(data.presence || {}).filter(([k,v]) => (now - v) < 45000);
  res.json({ count: active.length, users: active.map(x=>x[0]) });
});

// graceful shutdown write
process.on('SIGINT', ()=>{ writeData(); process.exit(); });
process.on('SIGTERM', ()=>{ writeData(); process.exit(); });

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=>console.log('Upgraded Team Space server running on', PORT));
