/* =====================================================================
   Dashboard-Kurzinfo für den Semesterplaner (Vorschau-Vertrag v1)
   Wird vom Pi-Server an Semesterplaner.html angehängt (apps.json → "addon").
   Der Planer lädt seine Kurzinfo selbst hoch (pushICS → PUT /api/sum_planer);
   dieser Zusatz ersetzt dabei nur den Inhalt durch das neue Format:
   - zeilen: Reihenfolge wie „Als Nächstes“ (Frist vorbei → laufende → als Nächstes erscheinende → fertig)
   - termine: alle Blätter ±6 Wochen mit Status (sc) für farbige Punkte pro Tag, dazu Klausuren und Termine
   Die Planer-Datei selbst bleibt unverändert.
   ===================================================================== */
(function(){
  if(typeof allSheets!=='function'||typeof stLabel!=='function') return;   // anderer Planer-Stand → nichts tun
  var SC=function(s){ return s.free&&s.s>=2?'s2':s.f?'sf':s.w?'sw':'s'+s.s; };
  function build(){
    var now=new Date(), sh=allSheets();
    var late=overdueOpen(), todo=sh.filter(function(s){ return s.due>now&&s.s<2&&!s.f; }), fin=sh.filter(function(s){ return s.due>now&&s.s<2&&s.f; });
    var nx=todo.filter(function(s){ return s.released; }).sort(function(a,b){ return a.due-b.due; })
      .concat(todo.filter(function(s){ return !s.released; }).sort(function(a,b){ return a.rel-b.rel||a.due-b.due; }));
    var row=function(s,isLate){ return {t:s.c.short+' · Blatt '+s.no, due:s.due.getTime(), farbe:s.c.color,
      st:isLate?'Frist vorbei':stLabel(s), sc:isLate?'late':SC(s), ton:isLate?'bad':'',
      sub:!s.released&&s.due>now?'erscheint '+fD(s.rel):undefined}; };
    var zeilen=late.map(function(s){ return row(s,true); }).concat(nx.map(function(s){ return row(s); }),fin.map(function(s){ return row(s); })).slice(0,8);
    var from=addDays(sod(now),-1), to=addDays(sod(now),42), termine=[];
    sh.forEach(function(s){ if(s.due<from||s.due>=to) return; var lt=s.s<2&&!s.free&&s.due<now;
      termine.push({t:s.c.short+' · Blatt '+s.no, due:s.due.getTime(), datum:iso(s.due), farbe:s.c.color, sc:lt?'late':SC(s), st:lt?'Frist vorbei':stLabel(s), done:s.s>=2}); });
    CS().forEach(function(c){ var d=c.exam&&!c.exam.none?dt(c.exam.date,c.exam.time):null; if(d&&d>=from&&d<addDays(sod(now),150))
      termine.push({t:'Klausur '+c.short, due:d.getTime(), datum:iso(d), farbe:c.color, sc:'ex', st:'Klausur'}); });
    (S().events||[]).forEach(function(e){ var d=dt(e.date,e.time); if(d&&d>=from&&d<to)
      termine.push({t:e.title, due:d.getTime(), datum:iso(d), farbe:(C(e.cid)||{}).color||'#5B4BE0', sc:'ev', st:'Termin'}); });
    return {v:1, savedAt:Date.now(), zeilen:zeilen, termine:termine, leer:sh.length?'Alles bearbeitet':'Noch keine Übungsblätter'};
  }
  var f0=window.fetch.bind(window);
  window.fetch=function(u,o){
    try{ if(typeof u==='string'&&u.indexOf('/api/sum_planer')===0&&o&&o.method==='PUT') o=Object.assign({},o,{body:JSON.stringify(build())}); }catch(e){}
    return f0(u,o); };
  window.__planerSum=window.__dashSum=build;   // das Dashboard holt sich hierüber die Vorschau (unsichtbar geladen)
})();
