/* Ernährung → Dashboard-Kachel: Farben wie in der App und Schnellaktion „+250 ml“.
   Die Ernährungs-Datei bleibt unverändert: das Addon ergänzt nur die Kurzinfo, die die App selbst an /api/sum_essen schickt. */
(function(){
  if(!window.__PI_SYNC||typeof window.fetch!=='function') return;
  var COL={'P':'#2C7BD6','KH':'#D99318','F':'#B4567F'}, WATER='#2E9BB5', last=null;
  function decorate(s){
    if(!s||s.v!==1) return s;
    var hi=-1;
    (s.balken||[]).forEach(function(b,i){ if(COL[b.l]) b.farbe=COL[b.l]; if(/^H/.test(b.l)){ b.farbe=WATER; hi=i; } });
    if(s.ring2) s.ring2.farbe=WATER;
    /* Schnellaktion: das Dashboard legt einen Wasser-Eintrag an (Sammlung „water“, Sync-Modus „liste“ führt ihn zusammen) */
    var plus=[]; if(s.ring2) plus.push(['ring2.wert',0.25]); if(hi>=0) plus.push(['balken.'+hi+'.wert',0.25]);
    s.aktionen=[{l:'+250 ml',titel:'Ein Glas Wasser eintragen',key:'ernaehrung_v1',coll:'water',pre:'w',item:{ml:250},plus:plus}];
    return s;
  }
  var orig=window.fetch;
  window.fetch=function(u,o){
    try{ if(typeof u==='string'&&u.indexOf('/api/sum_essen')===0&&o&&o.method==='PUT'&&typeof o.body==='string'){
      var s=decorate(JSON.parse(o.body)); last=s; o=Object.assign({},o,{body:JSON.stringify(s)}); } }catch(e){}
    return orig.call(this,u,o);
  };
  window.__dashSum=function(){ try{ if(!last&&typeof pushSum==='function') pushSum(); }catch(e){} return last; };
  setTimeout(function(){ try{ if(typeof pushSum==='function') pushSum(); }catch(e){} },1500);

  /* Archiv: auf dem Gerät liegen nur die letzten Tage, der Rest auf dem Pi. Die Sicherung aus der App („Backup“)
     holt deshalb den vollständigen Stand vom Pi und ergänzt noch nicht gesendete Änderungen dieses Geräts. */
  var KEY='ernaehrung_v1', AR=(window.__PI_ARCHIV||{})[KEY];
  if(!AR) return;
  function msg(m){ try{ if(typeof toast==='function') return toast(m,4000); }catch(e){} }
  function save(txt){ var d=new Date(), k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    var b=new Blob([txt],{type:'application/json'}), u=URL.createObjectURL(b), a=document.createElement('a'); a.href=u; a.download='ernaehrung_'+k+'.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(u); },1000); }
  document.addEventListener('click',function(e){ var t=e.target&&e.target.closest&&e.target.closest('[data-exp]'); if(!t) return;
    e.preventDefault(); e.stopImmediatePropagation();
    var loc=null; try{ loc=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
    fetch('/api/'+KEY+'?alles=1&t='+Date.now(),{credentials:'same-origin'}).then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
      .then(function(x){ if(loc) Object.keys(loc).forEach(function(c){ var v=loc[c], s=x[c];
          if(v&&typeof v==='object'&&!Array.isArray(v)&&s&&typeof s==='object') Object.keys(v).forEach(function(id){ var it=v[id], o=s[id];
            if(it&&typeof it==='object'&&'upd' in it&&(!o||(+it.upd||0)>(+o.upd||0))) s[id]=it; }); });
        save(JSON.stringify(x,null,1)); msg('Backup gespeichert – vollständig vom Pi'); })
      .catch(function(){ if(loc) save(JSON.stringify(loc,null,1)); msg('Pi nicht erreichbar – Backup enthält nur die letzten '+AR.tage+' Tage'); });
  },true);
})();
