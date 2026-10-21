"use strict";
window.RKBORankings=(()=>{
 const KEY_MAP={
  AVG:"AVG",AVERAGE:"AVG",OBP:"OBP",SLG:"SLG",OPS:"OPS",
  HITS:"H",H:"H","2B":"2B","3B":"3B",HR:"HR",HOMERUNS:"HR",HOMERS:"HR",
  BB:"BB",WALKS:"BB",SO:"K",K:"K",STRIKEOUTS:"K",R:"R",RUNS:"R",
  RBI:"RBI",SB:"SB",CS:"CS",G:"G",GAMES:"G",AB:"AB",ERA:"ERA",
  W:"W",WINS:"W",L:"L",LOSSES:"L",S:"SV",SV:"SV",SAVES:"SV",
  BS:"BS",BLSV:"BS",BLOWSAVES:"BS",GS:"GS",STARTS:"GS",CG:"CG",
  SHO:"SHO",SHUTOUTS:"SHO",IP:"IP",INNINGS:"IP",ER:"ER",WP:"WP",
  BK:"BK",HLD:"HLD",HOLDS:"HLD",QS:"QS",QUALITYSTARTS:"QS",WHIP:"WHIP",
  HBP:"HBP",HB:"HB",GIDP:"GIDP",IBB:"IBB",SF:"SF",SH:"SH"
 };
 const COLORS={1:"#FFD34D",2:"#62E89C",3:"#FF85C5"};
 const code=v=>String(v||"").trim().toUpperCase();
 const normalize=v=>String(v||"").normalize("NFKC").toLowerCase().replace(/[^a-z0-9가-힣]/g,"");
 function name(value){
  const raw=String(value||"").replace(/\s+/g," ").trim();
  const comma=raw.match(/^(.*?)\s*,\s*(.*?)$/);
  return comma?(comma[2]+" "+comma[1]).trim():raw;
 }
 function key(value){return normalize(name(value))}
 function names(value){
  const n=name(value),words=n.split(" ");
  const result=new Set([key(value),key(n)]);
  if(words.length>1)result.add(normalize(words.slice(1).join(" ")+" "+words[0]));
  // HHRecord has both "Namyoon Jr. Lee" and "Namyoon Lee Jr." conventions.
  if(words.length===3&&/^jr\.?$/i.test(words[1]))
   result.add(normalize(words[0]+" "+words[2]+" "+words[1]));
  if(words.length===3&&/^jr\.?$/i.test(words[2]))
   result.add(normalize(words[0]+" "+words[2]+" "+words[1]));
  return [...result].filter(Boolean);
 }
 const number=v=>{
  const parsed=Number(String(v??"").replace(/,/g,"").trim());
  return Number.isFinite(parsed)?parsed:null;
 };
 function parse(html,{season,kind}={}){
  const yr=Number(season);
  if(!Number.isInteger(yr)||yr<1||yr>999)throw Error("순위 시즌 차수는 1~999 사이의 정수여야 합니다.");
  if(!["batter","pitcher"].includes(kind))throw Error("타자/투수 순위 종류를 선택하세요.");
  if(typeof DOMParser==="undefined")throw Error("브라우저의 HTML 분석 기능을 사용할 수 없습니다.");
  // DOMParser creates an inert document; no uploaded scripts are executed or inserted into the page.
  const doc=new DOMParser().parseFromString(html,"text/html");
  const columns={};
  let recognized=0;
  for(const table of doc.querySelectorAll("table")){
   const rows=[...table.rows];
   if(rows.length<2)continue;
   const headers=[...rows[0].cells].map(c=>c.textContent.trim().replace(/\s+/g," "));
   if(headers[0]?.toLowerCase()!=="pos"||
      !headers[1]?.toLowerCase().includes("both leagues leaders"))continue;
   const stat=KEY_MAP[code(headers.at(-1)).replace(/[\s_-]+/g,"")];
   if(!stat)continue;
   recognized++;
   const leaders=[];let rank=0,position=0,last=null;
   for(const tr of rows.slice(1)){
    const cols=[...tr.cells].map(c=>c.textContent.trim().replace(/\s+/g," "));
    if(cols.length<4)continue;
    const val=number(cols.at(-1));
    if(val===null||!cols[1]||!cols[2])continue;
    position++;
    if(last===null||last!==val){rank=position;last=val}
    if(rank>3)break;
    leaders.push({name:name(cols[1]),team:code(cols[2]),value:cols.at(-1),rank});
   }
   if(leaders.length)columns[stat]=leaders;
  }
  if(!recognized||!Object.keys(columns).length)
   throw Error("Both Leagues leaders 형식의 순위표를 찾지 못했습니다.");
  return {season:yr,kind,columns};
 }
 function normalizeRecords(source){
  if(!source||typeof source!=="object"||Array.isArray(source))return {};
  const out={};
  for(const [year,sets] of Object.entries(source)){
   if(!/^\d{1,3}$/.test(year)||!Number(year)||!sets||typeof sets!=="object")continue;
   const normalized={};
   for(const kind of ["batter","pitcher"]){
    const raw=sets[kind];if(!raw||typeof raw!=="object")continue;
    const columns={};
    for(const [field,people] of Object.entries(raw)){
     if(!/^[A-Za-z0-9#]{1,12}$/.test(field)||!Array.isArray(people))continue;
     const arr=people.slice(0,70).filter(x=>x&&typeof x.name==="string"&&
      x.name.length<130&&typeof x.team==="string"&&x.team.length<9&&
      [1,2,3].includes(Number(x.rank))&&number(x.value)!==null)
      .map(x=>({name:name(x.name),team:code(x.team),value:String(x.value),rank:Number(x.rank)}));
     if(arr.length)columns[field]=arr;
    }
    if(Object.keys(columns).length)normalized[kind]=columns;
   }
   if(Object.keys(normalized).length)out[String(Number(year))]=normalized;
  }
  return out;
 }
 function combine(a,b){
  const one=normalizeRecords(a),two=normalizeRecords(b),out={...one};
  for(const [year,sets] of Object.entries(two))
   out[year]={...(out[year]||{}),...sets};
  return out;
 }
 function lookup(data,player,row,field,mode="regular"){
  if(mode!=="regular"||!player||!row||!row.year||!row.stats)return null;
  const available=data?.[String(Number(row.year)-1950)]?.[player.kind]?.[field];
  if(!available)return null;
  const team=code(row.team),stat=row.stats;
  if(!team)return null; // Prevent accidental awards to historical teams not yet confirmed.
  const aliases=[player.name,...(player.aliases||[])];
  const identities=new Set(aliases.flatMap(names));
  const value=field==="OPS"&&stat.OPS==null&&number(stat.OBP)!==null&&number(stat.SLG)!==null
   ?number(stat.OBP)+number(stat.SLG):number(stat[field]);
  if(value===null)return null;
  for(const r of available){
   if(code(r.team)!==team||!names(r.name).some(k=>identities.has(k)))continue;
   // The uploaded leaderboards are authoritative for rank: some HHRecord
   // player-page rates differ by 0.001-0.002 from its own leaders report.
   // Matching is by original name/aliases + confirmed season team, not rates.
   return {rank:r.rank,color:COLORS[r.rank]||null,
    sourceValue:r.value,careerValue:value};
  }
  return null;
 }
 return {parse,lookup,combine,normalizeRecords,names,name,key,COLORS};
})();