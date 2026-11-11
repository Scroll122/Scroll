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

db.ref('/').on('value', snap => {
  const data = snap.val() || {};
  DB.users = data.users ? Object.values(data.users) : [];
  DB.posts = data.posts ? Object.values(data.posts) : [];
  DB.msgs = data.msgs ? Object.values(data.msgs) : [];
  DB.friends = data.friends ? Object.values(data.friends) : [];
  DB.reqs = data.reqs ? Object.values(data.reqs) : [];
  DB.posts = DB.posts.map(p => ({...p, likes: p.likes || [], cmts: p.cmts || []}));

  if(document.getElementById('v-feed').classList.contains('active')) renderFeed();
  if(document.getElementById('v-profile').classList.contains('active')) renderProfile();
  if(document.getElementById('v-chats').classList.contains('active')) renderChats();
  if(document.getElementById('v-chat').classList.contains('active') && aChat) renderMsgs(aChat);
});

const genId = () => { let id; do { id = Math.floor(1000+Math.random()*9000).toString(); } while(DB.users.some(x=>x.id===id)); return id; };
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ago = t => { let d=(Date.now()-t)/1000; if(d<60)return'сейчас'; if(d<3600)return Math.floor(d/60)+'м'; if(d<86400)return Math.floor(d/3600)+'ч'; return Math.floor(d/86400)+'д'; };
const gT = t => { let d=new Date(t); return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0'); };
const ini = n => n ? n[0].toUpperCase() : '?';
const gU = id => DB.users.find(x => x.id === id) || {nick:'Удалён', id, cover:''};

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

function authToggle(){aMode=aMode==='login'?'register':'login';document.getElementById('aBtn').textContent=aMode==='login'?'Войти':'Создать';document.getElementById('aSub').textContent=aMode==='login'?'залетай в движ':'придумай ник и пароль';document.getElementById('aSwitch').innerHTML=aMode==='login'?'нет аккаунта? <u>создать</u>':'уже есть? <u>войти</u>';document.getElementById('aErr').textContent=''}

function authSubmit(){
  let n=document.getElementById('aNick').value.trim(),p=document.getElementById('aPass').value,e=document.getElementById('aErr');e.textContent='';
  if(n.length<2)return e.textContent='ник > 1';
  if(p.length<4)return e.textContent='пароль > 3';
  if(aMode==='register'){
    if(DB.users.some(x=>x.nick.toLowerCase()===n.toLowerCase()))return e.textContent='ник занят';
    let nu={id:genId(),nick:n,pass:p,cover:''};
    db.ref('users/'+nu.id).set(nu).then(()=>{
      u={id:nu.id,nick:nu.nick,cover:''};localStorage.setItem('scroll_session',JSON.stringify(u));location.reload();
    });
  }else{
    let f=DB.users.find(x=>x.nick.toLowerCase()===n.toLowerCase()&&x.pass===p);
    if(!f)return e.textContent='неверно';
    u={id:f.id,nick:f.nick,cover:f.cover||''};localStorage.setItem('scroll_session',JSON.stringify(u));location.reload();
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
  let file = e.target.files[0];
  if(!file) return;
  let reader = new FileReader();
  reader.onload = function(evt) {
    let img = new Image();
    img.onload = function() {
      let canvas = document.createElement('canvas');
      let MAX = 600;
      let width = img.width, height = img.height;
      if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } } 
      else { if (height > MAX) { width *= MAX / height; height = MAX; } }
      canvas.width = width; canvas.height = height;
      let ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      let dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      db.ref('users/'+u.id+'/cover').set(dataUrl).then(()=>{
        u.cover = dataUrl; localStorage.setItem('scroll_session',JSON.stringify(u)); renderProfile();
      });
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function show(v){document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));let el=document.getElementById('v-'+v);if(el)el.classList.add('active');document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));let nb=document.getElementById('n-'+v);if(nb)nb.classList.add('active');if(v==='profile')renderProfile();if(v==='chats')renderChats();if(v==='feed')renderFeed()}

function attachImg(e) {
  let file = e.target.files[0];
  if(!file) return;
  let reader = new FileReader();
  reader.onload = function(evt) {
    let img = new Image();
    img.onload = function() {
      let canvas = document.createElement('canvas');
      let MAX = 800;
      let width = img.width, height = img.height;
      if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } } 
      else { if (height > MAX) { width *= MAX / height; height = MAX; } }
      canvas.width = width; canvas.height = height;
      let ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      let dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      document.getElementById('pText').dataset.img = dataUrl;
      document.getElementById('imgPreview').innerHTML = `<img src="${dataUrl}" style="width:100%;border-radius:12px;margin-top:10px;">`;
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function publish(){
  let ta=document.getElementById('pText'),t=ta.value.trim();
  let img=ta.dataset.img||'';
  if(!t && !img)return;
  let id=Date.now().toString();
  db.ref('posts/'+id).set({id:id,aId:u.id,aNick:u.nick,text:t,img:img,time:Date.now(),likes:[],cmts:[]})
  .then(()=>{ta.value='';ta.dataset.img='';document.getElementById('imgPreview').innerHTML='';});
}

function tab(t){cTab=t;document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.textContent.includes(t==='recs'?'Рекомендации':'Свежее')));renderFeed()}

