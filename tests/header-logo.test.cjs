"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const draws=[];
const W=1606,H=231;
const paddedLogo={complete:true,naturalWidth:400,naturalHeight:400};
const sample=320;
const rgba=new Uint8ClampedArray(sample*sample*4);
for(let y=44;y<277;y++)for(let x=69;x<255;x++)rgba[(y*sample+x)*4+3]=255;
const document={
 createElement(tag){
  assert.equal(tag,"canvas");
  return {width:0,height:0,getContext(){return {
   drawImage(){},
   getImageData(){return {data:rgba};}
  }}};
 }
};
const drawing={
 fillRect(){},beginPath(){},rect(){},clip(){},save(){},restore(){},
 arc(){},fill(){},fillText(){},drawImage(...args){draws.push(args);}
};
const canvas={width:0,height:0,getContext(){return drawing}};
const context={window:{},document,console,
 RKBOXls:{summary:()=>({})}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,"..","card-renderer.js"),"utf8"),context);
const renderer=context.window.RKBOCard;
renderer.draw({canvas,p:{id:"1",name:"Test",team:"SAM",number:"1",kind:"pitcher",seasons:{}},
 teamInfo:{SAM:["삼성","#006db8","SAMSUNG LIONS"]},
 logos:{SAM:paddedLogo}});
const header=draws.find(d=>d[0]===paddedLogo);
assert.ok(header,"Expected header image draw");
assert.equal(header.length,9,"Must crop source and draw proportionally");
const [img,sx,sy,sw,sh,x,y,w,h]=header;
assert.ok(sx>0&&sy>0&&sw<400&&sh<400,"Transparent padding must be trimmed");
assert.ok(w>0&&h>0&&h<=H*.96+1,"Header logo must fit in header");
assert.ok(x>=0&&x+w<=W&&y>=0&&y+h<=H,"Logo must stay inside header");
assert.ok(Math.abs((w/h)-(sw/sh))<1e-7,"Aspect ratio must stay unchanged");
assert.ok(x+w >W*.90,"Logo should reach the right side of header");
console.log("Large header team logo tests passed.");
