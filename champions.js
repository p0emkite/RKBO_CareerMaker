"use strict";
window.RKBOChampions=(()=>{
 const DEFAULT={"22":"DOO","23":"KIW","24":"LOT","25":"SAM","26":"SAM","27":"KIW","28":"LG","29":"KIA","30":"DOO","31":"SAM","32":"SAM","33":"NC","34":"NC","35":"LOT","36":"SAM","37":"LOT","38":"HAN","39":"SAM","40":"LOT","41":"KT","42":"LOT","43":"LG","44":"SSG","45":"SAM","46":"DOO","47":"DOO","48":"NC","49":"SSG","50":"KIA","51":"SAM","52":"SAM","53":"KIA","54":"KIA","55":"LOT","56":"KIA","57":"SAM","58":"KIA","59":"KIA","60":"KIA"};
 const TEAM_NAMES={
  KIA:"KIA",기아:"KIA",한화:"HAN",HAN:"HAN",삼성:"SAM",SAM:"SAM",
  롯데:"LOT",LOT:"LOT",LG:"LG",두산:"DOO",DOO:"DOO",SSG:"SSG",
  NC:"NC",SK:"SK",KT:"KT",키움:"KIW",KIW:"KIW"
 };
 function mapTeam(raw){return TEAM_NAMES[String(raw||"").replace(/\*\*/g,"").trim().toUpperCase()]||null}
 function parse(text){
  const map={},errors=[];const lines=String(text||"").split(/\r?\n/);
  for(let i=0;i<lines.length;i++){
   const line=lines[i].trim();
   if(!line||/^\|?\s*:?-+:?\s*\|/.test(line)||/^#/.test(line))continue;
   const normalized=line.replace(/\*\*/g,"").replace(/`/g,"");
   const cells=normalized.includes("|")
     ?normalized.split("|").map(x=>x.trim()).filter(Boolean)
     :normalized.split(/[,;\t]/).map(x=>x.trim()).filter(Boolean);
   if(cells.length<2){
    if(!/^시즌/.test(normalized))errors.push((i+1)+"행: "+line);
    continue;
   }
   if(/시즌|팀명/.test(cells[0]))continue;
   const yearMatch=cells[0].match(/^(\d{1,3})\s*차?$/);
   const team=mapTeam(cells[1]);
   if(!yearMatch||!team){errors.push((i+1)+"행: "+line);continue}
   const year=Number(yearMatch[1]);if(year<1||year>999){errors.push((i+1)+"행: "+line);continue}
   if(map[year]&&map[year]!==team){errors.push((i+1)+"행: 같은 시즌 우승팀 중복");continue}
   map[year]=team;
  }
  return {map,errors,count:Object.keys(map).length};
 }
 function format(map){const names={KIA:"KIA",HAN:"한화",SAM:"삼성",LOT:"롯데",LG:"LG",DOO:"두산",SSG:"SSG",NC:"NC",SK:"SK",KT:"KT",KIW:"키움"};
  return Object.entries(map||{}).sort((a,b)=>Number(b[0])-Number(a[0])).map(([yr,team])=>yr+","+ (names[team]||team)).join("\n");
 }
 return {DEFAULT,mapTeam,parse,format};
})();