function renderFeed(){
  let f=document.getElementById('feed'),ps=DB.posts.slice();
  if(cTab==='recs')ps.sort((a,b)=>(b.likes.length*2+b.cmts.length*1.5-(Date.now()-b.time)/36e5*.3)-(a.likes.length*2+a.cmts.length*1.5-(Date.now()-a.time)/36e5*.3));
  else ps.sort((a,b)=>b.time-a.time);
  if(!ps.length)return f.innerHTML='<div class="empty">тут пусто...</div>';
  f.innerHTML=ps.map(p=>{
    let l=p.likes.includes(u.id),m=p.aId===u.id,ath=gU(p.aId);
    let imgHtml = p.img ? `<img src="${p.img}" style="width:100%;border-radius:12px;margin-top:10px;max-height:400px;object-fit:cover;">` : '';
    return `<article class="post"><div class="p-head"><div class="av" onclick="openU('${p.aId}')">${ini(p.aNick)}</div><div class="name" onclick="openU('${p.aId}')">${esc(p.aNick)} <span style="color:var(--muted);font-size:12px">@${ath.id}</span>${m?' · ты':''}</div><div class="time">${ago(p.time)}</div></div><div class="p-text">${esc(p.text)}</div>${imgHtml}<div style="display:flex;gap:15px;margin-top:12px"><button class="act ${l?'liked':''}" onclick="like('${p.id}')">${l?'🖤':'🤍'} ${p.likes.length}</button><button class="act" onclick="document.querySelector('.ci-${p.id}').focus()">💬 ${p.cmts.length}</button>${m?`<button class="act" onclick="delPost('${p.id}')">🗑</button>`:''}</div><div class="comments">${p.cmts.map(c=>`<div class="comment"><div class="av sm">${ini(c.n)}</div><div class="c-body"><span class="c-name">${esc(c.n)}</span>${esc(c.t)}</div></div>`).join('')}<input class="ci-${p.id}" placeholder="коммент..." onkeydown="if(event.key==='Enter')addCmt('${p.id}',this)" style="margin-top:10px"></div></article>`;
  }).join('');
}

function like(id){let p=DB.posts.find(x=>x.id===id);if(!p)return;let l=[...p.likes],i=l.indexOf(u.id);if(i===-1)l.push(u.id);else l.splice(i,1);db.ref('posts/'+id+'/likes').set(l)}
function delPost(id){if(confirm('Удалить?'))db.ref('posts/'+id).remove()}
function addCmt(id,inp){let t=inp.value.trim();if(!t)return;let p=DB.posts.find(x=>x.id===id);let cmts=[...p.cmts];cmts.push({id:Date.now().toString(),n:u.nick,t});db.ref('posts/'+id+'/cmts').set(cmts);inp.value='';}

