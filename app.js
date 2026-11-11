const firebaseConfig = {
  apiKey: "AIzaSyDoangT_YXrnOvnlFex6GLD5Z4VpLHdDTs",
  authDomain: "scroll-1e505.firebaseapp.com",
  databaseURL: "https://scroll-1e505-default-rtdb.firebaseio.com",
  projectId: "scroll-1e505",
  storageBucket: "scroll-1e505.firebasestorage.app",
  messagingSenderId: "407623450352",
  appId: "1:407623450352:web:49734fcf79185ce6b88c35"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let DB = { users: [], posts: [], msgs: [], friends: [], reqs: [], shorts: [] };
let u = JSON.parse(localStorage.getItem('scroll_session') || sessionStorage.getItem('scroll_session') || 'null');
let aMode = 'login', aChat = null;
let currentShortIndex = 0;
let dbLoaded = false;

const BAD_WORDS = ['хуй', 'пизда', 'ебать', 'блять', 'сука', 'долбоеб', 'мудак', 'гандон', 'шлюха', 'нахуй', 'пиздец'];
function censor(text) { let clean = String(text || ''); BAD_WORDS.forEach(w => { clean = clean.replace(new RegExp(w, 'gi'), '***'); }); return clean; }
let lastPostTime = 0;

db.ref('/').on('value', snap => {
  const data = snap.val() || {};
  DB.users = data.users ? Object.values(data.users).filter(x => x && x.id && x.nick) : [];
  DB.posts = data.posts ? Object.values(data.posts).filter(x => x && x.id) : [];
  DB.msgs = data.msgs ? Object.values(data.msgs).filter(x => x && x.from) : [];
  DB.friends = data.friends ? Object.values(data.friends).filter(x => x && x.a) : [];
  DB.reqs = data.reqs ? Object.values(data.reqs).filter(x => x && x.from) : [];
  DB.shorts = data.shorts ? Object.values(data.shorts).filter(x => x && x.vid) : [];
  DB.posts = DB.posts.map(p => ({...p, likes: p.likes || [], cmts: p.cmts || []}));
  dbLoaded = true;

  updateBadges(); // Обновляем красные кружочки

  if(document.getElementById('v-feed') && document.getElementById('v-feed').classList.contains('active')) renderFeed();
  if(document.getElementById('v-profile') && document.getElementById('v-profile').classList.contains('active')) renderProfile();
  if(document.getElementById('v-friends') && document.getElementById('v-friends').classList.contains('active')) renderFriends();
  if(document.getElementById('v-chat') && document.getElementById('v-chat').classList.contains('active') && aChat) renderMsgs(aChat);
  renderFriendsSidebar();
});

const genId = () => { let id; do { id = Math.floor(1000+Math.random()*9000).toString(); } while(DB.users.some(x=>x.id===id)); return id; };
const esc = s => String(s || '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ago = t => { if(!t) return ''; let d=(Date.now()-t)/1000; if(d<60)return'сейчас'; if(d<3600)return Math.floor(d/60)+'м'; if(d<86400)return Math.floor(d/3600)+'ч'; return Math.floor(d/86400)+'д'; };
const ini = n => n ? String(n)[0].toUpperCase() : '?';
const gU = id => DB.users.find(x => x.id === id) || {nick:'Удалён', id:id, lastSeen:0, game:''};
const isOnline = (id) => { let user = gU(id); return user.lastSeen && (Date.now() - user.lastSeen < 300000); };

function updateBadges() {
  if(!u) return;
  let unreadMsgs = DB.msgs.filter(m => m.to === u.id && !m.read).length;
  let reqs = DB.reqs.filter(r => r.to === u.id).length;
  
  let bc = document.getElementById('badge-chats');
  if(bc) { bc.style.display = unreadMsgs ? 'inline-block' : 'none'; bc.textContent = unreadMsgs; }
  
  let bf = document.getElementById('badge-friends');
  if(bf) { bf.style.display = reqs ? 'inline-block' : 'none'; bf.textContent = reqs; }
}

function appSet(){
  let s = JSON.parse(localStorage.getItem('setts')||'{"theme":"dark","bold":true}');
  document.body.dataset.theme = s.theme;
  if(s.bold) document.body.removeAttribute('data-thin'); else document.body.setAttribute('data-thin','1');
  let t=document.getElementById('tBold'); if(t) t.classList.toggle('on',s.bold);
  let th=document.getElementById('tTheme'); if(th) th.classList.toggle('on',s.theme==='dark');
}
const toggleTheme = () => { let s=JSON.parse(localStorage.getItem('setts')||'{"theme":"dark","bold":true}'); s.theme=s.theme==='dark'?'light':'dark'; localStorage.setItem('setts',JSON.stringify(s)); appSet(); };
const toggleBold = () => { let s=JSON.parse(localStorage.getItem('setts')||'{"theme":"dark","bold":true}'); s.bold=!s.bold; localStorage.setItem('setts',JSON.stringify(s)); appSet(); };
appSet();

function authToggle(){
  aMode=aMode==='login'?'register':'login';
  document.getElementById('aBtn').textContent=aMode==='login'?'Войти':'Создать аккаунт';
  document.getElementById('aSwitch').innerHTML=aMode==='login'?'Нет аккаунта? <u style="color:var(--acc)">Создать</u>':'Уже есть аккаунт? <u style="color:var(--acc)">Войти</u>';
  document.getElementById('aErr').textContent='';
}

function authSubmit(){
  let n=document.getElementById('aNick').value.trim();
  let p=document.getElementById('aPass').value;
  let remember = document.getElementById('aRemember').checked;
  let e=document.getElementById('aErr');
  e.textContent='';
  
  if(!dbLoaded) return e.textContent='Загрузка...';
  if(!n) return e.textContent='Введите ник!';
  if(n.length < 2) return e.textContent='Ник от 2 символов!';
  if(p.length < 3) return e.textContent='Пароль от 3 символов!';
  
  if(aMode==='register'){
    if(DB.users.some(x => x && x.nick && x.nick.toLowerCase() === n.toLowerCase())) return e.textContent='Ник занят';
    let nu = {id:genId(), nick:n, pass:p, lastSeen:Date.now(), game:''};
    db.ref('users/'+nu.id).set(nu).then(()=>{
      u = {id:nu.id, nick:nu.nick};
      if(remember) { localStorage.setItem('scroll_session', JSON.stringify(u)); sessionStorage.removeItem('scroll_session'); }
      else { sessionStorage.setItem('scroll_session', JSON.stringify(u)); localStorage.removeItem('scroll_session'); }
      location.reload();
    });
  } else {
    let f = DB.users.find(x => x && x.nick && x.nick.toLowerCase() === n.toLowerCase() && x.pass === p);
    if(!f) return e.textContent='Неверный ник или пароль';
    u = {id:f.id, nick:f.nick};
    if(remember) { localStorage.setItem('scroll_session', JSON.stringify(u)); sessionStorage.removeItem('scroll_session'); }
    else { sessionStorage.setItem('scroll_session', JSON.stringify(u)); localStorage.removeItem('scroll_session'); }
    location.reload();
  }
}

function logout(){ 
  localStorage.removeItem('scroll_session'); 
  sessionStorage.removeItem('scroll_session');
  u=null; location.reload(); 
}

function show(v){
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  let el = document.getElementById('v-'+v); if(el) el.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  let nb=document.getElementById('n-'+v); if(nb) nb.classList.add('active');
  
  let titles = {'feed':'Лента', 'shorts':'Скроллс 🎬', 'chats':'Мессенджер', 'music':'Музыка', 'profile':'Профиль', 'settings':'Настройки', 'chat':'Диалог', 'friends':'Друзья'};
  document.getElementById('hTitle').textContent = titles[v];
  
  if(v==='profile') renderProfile();
  if(v==='feed') renderFeed();
  if(v==='friends') renderFriends();
  if(v==='chats') renderChats();
  if(v==='shorts') renderShorts();
  if(v==='settings') { let g=gU(u.id); document.getElementById('gameInput').value = g.game || ''; }
}

function renderFriends(){
  let f=DB.friends.filter(x=>x.a===u.id||x.b===u.id);
  let fl = document.getElementById('fList');
  if(fl) fl.innerHTML=f.map(x=>{let o=gU(x.a===u.id?x.b:x.a);return `<div style="display:flex;gap:10px;align-items:center;padding:10px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.1)" onclick="openChat('${o.id}')"><div class="av sm ${isOnline(o.id)?'online':''}">${ini(o.nick)}</div><div style="flex:1;color:#fff">${esc(o.nick)}</div><span style="color:var(--acc)">💬</span></div>`}).join('')||'<div style="color:var(--muted)">У тебя пока нет друзей</div>';
  
  let r=DB.reqs.filter(x=>x.to===u.id);
  let rl = document.getElementById('reqList');
  if(rl) rl.innerHTML=r.map(x=>{let o=gU(x.from);return `<div style="display:flex;align-items:center;padding:10px;border-bottom:1px solid rgba(255,255,255,0.1)"><div class="av sm">${ini(o.nick)}</div><div style="flex:1;margin-left:10px;color:#fff">${esc(o.nick)}</div><button class="btn" style="padding:5px 10px;font-size:12px" onclick="accReq('${x.from}')">Принять</button></div>`}).join('')||'<div style="color:var(--muted)">Нет новых заявок</div>';
}

function accReq(id){
  db.ref('friends/'+Date.now()).set({a:u.id,b:id});
  DB.reqs.filter(r=>r.from===id&&r.to===u.id).forEach(r=>db.ref('reqs/'+r.id).remove());
  updateBadges();
}

function renderChats(){
  let ms=DB.msgs.filter(m=>m.from===u.id||m.to===u.id),chs={};
  ms.forEach(m=>{let o=m.from===u.id?m.to:m.from;if(!chs[o]||m.time>chs[o].time)chs[o]=m});
  let r=Object.values(chs).sort((a,b)=>b.time-a.time);
  let l=document.getElementById('chatsList');
  if(!r.length)return l.innerHTML='<div style="color:var(--muted);text-align:center;padding:50px">Нет сообщений...</div>';
  l.innerHTML=r.map(m=>{let o=gU(m.from===u.id?m.to:m.from);return `<div class="friend-card" onclick="openChat('${o.id}')"><div class="av ${isOnline(o.id)?'online':''}">${ini(o.nick)}</div><div class="friend-info"><div class="friend-name">${esc(o.nick)}</div><div class="friend-game" style="color:var(--muted)">${m.from===u.id?'Ты: ':''}${esc(m.text)}</div></div></div>`}).join('');
}

function openChat(id){
  aChat=id; 
  show('chat'); 
  let o=gU(id);
  document.getElementById('cHeader').innerHTML=`<div class="av sm ${isOnline(id)?'online':''}">${ini(o.nick)}</div><div style="font-weight:bold;color:#fff;font-size:18px">${esc(o.nick)}</div>`;
  renderMsgs(id);
}

function renderMsgs(id){
  let h=document.getElementById('cMsgs'); if(!h)return;
  let ms = DB.msgs.filter(m=>(m.from===u.id&&m.to===id)||(m.from===id&&m.to===u.id)).sort((a,b)=>a.time-b.time);
  h.innerHTML=ms.map(m=>`<div class="msg-wrap ${m.from===u.id?'me':'them'}"><div class="msg">${esc(m.text)}</div></div>`).join('');
  h.scrollTop=h.scrollHeight;
  // Помечаем прочитанным
  ms.forEach(m => { if(m.to === u.id && !m.read) db.ref('msgs/'+m.id+'/read').set(true); });
}

function send(){
  let i=document.getElementById('cInput'),t=i.value.trim();
  if(!t)return;
  db.ref('msgs/'+Date.now()).set({id:Date.now().toString(),from:u.id,to:aChat,text:censor(t),time:Date.now(),read:false});
  i.value='';
}

function saveGame(){ let g = document.getElementById('gameInput').value.trim(); db.ref('users/'+u.id+'/game').set(g); alert('Статус обновлен!'); }
function playMusic(name, url) { let player = document.getElementById('musicPlayer'); player.src = url; player.play(); }

function attachImg(e) {
  let file=e.target.files[0]; if(!file)return; let reader=new FileReader();
  reader.onload=function(evt){
    let img=new Image(); img.onload=function(){
      let canvas=document.createElement('canvas'); let MAX=600,w=img.width,h=img.height;
      if(w>h){if(w>MAX){h*=MAX/w;w=MAX}}else{if(h>MAX){w*=MAX/h;h=MAX}}
      canvas.width=w;canvas.height=h; let ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,w,h);
      let data=canvas.toDataURL('image/jpeg',0.6);
      document.getElementById('pText').dataset.img=data;
      document.getElementById('imgPreview').innerHTML=`<img src="${data}" style="width:100%;border-radius:8px;margin-bottom:10px;">`;
    }; img.src=evt.target.result;
  }; reader.readAsDataURL(file);
}

function publish(){
  let ta=document.getElementById('pText'), t=ta.value.trim(), img=ta.dataset.img||'';
  if(!t && !img)return;
  if(Date.now() - lastPostTime < 5000) return alert('Подожди 5 сек.');
  lastPostTime = Date.now();
  db.ref('posts/'+Date.now()).set({id:Date.now().toString(),aId:u.id,aNick:u.nick,text:censor(t),img:img,time:Date.now(),likes:[],cmts:[]})
  .then(()=>{ta.value='';ta.dataset.img='';document.getElementById('imgPreview').innerHTML='';});
}

function renderFeed(){
  let f=document.getElementById('feed'); if(!f) return;
  let ps=DB.posts.slice().sort((a,b)=>b.time-a.time);
  if(!ps.length) return f.innerHTML='<div style="text-align:center;color:var(--muted);padding:50px">Тут пока пусто...</div>';
  
  f.innerHTML=ps.map(p=>{
    let l=p.likes.includes(u.id), m=p.aId===u.id;
    let imgHtml = p.img ? `<img src="${p.img}" class="p-img">` : '';
    return `<article class="post"><div class="p-head"><div class="av ${isOnline(p.aId)?'online':''}">${ini(p.aNick)}</div><div><div style="font-weight:bold;color:#fff">${esc(p.aNick)}</div><div style="font-size:12px;color:var(--muted)">${ago(p.time)}</div></div></div><div class="p-text">${esc(p.text)}</div>${imgHtml}<div class="actions-row"><button class="act ${l?'liked':''}" onclick="like('${p.id}')">${l?'❤️':'🤍'} ${p.likes.length}</button><button class="act" onclick="document.querySelector('.ci-${p.id}').focus()">💬 ${p.cmts.length}</button>${m?`<button class="act" onclick="db.ref('posts/${p.id}').remove()">🗑</button>`:''}</div><div class="comments">${p.cmts.map(c=>`<div class="comment"><div class="av sm">${ini(c.n)}</div><div class="c-body"><span class="c-name">${esc(c.n)}</span>${esc(c.t)}</div></div>`).join('')}<div class="c-form"><input class="ci-${p.id}" placeholder="Написать коммент..." onkeydown="if(event.key==='Enter')addCmt('${p.id}',this)"></div></div></article>`;
  }).join('');
}

function like(id){let p=DB.posts.find(x=>x.id===id);if(!p)return;let l=[...p.likes],i=l.indexOf(u.id);if(i===-1)l.push(u.id);else l.splice(i,1);db.ref('posts/'+id+'/likes').set(l)}

function addCmt(id,inp){
  let t=inp.value.trim(); if(!t) return;
  let p=DB.posts.find(x=>x.id===id); if(!p) return;
  let cmts=[...p.cmts];
  cmts.push({id:Date.now().toString(),n:u.nick,t:censor(t)});
  db.ref('posts/'+id+'/cmts').set(cmts);
  inp.value='';
}

function renderShorts(){
  let player = document.getElementById('shortsPlayer'); if(!player) return;
  if(!DB.shorts.length) { player.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888">Нет видео</div>'; return; }
  let s = DB.shorts[currentShortIndex];
  player.innerHTML = `<iframe src="https://www.youtube.com/embed/${s.vid}?autoplay=1&loop=1&playlist=${s.vid}&controls=0" allowfullscreen allow="autoplay"></iframe>`;
}

function nextShort(){
  if(DB.shorts.length <= 1) return;
  currentShortIndex = (currentShortIndex + 1) % DB.shorts.length;
  renderShorts();
}

function addShort(){
  let url = document.getElementById('shortUrl').value.trim(); if(!url) return;
  let match = url.match(/(?:youtube\.com\/shorts\/)([^"&?\/\s]{11})/);
  if(!match) return alert('Вставь правильную ссылку на YouTube Shorts!');
  db.ref('shorts/'+Date.now()).set({id: Date.now().toString(), vid: match[1], aId: u.id, aNick: u.nick});
  document.getElementById('shortUrl').value='';
}

function renderFriendsSidebar(){
  if(!u) return;
  let f=DB.friends.filter(x=>x.a===u.id||x.b===u.id);
  let html = f.map(x=>{
    let o = gU(x.a===u.id?x.b:x.a);
    let online = isOnline(o.id);
    return `<div class="friend-card" onclick="openChat('${o.id}')"><div class="av sm ${online?'online':''}">${ini(o.nick)}</div><div class="friend-info"><div class="friend-name">${esc(o.nick)}</div><div class="friend-game">${o.game || (online?'В сети':'Не в сети')}</div></div></div>`;
  }).join('');
  let el = document.getElementById('onlineFriends'); if(el) el.innerHTML = html || '<div style="color:var(--muted);text-align:center">Нет друзей</div>';
}

function renderProfile(){
  let pc = document.getElementById('pCard'); if(!pc) return;
  pc.innerHTML = `<div class="av lg">${ini(u.nick)}</div><h2 style="margin:10px 0;color:#fff">${esc(u.nick)}</h2><div style="color:var(--muted)">ID: @${u.id}</div>`;
}

if(u){
  let authEl = document.getElementById('auth'); if(authEl) authEl.style.display='none'; 
  show('profile'); 
} 
