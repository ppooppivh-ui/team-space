
// Simple Express backend for Team Space
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({extended: true}));

// serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// storage config
const upload = multer({ dest: path.join(__dirname, 'uploads'), limits: { fileSize: 100*1024*1024 } });

// data.json file
const dataFile = path.join(__dirname, 'data.json');
function loadData(){
  try{ return JSON.parse(fs.readFileSync(dataFile)); }
  catch(e){ return {lastUpdate: Date.now(), news:[], media:[], wishes:[], comments:{}, likes:{}, online:{}}; }
}
function saveData(d){
  d.lastUpdate = Date.now();
  fs.writeFileSync(dataFile, JSON.stringify(d,null,2));
}

// API
app.get('/api/state',(req,res)=>{
  const since = parseInt(req.query.since||0);
  const d = loadData();
  if(d.lastUpdate > since){
    res.json({updated:true,lastUpdate:d.lastUpdate,data:d});
  } else {
    res.json({updated:false,lastUpdate:d.lastUpdate});
  }
});

app.post('/api/news', upload.single('image'), (req,res)=>{
  const d = loadData();
  const item = {
    id: Date.now(),
    title: req.body.title,
    body: req.body.body,
    author: req.body.author || '匿名',
    time: new Date().toLocaleString(),
    img: req.file ? '/uploads/'+req.file.filename : null
  };
  d.news.unshift(item);
  saveData(d);
  res.json({ok:true});
});

app.post('/api/media', upload.single('media'), (req,res)=>{
  const d = loadData();
  if(!req.file) return res.status(400).json({error:'No file'});
  const item = {
    id: Date.now(),
    url: '/uploads/'+req.file.filename,
    type: req.file.mimetype,
    time: new Date().toLocaleString(),
    author: req.body.author || '匿名',
    filename: req.file.originalname,
    size: req.file.size
  };
  d.media.unshift(item);
  saveData(d);
  res.json({ok:true});
});

app.post('/api/wish',(req,res)=>{
  const d = loadData();
  const item = {
    id: Date.now(),
    text: req.body.text,
    privacy: req.body.privacy,
    author: req.body.privacy==='anonymous' ? '匿名' : (req.body.author||'匿名'),
    time: new Date().toLocaleString()
  };
  d.wishes.unshift(item);
  saveData(d);
  res.json({ok:true});
});

app.post('/api/comment',(req,res)=>{
  const d = loadData();
  const key = req.body.key;
  d.comments[key] = d.comments[key] || [];
  d.comments[key].unshift({id:Date.now(), author:req.body.author, text:req.body.text, time:new Date().toLocaleString()});
  saveData(d);
  res.json({ok:true});
});

app.post('/api/like',(req,res)=>{
  const d = loadData();
  const key = req.body.key;
  d.likes[key] = d.likes[key] || {count:0, users:[]};
  const users = d.likes[key].users;
  const idx = users.indexOf(req.body.user);
  if(idx === -1){ users.push(req.body.user); d.likes[key].count++; }
  else { users.splice(idx,1); d.likes[key].count = Math.max(0,d.likes[key].count-1); }
  saveData(d);
  res.json({ok:true});
});

app.post('/api/delete',(req,res)=>{
  const d = loadData();
  const type = req.body.type, id = parseInt(req.body.id);
  if(!req.body.admin){ return res.status(403).json({error:'not admin'}); }
  if(type==='news') d.news = d.news.filter(x=>x.id!==id);
  if(type==='media') d.media = d.media.filter(x=>x.id!==id);
  if(type==='wish') d.wishes = d.wishes.filter(x=>x.id!==id);
  saveData(d);
  res.json({ok:true});
});

app.post('/api/heartbeat',(req,res)=>{
  const d = loadData();
  const name = req.body.name||'未知';
  d.online[name] = { last: Date.now(), deviceId:req.body.deviceId };
  saveData(d);
  res.json({ok:true});
});

// start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>{
  console.log('Server running on port '+PORT);
});
