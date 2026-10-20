"use strict";
window.RKBOPlayerFilter=(()=>{
  // YEAR is stored as season + 1950 (e.g. 2010 = 60차).
  function latestSeason(players){
    let latest=0;
    for(const p of Object.values(players||{})){
      for(const year of Object.keys(p.seasons||{})){
        const n=Number(year);
        if(Number.isInteger(n)&&n>latest)latest=n;
      }
    }
    return latest;
  }
  function participatedIn(p,year){
    return !!year&&Object.prototype.hasOwnProperty.call(p?.seasons||{},String(year));
  }
  function list(players,{team="ALL",query="",includeRetired=false,year=latestSeason(players)}={}){
    const term=String(query).trim().toLowerCase();
    return Object.values(players||{}).filter(p=>
      (includeRetired||participatedIn(p,year)) &&
      (team==="ALL"||p.team===team) &&
      (String(p.name||"").toLowerCase().includes(term)||String(p.id||"").toLowerCase().includes(term)||
        (p.aliases||[]).some(a=>String(a).toLowerCase().includes(term)))
    ).sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"ko"));
  }
  return {latestSeason,participatedIn,list};
})();