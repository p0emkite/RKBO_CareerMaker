"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.join(__dirname,"..");
class TestDOMParser {
 parseFromString(source){
  const tables=[...source.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(table=>({
   rows:[...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(tr=>({
    cells:[...tr[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(td=>({
     textContent:td[1].replace(/<[^>]+>/g,"").replace(/&nbsp;/gi," ")
    }))
   }))
  }));
  return {querySelectorAll:query=>query==="table"?tables:[]};
 }
}
const context={window:{},DOMParser:TestDOMParser};
vm.runInNewContext(fs.readFileSync(path.join(root,"season-rankings.js"),"utf8"),context);
const rankings=context.window.RKBORankings;
function htmlTable(stat,data){
 return "<table><tr><td>Pos</td><td>Both Leagues leaders</td><td>Team</td><td>"+stat+"</td></tr>"+
  data.map((row,i)=>"<tr><td>"+(i+1)+"</td><td>"+row[0]+"</td><td>"+row[1]+"</td><td>"+row[2]+"</td></tr>").join("")+"</table>";
}
const html=
 htmlTable("Avg",[["Choi , Ji-Hoon","DOO",".353"],["Markakis , Nick","SAM",".344"],["Bae , Jinsol","KIA",".344"],["Sim , Father","KIA",".300"]])+
 htmlTable("HR",[["LEE , Namyoon Jr.","SAM","46"],["Roh , Jeong-Eui","HAN","46"],["Go , Younjung","SAM","44"],["Lee , Siyeon","KIA","20"]])+
 htmlTable("2B",[["Choi , Ji-Hoon","DOO","48"],["Markakis , Nick","SAM","48"],["Bae , Jinsol","KIA","48"],["Sim , Father","KIA","47"]]);
const parsed=rankings.parse(html,{season:60,kind:"batter"});
assert.equal(parsed.columns.AVG.length,3);
assert.deepEqual([...parsed.columns.AVG.map(x=>x.rank)],[1,2,2]);
assert.deepEqual([...parsed.columns.HR.map(x=>x.rank)],[1,1,3]);
assert.deepEqual([...parsed.columns["2B"].map(x=>x.rank)],[1,1,1]);
assert.ok(!parsed.columns["2B"].some(x=>x.name==="Father Sim"),"3 tied first places means 4th receives no color");
assert.equal(parsed.season,60);
assert.throws(()=>rankings.parse(html,{season:0,kind:"batter"}),/시즌/);
assert.throws(()=>rankings.parse(html,{season:60,kind:"bad"}),/타자/);
assert.throws(()=>rankings.parse("<html>nothing</html>",{season:60,kind:"batter"}),/순위표/);
const seed=JSON.parse(fs.readFileSync(path.join(root,"data/rankings-60-batter.json"),"utf8"));
assert.equal(seed.season,60);
assert.equal(seed.kind,"batter");
assert.equal(Object.keys(seed.columns).length,14);
assert.equal(Object.values(seed.columns).flat().length,44);
const seeded=rankings.normalizeRecords({"60":{batter:seed.columns}});
const player={id:"7",name:"Ji-Hoon Choi",kind:"batter",team:"DOO",aliases:["Choi, Ji-Hoon"]};
const row={year:2010,team:"DOO",stats:{AVG:".353",OBP:".436",SLG:".647",AB:"479",G:"151"}};
for(const key of ["AVG","OBP","SLG","OPS"]){
 const v=rankings.lookup(seeded,player,row,key,"regular");
 assert.ok(v,"Expected 60th season Ji-Hoon Choi leader for "+key);
 assert.equal(v.rank,1);
 assert.equal(v.color,"#FFD34D");
}
assert.equal(rankings.lookup(seeded,player,row,"H","regular"),null);
assert.equal(rankings.lookup(seeded,player,{...row,year:2009},"AVG","regular"),null);
assert.equal(rankings.lookup(seeded,player,{...row,team:"KIA"},"AVG","regular"),null);
assert.equal(rankings.lookup(seeded,player,row,"AVG","postseason"),null);
const four=seeded[60].batter["2B"];
assert.deepEqual([...four.map(x=>x.rank)],[1,2,2]);
const two=seeded[60].batter.HR;
assert.deepEqual([...two.map(x=>x.rank)],[1,1,3]);
const alias={name:"Namyoon Lee Jr.",aliases:["Namyoon Jr. Lee"],kind:"batter"};
assert.equal(rankings.lookup(seeded,alias,{year:2010,team:"SAM",stats:{HR:"46"}},"HR","regular").rank,1);
const preserved=rankings.combine(seeded,{"61":{pitcher:{ERA:[{name:"Kim One",team:"SAM",value:"1.40",rank:1}]}}});
assert.ok(preserved["60"].batter.AVG.length);
assert.equal(preserved["61"].pitcher.ERA[0].rank,1);
const canvasLogs=[];
const paintCtx={
 font:"",fillStyle:"",fillRect(){},fillText(value,x,y){canvasLogs.push({value:String(value),color:this.fillStyle,x,y})},
 measureText(value){return {width:String(value).length*15}},
 drawImage(){},beginPath(){},rect(){},clip(){},save(){},restore(){},arc(){},fill(){}
};
const canvas={getContext:()=>paintCtx,width:0,height:0};
const renderCtx={window:{RKBORankings:rankings},RKBORankings:rankings,console,RKBOXls:{summary:()=>({})}};
vm.runInNewContext(fs.readFileSync(path.join(root,"card-renderer.js"),"utf8"),renderCtx);
const rendered=renderCtx.window.RKBOCard.draw({
 canvas,p:{...player,seasons:{2010:row}},rankings:seeded,
 wins:{},teamInfo:{DOO:["두산","#003468","DOOSAN BEARS"]},logos:{}
});
assert.equal(rendered.highlightCount,4);
assert.equal(rendered.height,220+28+(1+3)*29,"Regular cards include the ranking legend row");
const last3Label=canvasLogs.find(x=>x.value==="최근 3시즌 통산");
assert.ok(last3Label,"The last-three total must precede the legend");
for(const [label,color] of [
 ["금색: 해당 시즌 전체 1위 기록",rankings.COLORS[1]],
 ["초록색: 해당 시즌 전체 2위 기록",rankings.COLORS[2]],
 ["분홍색: 해당 시즌 전체 3위 기록",rankings.COLORS[3]]
]){
 const item=canvasLogs.find(x=>x.value===label);
 assert.ok(item,"Ranking legend missing: "+label);
 assert.equal(item.color,color,"Legend color must match season ranking color");
 assert.ok(item.y>last3Label.y,"Legend must appear below the last-three total");
}
for(const val of ["0.353","0.436","0.647","1.083"])
 assert.ok(canvasLogs.some(x=>x.value===val&&x.color==="#FFD34D"),"Gold rank failed for "+val);
assert.ok(canvasLogs.some(x=>x.value==="151"&&x.color==="#fff"),"Unranked rows must remain white");
canvasLogs.length=0;
const postseason=renderCtx.window.RKBOCard.draw({
 canvas,p:{...player,postSeasons:{}},rankings:seeded,mode:"postseason",
 wins:{},teamInfo:{DOO:["두산","#003468","DOOSAN BEARS"]},logos:{}
});
assert.equal(postseason.height,220+28+29,"Postseason card height must remain unchanged");
assert.ok(!canvasLogs.some(x=>x.value.includes("해당 시즌 전체")),"Postseason must not show regular-season ranking legend");

const htmlSource=fs.readFileSync(path.join(root,"index.html"),"utf8");
const appSource=fs.readFileSync(path.join(root,"app.js"),"utf8");
assert.equal((htmlSource.match(/id="downloadBtn"/g)||[]).length,1);
assert.ok(htmlSource.indexOf('id="downloadBtn"')>htmlSource.indexOf('class="preview-panel"'));
assert.match(htmlSource,/id="saveImageStatus"/);
assert.match(appSource,/showSaveFilePicker/);
assert.match(appSource,/prompt\("파일 이름을 입력하세요/);
assert.match(appSource,/sort\(comparePlayerNicknames\)/);
assert.match(appSource,/rankings:fullRankings/);
assert.match(htmlSource,/id="rankSeasonInput"/);
assert.match(htmlSource,/id="rankKindInput"/);
assert.match(htmlSource,/id="rankHtmlInput"/);
console.log("Competition ranking ties, four golden 60th Choi stats, Save As, preview layout, 가나다 order and cloud sync passed.");
