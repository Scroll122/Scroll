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
let u = JSON.parse(localStorage.getItem('scroll_session') || 'null');
let aMode = 'login', aChat = null;
let currentShortIndex = 0;
let dbLoaded = false;

const BAD_WORDS = ['хуй', 'пизда', 'ебать', 'блять', 'сука', 'долбоеб', 'мудак', 'гандон', 'шлюха', 'нахуй', 'пиздец'];
function censor(text) { let clean = text; BAD_WORDS.forEach(w => { clean = clean.replace(new RegExp(w, 'gi'), '***'); }); return clean; }
let lastPostTime = 0;

db.ref('/').on('value', snap => {
  const data = snap.val() || {};
  DB.users = data.users ? Object.values(data.users) : [];
  DB.posts = data.posts ? Object.values(data.posts) : [];
  DB.msgs = data.msgs ? Object.values(data.msgs) : [];
  DB.friends = data.friends ? Object.values(data.friends) : [];
  DB.shorts = data.shorts ? Object.values(data.shorts) : [];
  DB.posts = DB.posts.map(p => ({...p, likes: p.likes || [], cmts: p.cmts || []}));
  dbLoaded = true;

  if(document.getElementById('v-feed').classList.contains('active')) renderFeed();
  if(document.getElementById('v-profile').classList.contains('active')) renderProfile();
  if(document.getElementById('v-chat').classList.contains('active') && aChat) renderMsgs(aChat);
  renderFriendsSidebar();
});

const genId = () => { let id; do { id = Math.floor(1000+Math.random()*9000).toString(); } while(DB.users.some(x=>x.id===id)); return id; };
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ago = t => { let d=(Date.now()-t)/1000; if(d<60)return'сейчас'; if(d<3600)return Math.floor(d/60)+'м'; if(d<86400)return Math.floor(d/3600)+'ч'; return Math.floor(d/86400)+'д'; };
const ini = n => n ? n[0].toUpperCase() : '?';
const gU = id => DB.users.find(x => x.id === id) || {nick:'Удалён', id, lastSeen:0, game:''};
const isOnline = (id) => { let user = gU(id); return user.lastSeen && (Date.now() - user.lastSeen < 300000); };

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
  let e=document.getElementById('aErr');
  e.textContent='';
  
  if(!dbLoaded) return e.textContent='Загрузка... Подожди.';
  if(!n) return e.textContent='Введите ник!';
  if(n.length < 2) return e.textContent='Ник от 2 символов!';
  if(p.length < 3) return e.textContent='Пароль от 3 символов!';
  
  if(aMode==='register'){
    if(DB.users.some(x => x && x.nick && x.nick.toLowerCase() === n.toLowerCase())) return e.textContent='Ник занят';
    let nu = {id:genId(), nick:n, pass:p, lastSeen:Date.now(), game:''};
    db.ref('users/'+nu.id).set(nu).then(()=>{
      u = {id:nu.id, nick:nu.nick};
      localStorage.setItem('scroll_session', JSON.stringify(u));
      location.reload();
    });
  } else {
    let f = DB.users.find(x => x && x.nick && x.nick.toLowerCase() === n.toLowerCase() && x.pass === p);
    if(!f) return e.textContent='Неверный ник или пароль';
    u = {id:f.id, nick:f.nick};
    localStorage.setItem('scroll_session', JSON.stringify(u));
    location.reload();
  }
}
function logout(){ localStorage.removeItem('scroll_session'); u=null; location.reload(); }

function show(v){
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  document.getElementById('v-'+v).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  let nb=document.getElementById('n-'+v); if(nb) nb.classList.add('active');
  let titles = {'feed':'Лента', 'shorts':'Скроллс 🎬', 'chats':'Чаты', 'music':'Музыка', 'profile':'Профиль', 'settings':'Настройки', 'chat':'Диалог'};
  document.getElementById('hTitle').textContent = titles[v];
  if(v==='profile') renderProfile();
  if(v==='feed') renderFeed();
  if(v==='shorts') renderShorts();
  if(v==='settings') { let g=gU(u.id); document.getElementById('gameInput').value = g.game || ''; }
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
  let f=document.getElementById('feed'), ps=DB.posts.slice().sort((a,b)=>b.time-a.time);
  if(!ps.length) return f.innerHTML='<div style="text-align:center;color:var(--muted);padding:50px">Тут пока пусто...</div>';
  f.innerHTML=ps.map(p=>{
    let l=p.likes.includes(u.id), m=p.aId===u.id;
    let imgHtml = p.img ? `<img src="${p.img}" class="p-img">` : '';
    return `<article class="post"><div class="p-head"><div class="av ${isOnline(p.aId)?'online':''}">${ini(p.aNick)}</div><div><div style="font-weight:bold;color:#fff">${esc(p.aNick)}</div><div style="font-size:12px;color:var(--muted)">${ago(p.time)}</div></div></div><div class="p-text">${esc(p.text)}</div>${imgHtml}<div class="actions-row"><button class="act ${l?'liked':''}" onclick="like('${p.id}')">${l?'❤️':'🤍'} ${p.likes.length}</button><button class="act" onclick="document.querySelector('.ci-${p.id}').focus()">💬 ${p.cmts.length}</button>${m?`<button class="act" onclick="db.ref('posts/${p.id}').remove()">🗑</button>`:''}</div><div class="comments">${p.cmts.map(c=>`<div class="comment"><div class="av sm">${ini(c.n)}</div><div class="c-body"><span class="c-name">${esc(c.n)}</span>${esc(c.t)}</div></div>`).join('')}<div class="c-form"><input class="ci-${p.id}" placeholder="Написать коммент..." onkeydown="if(event.key==='Enter')addCmt('${p.id}',this)"></div></div></article>`;
  }).join('');
}
function like(id){
