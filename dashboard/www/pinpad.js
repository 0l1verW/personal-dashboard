/* =====================================================================
   PIN-Eingabe wie der iPhone/iPad-Sperrbildschirm (für Anmelden, Dashboard, Verwaltung)
   PinPad(el, {title, sub, len, head, foot, cancel, onDone(pin)->true|"Fehlertext"|Promise, onCancel})
     len = bekannte Länge → meldet bei der letzten Ziffer automatisch; 0 → OK-Taste (4–8 Ziffern)
   PinPad.setup(el, {needAlt:'pin'|'pw'|null, altLen, defLen, onSave(neu,alt)->Promise<true|'alt'|"Fehlertext">, onCancel})
     Ablauf: bisherige → neue PIN → bestätigen (wie „Code ändern“ auf dem iPhone)
   Keine Eingabefelder → keine Bildschirmtastatur. Hardware-Tastatur: Ziffern, ⌫, Enter, Esc.
   ===================================================================== */
(function(){
  var CSS='.ppd{display:flex;flex-direction:column;align-items:center;width:100%;user-select:none;-webkit-user-select:none}'
   +'.ppd-t{font-size:17px;font-weight:600;text-align:center;color:var(--ink)}'
   +'.ppd-s{font-size:13.5px;color:var(--muted);text-align:center;margin-top:4px;max-width:300px}'
   +'.ppd-dots{display:flex;gap:18px;justify-content:center;height:16px;margin:20px 0 8px}'
   +'.ppd-dots i{width:14px;height:14px;border-radius:50%;border:1.5px solid var(--ink);transition:background .12s}'
   +'.ppd-dots i.on{background:var(--ink)}'
   +'.ppd-dots.shake{animation:ppdshake .45s cubic-bezier(.36,.07,.19,.97)}'
   +'@keyframes ppdshake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-10px)}40%,60%{transform:translateX(10px)}}'
   +'.ppd-err{min-height:1.3em;margin-bottom:10px;color:var(--bad,var(--bad-ink,#C0392B));font-size:13.5px;font-weight:600;text-align:center}'
   +'.ppd-pad{display:grid;grid-template-columns:repeat(3,auto);gap:16px 26px;justify-content:center}'
   +'.ppd-pad button{width:78px;height:78px;border-radius:50%;border:0;padding:0;background:color-mix(in srgb,var(--ink) 9%,transparent);color:var(--ink);cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;'
   +'display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1;transition:background .25s;font-family:inherit}'
   +'.ppd-pad button b{font:400 34px/1 Inter,system-ui,-apple-system,sans-serif}'
   +'.ppd-pad button small{font:700 9.5px/1 Inter,sans-serif;letter-spacing:2px;margin-top:3px;min-height:10px;padding-left:2px}'
   +'.ppd-pad button.pr,.ppd-pad button:active{background:color-mix(in srgb,var(--ink) 28%,transparent);transition:none}'
   +'.ppd-pad .tx{background:none!important;font:500 16px Inter,sans-serif}'
   +'.ppd-pad .tx:disabled{visibility:hidden}'
   +'.ppd-lk{margin-top:16px;background:none;border:0;color:var(--accent);font:600 14.5px Inter,sans-serif;min-height:44px;cursor:pointer;padding:0 10px}'
   +'.ppd-pw{display:flex;flex-direction:column;gap:10px;width:100%;max-width:300px;margin-top:18px}'
   +'.ppd-pw input{width:100%;padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--card2,var(--surface-2));color:var(--ink);font:inherit;font-size:17px;text-align:center}'
   +'.ppd-pw button{min-height:44px;border-radius:12px;border:0;background:var(--accent);color:#fff;font:700 15px Inter,sans-serif;cursor:pointer}'
   +'@media(max-height:640px),(max-width:340px){.ppd-pad button{width:68px;height:68px}.ppd-pad button b{font-size:29px}.ppd-pad{gap:12px 22px}.ppd-dots{margin:14px 0 6px}}'
   +'@media (prefers-reduced-motion:reduce){.ppd-dots.shake{animation:none}}';
  var LET=['','','ABC','DEF','GHI','JKL','MNO','PQRS','TUV','WXYZ'], ACTIVE=null;
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function inject(){ if(document.getElementById('ppd-css')) return; var s=document.createElement('style'); s.id='ppd-css'; s.textContent=CSS; document.head.appendChild(s); }

  function PinPad(el,o){ inject(); var st={pin:'',busy:false}, api={};
    function q(s){ return el.querySelector(s); }
    function draw(){ var len=o.len||0;
      el.innerHTML='<div class="ppd">'+(o.head||'')+'<div class="ppd-t">'+esc(o.title||'PIN eingeben')+'</div>'+(o.sub?'<div class="ppd-s">'+esc(o.sub)+'</div>':'')
        +'<div class="ppd-dots" role="status"></div><div class="ppd-err" role="alert">'+esc(o.err||'')+'</div>'
        +'<div class="ppd-pad" role="group" aria-label="Ziffern">'+[1,2,3,4,5,6,7,8,9].map(function(n){ return '<button type="button" data-k="'+n+'" aria-label="'+n+'"><b>'+n+'</b><small>'+LET[n]+'</small></button>'; }).join('')
        +(len?'<span></span>':'<button type="button" class="tx" data-k="ok">OK</button>')
        +'<button type="button" data-k="0" aria-label="0"><b>0</b><small>+</small></button><button type="button" class="tx" data-k="x"></button></div>'+(o.foot||'')+'</div>';
      o.err=''; dots(); ACTIVE=api; }
    function dots(){ var n=o.len||0, d=q('.ppd-dots'); if(!d) return; var c=Math.max(n||4,st.pin.length);
      d.innerHTML=Array.apply(null,{length:c}).map(function(_,i){ return '<i'+(i<st.pin.length?' class="on"':'')+'></i>'; }).join('');
      d.setAttribute('aria-label',st.pin.length+' Ziffern eingegeben');
      var x=q('[data-k="x"]'); if(x){ x.textContent=st.pin?'Löschen':(o.cancel||'Abbrechen'); x.disabled=!st.pin&&!o.onCancel; }
      var ok=q('[data-k="ok"]'); if(ok) ok.disabled=st.pin.length<4; }
    function err(m){ var e=q('.ppd-err'); if(e) e.textContent=m||''; }
    function fail(m){ st.pin=''; st.busy=false; var d=q('.ppd-dots'); if(d){ d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); } setTimeout(dots,180); err(m); }
    function submit(){ st.busy=true; var p=st.pin;
      Promise.resolve().then(function(){ return o.onDone(p); }).then(function(r){ if(r===true||r==null){ st.busy=false; return; } fail(typeof r==='string'?r:'Falsch'); })
        .catch(function(e){ fail((e&&e.message)||'Fehler'); }); }
    function key(k){ if(st.busy) return; err('');
      if(k==='x'){ if(st.pin){ st.pin=st.pin.slice(0,-1); dots(); } else if(o.onCancel) o.onCancel(); return; }
      if(k==='ok'){ if(st.pin.length>=4) submit(); return; }
      if(st.pin.length>=8) return; st.pin+=k; dots();
      if(o.len&&st.pin.length===o.len) setTimeout(submit,120); }
    if(el.__ppClick) el.removeEventListener('click',el.__ppClick);   // gleicher Behälter, neuer Block
    el.__ppClick=function(e){ var b=e.target.closest('[data-k]'); if(!b||!el.contains(b)||b.disabled) return; e.preventDefault(); e.stopPropagation(); key(b.dataset.k); };
    el.addEventListener('click',el.__ppClick);
    api.key=key; api.el=el; api.fail=fail;
    api.set=function(no){ for(var k in no) o[k]=no[k]; st.pin=''; st.busy=false; draw(); };
    draw(); return api; }

  document.addEventListener('keydown',function(e){ var a=ACTIVE; if(!a||!document.body.contains(a.el)||!a.el.querySelector('.ppd-pad')) return;
    var t=e.target; if(t&&t.matches&&t.matches('input,textarea,select')) return;
    var k=e.key, b=null; if(/^[0-9]$/.test(k)) b=k; else if(k==='Backspace') b='x'; else if(k==='Enter') b='ok'; else if(k==='Escape') b='x';
    if(b==null) return; e.preventDefault(); e.stopPropagation();
    var el=a.el.querySelector('[data-k="'+b+'"]'); if(el){ el.classList.add('pr'); setTimeout(function(){ el.classList.remove('pr'); },110); } a.key(b); },true);

  /* PIN festlegen/ändern: bisherige → neue → bestätigen */
  PinPad.setup=function(el,o){ var len=o.defLen===6?6:4, alt='', neu='', pad=null;
    function opt(){ return '<button type="button" class="ppd-lk" data-ppl="1">'+(len===4?'6-stellige PIN verwenden':'4-stellige PIN verwenden')+'</button>'; }
    function stepAltPw(m){ inject(); ACTIVE=null; pad=null;
      el.innerHTML='<div class="ppd"><div class="ppd-t">Bisheriges Passwort</div><div class="ppd-s">Zum Wechseln auf eine PIN</div><div class="ppd-pw"><input type="password" autocomplete="current-password" aria-label="Bisheriges Passwort">'
        +'<button type="button" data-ppw="1">Weiter</button></div><div class="ppd-err" role="alert" style="margin-top:8px">'+esc(m||'')+'</div>'+(o.onCancel?'<button type="button" class="ppd-lk" data-ppc="1">Abbrechen</button>':'')+'</div>';
      var i=el.querySelector('input'); i.focus(); i.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); go(); } });
      function go(){ if(!i.value) return; alt=i.value; stepNeu(); }
      el.querySelector('[data-ppw]').onclick=go; var c=el.querySelector('[data-ppc]'); if(c) c.onclick=o.onCancel; }
    function stepAlt(m){ pad=PinPad(el,{title:'Bisherige PIN eingeben',len:o.altLen||0,err:m,onCancel:o.onCancel,onDone:function(p){ alt=p; stepNeu(); return true; }}); }
    function stepNeu(m){ var p={title:'Neue PIN eingeben',sub:'Eine '+len+'-stellige PIN',len:len,err:m,foot:opt(),onCancel:o.onCancel,onDone:function(x){ neu=x; stepConf(); return true; }};
      if(pad&&document.body.contains(pad.el)&&pad.el.querySelector('.ppd-pad')) pad.set(p); else pad=PinPad(el,p); }
    function stepConf(){ pad.set({title:'Neue PIN bestätigen',sub:'Gib die PIN noch einmal ein',foot:'',len:len,
      onDone:function(x){ if(x!==neu){ stepNeu('Die PINs stimmen nicht überein. Bitte neu eingeben.'); return true; }
        return Promise.resolve(o.onSave(neu,alt)).then(function(r){ if(r===true) return true;
          if(r==='alt'){ if(o.needAlt==='pw') stepAltPw('Bisheriges Passwort stimmt nicht.'); else stepAlt('Bisherige PIN stimmt nicht.'); return true; }
          stepNeu(typeof r==='string'?r:'Speichern fehlgeschlagen'); return true; }); }}); }
    if(el.__ppSet) el.removeEventListener('click',el.__ppSet);
    el.addEventListener('click',el.__ppSet=function(e){ var b=e.target.closest('[data-ppl]'); if(!b||!el.contains(b)) return; e.preventDefault(); e.stopPropagation(); len=len===4?6:4; stepNeu(); });
    if(o.needAlt==='pin') stepAlt(); else if(o.needAlt==='pw') stepAltPw(); else stepNeu(); };
  window.PinPad=PinPad;
})();
