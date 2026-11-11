/* Notencockpit → Dashboard-Kachel im einheitlichen Format (v:1).
   Ersetzt die alte Kurzinfo {gpa, ects}. Die Cockpit-Datei bleibt unverändert; fehlen ihre Funktionen, passiert nichts. */
(function(){
  if(!window.__PI_SYNC||typeof calc!=='function'||typeof info!=='function') return;
  var TOTAL=180;
  function build(){
    var k=calc(), M=(typeof modules!=='undefined'&&modules)||[], run=[], open=0;
    M.forEach(function(m){ var i=info(m); if(i.runCr>0) run.push(m); else if(i.state==='open') open++; });
    var avg=k.gpa!=null?(typeof fmtOff==='function'?fmtOff(k.gpa):String(Math.floor(k.gpa*10)/10).replace('.',',')):'–';
    var best=k.bestG!=null?k.bestG.toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1}):null;
    var Z=run.slice(0,4).map(function(m){ return {t:m.short||m.n,sub:'läuft · '+m.cr+' ECTS'}; });
    if(!Z.length){
      if(best) Z.push({t:'Beste Note',sub:best});
      Z.push({t:'Noch bis zum Abschluss',sub:Math.max(0,TOTAL-Math.round(k.passedCredits))+' ECTS'});
      if(k.rem>0) Z.push({t:'Benotete Credits offen',sub:Math.round(k.rem)+' ECTS'});
    }
    return {v:1,savedAt:Date.now(),
      zahl:{wert:avg,label:'Notenschnitt'},
      ring:{wert:Math.round(k.passedCredits*10)/10,von:TOTAL,label:'ECTS'},
      zaehler:{bestanden:k.passedCount,laufend:run.length,offen:open},
      zeilen:Z, leer:'Noch keine Noten eingetragen'};
  }
  window.__dashSum=function(){ try{ return build(); }catch(e){ return null; } };
  /* pushSum() des Cockpits (wird nach jedem Speichern aufgerufen) durch die v1-Fassung ersetzen */
  window.pushSum=function(){ var s=window.__dashSum(); if(!s) return;
    try{ fetch('/api/sum_noten',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(s)}).catch(function(){}); }catch(e){} };
  setTimeout(window.pushSum,1500);
})();
