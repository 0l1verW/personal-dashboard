/* Pi-Sync: spiegelt den App-Speicher (localStorage) auf den Raspberry Pi.
   Wird vom Server automatisch in jede HTML-Seite eingefügt – die Apps selbst bleiben unverändert.
   Welche Keys abgeglichen werden, setzt der Server aus apps.json (window.__PI_KEYS).
   Modus „ganz“: der neueste Gesamtstand gewinnt. Modus „liste“ (window.__PI_LISTE): der Server führt
   jeden Eintrag einzeln zusammen und schickt den zusammengeführten Stand zurück. */
(function(){
  window.__PI_SYNC=true;
  var KEYS=window.__PI_KEYS||['semesterplaner_ws2627_v1','bsc_informatik_cockpit_v2'];   // vom Pi: nur Keys der Tools, die die Person sehen darf
  var LISTE=window.__PI_LISTE||[];
  var API='/api/';
  var okStart=false, LS=window.localStorage, origSet=Storage.prototype.setItem, timers={}, last={};
  /* Wer angemeldet ist, entscheidet der Pi (Anmeldeseite). Die Apps lesen die Person aus localStorage.pd_person. */
  var ROLE=window.__PI_ROLE||null, RO=window.__PI_RO||[], EP=window.__PI_EPOCH||0;
  /* Nach einer Wiederherstellung auf dem Pi (neue Kennung): lokale Kopien verwerfen, damit der alte Gerätestand die Sicherung nicht überschreibt */
  try{ var le=LS.getItem('pd_epoch'); if(le===null) origSet.call(LS,'pd_epoch',String(EP));
    else if(le!==String(EP)){ KEYS.forEach(function(k){ LS.removeItem(k); }); origSet.call(LS,'pd_epoch',String(EP)); } }catch(e){}
  try{ if(ROLE&&LS.getItem('pd_person')!==(ROLE.pid||'')) origSet.call(LS,'pd_person',ROLE.pid||''); }catch(e){}
  function isRO(k){ return RO.indexOf(k)>=0; }
  function isL(k){ return LISTE.indexOf(k)>=0; }
  function ts(raw){ try{ var x=JSON.parse(raw); return (x&&+x.savedAt)||0; }catch(e){ return 0; } }
  function local(k){ try{ return LS.getItem(k); }catch(e){ return null; } }
  function badge(t,ok){ var b=document.getElementById('__piSync'); if(!b){ if(!document.body) return; b=document.createElement('div'); b.id='__piSync';
      b.style.cssText='position:fixed;left:8px;bottom:'+(innerWidth<=640?'calc(76px + env(safe-area-inset-bottom,0px))':'8px')+';z-index:99999;font:11px/1.4 system-ui,sans-serif;padding:3px 8px;border-radius:99px;pointer-events:none;opacity:.85';
      document.body.appendChild(b); }
    b.textContent=t; b.style.background=ok?'#1f7a4d':'#b3261e'; b.style.color='#fff'; b.style.transition='opacity .4s'; b.style.opacity='.9';
    clearTimeout(badge._t); if(ok) badge._t=setTimeout(function(){ b.style.opacity='0'; },3500); }   // Erfolg kurz zeigen, Fehler bleiben stehen
  function typing(){ var a=document.activeElement; return a&&a.matches&&a.matches('input,textarea,select')&&document.visibilityState==='visible'; }
  /* zusammengeführten Stand übernehmen – nur wenn sich lokal seit dem Senden nichts geändert hat */
  function canon(x){ if(x&&typeof x==='object'){ if(Array.isArray(x)) return '['+x.map(canon).join(',')+']';
      return '{'+Object.keys(x).sort().map(function(k){ return JSON.stringify(k)+':'+canon(x[k]); }).join(',')+'}'; } return JSON.stringify(x); }
  function same(a,b){ if(a===b) return true; try{ var A=JSON.parse(a), B=JSON.parse(b); delete A.savedAt; delete B.savedAt; return canon(A)===canon(B); }catch(e){ return false; } }
  function takeMerged(k,sent,merged){
    if(!merged||same(merged,sent)) return;
    if(local(k)!==sent) return;                        // inzwischen neu geändert: der nächste Abgleich holt den Rest
    if(typing()){ setTimeout(function(){ if(local(k)===sent) takeMerged(k,sent,merged); },2500); return; }
    try{ origSet.call(LS,k,merged); }catch(e){} last[k]=ts(merged);
    try{ window.dispatchEvent(new StorageEvent('storage',{key:k,newValue:merged})); }catch(e){}
    badge('Pi ↓ aktualisiert',true);
  }
  function push(k,raw,quiet,sync){
    var x=new XMLHttpRequest(); x.open('PUT',API+k+'?e='+EP,!sync); x.setRequestHeader('Content-Type','application/json');
    function done(){ if(x.status===409&&/epoch/.test(x.responseText||'')){ if(!push._r){ push._r=1; badge('Pi wurde wiederhergestellt – lade neu …',true); setTimeout(function(){ location.reload(); },800); } return; }
      if(x.status===200||x.status===409){ last[k]=Math.max(last[k]||0,ts(raw));
        if(isL(k)&&x.status===200) takeMerged(k,raw,x.responseText);
        if(!quiet) badge('Pi ✓ '+new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),true); }
      else if(!quiet) badge('Pi ✗ nicht gespeichert',false); }
    if(sync){ try{ x.send(raw); done(); }catch(e){} return; }
    x.onload=done; x.onerror=function(){ if(!quiet) badge('Pi offline – nur lokal',false); };
    x.send(raw);
  }
  function pull(k,sync,cb){
    var x=new XMLHttpRequest(); x.open('GET',API+k+'?t='+Date.now(),!sync);
    function done(){ if(x.status!==200) return cb&&cb(null); cb&&cb(x.responseText); }
    if(sync){ try{ x.send(); done(); }catch(e){ cb&&cb(undefined); } }
    else { x.onload=done; x.onerror=function(){ cb&&cb(undefined); }; x.send(); }
  }
  // 1) Beim Start (synchron, vor der App): neuesten Stand holen
  KEYS.forEach(function(k){
    var loc=local(k);
    if(isL(k)&&loc&&!isRO(k)){ push(k,loc,true,true); okStart=true; return; }   // Liste: lokalen Stand einbringen, zusammengeführten übernehmen
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
    origSet.call(this,k,v);
    if(this===LS&&KEYS.indexOf(k)>=0){ clearTimeout(timers[k]); timers[k]=setTimeout(function(){ push(k,v); },600); }
  };
  // 3) Änderungen von anderen Geräten übernehmen (beim Zurückkehren + alle 20 s)
  function check(){
    KEYS.forEach(function(k){
      if(isL(k)&&!isRO(k)){ var v=local(k); if(v) return push(k,v,true); }
      pull(k,false,function(srv){
        if(!srv) return; var s=ts(srv), l=ts(local(k));
        if(s>l||(isRO(k)&&srv!==local(k))){ if(typing()) return; // nicht mitten im Tippen
          try{ origSet.call(LS,k,srv); }catch(e){} last[k]=s;
          try{ window.dispatchEvent(new StorageEvent('storage',{key:k,newValue:srv})); }catch(e){}
          badge('Pi ↓ aktualisiert',true); }
      });
    });
  }
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') check(); });
  window.addEventListener('focus',check);
  setInterval(function(){ if(document.visibilityState==='visible') check(); },20000);
  window.addEventListener('pagehide',function(){ KEYS.forEach(function(k){ var v=local(k); if(v&&!isRO(k)&&(isL(k)||ts(v)>(last[k]||0))&&navigator.sendBeacon){ /* Beacon kann kein PUT – POST-Fallback */ navigator.sendBeacon(API+k+'?e='+EP,new Blob([v],{type:'application/json'})); } }); });
})();
