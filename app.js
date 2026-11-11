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
  if(document.getElementById('v-profile').classList.contains('active')) renderProfile();
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
  if(v==='profile') renderProfile();
}

function renderProfile(){
  document.getElementById('pCard').innerHTML = `
    <div class="av lg" style="width:120px;height:120px;font-size:48px;border-radius:8px;border:2px solid var(--acc)">${ini(u.nick)}</div>
    <div class="steam-profile-info">
      <h2>${u.nick}</h2>
      <p>Уровень 42 • В сети</p>
      <div style="font-size:12px;color:var(--muted);margin-top:10px">ID: @${u.id}</div>
    </div>
    <div style="flex:1"></div>
    <div class="steam-stats">
      <div class="steam-stat"><b>124</b><span>Игр</span></div>
      <div class="steam-stat"><b>42</b><span>Друзей</span></div>
      <div class="steam-stat"><b>15</b><span>Наград</span></div>
    </div>
  `;
  renderSteamLibrary();
}

function renderSteamLibrary() {
  let lib = document.getElementById('steamLibrary');
  let games = [
    {id: 1, title: 'Counter-Strike 2', status: 'В сети', icon: '🔫'},
    {id: 2, title: 'Dota 2', status: 'В сети', icon: '⚔️'},
    {id: 3, title: 'Cyberpunk 2077', status: 'Играл недавно', icon: '🤖'},
    {id: 4, title: 'GTA V', status: '1 час назад', icon: '🚗'}
  ];
  lib.innerHTML = games.map(g => `
    <div class="lib-card" onclick="launchGame('${g.title}')">
      <div class="lib-icon">${g.icon}</div>
      <div class="lib-info">
        <div class="lib-title">${g.title}</div>
        <div class="lib-status">${g.status}</div>
      </div>
    </div>
  `).join('');
}

function launchGame(title) {
  document.getElementById('gameTitle').innerText = title;
  document.getElementById('gameOverlay').classList.add('active');
}

function renderChats(){
  let list = document.getElementById('chatList'); if(!list) return;
  // Добавим тестового бота для голосовых
  let html = `
    <div class="chat-item" onclick="openChat('bot')">
      <div class="av sm" style="background:#ff4757">🤖</div>
      <div class="info"><div style="font-size:14px;font-weight:bold;color:#fff">Голосовой Бот</div><div style="font-size:12px;color:var(--muted)">Проверь голосовые!</div></div>
    </div>
  `;
  
  let f = DB.friends.filter(x=>x.a===u.id||x.b===u.id);
  f.forEach(x => {
    let o = gU(x.a===u.id?x.b:x.a);
    html += `<div class="chat-item" onclick="openChat('${o.id}')">
      <div class="av sm">${ini(o.nick)}</div>
      <div class="info"><div style="font-size:14px;font-weight:bold;color:#fff">${o.nick}</div></div>
    </div>`;
  });
  list.innerHTML = html;
}

function openChat(id){
  aChat = id;
  let h = document.getElementById('cHeader');
  if(id === 'bot') h.innerText = 'Голосовой Бот';
  else h.innerText = gU(id).nick;
  renderMsgs(id);
}

function renderMsgs(id){
  let h = document.getElementById('cMsgs'); if(!h) return;
  let ms = DB.msgs.filter(m=>(m.from===u.id && m.to===id)||(m.from===id && m.to===u.id)).sort((a,b)=>a.time-b.time);
  
  let html = ms.map(m => {
    // Если сообщение голосовое (начинается с [VOICE])
    if(m.text.startsWith('[VOICE]')) {
      let voiceText = m.text.replace('[VOICE]', '');
      return `<div class="msg-wrap ${m.from===u.id?'me':'them'}">
                <div class="msg">
                  <button class="voice-btn" onclick="speak('${voiceText.replace(/'/g, "\\'")}')">▶️</button>
                  <span>Голосовое сообщение</span>
                </div>
              </div>`;
    }
    return `<div class="msg-wrap ${m.from===u.id?'me':'them'}"><div class="msg">${m.text}</div></div>`;
  }).join('');
  
  if(ms.length === 0 && id === 'bot') {
    html = `<div class="msg-wrap them"><div class="msg">Напиши текст и нажми 🎤, чтобы отправить голосовое!</div></div>`;
  }
  
  h.innerHTML = html;
  h.scrollTop = h.scrollHeight;
}

// Отправка текста или голосового
function send(isVoice = false){
  let i = document.getElementById('cInput'), t = i.value.trim();
  if(!t || !aChat) return;
  
  if(aChat === 'bot' && isVoice) {
    // Бот отвечает голосовым
    let botText = "[VOICE]Привет! Я бот, я умею говорить!";
    db.ref('msgs/'+Date.now()).set({id:Date.now().toString(), from:'bot', to:u.id, text:botText, time:Date.now()});
    i.value = '';
    return;
  }
  
  if(aChat === 'bot') { alert('Бот понимает только голосовые!'); i.value=''; return; }

  let textToSend = isVoice ? '[VOICE]' + t : t;
  db.ref('msgs/'+Date.now()).set({id:Date.now().toString(), from:u.id, to:aChat, text:textToSend, time:Date.now()});
  i.value = '';
}

// Озвучка голосового сообщения
function speak(text) {
  let msg = new SpeechSynthesisUtterance(text);
  msg.lang = 'ru-RU';
  window.speechSynthesis.speak(msg);
}

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
  f.innerHTML=ps.map(p=>`<div class="post"><div style="font-weight:bold;color:var(--muted);margin-bottom:10px">${p.aNick}</div><div style="color:#fff">${p.text}</div></div>`).join('');
}

if(u){ document.getElementById('auth').style.display='none'; show('profile'); }
