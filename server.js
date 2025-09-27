/**
 * server.js
 * Simple Express backend that stores data in data.json and serves uploaded files.
 * - API endpoints:
 *   GET  /api/state?since=<timestamp>
 *   POST /api/news            (fields: title, body; optional file 'image')
 *   POST /api/media           (file 'media')
 *   POST /api/wish            (fields: text, privacy, author)
 *   POST /api/heartbeat       (fields: name)  // mark online
 *   POST /api/comment        (fields: key, author, text)
 *   POST /api/like           (fields: key, user)
 *   POST /api/delete         (fields: type, id)  // admin only (simple check)
 *
 * - Files saved under /uploads
 *
 * Note: This is a simple packaged demo for local run or deploy to a server.
 */

const express = require('express');
const multer  = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if(!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const app = express();
app.use(cors());
app.use(bodyParser.json({limit: '200mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '200mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, 'public')));

// Simple upload storage with original filename preserved
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR)
  },
  filename: function (req, file, cb) {
    const name = Date.now() + '_' + file.originalname.replace(/\s+/g,'_');
    cb(null, name);
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB

// Initialize data.json if missing
function loadData() {
  if(!fs.existsSync(DATA_FILE)){
    const init = { lastUpdate: Date.now(), news: [], media: [], wishes: [], comments: {}, likes: {}, sessions: {}, online: {} };
    fs.writeFileSync(DATA_FILE, JSON.stringify(init, null, 2), 'utf-8');
    return init;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}
function saveData(d){
  d.lastUpdate = Date.now();
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2), 'utf-8');
}

app.get('/api/state', (req, res) => {
  const since = parseInt(req.query.since || '0', 10);
  const d = loadData();
  // If since is recent, return only metadata and lastUpdate
  if(since && d.lastUpdate <= since){
    return res.json({ updated: false, lastUpdate: d.lastUpdate });
  }
  res.json({ updated: true, lastUpdate: d.lastUpdate, data: d });
});

app.post('/api/news', upload.single('image'), (req, res) => {
  const d = loadData();
  const { title, body, author } = req.body;
  if(!title || !body) return res.status(400).json({error:'title and body required'});
  const item = { id: Date.now(), title, body, author: author || '匿名', time: new Date().toLocaleString(), img: null };
  if(req.file){
    item.img = '/uploads/' + req.file.filename;
    item.size = req.file.size;
    item.filename = req.file.originalname;
  }
  d.news.unshift(item);
  saveData(d);
  res.json({ ok: true, item });
});

app.post('/api/media', upload.single('media'), (req, res) => {
  const d = loadData();
  if(!req.file) return res.status(400).json({error:'file required'});
  const item = { id: Date.now(), url: '/uploads/' + req.file.filename, type: req.file.mimetype, time: new Date().toLocaleString(), author: req.body.author || '匿名', filename: req.file.originalname, size: req.file.size };
  d.media.unshift(item);
  saveData(d);
  res.json({ ok: true, item });
});

app.post('/api/wish', (req, res) => {
  const d = loadData();
  const { text, privacy, author } = req.body;
  if(!text) return res.status(400).json({error:'text required'});
  const item = { id: Date.now(), text, privacy: privacy||'public', author: privacy==='anonymous'?'匿名':(author||'匿名'), time: new Date().toLocaleString() };
  d.wishes.unshift(item);
  saveData(d);
  res.json({ ok: true, item });
});

app.post('/api/heartbeat', (req, res) => {
  const { name } = req.body;
  if(!name) return res.status(400).json({error:'name required'});
  const d = loadData();
  d.online = d.online || {};
  d.online[name] = { last: Date.now(), deviceId: req.body.deviceId || null };
  saveData(d);
  res.json({ ok:true, online: d.online });
});

app.post('/api/comment', (req, res) => {
  const { key, author, text } = req.body;
  if(!key || !author || !text) return res.status(400).json({error:'key, author, text required'});
  const d = loadData();
  d.comments[key] = d.comments[key] || [];
  d.comments[key].unshift({ id: Date.now(), author, text, time: new Date().toLocaleString() });
  saveData(d);
  res.json({ ok:true });
});

app.post('/api/like', (req, res) => {
  const { key, user } = req.body;
  if(!key || !user) return res.status(400).json({error:'key,user required'});
  const d = loadData();
  d.likes[key] = d.likes[key] || { count:0, users:[] };
  const idx = d.likes[key].users.indexOf(user);
  if(idx === -1){ d.likes[key].users.push(user); d.likes[key].count++; } else { d.likes[key].users.splice(idx,1); d.likes[key].count = Math.max(0, d.likes[key].count-1); }
  saveData(d);
  res.json({ ok:true, likes: d.likes[key] });
});

// Simple delete endpoint, naive admin check: provide admin=true in body OR name==='admin'
app.post('/api/delete', (req, res) => {
  const { type, id, admin } = req.body;
  const d = loadData();
  if(!admin && req.body.user !== 'admin') return res.status(403).json({ error: 'only admin' });
  if(!type || !id) return res.status(400).json({ error: 'type and id required' });
  if(type === 'news') d.news = d.news.filter(x => String(x.id) !== String(id));
  if(type === 'media') d.media = d.media.filter(x => String(x.id) !== String(id));
  if(type === 'wish') d.wishes = d.wishes.filter(x => String(x.id) !== String(id));
  saveData(d);
  res.json({ ok:true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});