const express = require('express');
const fs = require('fs');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static('public'));

// 数据文件
const dataFile = 'data.json';
let data = { news: [], wishes: [] };
if (fs.existsSync(dataFile)) {
  data = JSON.parse(fs.readFileSync(dataFile));
}

// 保存数据
function saveData() { fs.writeFileSync(dataFile, JSON.stringify(data,null,2)); }

// 获取数据
app.get('/data', (req,res)=>{ res.json(data); });

// 发布新闻
app.post('/news',(req,res)=>{
  const {text,file,title,adminName,adminPass,id} = req.body;
  if(adminName!=='guangminghui' || adminPass!=='guangminghui888'){ return res.status(403).json({error:'unauthorized'}); }
  data.news.push({id,text,file,title,type:'news'}); saveData(); res.json({ok:true});
});

// 许愿
app.post('/wish',(req,res)=>{
  const {text,user,id,file,type} = req.body;
  data.wishes.push({id,text,user,file,type:'wish'}); saveData(); res.json({ok:true});
});

// 上传
const upload = multer({dest:'uploads/'});
app.post('/upload', upload.single('file'), (req,res)=>{
  const url = '/'+req.file.path;
  res.json({file:url});
});

// 删除
app.post('/delete',(req,res)=>{
  const {type,id,adminName,adminPass} = req.body;
  if(adminName!=='guangminghui' || adminPass!=='guangminghui888'){ return res.status(403).json({error:'unauthorized'}); }
  if(type==='news'){ data.news = data.news.filter(i=>i.id!=id); }
  if(type==='wish'){ data.wishes = data.wishes.filter(i=>i.id!=id); }
  saveData(); res.json({ok:true});
});

app.listen(PORT,()=>console.log('Server running on '+PORT));