function renderSearch(){let q=document.getElementById('sInput').value.toLowerCase().trim(),r=document.getElementById('sRes');if(!q)return r.innerHTML='';let us=DB.users.filter(x=>x.nick.toLowerCase().includes(q)&&x.id!==u.id);if(!us.length)return r.innerHTML='<div class="empty">не найдено</div>';r.innerHTML=us.map(x=>`<div style="display:flex;gap:12px;align-items:center;padding:12px;background:var(--card);border:1px solid var(--line);border-radius:var(--rad);margin-bottom:10px"><div class="av">${ini(x.nick)}</div><div style="flex:1"><div>${esc(x.nick)}</div><div style="font-size:12px;color:var(--muted)">@${x.id}</div></div><button class="btn sm" onclick="openU('${x.id}')">Профиль</button></div>`).join('')}
function searchById(){let id=document.getElementById('idInput').value.trim().replace('@','');let t=DB.users.find(x=>x.id===id);if(!t)return alert('Не найден');if(t.id===u.id)return show('profile');openU(t.id);}
function openU(id){if(id===u.id)return show('profile');let t=gU(id),fs=DB.friends.some(f=>(f.a===u.id&&f.b===id)||(f.a===id&&f.b===u.id)),rq=DB.reqs.some(r=>r.from===u.id&&r.to===id);let h=fs?'Вы подписаны':(rq?'Заявка отправлена':`<button class="btn sm" onclick="addFriend('${id}')">Подписаться</button>`);document.getElementById('uCard').innerHTML=`${t.cover?`<div style="height:120px;background:url(${t.cover}) center/cover;border-radius:12px;margin-bottom:-40px;"></div>`:''}<div class="av lg" style="margin-top:${t.cover?'10px':'0'}">${ini(t.nick)}</div><h2 style="margin:10px 0">${esc(t.nick)}</h2><div style="color:var(--muted);margin-bottom:16px">@${t.id}</div><div>${h}</div>`;show('uProfile')}
function addFriend(id){if(!DB.reqs.some(r=>r.from===u.id&&r.to===id))db.ref('reqs/'+Date.now()).set({from:u.id,to:id})}
function renderProfile(){
  document.getElementById('pCard').innerHTML=`${u.cover?`<div style="height:120px;background:url(${u.cover}) center/cover;border-radius:12px;margin-bottom:-40px;"></div>`:''}<div class="av lg" style="margin-top:${u.cover?'10px':'0'}">${ini(u.nick)}</div><h2 style="margin:10px 0">${esc(u.nick)}</h2><div style="color:var(--muted);margin-bottom:16px">Твой ID: @${u.id}</div><label class="btn ghost sm" style="cursor:pointer">Сменить обложку<input type="file" accept="image/*" style="display:none" onchange="setCover(event)"></label>`;
  let f=DB.friends.filter(x=>x.a===u.id||x.b===u.id);
  document.getElementById('fCount').textContent=f.length;
  document.getElementById('fList').innerHTML=f.map(x=>{let o=gU(x.a===u.id?x.b:x.a);return `<div style="display:flex;gap:10px;align-items:center;padding:10px;border-bottom:1px solid var(--line);cursor:pointer" onclick="openChat('${o.id}')"><div class="av sm">${ini(o.nick)}</div><div style="flex:1"><div>${esc(o.nick)}</div><div style="font-size:12px;color:var(--muted)">@${o.id}</div></div><span>💬</span></div>`}).join('')||'<div class="empty">пусто</div>';
  let r=DB.reqs.filter(x=>x.to===u.id);
  document.getElementById('rList').innerHTML=r.map(x=>{let o=gU(x.from);return `<div style="display:flex;align-items:center;padding:10px;border-bottom:1px solid var(--line)"><div style="flex:1"><div>${esc(o.nick)}</div></div><button class="btn sm" onclick="accReq('${x.from}')">✓</button><button class="btn sm ghost" onclick="decReq('${x.from}')">✕</button></div>`}).join('')||'<div class="empty">нет заявок</div>'
}
function accReq(id){db.ref('friends/'+Date.now()).set({a:u.id,b:id});DB.reqs.filter(r=>r.from===id&&r.to===u.id).forEach(r=>db.ref('reqs/'+r.id).remove())}
function decReq(id){DB.reqs.filter(r=>r.from===id&&r.to===u.id).forEach(r=>db.ref('reqs/'+r.id).remove())}

function renderChats(){let ms=DB.msgs.filter(m=>m.from===u.id||m.to===u.id),chs={};ms.forEach(m=>{let o=m.from===u.id?m.to:m.from;if(!chs[o]||m.time>chs[o].time)chs[o]=m});let r=Object.values(chs).sort((a,b)=>b.time-a.time),l=document.getElementById('chatsList');if(!r.length)return l.innerHTML='<div class="empty">нет сообщений</div>';l.innerHTML=r.map(m=>{let o=gU(m.from===u.id?m.to:m.from);return `<div class="chat-item" onclick="openChat('${o.id}')"><div class="av">${ini(o.nick)}</div><div style="flex:1"><div>${esc(o.nick)}</div><div style="font-size:12px;color:var(--muted)">${m.from===u.id?'Ты: ':''}${esc(m.text)}</div></div></div>`}).join('')}
function openChat(id){aChat=id;let o=gU(id);document.getElementById('cHeader').innerHTML=`<button class="btn ghost sm" onclick="show('chats')">←</button><div class="av sm">${ini(o.nick)}</div><div style="flex:1"><div>${esc(o.nick)}</div><div style="font-size:12px;color:var(--muted)">@${o.id}</div></div>`;renderMsgs(id);show('chat')}
function renderMsgs(id){let ms=DB.msgs.filter(m=>(m.from===u.id&&m.to===id)||(m.from===id&&m.to===u.id)).sort((a,b)=>a.time-b.time);let h=document.getElementById('cMsgs');h.innerHTML=ms.map(m=>`<div class="msg-wrap ${m.from===u.id?'me':'them'}"><div class="msg">${esc(m.text)}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">${gT(m.time)}</div></div>`).join('');h.scrollTop=h.scrollHeight}
function send(){let i=document.getElementById('cInput'),t=i.value.trim();if(!t)return;db.ref('msgs/'+Date.now()).set({from:u.id,to:aChat,text:t,time:Date.now()});i.value='';}

if(u){document.getElementById('auth').style.display='none';document.getElementById('header').style.display='flex';document.getElementById('nav').style.display='flex';document.getElementById('myAv').textContent=ini(u.nick);}
