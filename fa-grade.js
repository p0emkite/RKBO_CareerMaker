"use strict";
window.RKBOFA=(()=>{
 const valid=v=>v!==undefined&&v!==null&&String(v).trim()!==""&&Number.isFinite(Number(v));
 const num=v=>valid(v)?Number(v):null;
 const near=(v,min)=>v>=min-1e-9;
 function outs(value){
  if(!valid(value))return null;
  const n=Number(value),whole=Math.floor(n+1e-8),decimal=Math.round((n-whole)*100);
  if(decimal===0)return whole*3;
  if([30,33,34].includes(decimal))return whole*3+1;
  if([66,67,70].includes(decimal))return whole*3+2;
  return null;
 }
 function recentRows(player){
  return Object.values(player?.seasons||{}).filter(r=>r?.stats&&Number.isFinite(Number(r.year)))
   .sort((a,b)=>Number(a.year)-Number(b.year)).slice(-3);
 }
 function derived(player,rows){
  const pitcher=player.kind==="pitcher",stats={},approximated=[];
  const total=k=>rows.every(r=>valid(r.stats[k]))?rows.reduce((t,r)=>t+Number(r.stats[k]),0):null;
  if(!pitcher){
   stats.AB=total("AB");
   const hits=total("H");
   stats.AVG=hits!==null&&stats.AB>0?hits/stats.AB:null;
   const tb=total("TB"),doubles=total("2B"),triples=total("3B"),hrs=total("HR");
   stats.SLG=stats.AB>0?(tb!==null?tb:(
    hits!==null&&doubles!==null&&triples!==null&&hrs!==null?
    hits+doubles+2*triples+3*hrs:null))/stats.AB:null;
   const bb=total("BB"),hbp=total("HBP"),sf=total("SF");
   if(stats.AB>0&&hits!==null&&bb!==null&&hbp!==null&&sf!==null){
    const denominator=stats.AB+bb+hbp+sf;
    stats.OBP=denominator>0?(hits+bb+hbp)/denominator:null;
   }else{
    // XLS history lacks HBP/SF. Approximate the *three-season* rate using
    // season PA proxy, never by summing/averaging percentages unweighted.
    const data=rows.map(r=>({
     rate:num(r.stats.OBP),
     weight:(num(r.stats.AB)||0)+(num(r.stats.BB)||0)
    }));
    const usable=data.every(x=>x.rate!==null&&x.weight>=0)&&data.some(x=>x.weight>0);
    stats.OBP=usable?data.reduce((t,x)=>t+x.rate*x.weight,0)/
      data.reduce((t,x)=>t+x.weight,0):null;
    if(usable)approximated.push("OBP");
   }
  }else{
   stats.G=total("G");stats.GS=total("GS");
   const outList=rows.map(r=>outs(r.stats.IP));
   stats.IP=outList.every(v=>v!==null)?outList.reduce((t,x)=>t+x,0)/3:null;
   const denom=outList.every(x=>x!==null)?outList.reduce((t,x)=>t+x,0):null;
   for(const key of ["AVG","OBP","SLG"]){
    const arr=rows.map((r,i)=>({value:num(r.stats[key]),weight:outList[i]}));
    // The HHRecord XLS source has only seasonal opposing rates. Actual combined
    // PA/AB denominators are absent, so innings/outs are an estimate, not exact.
    if(denom>0&&arr.every(x=>x.value!==null)){
     stats[key]=arr.reduce((t,x)=>t+x.value*x.weight,0)/denom;
     approximated.push(key);
    }else stats[key]=null;
   }
  }
  return {stats,source:"시즌별 기록 재구성",approximated};
 }
 function calculate(player){
  if(!player||!["pitcher","batter"].includes(player.kind))
   return {grade:null,role:null,source:"선수 미선택",reason:"선수를 선택하세요.",approximate:false,stats:{}};
  const rows=recentRows(player),lastYear=rows.length?Number(rows[rows.length-1].year):null;
  const recent=player.last3;
  const exact=recent&&lastYear!==null&&Number(player.hhLatestYear)===lastYear;
  const dataset=exact
   ?{stats:recent,source:"HHRecord LAST 3",approximated:[]}
   :derived(player,rows);
  const s=dataset.stats,role=player.kind==="pitcher"&&valid(s.G)&&num(s.G)>0&&valid(s.GS)
    ?(num(s.GS)/num(s.G)>=.3?"선발투수":"불펜투수"):player.kind==="pitcher"?null:null;
  const base={grade:null,role,source:dataset.source,approximate:dataset.approximated.length>0,
   approximated:dataset.approximated,stats:s,years:rows.map(r=>r.year)};
  if(player.kind==="batter"){
   const ab=num(s.AB);
   if(ab===null)return {...base,reason:"최근 3시즌 타수가 없어 계산할 수 없습니다."};
   if(ab<750)return {...base,grade:"C",reason:"최근 3시즌 타수 "+ab+"회 · 750타수 미만"};
   const avg=num(s.AVG),obp=num(s.OBP),slg=num(s.SLG);
   if([avg,obp,slg].some(v=>v===null))
    return {...base,reason:"최근 3시즌 타율·출루율·장타율 중 누락된 값이 있습니다."};
   const met=[near(avg,.3),near(obp-avg,.08),near(slg-avg,.18)];
   const count=met.filter(Boolean).length,grade=count>=2?"A":count===1?"B":"C";
   return {...base,grade,reason:"최근 3시즌 "+ab+"타수 · 기준 "+count+"/3개 충족",met};
  }
  const games=num(s.G),starts=num(s.GS),ip=num(s.IP);
  if(games===null||starts===null||ip===null)
   return {...base,reason:"최근 3시즌 경기·선발·투구이닝 자료가 부족합니다."};
  const type=games>0&&starts/games>=.3?"선발투수":"불펜투수";
  const min=type==="선발투수"?300:120;
  if(ip+1e-8<min)return {...base,role:type,grade:"C",
   reason:"최근 3시즌 "+ip.toFixed(2)+"이닝 · "+min+"이닝 미만"};
  const avg=num(s.AVG),obp=num(s.OBP),slg=num(s.SLG);
  if([avg,obp,slg].some(v=>v===null))
   return {...base,role:type,reason:"최근 3시즌 피안·피출·피장 수치가 부족합니다."};
  const met=[avg<=.24+1e-9,obp<=.29+1e-9,slg<=.34+1e-9];
  const count=met.filter(Boolean).length,grade=count>=2?"A":count===1?"B":"C";
  return {...base,role:type,grade,reason:"최근 3시즌 "+ip.toFixed(2)+"이닝 · 기준 "+count+"/3개 충족",met};
 }
 return {calculate,derived,outs,recentRows};
})();