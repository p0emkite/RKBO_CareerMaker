"use strict";
window.RKBOCloudMerge=(()=>{
 function distinct(values){return [...new Set((values||[]).filter(x=>typeof x==="string"&&x.trim()))]}
 function sameStatRow(a,b){
  if(!a||!b)return false;
  const norm=x=>JSON.stringify(Object.entries(x.stats||{}).map(([k,v])=>[k,String(v)]).sort((x,y)=>x[0].localeCompare(y[0])));
  return String(a.team||"")===String(b.team||"")&&norm(a)===norm(b);
 }
 function combine(remotePlayers,localPlayers){
  const players={...remotePlayers},conflicts=[];
  let addedPlayers=0,addedRegular=0,addedPostseason=0;
  for(const [id,local] of Object.entries(localPlayers||{})){
   if(!local||!local.kind||!local.id)continue;
   const remote=players[id];
   if(!remote){players[id]=local;addedPlayers++;addedRegular+=Object.keys(local.seasons||{}).length;
    addedPostseason+=Object.keys(local.postSeasons||{}).length;continue}
   if(local.kind!==remote.kind){conflicts.push({id,type:"player-kind",season:""});continue}
   const newer=(Number(local.latestYear||0)>=Number(remote.latestYear||0))?local:remote;
   const other=newer===local?remote:local;
   const seasons={...(remote.seasons||{})},postSeasons={...(remote.postSeasons||{})};
   for(const [yr,row] of Object.entries(local.seasons||{})){
    if(!seasons[yr])addedRegular++;
    else if(!sameStatRow(seasons[yr],row))conflicts.push({id,type:"regular",season:yr});
    seasons[yr]=row;
   }
   for(const [yr,row] of Object.entries(local.postSeasons||{})){
    if(!postSeasons[yr])addedPostseason++;
    else if(!sameStatRow(postSeasons[yr],row))conflicts.push({id,type:"postseason",season:yr});
    postSeasons[yr]=row;
   }
   players[id]={...other,...newer,
    seasons,postSeasons,
    aliases:distinct([...(remote.aliases||[]),...(local.aliases||[])]),
    postAliases:distinct([...(remote.postAliases||[]),...(local.postAliases||[])]),
    koreanNameOverride:local.koreanNameOverride??remote.koreanNameOverride,
    numberOverride:local.numberOverride??remote.numberOverride,
    latestYear:Math.max(Number(remote.latestYear||0),Number(local.latestYear||0)),
    postLatestYear:Math.max(Number(remote.postLatestYear||0),Number(local.postLatestYear||0))};
  }
  return {players,addedPlayers,addedRegular,addedPostseason,conflicts};
 }
 return {combine,sameStatRow};
})();