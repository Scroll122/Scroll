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

let DB = { users: [], posts: [], msgs: [], friends: [], reqs: [] };
let u = JSON.parse(localStorage.getItem('scroll_session') || 'null');
let aMode = 'login', cTab = 'recs', aChat = null;

const BAD_WORDS = ['хуй', 'пизда', 'ебать', 'блять', 'сука', 'долбоеб', 'мудак', 'гандон', 'шлюха', 'нахуй', 'пиздец'];
const BAD_NICKS = ['admin', 'moder', 'support', 'sistem', 'fuck', 'shit', 'бля', 'хуй'];

function censor(text) { 
  let clean = text; 
  BAD_WORDS.forEach(w => { clean = clean.replace(new RegExp(w, 'gi'), '***'); }); 
  return clean; 
}

function checkNick(nick) {
  if(nick.length < 2 || nick.length > 15) return 'Ник от 2 до 15 символов';
  if(BAD_NICKS.some(w => nick.toLowerCase().includes(w))) return 'Этот ник запрещен правилами';
  if(!/^[a-zA-Zа-яА-Я0-9_]+$/.test(nick)) return 'Только буквы, цифры и _';
  return null;
}

// Трекинг онлайна
function setOnline() {
  if(!u) return;
  db.ref('users/' + u.id + '/lastSeen').set(Date.now());
}

let lastPostTime = 0;

db.ref('/').on('value', snap => {
  const data = snap.val() || {};
  DB.users = data.users ? Object.values(data.users) : [];
  DB.posts = data.posts ? Object.values(data.posts) : [];
  DB.msgs = data.msgs ? Object.values(data.msgs) : [];
  DB.friends = data.friends ? Object.values(data.friends) : [];
  DB.reqs = data.reqs ? Object.values(data.reqs) : [];
  DB.posts = DB.posts.map(p => ({...p, likes: p.likes || [], cmts: p.cmts || []}));

  if(document.getElementById('v-feed') && document.getElementById('v-feed').classList.contains('active')) renderFeed();
  if(document.getElementById('v-profile') && document.getElementById('v-profile').classList.contains('active')) renderProfile();
  if(document.getElementById('v-chats') && document.getElementById('v-chats').classList.contains('active')) renderChats();
  if(document.getElementById('v-chat') && document.getElementById('v-chat').classList.contains('active') && aChat) renderMsgs(aChat);
});

