"use strict";
window.RKBOPostseason=(()=>{
 const TEAM_NAMES={
  KIA:"KIA",기아:"KIA",한화:"HAN",HAN:"HAN",삼성:"SAM",SAM:"SAM",
  롯데:"LOT",LOT:"LOT",LG:"LG",두산:"DOO",DOO:"DOO",SSG:"SSG",
  NC:"NC",SK:"SK",KT:"KT",키움:"KIW",KIW:"KIW"
 };
 const HEADERS={
  POS:"POS",G:"G",AVG:"AVG",OBP:"OBP",SLG:"SLG",AB:"AB",H:"H","2B":"2B","3B":"3B",
  HR:"HR",R:"R",RBI:"RBI",BB:"BB",K:"K",SB:"SB",CS:"CS",ERA:"ERA",W:"W",L:"L",
  S:"SV",SV:"SV",BS:"BS",GS:"GS",CG:"CG",SHO:"SHO",IP:"IP",BK:"BK",WP:"WP",ER:"ER"
 };
 function team(value){return TEAM_NAMES[String(value??"").trim().toUpperCase()]||null}
 function name(value){const s=String(value||"").trim().replace(/\s+/g," ");const m=s.match(/^(.*?)\s*,\s*(.*?)$/);return m?(m[2]+" "+m[1]).trim():s}
 function signature(value){
  return name(value).normalize("NFKC").toLowerCase().replace(/[^a-z0-9가-힣]/g,"");
 }
 function identifiers(value){
  const input=name(value);
  const pieces=input.split(/\s+/);
  const keys=new Set([signature(input)]);
  if(pieces.length===2)keys.add(signature(pieces[1]+" "+pieces[0]));
  return [...keys].filter(Boolean);
 }
 function cleanHtml(cell){
  return String(cell||"").replace(/<[^>]*>/g,"").replace(/&nbsp;/gi," ")
   .replace(/&amp;/gi,"&").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)))
   .replace(/\s+/g," ").trim();
 }
 function parseMajorLeagueHtml(html,teamCode,season){
  const year=1950+Number(season);
  if(!Number.isInteger(year)||year<1951||year>2949)throw Error("포스트시즌 차수는 1~999 사이의 정수여야 합니다.");
  if(!team(teamCode))throw Error("지원되지 않는 포스트시즌 팀: "+teamCode);
  // The literal season printed inside HHRecord HTML (frequently '2002') is intentionally ignored.
  const start=html.search(/Major\s+League\s+roster/i);
  if(start<0)throw Error("Major League roster 섹션을 찾지 못했습니다.");
  const next=html.slice(start).search(/<a\s+name\s*=\s*["']?(?:AAA|AA|A)["']?/i);
  const major=next<0?html.slice(start):html.slice(start,start+next);
  const records=[];
  const tables=[...major.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];
  for(const table of tables){
   const rows=[...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map(row=>[...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>cleanHtml(x[1])))
    .filter(row=>row.length);
   if(rows.length<2)continue;
   const header=rows[0].map(x=>x.toUpperCase());
   const kind=header.includes("ERA")?"pitcher":header.includes("POS")?"batter":null;
   if(!kind||header[0]!=="NAME")continue;
   for(const row of rows.slice(1)){
    const playerName=name(row[0]);if(!playerName)continue;
    const stats={};
    for(let i=1;i<header.length;i++){
     const key=HEADERS[header[i]];if(!key)continue;
     if(row[i]!==undefined&&row[i]!=="")stats[key]=row[i];
    }
    if(!stats.G||Number(stats.G)<=0)continue;
    records.push({kind,name:playerName,team:team(teamCode),year,
      stats,source:"postseason-zip"});
   }
  }
  return records;
 }
 function parseWorkbook(buffer){
  if(!window.XLSX)throw Error("XLSX 처리 모듈을 불러오지 못했습니다.");
  const wb=window.XLSX.read(buffer,{type:"array"});
  const entries=[];
  let found=0;
  for(const sheetName of wb.SheetNames){
   if(!/^(타자|투수)_전체 기록\(포시\)/.test(sheetName))continue;
   const ws=wb.Sheets[sheetName];
   const rows=window.XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null,blankrows:false});
   if(rows.length<2)continue;
   const h=rows[0].map(x=>String(x??"").trim().toUpperCase());
   const kind=sheetName.startsWith("투수")?"pitcher":"batter";
   if(h[0]!=="소속팀"||h[1]!=="시즌"||h[2]!=="이름")continue;
   found++;
   for(const row of rows.slice(1)){
    const season=Number(row[1]),playerName=name(row[2]),t=team(row[0]);
    if(!t||!Number.isInteger(season)||season<1||season>999||!playerName)continue;
    const stats={};
    for(let i=3;i<h.length;i++){
     const key=HEADERS[h[i]];
     if(key&&row[i]!==null&&row[i]!==undefined&&String(row[i]).trim()!=="")
      stats[key]=String(row[i]).trim();
    }
    if(!stats.G||Number(stats.G)<=0)continue;
    entries.push({kind,name:playerName,team:t,year:1950+season,
      stats,source:"postseason-xlsx"});
   }
  }
  if(found!==2||!entries.length)
   throw Error("타자_전체 기록(포시) / 투수_전체 기록(포시) 탭을 찾지 못했습니다.");
  return entries;
 }
 function matchPlayer(players,rec){
  const desired=new Set(identifiers(rec.name));
  let exact=[];
  for(const p of Object.values(players)){
   if(p.kind!==rec.kind)continue;
   const aliases=[p.name,...(p.aliases||[]),...(p.postAliases||[])];
   if(aliases.some(a=>identifiers(a).some(k=>desired.has(k))))exact.push(p);
  }
  if(exact.length===1)return {player:exact[0]};
  // When no known player matches or more than one does, do not guess.
  return {player:null,ambiguous:exact.length>1};
 }
 function merge(players,entries){
  const result={...players},counts={newPlayers:0,matched:0,added:0,updated:0,ambiguous:0,conflicts:0,skipped:0};
  for(const item of entries){
   if(!item||!item.team||!item.year||!item.kind||!item.name||!item.stats) {counts.skipped++;continue}
   const matched=matchPlayer(result,item);
   if(matched.ambiguous){counts.ambiguous++;counts.skipped++;continue}
   const canonical="ps:"+item.kind+":"+signature(item.name);
   const p=matched.player||result[canonical]||{
    id:canonical,name:item.name,kind:item.kind,team:item.team,
    number:"",seasons:{},postSeasons:{},postAliases:[],career:null,last3:null,latestYear:0,postLatestYear:0,
    source:"postseason-only"
   };
   if(matched.player)counts.matched++;
   else if(!result[canonical])counts.newPlayers++;
   const seasons={...(p.postSeasons||{})};
   const previous=seasons[item.year];
   // Preserve historical team when the new file does not provide one.
   if(previous&&previous.team&&previous.team!==item.team){counts.conflicts++;counts.skipped++;continue}
   if(previous){counts.updated++}else counts.added++;
   seasons[item.year]={year:item.year,team:item.team,stats:item.stats,
      source:item.source};
   const synthetic=p.id.startsWith("ps:");
   const oldLatest=p.postLatestYear||0;
   result[p.id]={...p,postSeasons:seasons,
    postLatestYear:Math.max(oldLatest,item.year),
    postAliases:[...new Set([...(p.postAliases||[]),item.name])],
    team:synthetic&&item.year>=oldLatest?item.team:(p.team||item.team)};
  }
  return {players:result,counts};
 }

 function relink(players){
  const result={...players};
  let linked=0;
  for(const [id,orphan] of Object.entries(result)){
   if(!id.startsWith("ps:"))continue;
   const regular=Object.fromEntries(Object.entries(result).filter(([key])=>!key.startsWith("ps:")));
   const match=matchPlayer(regular,orphan);
   if(!match.player)continue;
   const p=match.player;
   const postSeasons={...(orphan.postSeasons||{}),...(p.postSeasons||{})};
   result[p.id]={...p,postSeasons,
    postAliases:[...new Set([...(orphan.postAliases||[]),...(p.postAliases||[]),orphan.name])]};
   delete result[id];linked++;
  }
  return {players:result,linked};
 }
 function statsFor(player){
  return Object.values(player?.postSeasons||{}).filter(r=>r&&r.year)
   .sort((a,b)=>a.year-b.year);
 }
 return {parseMajorLeagueHtml,parseWorkbook,merge,relink,matchPlayer,name,signature,identifiers,team,statsFor};
})();