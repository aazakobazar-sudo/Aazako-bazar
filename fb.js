/* Firebase Auth (stage 1): mirrors local login/register into Firebase Auth. Local login stays as fallback. */
(function(){
const cfg={apiKey:"AIzaSyA48YiJe9WQNGcs0_a8ADtDPVn7AqbbkbU",authDomain:"aazabo-bazar.firebaseapp.com",projectId:"aazabo-bazar",storageBucket:"aazabo-bazar.firebasestorage.app",messagingSenderId:"813051695868",appId:"1:813051695868:web:dd227f036d4dd07b967d79"};
let auth=null;
try{if(typeof firebase!=='undefined'){firebase.initializeApp(cfg);auth=firebase.auth()}}catch(e){console.warn('fb init',e)}
if(!auth)return;
let cred=null;
const em=s=>String(s||'').trim().toLowerCase();
var mirror=async function mirror(c,u){
  try{
    let r;
    try{r=await auth.signInWithEmailAndPassword(c.e,c.p)}
    catch(x){
      if(['auth/user-not-found','auth/invalid-credential','auth/invalid-login-credentials'].includes(x.code))r=await auth.createUserWithEmailAndPassword(c.e,c.p);
      else throw x}
    if(u&&r.user&&u.fu!==r.user.uid){u.fu=r.user.uid;save()}
    if(u&&u.role=='a'&&typeof claimAdmin=='function')claimAdmin(r.user);
  }catch(x){console.warn('fb auth',x.code||x)}
}
const _login=window.login;
window.login=function(e,p){cred={e:em(e),p:p};return _login.apply(this,arguments)};
const _reg=window.regNext;
window.regNext=function(){try{rc();const d=S.r&&S.r.d;if(d&&d.em2&&d.pw1)cred={e:em(d.em2),p:d.pw1}}catch(_){}return _reg.apply(this,arguments)};
const _sess=window.sess;
window.sess=function(u){const c=cred;cred=null;const r=_sess.apply(this,arguments);if(c&&S.u===u)mirror(c,u);return r};
const _lo=window.logout;
window.logout=function(){try{auth.signOut()}catch(_){}return _lo.apply(this,arguments)};
const _ch=window.chPw;
window.chPw=async function(){
  const op=$('op')&&$('op').value,np=$('np')&&$('np').value,before=S.u&&S.u.pass;
  const r=await _ch.apply(this,arguments);
  try{const cu=auth.currentUser;if(cu&&np&&S.u&&S.u.pass!==before){await cu.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(cu.email,op));await cu.updatePassword(np)}}
  catch(x){console.warn('fb pw',x.code||x)}
  return r};

/* ---- pub/{uid}: merchant shop+items+notices (~<=20KB, all signed-in users read). priv/{uid}: own full profile (owner only). ---- */
let fs=null;try{fs=firebase.firestore();fs.settings({experimentalAutoDetectLongPolling:true,merge:true})}catch(e){console.warn('fs',e)}
if(fs){
const BADK=new Set(['photo','doc','tok','pass','salt','img','pic','image','fu']);
const cl=x=>{if(Array.isArray(x))return x.map(cl).filter(v=>v!==undefined);if(x&&typeof x=='object'){const o={};for(const k in x){if(BADK.has(k)||k[0]=='_')continue;const v=cl(x[k]);if(v!==undefined)o[k]=v}return o}if(typeof x=='string'&&(x.startsWith('data:')||x.length>1500))return undefined;if(typeof x=='number'&&!isFinite(x))return 0;return x};
const hh=s=>{let c=~0;for(let i=0;i<s.length;i++){c^=s.charCodeAt(i);for(let k=0;k<8;k++)c=c>>>1^(c&1?0xEDB88320:0)}return 1e6+((~c)>>>0)%9e8};
const IC={};
const shrink=src=>new Promise(ok=>{const i=new Image();i.onload=()=>{const k=Math.min(1,480/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=Math.round(i.width*k);c.height=Math.round(i.height*k);c.getContext('2d').drawImage(i,0,0,c.width,c.height);let q=.6,r;for(;;){r=c.toDataURL('image/jpeg',q);if(r.length<=90000||q<=.3)break;q-=.1}ok(r.length<=110000?r:null)};i.onerror=()=>ok(null);i.src=src});
async function upImgs(u){if(u.role!='m')return false;let ch=false;
  for(const p of DB.products){if(p.mid!=u.id||!p.img||!p.img.startsWith('data:')||(p.ih&&p._il===p.img.length))continue;
    const d=await shrink(p.img);if(!d)continue;
    try{await fs.collection('imgs').doc(auth.currentUser.uid+'_'+p.id).set({d,ts:Date.now()});p.ih=Date.now();p._il=p.img.length;ch=true}catch(x){console.warn('img',x.code||x);break}}
  return ch}
async function pullImgs(){let ch=false;const need=DB.products.filter(p=>p._r&&p.ih&&!(IC[p._k]&&IC[p._k].v==p.ih)).slice(0,30);
  await Promise.all(need.map(async p=>{try{const d=await fs.collection('imgs').doc(p._k).get();if(d.exists){IC[p._k]={v:p.ih,d:d.data().d};ch=true}}catch(x){console.warn('imgget',x.code||x)}}));return ch}
let AP={},APs='';
async function pushApprovals(){const m=mine();if(!m||m.u.role!='a')return;
  for(const x of DB.users){if(!x._r||!x._uid||!x.shop)continue;const g=[x.shop.ok,x.shop.exp,x.on,x.shop.fake,x.shop.slots].join('|');if(x._as===g)continue;
    await fs.collection('approvals').doc(x._uid).set({ok:x.shop.ok?1:0,exp:x.shop.exp||'',on:x.on?1:0,fake:x.shop.fake||'',slots:x.shop.slots||0,ts:Date.now()});x._as=g}}
async function claimAdmin(cu){try{const r=fs.doc('cfg/admin');if(!(await r.get()).exists)await r.set({uid:cu.uid})}catch(x){console.warn('adm',x.code||x)}}
async function pushPays(){const m=mine();if(!m)return false;const{u,cu}=m;let ch=false;
  for(const o of DB.pay){const asM=o.mid==u.id;if(!asM&&u.role!='a')continue;const id=o._o||(asM?cu.uid+'_'+o.id:'');if(!id||(o._o&&o._s===o.st))continue;
    await fs.collection('pays').doc(id).set(asM&&!o._o?{muid:cu.uid,j:JSON.stringify(cl(o)),st:o.st,ts:Date.now()}:{st:o.st,ts:Date.now()},{merge:true});o._o=id;o._s=o.st;ch=true}
  return ch}
async function pullPays(){const m=mine();if(!m)return false;const{u,cu}=m;let ch=false;
  const s=await(u.role=='a'?fs.collection('pays'):fs.collection('pays').where('muid','==',cu.uid)).get();
  s.forEach(d=>{const x=d.data();let o;try{o=JSON.parse(x.j)}catch(_){return}const l=DB.pay.find(y=>y._o===d.id);
    if(!l){if(u.role=='a'){DB.pay.unshift(Object.assign({},o,{id:hh(d.id),mid:hh(x.muid),st:x.st,_o:d.id,_s:x.st}));ch=true}return}
    if(x.st!==l._s){l.st=x.st;l._s=x.st;ch=true}});
  if(ch)save();return ch}
async function pushOrders(){const m=mine();if(!m)return false;const{u,cu}=m;let ch=false;
  for(const o of DB.orders){const asC=o.cid==u.id,asM=o.mid==u.id;if(!asC&&!asM)continue;
    const id=o._o||(asC?cu.uid+'_'+o.id:'');if(!id||(o._o&&o._s===o.st))continue;
    const mu=U(o.mid),muid=asM?cu.uid:mu&&mu._uid;if(!muid)continue;
    const x=asC&&!o._o?{cuid:cu.uid,muid,j:JSON.stringify(cl(Object.assign({},o,{cn:u.name,cp:u.phone,ca:[u.dist,u.local,u.ward].join(', ')}))),st:o.st,ts:Date.now()}:{st:o.st,ts:Date.now()};
    await fs.collection('orders').doc(id).set(x,{merge:true});o._o=id;o._s=o.st;ch=true}
  return ch}
async function pullOrders(){const m=mine();if(!m)return false;const{u,cu}=m;let ch=false;
  const s=await fs.collection('orders').where(u.role=='m'?'muid':'cuid','==',cu.uid).get();
  s.forEach(d=>{const x=d.data();let o;try{o=JSON.parse(x.j)}catch(_){return}let l=DB.orders.find(y=>y._o===d.id);
    if(u.role=='m'){const cid=hh(x.cuid);if(!DB.users.some(y=>y.id==cid))DB.users.push({id:cid,name:o.cn||'Customer',phone:o.cp||'',dist:'',local:o.ca||'',ward:'',email:'c'+cid+'@remote.invalid',role:'c',on:1,salt:'',pass:'',wallet:0,pts:0,_c:1});
}
    if(!l){DB.orders.unshift(Object.assign({},o,{id:hh(d.id),mid:u.role=='m'?u.id:hh(x.muid),cid:u.role=='m'?hh(x.cuid):u.id,st:x.st,_o:d.id,_s:x.st}));ch=true;return}
    if(l&&x.st!==l._s){l.st=x.st;l._s=x.st;ch=true}});
  if(ch)save();return ch}
let pt,last='';
const mine=()=>{const u=S.u,cu=auth.currentUser;return u&&cu&&u.fu===cu.uid?{u,cu}:null};
async function push(){const m=mine();if(!m)return;const{u,cu}=m;
  try{if(await upImgs(u))save()}catch(_){}
  try{if(await pushOrders())save()}catch(x){console.warn('ord',x.code||x)}
  try{await fs.collection('priv').doc(cu.uid).set({j:JSON.stringify(cl(u)),ts:Date.now()});
  if(u.role=='m'&&u.shop){let o={u:cl(u),p:cl(DB.products.filter(x=>x.mid==u.id)),n:cl(DB.notices.filter(x=>x.mid==u.id))},j=JSON.stringify(o);
    while(j.length>20000&&(o.n.length||o.p.length)){(o.n.length?o.n:o.p).pop();j=JSON.stringify(o)}
    await fs.collection('pub').doc(cu.uid).set({j,ts:Date.now()})}}catch(x){console.warn('push',x.code||x)}}
function merge(s){const me=auth.currentUser&&auth.currentUser.uid;
  ['users','products','notices'].forEach(k=>DB[k]=DB[k].filter(x=>!x._r));
  s.forEach(d=>{if(d.id===me)return;let o;try{o=JSON.parse(d.data().j)}catch(_){return}if(!o.u||!o.u.shop)return;const b=hh(d.id);
    const U0=Object.assign({},o.u,{id:b,email:'r'+d.id+'@remote.invalid',role:'m',on:1,salt:'',pass:'',_r:1,_uid:d.id}),a=AP[d.id]||{};U0.shop=Object.assign({},o.u.shop,{ok:a.ok||0,exp:a.exp||'',fake:a.fake||'',slots:a.slots||0});U0.on=a.on===0?0:1;U0._as=[U0.shop.ok,U0.shop.exp,U0.on,U0.shop.fake,U0.shop.slots].join('|');DB.users.push(U0);
    (o.p||[]).forEach(p=>{const k=d.id+'_'+p.id,q=Object.assign({},p,{id:b*1e4+p.id%1e4,mid:b,_r:1,_k:k});Object.defineProperty(q,'img',{get(){const c=IC[k];return c&&c.v==q.ih?c.d:''},enumerable:false});DB.products.push(q)});
    (o.n||[]).forEach(n=>DB.notices.push(Object.assign({},n,{id:b*1e4+n.id%1e4,mid:b,_r:1})))})}
async function pull(){const m=mine();if(!m)return;try{let ch=false;if(m.u.role=='a')await pushApprovals();
  const ap=await fs.collection('approvals').get(),g=JSON.stringify(ap.docs.map(d=>[d.id,d.data().ts]));if(g!==APs){APs=g;AP={};ap.forEach(d=>AP[d.id]=d.data());last='';ch=true}
  if(m.u.role=='m'&&AP[m.cu.uid]){const a=AP[m.cu.uid],h=m.u.shop||{};if(h.ok!=a.ok||h.exp!==a.exp||(m.u.on?1:0)!==a.on||(h.slots||0)!==a.slots||(h.fake||'')!==a.fake){Object.assign(h,{ok:a.ok,exp:a.exp,slots:a.slots,fake:a.fake});m.u.on=a.on;ch=true;save()}}
  if(await pushPays())ch=true;if(await pullPays())ch=true;
  const s=await fs.collection('pub').get(),sig=s.docs.map(d=>d.id+d.data().ts).join();if(sig!==last){last=sig;merge(s);ch=true}
  if(await pullImgs())ch=true;
  if(await pullOrders())ch=true;
  const a=document.activeElement;if(ch&&!(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)))R()}catch(x){console.warn('pull',x.code||x)}}
const _save=window.save;window.save=function(){const r=_save.apply(this,arguments);clearTimeout(pt);pt=setTimeout(push,3000);return r};
const _m=mirror;mirror=async function(c,u){await _m(c,u);await push();await pull()};
async function restore(e,p){const r=await auth.signInWithEmailAndPassword(e,p),uid=r.user.uid,pv=await fs.collection('priv').doc(uid).get();if(!pv.exists)return;
  const u=JSON.parse(pv.data().j);u.id=nid();u.salt=rnd(16);u.pass=await hp(p,u.salt);u.on=1;u.fu=uid;DB.users.push(u);
  if(u.role=='m'){const pb=await fs.collection('pub').doc(uid).get();if(pb.exists){const o=JSON.parse(pb.data().j);(o.p||[]).forEach(x=>DB.products.push(Object.assign(x,{id:nid(),mid:u.id})));(o.n||[]).forEach(x=>DB.notices.push(Object.assign(x,{id:nid(),mid:u.id})))}}
  save()}
const _l2=window.login;window.login=async function(e,p){try{if(!DB.users.some(x=>canon(x.email)===canon(e)))await restore(em(e),p)}catch(x){console.warn('restore',x.code||x)}return _l2.apply(this,arguments)};
setInterval(pull,30000);
}
})();
