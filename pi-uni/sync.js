/* Pi-Sync: spiegelt den App-Speicher (localStorage) auf den Raspberry Pi.
   Wird vom Server automatisch in jede HTML-Seite eingefügt – die Apps selbst bleiben unverändert. */
(function(){
  window.__PI_SYNC=true;
  var KEYS=['semesterplaner_ws2627_v1','bsc_informatik_cockpit_v2'];
  var API='/api/';
  var okStart=false, LS=window.localStorage, origSet=Storage.prototype.setItem, timers={}, last={};
  function ts(raw){ try{ var x=JSON.parse(raw); return (x&&+x.savedAt)||0; }catch(e){ return 0; } }
  function local(k){ try{ return LS.getItem(k); }catch(e){ return null; } }
  function badge(t,ok){ var b=document.getElementById('__piSync'); if(!b){ if(!document.body) return; b=document.createElement('div'); b.id='__piSync';
      b.style.cssText='position:fixed;left:8px;bottom:'+(innerWidth<=640?'calc(76px + env(safe-area-inset-bottom,0px))':'8px')+';z-index:99999;font:11px/1.4 system-ui,sans-serif;padding:3px 8px;border-radius:99px;pointer-events:none;opacity:.85';
      document.body.appendChild(b); }
    b.textContent=t; b.style.background=ok?'#1f7a4d':'#b3261e'; b.style.color='#fff'; }
  function push(k,raw){
    var x=new XMLHttpRequest(); x.open('PUT',API+k,true); x.setRequestHeader('Content-Type','application/json');
    x.onload=function(){ if(x.status===200||x.status===409){ last[k]=Math.max(last[k]||0,ts(raw)); badge('Pi ✓ '+new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),true);} else badge('Pi ✗ nicht gespeichert',false); };
    x.onerror=function(){ badge('Pi offline – nur lokal',false); };
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
    pull(k,true,function(srv){
      if(srv===undefined){ setTimeout(function(){badge('Pi offline – nur lokal',false);},500); return; }
      var loc=local(k), s=srv?ts(srv):0, l=loc?ts(loc):0;
      if(s>l){ try{ origSet.call(LS,k,srv); }catch(e){} last[k]=s; }
      else if(l>s){ push(k,loc); }   // offline geänderter Stand -> hochladen
      else last[k]=s;
      okStart=true;
    });
  });
  function hello(){ if(okStart) badge('Pi ✓ verbunden',true); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',hello); else hello();
  // 2) Jede Speicherung der App an den Pi senden (gebündelt)
  Storage.prototype.setItem=function(k,v){
    origSet.call(this,k,v);
    if(this===LS&&KEYS.indexOf(k)>=0){ clearTimeout(timers[k]); timers[k]=setTimeout(function(){ push(k,v); },600); }
  };
  // 3) Änderungen von anderen Geräten übernehmen (beim Zurückkehren + alle 20 s)
  function check(){
    KEYS.forEach(function(k){
      pull(k,false,function(srv){
        if(!srv) return; var s=ts(srv), l=ts(local(k));
        if(s>l){ var a=document.activeElement; if(a&&a.matches&&a.matches('input,textarea,select')&&document.visibilityState==='visible') return; // nicht mitten im Tippen
          try{ origSet.call(LS,k,srv); }catch(e){} last[k]=s;
          try{ window.dispatchEvent(new StorageEvent('storage',{key:k,newValue:srv})); }catch(e){}
          badge('Pi ↓ aktualisiert',true); }
      });
    });
  }
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') check(); });
  window.addEventListener('focus',check);
  setInterval(function(){ if(document.visibilityState==='visible') check(); },20000);
  window.addEventListener('pagehide',function(){ KEYS.forEach(function(k){ var v=local(k); if(v&&ts(v)>(last[k]||0)&&navigator.sendBeacon){ /* Beacon kann kein PUT – POST-Fallback */ navigator.sendBeacon(API+k,new Blob([v],{type:'application/json'})); } }); });
})();
