// Express backend for Team Space (final)
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({extended: true, limit: '50mb'}));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if(!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, UPLOAD_DIR); },
  filename: function (req, file, cb) {
    const name = Date.now() + '_' + file.originalname.replace(/\s+/g,'_');
    cb(null, name);
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 100 * 1024 * 1024 } });

const DATA_FILE = path.join(__dirname, 'data.json');
function loadData(){ try{ return JSON.parse(fs.readFileSync(DATA_FILE,'utf-8')); }catch(e){ return { lastUpdate: Date.now(), users:[], news:[], media:[], wishes:[], comments:{}, likes:{}, online:{} }; } }
function saveData(d){ d.lastUpdate = Date.now(); fs.writeFileSync(DATA_FILE, JSON.stringify(d,null,2),'utf-8'); }

// state endpoint
app.get('/api/state', (req,res)=>{
  const since = parseInt(req.query.since||'0',10);
  const d = loadData();
  if(since && d.lastUpdate <= since) return res.json({ updated:false, lastUpdate: d.lastUpdate });
  return res.json({ updated:true, lastUpdate: d.lastUpdate, data: d });
});

// register/login simple endpoints (login only checks admin)
app.post('/api/register', (req,res)=>{
  const d = loadData();
  const name = req.body.name;
  if(!name) return res.status(400).json({ error: 'name required' });
  if(!d.users.find(u=>u.name===name)){ d.users.push({ name, created: new Date().toLocaleString() }); saveData(d); }
  res.json({ ok:true });
});

app.post('/api/login', (req,res)=>{
  const name = req.body.name;
  const pwd = req.body.password || '';
  // admin password is '123456'
  if(name === 'admin'){
    if(pwd === '123456') return res.json({ ok:true, admin:true });
    else return res.status(403).json({ error:'admin password incorrect' });
  }
  // normal login success
  res.json({ ok:true, admin:false });
});

// news
app.post('/api/news', upload.single('image'), (req,res)=>{
  const d = loadData();
  const item = { id: Date.now(), title: req.body.title, body: req.body.body, author: req.body.author||'匿名', time: new Date().toLocaleString(), img: req.file ? '/uploads/' + req.file.filename : null, filename: req.file?req.file.originalname:null, size: req.file?req.file.size:0 };
  d.news.unshift(item); saveData(d); res.json({ ok:true, item });
});

// media
app.post('/api/media', upload.single('media'), (req,res)=>{
  const d = loadData();
  if(!req.file) return res.status(400).json({ error:'file required' });
  const item = { id: Date.now(), url: '/uploads/' + req.file.filename, type: req.file.mimetype, time: new Date().toLocaleString(), author: req.body.author||'匿名', filename: req.file.originalname, size: req.file.size };
  d.media.unshift(item); saveData(d); res.json({ ok:true, item });
});

// wish
app.post('/api/wish', (req,res)=>{
  const d = loadData();
  const item = { id: Date.now(), text: req.body.text, privacy: req.body.privacy, author: req.body.privacy==='anonymous' ? '匿名' : (req.body.author||'匿名'), time: new Date().toLocaleString() };
  d.wishes.unshift(item); saveData(d); res.json({ ok:true, item });
});

// comment
app.post('/api/comment', (req,res)=>{
  const d = loadData();
  const key = req.body.key;
  d.comments[key] = d.comments[key] || [];
  d.comments[key].unshift({ id: Date.now(), author: req.body.author, text: req.body.text, time: new Date().toLocaleString() });
  saveData(d); res.json({ ok:true });
});

// like
app.post('/api/like', (req,res)=>{
  const d = loadData();
  const key = req.body.key;
  d.likes[key] = d.likes[key] || { count:0, users:[] };
  const idx = d.likes[key].users.indexOf(req.body.user);
  if(idx === -1){ d.likes[key].users.push(req.body.user); d.likes[key].count++; } else { d.likes[key].users.splice(idx,1); d.likes[key].count = Math.max(0,d.likes[key].count-1); }
  saveData(d); res.json({ ok:true, likes: d.likes[key] });
});

// delete (admin)
app.post('/api/delete', (req,res)=>{
  const d = loadData();
  const admin = req.body.admin;
  if(!admin) return res.status(403).json({ error:'admin required' });
  const type = req.body.type, id = parseInt(req.body.id,10);
  if(type==='news') d.news = d.news.filter(x=>String(x.id)!==String(id));
  if(type==='media') d.media = d.media.filter(x=>String(x.id)!==String(id));
  if(type==='wish') d.wishes = d.wishes.filter(x=>String(x.id)!==String(id));
  saveData(d); res.json({ ok:true });
});

// heartbeat
app.post('/api/heartbeat', (req,res)=>{
  const d = loadData();
  const name = req.body.name||'未知';
  d.online[name] = { last: Date.now(), deviceId: req.body.deviceId || null };
  saveData(d); res.json({ ok:true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>{ console.log('Team Space server listening on port ' + PORT); });
