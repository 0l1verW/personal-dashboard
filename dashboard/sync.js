/* Pi-Sync: spiegelt den App-Speicher (localStorage) auf den Raspberry Pi.
   Wird vom Server automatisch in jede HTML-Seite eingefügt – die Apps selbst bleiben unverändert.
   Welche Keys abgeglichen werden, setzt der Server aus apps.json (window.__PI_KEYS).
   Modus „ganz“: der neueste Gesamtstand gewinnt.
   Modus „liste“ (window.__PI_LISTE): nur Geändertes wandert. Das Gerät merkt sich, welche Einträge es seit dem letzten
   Abgleich geändert hat (pd_dirty_<key>), schickt nur diese und holt mit ?seit=<Nummer> nur, was auf dem Pi dazukam
   (pd_seq_<key>). Mit Archiv (window.__PI_ARCHIV) behält das Gerät nur die letzten N Tage (je Sammlung einstellbar), der Rest bleibt auf dem Pi.
   Eigene Daten je Person (window.__PI_MAP): der Pi legt den Stand einer Person woanders ab; das Gerät verwirft seine Kopie,
   sobald sich die Ablage ändert (andere Person am selben Gerät, eigene Daten an/aus). */
(function(){
  window.__PI_SYNC=true;
  var KEYS=window.__PI_KEYS||['semesterplaner_ws2627_v1','bsc_informatik_cockpit_v2'];   // vom Pi: nur Keys der Tools, die die Person sehen darf
  var LISTE=window.__PI_LISTE||[], AR=window.__PI_ARCHIV||{}, MAP=window.__PI_MAP||{};
  var API='/api/';
  var okStart=false, LS=window.localStorage, origSet=Storage.prototype.setItem, timers={}, last={};
  /* Wer angemeldet ist, entscheidet der Pi (Anmeldeseite). Die Apps lesen die Person aus localStorage.pd_person. */
  var ROLE=window.__PI_ROLE||null, RO=window.__PI_RO||[], EP=window.__PI_EPOCH||0;
  function drop(k){ LS.removeItem(k); LS.removeItem('pd_seq_'+k); LS.removeItem('pd_dirty_'+k); }
  /* Nach einer Wiederherstellung auf dem Pi (neue Kennung): lokale Kopien verwerfen, damit der alte Gerätestand die Sicherung nicht überschreibt */
  try{ var le=LS.getItem('pd_epoch'); if(le===null) origSet.call(LS,'pd_epoch',String(EP));
    else if(le!==String(EP)){ KEYS.forEach(drop); origSet.call(LS,'pd_epoch',String(EP)); } }catch(e){}
  /* Ablage gewechselt → die lokale Kopie gehört jemand anderem. Ohne bisherige Angabe (erstes Mal mit dieser Version) nur
     verwerfen, wenn es um eigene Daten geht (<key>__<person>) – sonst bleiben auch noch nicht gesendete Änderungen erhalten. */
  try{ KEYS.forEach(function(k){ var m=MAP[k]||k, o=LS.getItem('pd_map_'+k);
      if(o===null?m.indexOf('__')>=0:o!==m) drop(k);
      if(o!==m) origSet.call(LS,'pd_map_'+k,m); }); }catch(e){}
  try{ if(ROLE&&LS.getItem('pd_person')!==(ROLE.pid||'')) origSet.call(LS,'pd_person',ROLE.pid||''); }catch(e){}
  function isRO(k){ return RO.indexOf(k)>=0; }
  function isL(k){ return LISTE.indexOf(k)>=0; }
  function ts(raw){ try{ var x=JSON.parse(raw); return (x&&+x.savedAt)||0; }catch(e){ return 0; } }
  function local(k){ try{ return LS.getItem(k); }catch(e){ return null; } }
  function parse(raw){ try{ var x=JSON.parse(raw); return x&&typeof x==='object'?x:null; }catch(e){ return null; } }
  function badge(t,ok){ var b=document.getElementById('__piSync'); if(!b){ if(!document.body) return; b=document.createElement('div'); b.id='__piSync';
      b.style.cssText='position:fixed;left:8px;bottom:'+(innerWidth<=640?'calc(76px + env(safe-area-inset-bottom,0px))':'8px')+';z-index:99999;font:11px/1.4 system-ui,sans-serif;padding:3px 8px;border-radius:99px;pointer-events:none;opacity:.85';
      document.body.appendChild(b); }
    b.textContent=t; b.style.background=ok?'#1f7a4d':'#b3261e'; b.style.color='#fff'; b.style.transition='opacity .4s'; b.style.opacity='.9';
    clearTimeout(badge._t); if(ok) badge._t=setTimeout(function(){ b.style.opacity='0'; },3500); }   // Erfolg kurz zeigen, Fehler bleiben stehen
  function typing(){ var a=document.activeElement; return a&&a.matches&&a.matches('input,textarea,select')&&document.visibilityState==='visible'; }
  /* Modus „liste“: die Apps schützen offene Blätter und die Schnelleingabe selbst. Gewartet wird nur, solange gerade
     getippt wird (letzte Taste vor < 5 s) oder in einem anderen Feld schon etwas steht. */
  var lastKey=0; document.addEventListener('keydown',function(){ lastKey=Date.now(); },true);
  function typingL(){ if(!typing()) return false; var a=document.activeElement;
    return Date.now()-lastKey<5000||(a.id!=='qa'&&a.type!=='checkbox'&&a.type!=='radio'&&a.tagName!=='SELECT'&&String(a.value||'').trim()!==''); }
  function stamp(){ return 'Pi ✓ '+new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}); }
  function notify(k,v){ try{ window.dispatchEvent(new StorageEvent('storage',{key:k,newValue:v})); }catch(e){} }
  function req(m,u,body,sync,cb){ var x=new XMLHttpRequest(); x.open(m,u,!sync); if(body!=null) x.setRequestHeader('Content-Type','application/json');
    function done(){ var sq=null; try{ sq=x.getResponseHeader('X-Seq'); }catch(e){} cb&&cb({status:x.status,text:x.responseText,seq:sq==null?null:+sq}); }
    if(sync){ try{ x.send(body); done(); }catch(e){ cb&&cb({status:0,text:'',seq:null}); } return; }
    x.onload=done; x.onerror=function(){ cb&&cb({status:0,text:'',seq:null}); }; x.send(body); }
  function epochGone(r){ if(r.status===409&&/epoch/.test(r.text||'')){ if(!epochGone._r){ epochGone._r=1; badge('Pi wurde wiederhergestellt – lade neu …',true); setTimeout(function(){ location.reload(); },800); } return true; } return false; }

  /* ================= Modus „ganz“ (Planer, Cockpit) und „nur ansehen“: ganzer Stand ================= */
  function push(k,raw,quiet,sync){
    req('PUT',API+k+'?e='+EP,raw,sync,function(r){ if(epochGone(r)) return;
      if(r.status===200||r.status===409){ last[k]=Math.max(last[k]||0,ts(raw)); if(!quiet) badge(stamp(),true); }
      else if(!quiet) badge(r.status?'Pi ✗ nicht gespeichert':'Pi offline – nur lokal',false); }); }
  function pull(k,sync,cb){ req('GET',API+k+'?t='+Date.now(),null,sync,function(r){ cb&&cb(r.status===200?r.text:(r.status?null:undefined)); }); }

  /* ================= Modus „liste“: nur Geändertes ================= */
  var prev={}, busy={}, again={};
  function isColl(v){ if(!v||typeof v!=='object'||Array.isArray(v)) return false; for(var i in v){ var x=v[i]; if(!x||typeof x!=='object'||!('upd' in x)) return false; } return true; }
  function getSeq(k){ var v=null; try{ v=LS.getItem('pd_seq_'+k); }catch(e){} return v===null?null:(+v||0); }
  function setSeq(k,n){ try{ origSet.call(LS,'pd_seq_'+k,String(n||0)); }catch(e){} }
  function getDirty(k){ try{ var d=JSON.parse(LS.getItem('pd_dirty_'+k)||'null'); if(d&&d.c&&d.t) return d; }catch(e){} return {c:{},t:{},n:0}; }
  function setDirty(k,d){ try{ origSet.call(LS,'pd_dirty_'+k,JSON.stringify(d)); }catch(e){} }
  function hasDirty(d){ for(var c in d.c){ for(var i in d.c[c]) return true; } for(var t in d.t) return true; return false; }
  function strip(it){ if(!it||typeof it!=='object') return it; var o={}; for(var a in it) if(a!=='_s') o[a]=it[a]; return o; }
  function canon(x){ if(x&&typeof x==='object'){ if(Array.isArray(x)) return '['+x.map(canon).join(',')+']';
      return '{'+Object.keys(x).sort().map(function(k){ return JSON.stringify(k)+':'+canon(x[k]); }).join(',')+'}'; } return JSON.stringify(x); }
  function sameIt(a,b){ var x=strip(a), y=strip(b); return JSON.stringify(x)===JSON.stringify(y)||canon(x)===canon(y); }
  /* Was hat die App seit dem letzten Stand geändert? → als „noch zu senden“ merken (mit fortlaufender Marke) */
  function markDirty(k,a,b){ if(!b) return false; var d=getDirty(k), ch=false;
    for(var key in b){ if(key==='savedAt') continue; var v=b[key], o=a?a[key]:undefined;
      if(isColl(v)&&(o===undefined||isColl(o))){
        for(var id in v){ var x=v[id], y=o&&o[id]; if(!y||!sameIt(x,y)){ (d.c[key]=d.c[key]||{})[id]=++d.n; ch=true; } } }
      else if(JSON.stringify(v)!==JSON.stringify(o)){ d.t[key]=++d.n; ch=true; } }
    if(ch) setDirty(k,d); return ch; }
  function prune(k,cur){ var ar=AR[k]; if(!ar||!cur) return 0; var d=getDirty(k), n=0;
    (ar.sammlungen||[]).forEach(function(c){ var v=cur[c]; if(!v||typeof v!=='object') return;
      var ab=(ar.abJe&&ar.abJe[c])||ar.ab;   // einzelne Sammlungen bleiben länger (z. B. Gewicht 2 Jahre)
      for(var id in v){ var it=v[id], f=it&&it[ar.feld]; if(f&&String(f)<ab&&!(d.c[c]&&d.c[c][id]!=null)){ delete v[id]; n++; } } });
    return n; }
  function write(k,cur){ var raw=JSON.stringify(cur); try{ origSet.call(LS,k,raw); }catch(e){ badge('Gerätespeicher voll',false); return false; } prev[k]=cur; return raw; }
  /* Antwort des Pi einarbeiten. Eigene, noch nicht gesendete Änderungen gehen vor, solange sie neuer sind. */
  function apply(k,r,atStart){
    if(!r) return;
    if(r.voll) return full(k,atStart);
    var nItems=0, D=r.d||{}, T=r.top||{}; for(var c0 in D) for(var i0 in D[c0]) nItems++; for(var t0 in T) nItems++;
    if(nItems&&!atStart&&typingL()) return;             // nicht mitten im Tippen – der nächste Abgleich holt es wieder
    var cur=parse(local(k)); if(!cur) return full(k,atStart);
    var d=getDirty(k), ch=false, dch=false;
    for(var c in D){ var src=D[c]; if(!cur[c]||typeof cur[c]!=='object'||Array.isArray(cur[c])) cur[c]={};
      for(var id in src){ var it=src[id], loc=cur[c][id], mine=d.c[c]&&d.c[c][id]!=null;
        if(mine&&loc){ var lu=+loc.upd||0, ru=+it.upd||0;
          if(lu>ru) continue;                                         // meine neuere Änderung wartet noch
          if(lu===ru&&!sameIt(loc,it)) continue;
          delete d.c[c][id]; dch=true; }
        if(!loc||!sameIt(loc,it)){ cur[c][id]=it; ch=true; } } }
    for(var t in T){ var rv=T[t], lv=cur[t];
      if(d.t[t]!=null){ if(rv&&lv&&typeof rv==='object'&&'upd' in rv&&'upd' in lv&&(+rv.upd||0)>(+lv.upd||0)){ delete d.t[t]; dch=true; } else continue; }
      if(JSON.stringify(rv)!==JSON.stringify(lv)){ cur[t]=rv; ch=true; } }
    if(dch) setDirty(k,d);
    if(prune(k,cur)) ch=true;
    if(r.seq!=null) setSeq(k,r.seq);
    if(ch){ cur.savedAt=Math.max(+cur.savedAt||0,+r.savedAt||0); var raw=write(k,cur); if(raw&&!atStart){ notify(k,raw); badge('Pi ↓ aktualisiert',true); } }
    else prev[k]=cur; }
  /* Ganzen Stand holen (erstes Mal, nach langer Pause oder wenn der Pi es verlangt). Eigene offene Änderungen bleiben erhalten. */
  function full(k,sync){
    req('GET',API+k+'?t='+Date.now(),null,sync,function(r){
      if(r.status!==200){ if(!r.status) badge('Pi offline – nur lokal',false); return; }
      var S=parse(r.text); if(!S) return;
      var cur=parse(local(k)), d=getDirty(k);
      if(cur){ for(var c in d.c){ for(var id in d.c[c]){ var loc=cur[c]&&cur[c][id]; if(!loc) continue; S[c]=S[c]||{}; var rem=S[c][id];
            if(!rem||(+loc.upd||0)>=(+rem.upd||0)) S[c][id]=loc; } }
        for(var t in d.t){ if(t in cur) S[t]=cur[t]; } }
      prune(k,S); S.savedAt=Math.max(+S.savedAt||0,cur?+cur.savedAt||0:0);
      var raw=write(k,S); if(r.seq!=null) setSeq(k,r.seq);
      if(raw&&!sync){ notify(k,raw); badge('Pi ↓ aktualisiert',true); }
      okStart=true; }); }
  function sendL(k,sync,cb){
    if(busy[k]){ again[k]=1; return; }
    var cur=parse(local(k)), d=getDirty(k), seq=getSeq(k)||0;
    if(!cur||!hasDirty(d)) return pullL(k,sync,cb);
    var body={savedAt:+cur.savedAt||Date.now()}, sent={c:{},t:{}}, any=false;
    for(var c in d.c){ for(var id in d.c[c]){ var it=cur[c]&&cur[c][id];
        if(it){ (body[c]=body[c]||{})[id]=it; (sent.c[c]=sent.c[c]||{})[id]=d.c[c][id]; any=true; } else delete d.c[c][id]; } }
    for(var t in d.t){ if(t in cur){ body[t]=cur[t]; sent.t[t]=d.t[t]; any=true; } else delete d.t[t]; }
    if(!any){ setDirty(k,d); return pullL(k,sync,cb); }
    busy[k]=1;
    req('PUT',API+k+'?e='+EP+'&d=1&seit='+seq,JSON.stringify(body),sync,function(r){ busy[k]=0;
      if(epochGone(r)) return;
      if(r.status===200){ var x=getDirty(k);                  // gesendet → abhaken (nur, was sich inzwischen nicht wieder geändert hat)
        for(var c in sent.c){ for(var id in sent.c[c]){ if(x.c[c]&&x.c[c][id]===sent.c[c][id]) delete x.c[c][id]; } if(x.c[c]&&!Object.keys(x.c[c]).length) delete x.c[c]; }
        for(var t in sent.t){ if(x.t[t]===sent.t[t]) delete x.t[t]; }
        setDirty(k,x); apply(k,parse(r.text),sync); okStart=true; if(!sync) badge(stamp(),true); }
      else if(r.status===403) badge('Nur ansehen – nicht gespeichert',false);
      else badge(r.status?'Pi ✗ nicht gespeichert':'Pi offline – nur lokal',false);
      if(again[k]){ again[k]=0; setTimeout(function(){ sendL(k,false); },50); }
      cb&&cb(); }); }
  function pullL(k,sync,cb){
    var seq=getSeq(k); if(seq===null) return full(k,sync);
    req('GET',API+k+'?d=1&seit='+seq+'&t='+Date.now(),null,sync,function(r){
      if(r.status===200){ apply(k,parse(r.text),sync); okStart=true; } else if(!r.status&&sync) setTimeout(function(){ badge('Pi offline – nur lokal',false); },500);
      cb&&cb(); }); }
  function startL(k){
    var loc=local(k), seq=getSeq(k);
    if(loc&&seq===null){                                 // erstes Mal mit dieser Version: eigenen Stand ganz einbringen
      req('PUT',API+k+'?e='+EP,loc,true,function(r){ if(epochGone(r)) return;
        if(r.status===200){ var S=parse(r.text); if(S){ prune(k,S); write(k,S); } setDirty(k,{c:{},t:{},n:0}); if(r.seq!=null) setSeq(k,r.seq); okStart=true; }
        else if(!r.status) setTimeout(function(){ badge('Pi offline – nur lokal',false); },500); });
    } else if(!loc) full(k,true);
    else sendL(k,true);
    prev[k]=parse(local(k)); }

  /* ================= Start (synchron, vor der App) ================= */
  KEYS.forEach(function(k){
    if(isL(k)&&!isRO(k)) return startL(k);
    var loc=local(k);
    pull(k,true,function(srv){
      if(srv===undefined){ setTimeout(function(){badge('Pi offline – nur lokal',false);},500); return; }
      var s=srv?ts(srv):0, l=loc?ts(loc):0;
      if(isRO(k)){ if(srv) try{ origSet.call(LS,k,srv); }catch(e){} last[k]=s; okStart=true; return; }   // nur ansehen: immer Stand vom Pi
      if(s>l){ try{ origSet.call(LS,k,srv); }catch(e){} last[k]=s; }
      else if(l>s){ push(k,loc); }   // offline geänderter Stand -> hochladen
      else last[k]=s;
      okStart=true;
    });
  });
  function hello(){ if(okStart) badge('Pi ✓ verbunden',true);
    if(ROLE&&ROLE.ro&&document.body){ var b=document.createElement('div'); b.id='__piRO'; b.setAttribute('role','status');
      b.style.cssText='position:fixed;left:50%;transform:translateX(-50%);top:calc(6px + env(safe-area-inset-top,0px));z-index:99998;font:600 12px/1.4 system-ui,sans-serif;padding:5px 12px;border-radius:99px;background:#5C6680;color:#fff;box-shadow:0 2px 10px rgba(0,0,0,.2);pointer-events:none;white-space:nowrap';
      b.textContent='Nur ansehen – Änderungen werden nicht gespeichert'; document.body.appendChild(b); } }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',hello); else hello();
  // 2) Jede Speicherung der App an den Pi senden (gebündelt)
  Storage.prototype.setItem=function(k,v){
    if(this===LS&&isRO(k)){ badge('Nur ansehen – nicht gespeichert',false); return; }
    var before=this===LS&&isL(k)&&KEYS.indexOf(k)>=0?(prev[k]!==undefined?prev[k]:parse(local(k))):undefined;
    origSet.call(this,k,v);
    if(this!==LS||KEYS.indexOf(k)<0) return;
    if(isL(k)){ var nx=parse(v); markDirty(k,before,nx); prev[k]=nx; clearTimeout(timers[k]); timers[k]=setTimeout(function(){ sendL(k,false); },600); return; }
    clearTimeout(timers[k]); timers[k]=setTimeout(function(){ push(k,v); },600);
  };
  window.addEventListener('storage',function(e){ if(e.key&&isL(e.key)&&e.isTrusted) prev[e.key]=parse(e.newValue); });   // anderer Tab hat gespeichert
  // 3) Änderungen von anderen Geräten übernehmen (beim Zurückkehren + alle 20 s)
  function check(){
    KEYS.forEach(function(k){
      if(isL(k)&&!isRO(k)) return sendL(k,false);
      pull(k,false,function(srv){
        if(!srv) return; var s=ts(srv), l=ts(local(k));
        if(s>l||(isRO(k)&&srv!==local(k))){ if(typing()) return; // nicht mitten im Tippen
          try{ origSet.call(LS,k,srv); }catch(e){} last[k]=s; notify(k,srv); badge('Pi ↓ aktualisiert',true); }
      });
    });
  }
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') check(); });
  window.addEventListener('focus',check);
  setInterval(function(){ if(document.visibilityState==='visible') check(); },20000);
  window.addEventListener('pagehide',function(){ if(!navigator.sendBeacon) return;
    KEYS.forEach(function(k){ var v=local(k); if(!v||isRO(k)) return;
      if(isL(k)){ var cur=parse(v), d=getDirty(k); if(!cur||!hasDirty(d)) return; var body={savedAt:+cur.savedAt||Date.now()};
        for(var c in d.c) for(var id in d.c[c]){ if(cur[c]&&cur[c][id]) (body[c]=body[c]||{})[id]=cur[c][id]; }
        for(var t in d.t) if(t in cur) body[t]=cur[t];
        navigator.sendBeacon(API+k+'?e='+EP+'&d=1&seit='+(getSeq(k)||0),new Blob([JSON.stringify(body)],{type:'application/json'})); return; }   // Beacon kann kein PUT – POST-Fallback
      if(ts(v)>(last[k]||0)) navigator.sendBeacon(API+k+'?e='+EP,new Blob([v],{type:'application/json'})); }); });
})();
