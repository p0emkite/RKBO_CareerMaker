"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const app=fs.readFileSync(path.join(root,"app.js"),"utf8");
const css=fs.readFileSync(path.join(root,"styles.css"),"utf8");
const src=fs.readFileSync(path.join(root,"card-renderer.js"),"utf8");
assert.doesNotMatch(html,/season-rankings|rankHtmlInput|rankSeasonInput|rankKindInput|rankingsCount|rankingImportStatus|season-rank-import/);
assert.doesNotMatch(app,/RKBORankings|setRankings|rankings:|rankHtmlInput|loadSeedRankings|importSeasonLeaderboard/);
assert.doesNotMatch(css,/season-rank-import|rank-import-fields/);
assert.doesNotMatch(src,/RKBORankings|highlightCount|해당 시즌 전체/);
assert.match(html,/id="downloadBtn"/);
assert.match(html,/id="saveImageStatus"/);
assert.match(app,/showSaveFilePicker/);
assert.match(app,/prompt\("파일 이름을 입력하세요/);
assert.match(app,/sort\(comparePlayerNicknames\)/);
const log=[],ctx={fillStyle:"#fff",font:"",fillRect(){},fillText(value,x,y){log.push({value:String(value),color:this.fillStyle,y})},
 measureText:value=>({width:String(value).length*11}),
 drawImage(){},beginPath(){},rect(){},clip(){},save(){},restore(){},arc(){},fill(){}};
const canvas={getContext:()=>ctx};
const scope={window:{},console,RKBOXls:{summary:(p,period)=>p?.[period]||{}}};
vm.runInNewContext(src,scope);
for(const kind of ["batter","pitcher"]){
 log.length=0;
 const stats=kind==="pitcher"?{ERA:"3.21",G:"30",IP:"90.33"}:{AVG:".353",OBP:".436",SLG:".647",AB:"479",G:"151"};
 const p={kind,name:"Example",number:"14",team:"DOO",career:stats,last3:stats,
  seasons:{2010:{year:2010,team:"DOO",stats}},postSeasons:{}};
 const row=scope.window.RKBOCard.draw({canvas,p,teamInfo:{DOO:["두산","#003468","DOOSAN BEARS"]},wins:{},logos:{}});
 const h=kind==="pitcher"?231:220;
 assert.equal(row.height,h+28+3*29,"Only the season + two summary rows should remain");
 assert.ok(log.some(t=>t.value==="최근 3시즌 통산"));
 assert.ok(!log.some(t=>t.value.includes("해당 시즌 전체")));
 const stat=log.find(t=>t.value===(kind==="pitcher"?"3.21":"0.353"));
 assert.ok(stat);
 assert.equal(stat.color,"#fff","Regular statistics must be white");
 const post=scope.window.RKBOCard.draw({canvas,p,mode:"postseason",teamInfo:{DOO:["두산","#003468","DOOSAN BEARS"]},wins:{},logos:{}});
 assert.equal(post.height,h+28+29);
}
console.log("Season ranking feature removed; card, Save As and postseason maintained.");
