/* Gemeinsame Schicht für alle Tools auf dem Pi (wird vom Server in den <head> jeder Tool-Seite eingefügt).
   - html[data-app] setzen (für shell.css)
   - Home-Knopf zum Dashboard in Tools, die keinen haben
   - Hell/Dunkel: ein Wechsel in einem Tool gilt für alle Tools und das Dashboard
   Die Tool-Dateien bleiben unverändert. Fehlt etwas Erwartetes, passiert nichts. */
(function(){
  var MAP={semesterplaner:'planer',notencockpit:'noten',aufgaben:'aufgaben',ernaehrung:'essen',haushaltsbuch:'haushalt',training:'training'};
  var file=(location.pathname.split('/').pop()||'').replace(/\.html?$/i,'').toLowerCase();
  var app=MAP[file]||file.replace(/[^a-z0-9]/g,'')||'tool';
  var root=document.documentElement; root.setAttribute('data-app',app);
  var KEYS=['launcher_theme','sp_theme','cockpit_theme','aufg_theme','essen_theme','haushalt_theme','training_theme'];

  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn(); }
  var HOME='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-8 9 8M5 10v10h14V10"/></svg>';

  ready(function(){
    try{
      var hdr=document.querySelector('header');
      if(hdr&&!document.getElementById('homeBtn')&&!hdr.querySelector('.pdhome')){
        var a=document.createElement('a'); a.href='/'; a.className='ibtn pdhome'; a.title='Zum Dashboard'; a.setAttribute('aria-label','Zum Dashboard'); a.innerHTML=HOME;
        /* direkt hinter den Titel: am Handy steht er so in der Titelzeile, die Knopfleiste darunter behält ihren Platz */
        var brand=hdr.querySelector('.brand');
        if(brand&&brand.parentNode===hdr) hdr.insertBefore(a,brand.nextSibling); else hdr.appendChild(a);
      }
    }catch(e){}
    /* Theme: nach einem Klick auf den Theme-Knopf (oder die Auswahl in den Einstellungen) den Stand für alle Tools merken */
    document.addEventListener('click',function(e){
      var t=e.target&&e.target.closest&&e.target.closest('#themeBtn,[data-theme-set]'); if(!t) return;
      setTimeout(function(){ try{
        var th=root.getAttribute('data-theme');
        if(t.getAttribute('data-theme-set')==='system'||!th) KEYS.forEach(function(k){ localStorage.removeItem(k); });
        else if(th==='dark'||th==='light') KEYS.forEach(function(k){ localStorage.setItem(k,th); });
      }catch(_){} },0);
    });
  });
})();
