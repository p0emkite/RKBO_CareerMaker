"use strict";
window.RKBOReference=(()=>{
 const normalize=v=>String(v??"").normalize("NFKC").trim().replace(/\s+/g," ").toLowerCase();
 const key=v=>normalize(v).replace(/[^a-z0-9가-힣]+/g,"");
 const englishVariants=name=>{
  const raw=String(name||"").trim(), variants=[key(raw)];
  const m=raw.match(/^(.*?)\s*,\s*(.*?)$/);
  if(m){variants.push(key(m[2]+" "+m[1]));variants.push(key(m[1]+" "+m[2]))}
  return [...new Set(variants.filter(Boolean))];
 };
 function parseCSV(text){
  const rows=[];let row=[],field="",quoted=false;
  const s=String(text||"").replace(/^\uFEFF/,"");
  for(let i=0;i<s.length;i++){
   const c=s[i];
   if(quoted){
    if(c==='"'&&s[i+1]==='"'){field+='"';i++}
    else if(c==='"')quoted=false;
    else field+=c;
   }else if(c==='"'&&field==="")quoted=true;
   else if(c===","){row.push(field);field=""}
   else if(c==="\n"||c==="\r"){
    if(c==="\r"&&s[i+1]==="\n")i++;
    row.push(field);field="";
    if(row.some(v=>v.trim()!==""))rows.push(row);
    row=[];
   }else field+=c;
  }
  row.push(field);if(row.some(v=>v.trim()!==""))rows.push(row);
  if(!rows.length)return [];
  const header=rows.shift().map(x=>x.trim());
  return rows.map(r=>Object.fromEntries(header.map((h,i)=>[h,(r[i]??"").trim()])));
 }
 let loaded=false,records=[],roster=[],byEnglish=new Map(),koreanEnglish=new Map(),jerseys=new Map();
 let summary={names:0,englishUnique:0,jerseyRows:0,matchedJerseys:0,unmatched:[],unnamed:0};
 function register(){
  byEnglish=new Map();koreanEnglish=new Map();jerseys=new Map();
  for(const r of records){
   if(!r.Name||!r.KoreanName)continue;
   const english=englishVariants(r.Name);
   for(const variant of english){
    if(!byEnglish.has(variant))byEnglish.set(variant,[]);
    byEnglish.get(variant).push(r);
   }
   const kr=key(r.KoreanName);
   if(!koreanEnglish.has(kr))koreanEnglish.set(kr,new Set());
   koreanEnglish.get(kr).add(english[0]);
  }
  for(const r of roster){
   if(!r["이름"])continue;
   const kr=key(r["이름"]);
   if(!jerseys.has(kr))jerseys.set(kr,new Set());
   jerseys.get(kr).add(String(r["등번호"]||"").trim());
  }
  const missing=roster.filter(r=>r["이름"]&&!koreanEnglish.has(key(r["이름"])));
  summary={
   names:records.length,
   englishUnique:new Set(records.map(r=>englishVariants(r.Name)[0]).filter(Boolean)).size,
   jerseyRows:roster.length,
   matchedJerseys:roster.filter(r=>r["이름"]&&koreanEnglish.has(key(r["이름"]))).length,
   unmatched:missing,
   unnamed:roster.filter(r=>!r["이름"]).length
  };
  loaded=true;
 }
 async function load(){
  const files=["./data/player_db.csv","./data/jersey_60.csv"];
  const [a,b]=await Promise.all(files.map(async url=>{
   const res=await fetch(url,{cache:"no-store"});
   if(!res.ok)throw Error(url+" 로드 실패 ("+res.status+")");
   return await res.text();
  }));
  records=parseCSV(a);roster=parseCSV(b);
  register();
  return summary;
 }
 function findName(player){
  if(!player)return null;
  const english=[player.name,...(player.aliases||[])];
  let candidates=[];
  for(const name of english){
   const arr=byEnglish.get(key(name))||[];
   candidates.push(...arr);
  }
  if(!candidates.length)return null;
  const unique=new Map();
  for(const r of candidates){
   const id=key(r.KoreanName);
   if(!unique.has(id))unique.set(id,[]);
   unique.get(id).push(r);
  }
  if(unique.size===1)return candidates[0].KoreanName;
  // If English names conflict, require explicit season/team corroboration.
  const yr=Object.keys(player.seasons||{}).map(Number);
  const matching=candidates.filter(r=>Number(r.Season)===60&&yr.includes(2010)&&
    (!r.Team||r.Team===player.seasons?.[2010]?.team));
  const uniq=new Set(matching.map(r=>key(r.KoreanName)));
  return uniq.size===1?matching[0].KoreanName:null;
 }
 function jerseyFor(player,korean){
  if(!player||!korean||!Object.prototype.hasOwnProperty.call(player.seasons||{},"2010"))return null;
  const kr=key(korean),numbers=jerseys.get(kr),english=koreanEnglish.get(kr);
  // Same Korean nickname on different English players is not safe to assign without a team column.
  if(!numbers||numbers.size!==1||!english||english.size!==1)return null;
  const result=[...numbers][0];
  return result!==""?result:null;
 }
 function get(player){
  const baseName=findName(player),koreanName=String(player?.koreanNameOverride||"").trim()||baseName||null;
  const baseNumber=jerseyFor(player,koreanName);
  const override=String(player?.numberOverride??"").trim();
  return {
   englishName:player?.name||"",
   koreanName,
   displayName:koreanName||player?.name||"",
   number:override||baseNumber||String(player?.number||""),
   nameFromDB:!!baseName,
   jerseyFromCSV:!!baseNumber,
   manualKorean:!!String(player?.koreanNameOverride||"").trim(),
   manualNumber:!!override,
   matched:!!baseName
  };
 }
 function stats(){return {...summary,unmatched:summary.unmatched.slice()}}
 return {parseCSV,load,findName,jerseyFor,get,stats,englishVariants,isLoaded:()=>loaded};
})();