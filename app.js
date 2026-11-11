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

let DB = { users: [], posts: [], msgs: [], friends: [] };
let u = JSON.parse(localStorage.getItem('scroll_session') || 'null');
let aMode = 'login', aChat = null;
let dbLoaded = false;

const BAD_WORDS = ['хуй', 'пизда', 'ебать', 'блять', 'сука'];
function censor(text) { let clean = String(text || ''); BAD_WORDS.forEach(w => { clean = clean.replace(new RegExp(w, 'gi'), '***'); }); return clean; }

db.ref('/').on('value', snap => {
  const data = snap.val() || {};
  DB.users = data.users ? Object.values(data.users).filter(x => x && x.id && x.nick) : [];
  DB.posts = data.posts ? Object.values(data.posts).filter(x => x && x.id) : [];
  DB.msgs = data.msgs ? Object.values(data.msgs).filter(x => x && x.from) : [];
  DB.friends = data.friends ? Object.values(data.friends).filter(x => x && x.a) : [];
  dbLoaded = true;

  if(document.getElementById('v-feed').classList.contains('active')) renderFeed();
  if(document.getElementById('v-chats').classList.contains('active')) renderChats();
  if(aChat) renderMsgs(aChat);
});

const ini = n => n ? String(n)[0].toUpperCase() : '?';
const gU = id => DB.users.find(x => x.id === id) || {nick:'Удалён', id};

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
}

// ЧАТЫ
function renderChats(){
  let list = document.getElementById('chatList'); if(!list) return;
  
  // Тестовые чаты (Боты) для интерактива
  let html = `
    <div class="chat-item" onclick="openChat('bot1')">
      <div class="av sm" style="background:#ff4757">😂</div>
      <div class="chat-info"><div class="chat-name">Мемный Бот</div><div class="chat-last">Скинь мем!</div></div>
    </div>
    <div class="chat-item" onclick="openChat('bot2')">
      <div class="av sm" style="background:#2ed573">👾</div>
      <div class="chat-info"><div class="chat-name">Геймерский Бот</div><div class="chat-last">Го в доту?</div></div>
    </div>
  `;
  
  // Реальные друзья
  let f = DB.friends.filter(x=>x.a===u.id||x.b===u.id);
  f.forEach(x => {
    let o = gU(x.a===u.id?x.b:x.a);
    html += `<div class="chat-item" onclick="openChat('${o.id}')">
      <div class="av sm">${ini(o.nick)}</div>
      <div class="chat-info"><div class="chat-name">${o.nick}</div><div class="chat-last">Нажми чтобы открыть</div></div>
    </div>`;
  });
  
  list.innerHTML = html;
}

function openChat(id){
  aChat = id;
  document.getElementById('chatArea').style.display = 'flex';
  document.getElementById('emptyChat').style.display = 'none';
  
  let h = document.getElementById('cHeader');
  if(id === 'bot1') h.innerHTML = `<div class="av sm" style="background:#ff4757">😂</div> Мемный Бот`;
  else if(id === 'bot2') h.innerHTML = `<div class="av sm" style="background:#2ed573">👾</div> Геймерский Бот`;
  else h.innerHTML = `<div class="av sm">${ini(gU(id).nick)}</div> ${gU(id).nick}`;
  
  renderMsgs(id);
}

function renderMsgs(id){
  let h = document.getElementById('cMsgs'); if(!h) return;
  let ms = DB.msgs.filter(m=>(m.from===u.id && m.to===id)||(m.from===id && m.to===u.id)).sort((a,b)=>a.time-b.time);
  
  let html = ms.map(m=>`<div class="msg-wrap ${m.from===u.id?'me':'them'}"><div class="msg">${m.text}</div></div>`).join('');
  
  // Стартовые сообщения для ботов
  if(ms.length === 0 && id === 'bot1') html = `<div class="msg-wrap them"><div class="msg">Привет! Я собираю мемы. Напиши что-нибудь смешное!</div></div>`;
  if(ms.length === 0 && id === 'bot2') html = `<div class="msg-wrap them"><div class="msg">Йоу! Я геймерский бот. Обсудим игры?</div></div>`;
  
  h.innerHTML = html;
  h.scrollTop = h.scrollHeight;
}

function send(){
  let i = document.getElementById('cInput'), t = i.value.trim();
  if(!t || !aChat) return;
  
  if(aChat === 'bot1') {
    db.ref('msgs/'+Date.now()).set({id:Date.now().toString(), from:u.id, to:'bot1', text:censor(t), time:Date.now()});
    setTimeout(()=>db.ref('msgs/'+Date.now()).set({id:Date.now().toString(), from:'bot1', to:u.id, text:'Ахаха, смешно! 😂', time:Date.now()}), 1000);
  } else if(aChat === 'bot2') {
    db.ref('msgs/'+Date.now()).set({id:Date.now().toString(), from:u.id, to:'bot2', text:censor(t), time:Date.now()});
    setTimeout(()=>db.ref('msgs/'+Date.now()).set({id:Date.now().toString(), from:'bot2', to:u.id, text:'Согласен, го в катку! 🎮', time:Date.now()}), 1000);
  } else {
    db.ref('msgs/'+Date.now()).set({id:Date.now().toString(), from:u.id, to:aChat, text:censor(t), time:Date.now()});
  }
  
  i.value = '';
}

// ЛЕНТА
function publish(){
  let ta=document.getElementById('pText'), t=ta.value.trim();
  if(!t) return;
  db.ref('posts/'+Date.now()).set({id:Date.now().toString(),aId:u.id,aNick:u.nick,text:censor(t),time:Date.now()});
  ta.value='';
}

function renderFeed(){
  let f=document.getElementById('feed'); if(!f) return;
  let ps=DB.posts.sort((a,b)=>b.time-a.time);
  if(!ps.length) return f.innerHTML='<div style="text-align:center;color:var(--muted);padding:50px">Тут пусто...</div>';
  f.innerHTML=ps.map(p=>`<div class="post"><div style="font-weight:bold;color:var(--acc);margin-bottom:10px">${p.aNick}</div><div style="color:#fff;font-size:15px;line-height:1.5">${p.text}</div></div>`).join('');
}

if(u){ document.getElementById('auth').style.display='none'; show('chats'); }