const genId = () => { let id; do { id = Math.floor(1000+Math.random()*9000).toString(); } while(DB.users.some(x=>x.id===id)); return id; };
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ago = t => { let d=(Date.now()-t)/1000; if(d<60)return'сейчас'; if(d<3600)return Math.floor(d/60)+'м'; if(d<86400)return Math.floor(d/3600)+'ч'; return Math.floor(d/86400)+'д'; };
const gT = t => { let d=new Date(t); return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0'); };
const ini = n => n ? n[0].toUpperCase() : '?';
const gU = id => DB.users.find(x => x.id === id) || {nick:'Удалён', id, cover:'', lastSeen:0};

// Проверка онлайн (был в сети менее 2 минут назад)
const isOnline = (id) => {
  let user = gU(id);
  return user.lastSeen && (Date.now() - user.lastSeen < 120000);
};

function appSet(){
  let s = JSON.parse(localStorage.getItem('setts')||'{"theme":"dark","bold":true,"fs":16,"radius":16,"anim":true}');
  document.body.dataset.theme = s.theme;
  document.body.dataset.anim = s.anim ? 'true' : 'false';
  if(s.bold) document.body.removeAttribute('data-thin'); else document.body.setAttribute('data-thin','1');
  document.documentElement.style.setProperty('--fs', s.fs+'px');
  document.documentElement.style.setProperty('--rad', s.radius+'px');
  let t=document.getElementById('tBold'); if(t) t.classList.toggle('on',s.bold);
  let a=document.getElementById('tAnim'); if(a) a.classList.toggle('on',s.anim);
  let sl=document.getElementById('fSlider'); if(sl) sl.value=s.fs;
  let rl=document.getElementById('rSlider'); if(rl) rl.value=s.radius;
}
const setTheme = t => { let s=JSON.parse(localStorage.getItem('setts')||'{"theme":"dark","bold":true,"fs":16,"radius":16,"anim":true}'); s.theme=t; localStorage.setItem('setts',JSON.stringify(s)); appSet(); };
const toggleBold = () => { let s=JSON.parse(localStorage.getItem('setts')||'{"theme":"dark","bold":true,"fs":16,"radius":16,"anim":true}'); s.bold=!s.bold; localStorage.setItem('setts',JSON.stringify(s)); appSet(); };
const toggleAnim = () => { let s=JSON.parse(localStorage.getItem('setts')||'{"theme":"dark","bold":true,"fs":16,"radius":16,"anim":true}'); s.anim=!s.anim; localStorage.setItem('setts',JSON.stringify(s)); appSet(); };
const setFS = v => { let s=JSON.parse(localStorage.getItem('setts')||'{"theme":"dark","bold":true,"fs":16,"radius":16,"anim":true}'); s.fs=+v; localStorage.setItem('setts',JSON.stringify(s)); appSet(); };
const setRad = v => { let s=JSON.parse(localStorage.getItem('setts')||'{"theme":"dark","bold":true,"fs":16,"radius":16,"anim":true}'); s.radius=+v; localStorage.setItem('setts',JSON.stringify(s)); appSet(); };
const clearAll = () => { if(confirm('Стереть всё?')){ localStorage.clear(); location.reload(); } };
appSet();

function authToggle(){
  aMode=aMode==='login'?'register':'login';
  document.getElementById('aBtn').textContent=aMode==='login'?'Войти':'Создать';
  document.getElementById('aSub').textContent=aMode==='login'?'Заходи на сайт, тут весело!':'Придумай ник и пароль';
  document.getElementById('aSwitch').innerHTML=aMode==='login'?'нет аккаунта? <u>создать</u>':'уже есть? <u>войти</u>';
  document.getElementById('aErr').textContent='';
}

function authSubmit(){
  let n=document.getElementById('aNick').value.trim();
  let p=document.getElementById('aPass').value;
  let e=document.getElementById('aErr');
  e.textContent='';
  
  if(p.length<4) return e.textContent='Пароль минимум 4 символа!';
  
  if(aMode==='register'){
    let nickErr = checkNick(n); 
    if(nickErr) return e.textContent = nickErr;
    if(DB.users.some(x=>x.nick.toLowerCase()===n.toLowerCase())) return e.textContent='Этот ник уже занят';
    
    let nu={id:genId(),nick:n,pass:p,cover:'',lastSeen:Date.now()};
    db.ref('users/'+nu.id).set(nu).then(()=>{
      u={id:nu.id,nick:nu.nick,cover:''};
      localStorage.setItem('scroll_session',JSON.stringify(u));
      location.reload();
    }).catch(err=>e.textContent='Ошибка сети');
  }else{
    let f=DB.users.find(x=>x.nick.toLowerCase()===n.toLowerCase()&&x.pass===p);
    if(!f) return e.textContent='Неверный ник или пароль';
    u={id:f.id,nick:f.nick,cover:f.cover||''};
    localStorage.setItem('scroll_session',JSON.stringify(u));
    location.reload();
  }
}
function logout(){localStorage.removeItem('scroll_session');u=null;location.reload()}

function changeId(){
  let val=document.getElementById('newId').value.trim(),e=document.getElementById('idErr');e.textContent='';
  if(!/^\d{4}$/.test(val))return e.textContent='ID из 4 цифр';
  if(DB.users.some(x=>x.id===val))return e.textContent='ID занят';
  db.ref('users/'+u.id).remove().then(()=>{
    let nu = {id:val, nick:u.nick, pass:DB.users.find(x=>x.id===u.id).pass, cover:u.cover||''};
    db.ref('users/'+val).set(nu).then(()=>{
      u.id=val;localStorage.setItem('scroll_session',JSON.stringify(u));alert('ID изменен!');renderProfile();
    });
  });
}

function setCover(e) {
  let file = e.target.files[0]; if(!file) return;
  let reader = new FileReader();
  reader.onload = function(evt) {
    let img = new Image();
    img.onload = function() {
      let canvas = document.createElement('canvas');
      let MAX = 600; let width = img.width, height = img.height;
      if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } } else { if (height > MAX) { width *= MAX / height; height = MAX; } }
      canvas.width = width; canvas.height = height;
      let ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
      let dataUrl = canvas.toDataURL('image/jpeg',
