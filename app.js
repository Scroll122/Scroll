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

let DB = { users: [], posts: [], msgs: [], channels: [] };
let u = JSON.parse(localStorage.getItem('scroll_session') || 'null');
let aMode = 'login', aChat = null;
let dbLoaded = false;

db.ref('/').on('value', snap => {
  const data = snap.val() || {};
  DB.users = data.users ? Object.values(data.users).filter(x => x && x.id && x.nick) : [];
  DB.posts = data.posts ? Object.values(data.posts).filter(x => x && x.id) : [];
  DB.msgs = data.msgs ? Object.values(data.msgs).filter(x => x && x.from) : [];
  DB.channels = data.channels ? Object.values(data.channels).filter(x => x && x.id) : [];
  dbLoaded = true;

  if(document.getElementById('v-feed').classList.contains('active')) renderFeed();
  if(document.getElementById('v-chats').classList.contains('active')) renderChats();
  if(document.getElementById('v-channels').classList.contains('active')) renderChannelsPage();
  if(aChat) renderMsgs(aChat);
});

const ini = n => n ? String(n)[0].toUpperCase() : '?';
const gU = id => DB.users.find(x => x.id === id) || {nick:'Неизвестный', id};

function authToggle(){
  aMode=aMode==='login'?'register':'login';
  document.getElementById('aBtn').textContent=aMode==='login'?'Войти':'Создать аккаунт';
  document.getElementById('aSwitch').innerHTML=aMode==='login'?'Нет аккаунта? <span style="color:#fff;text-decoration:underline">Создать</span>':'Уже есть аккаунт? <span style="color:#fff;text-decoration:underline">Войти</span>';
  document.getElementById('aErr').textContent='';
}

function authSubmit(){
  let n=document.getElementById('aNick').value.trim();
  let p=document.getElementById('aPass').value;
  let e=document.getElementById('aErr');
  e.textContent='';
  
  if(!dbLoaded) return e.textContent='Загрузка...';
  if(!n || n.length < 2) return e.textContent='Ник от 2 символов!';
  if(p.length < 3) return e.textContent='Пароль от 3 символов!';
  
  if(aMode==='register'){
    if(DB.users.some(x => x.nick.toLowerCase() === n.toLowerCase())) return e.textContent='Ник занят';
    let nu = {id:Math.floor(1000+Math.random()*9000).toString(), nick:n, pass:p};
    db.ref('users/'+nu.id).set(nu).then(()=>{
      u = {id:nu.id, nick:nu.nick};
      localStorage.setItem('scroll_session', JSON.stringify(u));
      location.reload();
    });
  } else {
    let f = DB.users.find(x => x.nick.toLowerCase() === n.toLowerCase() && x.pass === p);
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
  document.getElementById('n-'+v).classList.add('active');
  
  if(v==='chats') renderChats();
  if(v==='feed') renderFeed();
  if(v==='channels') renderChannelsPage();
}

// ЧАТЫ
function renderChats(){
  let list = document.getElementById('chatList'); if(!list) return;
  let ms = DB.msgs.filter(m => m.from === u.id || m.to === u.id);
  let chatters = [...new Set(ms.map(m => m.from === u.id ? m.to : m.from))];
  let html = chatters.map(id => {
    let o = gU(id);
    return `<div class="chat-item" onclick="openChat('${o.id}')" style="padding:12px;cursor:pointer;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:10px">
      <div class="av">${ini(o.nick)}</div><div style="font-weight:bold;font-size:14px;color:#fff">${o.nick}</div>
    </div>`;
  }).join('');
  list.innerHTML = html || '<div style="color:var(--muted);text-align:center;padding:20px;font-size:12px">Нет переписок. Найди друга в Поиске!</div>';
}

function openChat(id){
  aChat = id;
  document.getElementById('chatArea').style.display = 'flex';
  document.getElementById('emptyChat').style.display = 'none';
  document.getElementById('cHeader').innerHTML = `<div class="av">${ini(gU(id).nick)}</div> ${gU(id).nick}`;
  renderMsgs(id);
}

function renderMsgs(id){
  let h = document.getElementById('cMsgs'); if(!h) return;
  let ms = DB.msgs.filter(m=>(m.from===u.id && m.to===id)||(m.from===id && m.to===u.id)).sort((a,b)=>a.time-b.time);
  h.innerHTML = ms.map(m=>`<div class="msg-wrap ${m.from===u.id?'me':'them'}"><div class="msg">${m.text}</div></div>`).join('');
  h.scrollTop = h.scrollHeight;
}

function send(){
  let i = document.getElementById('cInput'), t = i.value.trim();
  if(!t || !aChat) return;
  db.ref('msgs/'+Date.now()).set({id:Date.now().toString(), from:u.id, to:aChat, text:t, time:Date.now()});
  i.value = '';
}

// КАНАЛЫ
function renderChannelsPage(){
  let list = document.getElementById('channelsList'); if(!list) return;
  let html = DB.channels.map(ch => `
    <div style="background:var(--card);border:1px solid var(--line);padding:15px;border-radius:8px;margin-bottom:10px;display:flex;align-items:center;gap:10px;cursor:pointer" onclick="openChat('${ch.id}')">
      <div class="av" style="background:#fff;color:#000">📢</div>
      <div style="font-weight:bold;color:#fff">${ch.name}</div>
    </div>
  `).join('');
  list.innerHTML = html || '<div style="color:var(--muted);text-align:center;padding:20px">Нет каналов</div>';
}

function createChannel(){
  let name = document.getElementById('newChannelName').value.trim();
  if(!name) return;
  db.ref('channels/'+Date.now()).set({id:Date.now().toString(), name:name, owner:u.id});
  document.getElementById('newChannelName').value = '';
}

// ПОИСК
function findUser(){
  let val = document.getElementById('searchId').value.trim().replace('@','');
  let f = DB.users.find(x => x.id === val);
  if(!f) return alert('Пользователь не найден!');
  show('chats');
  openChat(f.id);
}

// ЛЕНТА
function attachImg(e) {
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
      let dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      document.getElementById('pText').dataset.img = dataUrl;
      document.getElementById('imgPreview').innerHTML = `<img src="${dataUrl}" style="width:100%;border-radius:8px;margin-bottom:8px;">`;
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function publish(){
  let ta=document.getElementById('pText'), t=ta.value.trim(), img=ta.dataset.img||'';
  if(!t && !img) return;
  db.ref('posts/'+Date.now()).set({id:Date.now().toString(), aId:u.id, aNick:u.nick, text:t, img:img, time:Date.now()});
  ta.value=''; ta.dataset.img=''; document.getElementById('imgPreview').innerHTML='';
}

function renderFeed(){
  let f=document.getElementById('feed'); if(!f) return;
  let ps=DB.posts.sort((a,b)=>b.time-a.time);
  if(!ps.length) return f.innerHTML='<div style="text-align:center;color:var(--muted);padding:30px;font-size:13px">Тут пусто...</div>';
  
  f.innerHTML=ps.map(p=>`
    <div class="post">
      <div class="post-head">
        <div class="av">${ini(p.aNick)}</div>
        <div style="font-weight:bold;color:#fff;font-size:14px">${p.aNick}</div>
      </div>
      <div style="font-size:14px;color:#fff;line-height:1.4">${p.text}</div>
      ${p.img ? `<img src="${p.img}" class="post-img">` : ''}
    </div>
  `).join('');
}

if(u){ document.getElementById('auth').style.display='none'; show('feed'); }
