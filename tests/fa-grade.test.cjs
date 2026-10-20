"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.join(__dirname,".."),ctx={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,"fa-grade.js"),"utf8"),ctx);
const fa=ctx.window.RKBOFA;
function make(kind,stats,extras={}){
 return {id:"1",name:"Example",kind,latestYear:2010,hhLatestYear:2010,
 seasons:{2010:{year:2010,stats:{...stats}}},
 last3:{...stats},...extras};
}
// Exact source: 투수!P13 / Q13 use row 38 (= LAST 3), not row 37 (= career).
const tsuki=make("pitcher",{G:"94",GS:"94",IP:"591.33",
  AVG:"0.236",OBP:"0.299",SLG:"0.291"},{career:{G:"449",GS:"309",
 IP:"1966.00",AVG:"0.270",OBP:"0.338",SLG:"0.349"}});
assert.equal(fa.calculate(tsuki).grade,"A","Tsuki must be A from LAST 3; career would be C");
assert.equal(fa.calculate(tsuki).role,"선발투수");
assert.equal(fa.calculate(tsuki).source,"HHRecord LAST 3");
assert.equal(fa.calculate(tsuki).approximate,false);
const bullpen=make("pitcher",{G:"80",GS:"0",IP:"181.33",AVG:".200",OBP:".278",SLG:".385"});
assert.equal(fa.calculate(bullpen).grade,"A");
assert.equal(fa.calculate(bullpen).role,"불펜투수");
const bullpenB=make("pitcher",{G:"80",GS:"1",IP:"150.33",AVG:".235",OBP:".319",SLG:".377"});
assert.equal(fa.calculate(bullpenB).grade,"B","Exactly one opposing-rate threshold");
const starterB=make("pitcher",{G:"100",GS:"90",IP:"350.67",AVG:".245",OBP:".284",SLG:".390"});
assert.equal(fa.calculate(starterB).grade,"B");
assert.equal(fa.calculate(make("pitcher",{G:"80",GS:"80",IP:"299.67",AVG:".190",OBP:".240",SLG:".260"})).grade,"C");
assert.equal(fa.calculate(make("pitcher",{G:"80",GS:"0",IP:"119.67",AVG:".190",OBP:".240",SLG:".260"})).grade,"C");
assert.equal(fa.calculate(make("pitcher",{G:"80",GS:"0",IP:"200.33",AVG:".250",OBP:".320",SLG:".370"})).grade,"C");
const hitterA=make("batter",{AB:"1500",AVG:".302",OBP:".384",SLG:".390"});
assert.equal(fa.calculate(hitterA).grade,"A");
const hitterB=make("batter",{AB:"850",AVG:".245",OBP:".326",SLG:".380"});
assert.equal(fa.calculate(hitterB).grade,"B");
assert.equal(fa.calculate(make("batter",{AB:"749",AVG:".340",OBP:".450",SLG:".600"})).grade,"C");
assert.equal(fa.calculate(make("batter",{AB:"1500",AVG:".200",OBP:".240",SLG:".330"})).grade,"C");
// Invalid scores must not silently be interpreted as qualifying success or C.
assert.equal(fa.calculate(make("batter",{AB:"1500",AVG:"-.---",OBP:".350",SLG:".380"})).grade,null);
assert.equal(fa.calculate(make("pitcher",{G:"80",GS:"0",IP:"200",AVG:"-.---",OBP:".280",SLG:".280"})).grade,null);
// One or more complete XLS seasons without HH LAST 3: reconstruct, do not
// default to C due to absence of p.career.
const xlsHitter={id:"xls:batter:sample",kind:"batter",latestYear:2010,
 seasons:{2008:{year:2008,stats:{G:"100",AB:"400",H:"140","2B":"30","3B":"2",HR:"10",BB:"35",AVG:".350",OBP:".410",SLG:".510"}},
 2009:{year:2009,stats:{G:"100",AB:"400",H:"135","2B":"30","3B":"1",HR:"8",BB:"35",AVG:".338",OBP:".410",SLG:".480"}},
 2010:{year:2010,stats:{G:"100",AB:"400",H:"130","2B":"30","3B":"2",HR:"9",BB:"40",AVG:".325",OBP:".400",SLG:".477"}}}};
const xlsHitterResult=fa.calculate(xlsHitter);
assert.equal(xlsHitterResult.grade,"A");
assert.equal(xlsHitterResult.approximate,true,"Missing HBP/SF requires approximate OBP");
assert.equal(xlsHitterResult.stats.AB,1200);
const xlsPitcher={id:"xls:pitcher:sample",kind:"pitcher",
 seasons:{2008:{year:2008,stats:{G:"40",GS:"0",IP:"60.33",AVG:".210",OBP:".260",SLG:".310"}},
 2009:{year:2009,stats:{G:"50",GS:"0",IP:"65.67",AVG:".235",OBP:".270",SLG:".360"}},
 2010:{year:2010,stats:{G:"45",GS:"0",IP:"62.00",AVG:".230",OBP:".280",SLG:".320"}}}};
const xlsPitcherResult=fa.calculate(xlsPitcher);
assert.equal(xlsPitcherResult.grade,"A");
assert.equal(xlsPitcherResult.role,"불펜투수");
assert.equal(xlsPitcherResult.approximate,true);
assert.equal(xlsPitcherResult.source,"시즌별 기록 재구성");
assert.equal(fa.outs("60.33"),181);
assert.equal(fa.outs("65.67"),197);
// Missing rates with sufficient eligible workload should be marked ungraded.
const unknown=fa.calculate({id:"x",kind:"pitcher",seasons:{2010:{year:2010,
 stats:{G:80,GS:0,IP:"190",AVG:".220"}}}});
assert.equal(unknown.grade,null);
const app=fs.readFileSync(path.join(root,"app.js"),"utf8");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
assert.match(app,/RKBOFA\.calculate\(p\)/);
assert.match(app,/faManualSelection=false/);
assert.match(app,/faSelectedPlayerId=""/);
assert.match(app,/function refreshFASelection\(/);
assert.doesNotMatch(app,/const s=p\.career\|\|\{\}; if\(p\.kind==="batter"\)/);
assert.match(html,/src="\.\/fa-grade\.js\?/);
assert.match(html,/id="faAutoHint"/);
console.log("Original Sheets LAST 3 FA thresholds, A/B/C, player changes and XLS reconstruction passed.");
