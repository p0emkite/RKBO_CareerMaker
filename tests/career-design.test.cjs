"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const src=fs.readFileSync(path.join(__dirname,"..","card-renderer.js"),"utf8");
const ctxObj={window:{},console,RKBOXls:{summary:p=>p?.career||{}}};
vm.runInNewContext(src,ctxObj);
const renderer=ctxObj.window.RKBOCard;
assert.equal(renderer.pitcherRole({career:{G:"100",GS:"61"}}),"선발투수");
assert.equal(renderer.pitcherRole({career:{G:"100",GS:"29"}}),"불펜투수");
const rowSprite={complete:true,naturalWidth:240,naturalHeight:96};
function render(kind,grade,gs=61){
 const rects=[],texts=[],images=[];
 const ctx={
  fillStyle:"#fff",font:"",textAlign:"center",
  fillRect(...args){rects.push({args,color:this.fillStyle})},
  fillText(value,x,y,max){texts.push({value:String(value),x,y,font:this.font,color:this.fillStyle,max})},
  drawImage(...args){images.push(args)},
  measureText(value){
   const size=Number(String(this.font).match(/(\d+)px/)?.[1]||18);
   return {width:[...String(value)].reduce((w,c)=>w+(c===" "?0.36:0.85)*size,0)};
  },
  beginPath(){},arc(){},rect(){},save(){},restore(){},clip(){},fill(){}
 };
 const canvas={width:0,height:0,getContext:()=>ctx};
 const p={id:"10",kind,name:"배찬승",team:"SAM",number:"1",career:{G:100,GS:gs},
  seasons:{2010:{year:2010,team:"SAM",stats:{ERA:"3.21",G:"30",GS:"27",IP:"90.33",AVG:".230"}}}};
 renderer.draw({canvas,p,teamInfo:{SAM:["삼성","#006db8","SAMSUNG LIONS"]},
  logos:{},rowSprite,wins:{},fa:true,faGrade:grade});
 return {canvas,rects,texts,images};
}
for(const grade of ["A","B","C"]){
 const {canvas,rects,texts,images}=render("pitcher",grade);
 const fa=texts.find(x=>x.value.includes("FA")&&x.value.includes("등급"));
 assert.ok(fa);
 assert.ok(fa.value.includes("선발투수"));
 assert.equal(fa.color,grade==="A"?"#FFD34D":"#ffffff");
 assert.equal(fa.y,216);
 assert.ok(/23px/.test(fa.font),"Pitcher FA label should use the larger font");
 const team=texts.find(x=>x.value==="SAMSUNG LIONS");
 const name=texts.find(x=>x.value==="1. 배찬승");
 const subtitle=texts.find(x=>x.value==="정규 시즌 통산 기록");
 assert.ok(parseFloat(team.font.match(/\d+/)?.[0])>=38,"Team header should be larger");
 assert.ok(parseFloat(name.font.match(/\d+/)?.[0])>=60,"Player name should be larger");
 assert.ok(parseFloat(subtitle.font.match(/\d+/)?.[0])>=30,"Subtitle should be larger");
 const badge=images.find(x=>x[0]===rowSprite);
 assert.ok(badge,"Provided small circular team logo must be used");
 assert.deepEqual(Array.from(badge.slice(1,5)),[144,0,48,48],"Samsung icon should be tile #3");
 assert.equal(badge[7],25);
 assert.ok(badge[5]>50,"Badge must be between season and team label, not glued to season");
 assert.ok(rects.some(r=>r.args[0]===0&&r.args[1]===231&&r.args[3]===1&&r.color==="#fff"),
  "Table header must have top white border");
 assert.ok(rects.some(r=>r.args[0]===0&&r.args[1]===canvas.height-1&&r.args[3]===1),
  "Bottom border must be one pixel");
}
const bullpen=render("pitcher","C",3);
assert.ok(bullpen.texts.some(x=>x.value.includes("불펜투수")),"Relief pitcher label");
const batter=render("batter","B");
assert.ok(batter.texts.some(x=>x.value.includes("FA")&&x.value.includes("B등급")&&!x.value.includes("투수")&&x.color==="#ffffff"));
console.log("FA styling, pitcher role, row logos, typography and borders passed.");
