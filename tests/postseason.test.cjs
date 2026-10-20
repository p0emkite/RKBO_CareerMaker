"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.join(__dirname,"..");
const postContext={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,"postseason.js"),"utf8"),postContext);
const post=postContext.window.RKBOPostseason;
// The old year embedded in a HHRecord postseason HTML must NEVER be used.
const html='<html><p>2002 Season Stats</p><b>Major League roster</b>'+
'<table><tr><td>Name</td><td>Pos</td><td>G</td><td>Avg</td><td>Ab</td><td>H</td></tr>'+
'<tr><td>Bae , Jinsol</td><td>SS</td><td>9</td><td>.184</td><td>38</td><td>7</td></tr></table>'+
'<table><tr><td>Name</td><td>ERA</td><td>W</td><td>L</td><td>S</td><td>G</td><td>IP</td></tr>'+
'<tr><td>Bae , Chanseung</td><td>4.61</td><td>0</td><td>1</td><td>0</td><td>2</td><td>13.7</td></tr></table>'+
'<a name="AAA">AAA roster</a><table><tr><td>Name</td><td>Pos</td><td>G</td></tr>'+
'<tr><td>Fake , Person</td><td>SS</td><td>9</td></tr></table></html>';
const parsed=post.parseMajorLeagueHtml(html,"SAM",60);
assert.equal(parsed.length,2);
assert.ok(parsed.every(p=>p.year===2010));
assert.equal(parsed[0].name,"Jinsol Bae");
assert.equal(parsed[0].stats.POS,"SS");
assert.equal(parsed[1].stats.IP,"13.7");
assert.equal(parsed[1].stats.SV,"0");
assert.ok(!parsed.some(x=>x.name.includes("Fake")));
const fake={SheetNames:["투수_전체 기록(포시)","타자_전체 기록(포시)"],Sheets:{P:{},B:{}}};
fake.Sheets["투수_전체 기록(포시)"]=fake.Sheets.P;
fake.Sheets["타자_전체 기록(포시)"]=fake.Sheets.B;
const pitcher=[["소속팀","시즌","이름","ERA","W","L","SV","BS","G","GS","IP"],
 ["삼성",59,"Bae , Chanseung",1.8,0,1,0,0,2,2,10]];
const batter=[["소속팀","시즌","이름","Pos","G","Avg","Ab","H"],
 ["KIA",59,"Bae , Jinsol","SS",3,.333,9,3]];
postContext.window.XLSX={read:()=>fake,utils:{sheet_to_json:sheet=>sheet===fake.Sheets.P?pitcher:batter}};
const history=post.parseWorkbook(new ArrayBuffer(0));
assert.equal(history.length,2);
assert.equal(history[0].year,2009);
assert.equal(history[1].team,"KIA");
assert.equal(history[1].stats.POS,"SS");
const current={"100":{id:"100",kind:"pitcher",name:"Bae Chanseung",team:"SAM",number:"1",
 seasons:{"2010":{year:2010}},postSeasons:{}}};
const merged=post.merge(current,[history[0],parsed[1]]);
assert.equal(merged.counts.matched,2);
assert.equal(Object.keys(merged.players).length,1);
assert.equal(merged.players["100"].postSeasons[2009].stats.ERA,"1.8");
assert.equal(merged.players["100"].postSeasons[2010].stats.ERA,"4.61");
assert.ok(merged.players["100"].seasons[2010],"Regular-season data preserved");
assert.equal(post.merge(merged.players,[parsed[1]]).counts.updated,1,"Re-importing same year updates instead of duplicating");
const ambiguous=post.matchPlayer({"1":{id:"1",kind:"pitcher",name:"Bae Chanseung"},
 "2":{id:"2",kind:"pitcher",name:"Chanseung Bae"}},parsed[1]);
assert.equal(ambiguous.ambiguous,true);
function renderer(mode){
 const texts=[],rectangles=[];
 const ctx={fillRect(...args){rectangles.push(args)},fillText(value,x,y){texts.push({value:String(value),x,y})},
  measureText(s){return {width:String(s).length*17}},drawImage(){},save(){},restore(){},clip(){},
  beginPath(){},rect(){},arc(){},fill(){}};
 const canvas={width:0,height:0,getContext(){return ctx}};
 const context={window:{},console,RKBOXls:{summary:()=>({})}};
 vm.runInNewContext(fs.readFileSync(path.join(root,"card-renderer.js"),"utf8"),context);
 const p={id:"100",kind:"pitcher",name:"Bae Chanseung",team:"SAM",number:"1",
  seasons:{2009:{year:2009,team:"SAM",stats:{G:30}}},
  postSeasons:{2010:{year:2010,team:"SAM",stats:{ERA:"4.61",G:"2",GS:"2",IP:"13.7"}}}};
 const output=context.window.RKBOCard.draw({canvas,p,mode,logos:{},rowSprite:null,wins:{60:"SAM"},
  teamInfo:{SAM:["삼성","#006db8","SAMSUNG LIONS"]}});
 return {output,texts,canvas};
}
const ps=renderer("postseason");
assert.equal(ps.output.rows,1);
assert.equal(ps.output.won,1);
assert.ok(ps.texts.some(x=>x.value==="포스트시즌 통산 기록"));
assert.ok(ps.texts.some(x=>x.value==="우승"));
assert.ok(ps.texts.some(x=>x.value==="🏆"));
assert.ok(!ps.texts.some(x=>x.value.includes("시즌 통산")&&x.value!=="포스트시즌 통산 기록"));
assert.ok(!ps.texts.some(x=>x.value==="최근 3시즌 통산"));
const regular=renderer("regular");
assert.ok(regular.texts.some(x=>x.value==="정규 시즌 통산 기록"));
assert.ok(regular.texts.some(x=>x.value==="최근 3시즌 통산"));
assert.ok(!regular.texts.some(x=>x.value==="🏆"));
const htmlUi=fs.readFileSync(path.join(root,"index.html"),"utf8");
assert.match(htmlUi,/id="careerModeSelect"/);
assert.match(htmlUi,/value="regular">정규/);
assert.match(htmlUi,/value="postseason">포스트시즌/);
assert.match(htmlUi,/id="postSeasonInput"/);
assert.match(htmlUi,/id="postZipInput"/);
assert.match(htmlUi,/id="postHistoryInput"/);
console.log("Postseason HTML, XLSX, matching, trophy and rendering tests passed.");
