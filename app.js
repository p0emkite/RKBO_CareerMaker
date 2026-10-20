"use strict";
const $=id=>document.getElementById(id);
let championMap={};

let originalPhotoFile=null,photoGeneration=0,cutoutBusy=false,cutoutModule=null;
const CUTOUT_CONFIG={model:"isnet",output:{format:"image/png",quality:1}};
function cutoutStatus(message){$("cutoutStatus").textContent=message}
function photoButtons(){
 $("cutoutBtn").disabled=!originalPhotoFile||cutoutBusy;
 $("restorePhotoBtn").disabled=!originalPhotoFile||cutoutBusy;
}
function loadPhotoBlob(blob,version,label){
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(blob),img=new Image();
  img.onload=()=>{
   URL.revokeObjectURL(url);
   if(version!==photoGeneration){resolve(false);return}
   photo=img;draw();cutoutStatus(label);resolve(true);
  };
  img.onerror=()=>{URL.revokeObjectURL(url);reject(Error("이미지를 불러오지 못했습니다."))};
  img.src=url;
 });
}
async function doCutout(){
 if(!originalPhotoFile||cutoutBusy)return;
 const version=photoGeneration;
 cutoutBusy=true;photoButtons();
 try{
  cutoutStatus("AI 누끼 모델 준비 중 · 최초 실행은 다운로드로 오래 걸릴 수 있습니다.");
  if(!cutoutModule)cutoutModule=await import("https://esm.sh/@imgly/background-removal@1.5.6");
  const progress=(key,current,total)=>{
   if(version===photoGeneration)cutoutStatus("AI 누끼 처리 중 · "+key+" "+Math.round(current/Math.max(1,total)*100)+"%");
  };
  const run=device=>cutoutModule.removeBackground(originalPhotoFile,{...CUTOUT_CONFIG,device,progress});
  let result;
  if(typeof navigator!=="undefined"&&navigator.gpu){
   try{cutoutStatus("AI 누끼 · WebGPU 처리 중...");result=await run("gpu")}
   catch(error){console.warn("WebGPU 누끼 실패, CPU 재시도",error);cutoutStatus("GPU 처리 실패 · CPU로 재시도 중...");result=await run("cpu")}
  }else{cutoutStatus("AI 누끼 · CPU/WASM 처리 중...");result=await run("cpu")}
  if(version!==photoGeneration)return;
  await loadPhotoBlob(result,version,"AI 누끼 적용 완료 · 투명 배경 PNG로 출력됩니다.");
 }catch(error){
  console.error("AI 누끼 오류",error);
  if(version===photoGeneration)cutoutStatus("AI 누끼 실패: "+error.message+" · 원본 사진은 유지됩니다.");
 }finally{cutoutBusy=false;photoButtons()}
}

const TEAM={
 DOO:["두산 베어스","#003468","DOOSAN BEARS"],HAN:["한화 이글스","#ea580c","HANWHA EAGLES"],
 KIA:["KIA 타이거즈","#cc1129","KIA TIGERS"],LG:["LG 트윈스","#c30434","LG TWINS"],
 LOT:["롯데 자이언츠","#62aedb","LOTTE GIANTS"],NC:["NC 다이노스","#c59f79","NC DINOS"],
 SAM:["삼성 라이온즈","#006db8","SAMSUNG LIONS"],SSG:["SSG 랜더스","#c9203b","SSG LANDERS"],KT:["KT 위즈","#35343d","KT WIZ"],KIW:["키움 히어로즈","#820024","KIWOOM HEROES"],
 SK:["SK 와이번스","#ea8042","SK WYVERNS"]};
const LONG_TO_CODE=Object.fromEntries(Object.entries(TEAM).map(([k,v])=>[v[2].toUpperCase(),k]));
const labelMap={ERA:"방어율",W:"승",L:"패",SV:"세",BS:"블론",G:"경기수",GS:"선발",CG:"완투",SHO:"완봉",IP:"이닝",K:"삼진",BB:"볼넷",H:"안타","2B":"2루타","3B":"3루타",HR:"홈런",R:"득점",RBI:"타점",AVG:"타율",OBP:"출루율",SLG:"장타율",AB:"타수",SB:"도루",CS:"도실",HBP:"사구",GIDP:"병살",IBB:"고의4구",SF:"희비",SH:"희타",TB:"루타",BK:"보크",WP:"폭투",HB:"사구",ER:"자책점",HLD:"홀드",QS:"QS","#Pitch":"투구수"};
const batCols=["G","AVG","OBP","SLG","OPS","AB","H","2B","3B","HR","R","RBI","BB","K","SB","CS"];
const pitCols=["ERA","W","L","SV","BS","G","GS","CG","SHO","IP","K","BB","H","2B","3B","HR","SB","CS","BK","WP","R","ER","AVG","OBP","SLG","HLD","QS"];
const DB_NAME="rkbo-career-maker";let players={},photo=null,logos={},rowSprite=null,selectedId="",rawZipYears=[];
function report(message){$("importProgress").textContent=message;}


function rosterInfo(p){
 return window.RKBOReference ? RKBOReference.get(p) :
  {displayName:p?.name||"",englishName:p?.name||"",number:p?.number||"",koreanName:null,matched:false,jerseyFromCSV:false};
}
function showIdentityEditor(){
 const p=players[selectedId],container=$("identityEditor");
 container.hidden=!p;
 if(!p)return;
 const info=rosterInfo(p);
 $("koreanNameInput").value=info.koreanName||"";
 $("jerseyNumberInput").value=info.number||"";
 $("identityStatus").textContent=info.nameFromDB
  ?("영문 원본: "+p.name+" · 한글 닉네임 자동 매칭"+(info.jerseyFromCSV?" · 60차 등번호 자동 배정":" · 등번호는 현재 기록 기준"))
  :("매칭표에 없는 선수입니다. 영문 이름: "+p.name+" · 한글 닉네임을 직접 입력하고 저장하세요.");
}
function showUnmatchedRoster(){
 if(!window.RKBOReference||!RKBOReference.isLoaded())return;
 const summary=RKBOReference.stats();
 $("unmatchedRosterSummary").textContent="60차 등번호표 미매칭 "+summary.unmatched.length+"명 · 이름 공란 "+summary.unnamed+"행";
 const box=$("unmatchedRosterDetails");
 box.replaceChildren();
 const info=document.createElement("p");
 info.textContent="영문↔한글 매칭표에 없는 이름입니다. CSV 원본에는 그대로 남겨 두었으며 임의로 다른 선수에게 연결하지 않습니다.";
 box.append(info);
 for(const r of summary.unmatched){
  const el=document.createElement("span");
  el.textContent=(r["등번호"]||"?")+"번 "+r["이름"];
  box.append(el);
 }
}
function showChampionStatus(message){
 $("championCount").textContent=Object.keys(championMap).length+"시즌";
 $("championSaveStatus").textContent=message;
}
function setChampionMap(source,message,{persist=true}={}){
 championMap={...source};
 $("champions").value=RKBOChampions.format(championMap);
 if(persist){try{localStorage.setItem("rkbo-champions",JSON.stringify(championMap))}catch(e){console.warn("Cannot save champion map",e)}}
 showChampionStatus(message);
 draw();
}

const CURRENT_SEASON_KEY="rkbo-current-season";
let currentSeason=null,cloudLoadedForPublish=false,cloudHasPlayers=false;
function parseSeasonNumber(value){
 if(value===""||value===null||value===undefined)return null;
 const n=Number(value);
 return Number.isInteger(n)&&n>=1&&n<=999?n:null;
}
function applySeason(value,{persist=true}={}){
 currentSeason=parseSeasonNumber(value);
 $("currentSeasonInput").value=currentSeason===null?"":String(currentSeason);
 if(persist){
  try{
   if(currentSeason===null)localStorage.removeItem(CURRENT_SEASON_KEY);
   else localStorage.setItem(CURRENT_SEASON_KEY,String(currentSeason));
  }catch(e){report("시즌 설정 저장 실패: 브라우저 저장소를 확인하세요.")}
 }
 $("currentSeasonStatus").textContent=currentSeason===null?
  "최신 시즌 미설정 · 차수를 직접 입력한 뒤 저장하세요.":
  "저장된 최신 시즌: "+currentSeason+"차 · 현역 선수 판정에 적용됩니다.";
}
function setCloudStatus(state,detail){
 $("githubStatus").textContent=state;
 $("githubDetail").textContent=detail;
}
function refreshGithubControls(){
 const connected=RKBOGitHubDB.isConnected();
 $("githubConnect").disabled=connected;
 $("githubDisconnect").disabled=!connected;
 $("githubSave").disabled=!connected;
}
async function loadCloud({automatic=false}={}){
 $("githubLoad").disabled=true;
 try{
  const snapshot=await RKBOGitHubDB.read();
  if(!snapshot){
   cloudLoadedForPublish=true;cloudHasPlayers=false;
   setCloudStatus("저장소 빈 상태","GitHub DB가 아직 없습니다. 현재 기록을 GitHub에 저장해 처음 생성할 수 있습니다.");
   return;
  }
  const remote=snapshot.data,remoteCount=Object.keys(remote.players).length;
  cloudHasPlayers=remoteCount>0;
  const localCount=Object.keys(players).length;
  if(automatic&&localCount>0){
   cloudLoadedForPublish=!remoteCount;
   if(currentSeason===null&&remote.currentSeason!==null)applySeason(remote.currentSeason);
   if(Object.keys(remote.champions).length){
    setChampionMap({...RKBOChampions.DEFAULT,...championMap,...remote.champions},
      "기본 우승 기록과 GitHub 우승 기록을 적용했습니다.");
   }
   updatePlayerList();
   setCloudStatus("GitHub 연결됨",remoteCount?
    "브라우저에 "+localCount+"명, GitHub에 "+remoteCount+"명의 기록이 있습니다. 기존 기록을 보호하기 위해 자동 덮어쓰지 않았습니다. GitHub DB 불러오기는 현재 브라우저 기록을 대체합니다.":
    "GitHub DB는 아직 비어 있습니다. 브라우저 기록 "+localCount+"명을 최초로 GitHub에 저장할 수 있습니다.");
   return;
  }
  if(!automatic&&localCount>0&&
    !confirm("현재 브라우저에 저장된 선수 "+localCount+"명의 DB를 GitHub의 "+remoteCount+"명 기록으로 교체합니다.\n기존 기록을 보관하려면 먼저 'DB JSON 백업'을 눌러 주세요.\n계속할까요?")){
   setCloudStatus("불러오기 취소","브라우저에 보관된 기존 기록을 그대로 유지했습니다.");
   return;
  }
  players=remote.players;
  setChampionMap({...RKBOChampions.DEFAULT,...remote.champions},
    "GitHub 저장 기록을 불러왔습니다. 기본 우승 기록도 함께 적용했습니다.");
  if(remote.currentSeason!==null||!automatic)applySeason(remote.currentSeason);
  await store();
  selectedId="";
  populate();
  cloudLoadedForPublish=true;
  setCloudStatus("GitHub DB 적용","GitHub에서 "+remoteCount+"명 기록을 불러왔습니다. 최신 시즌: "+(currentSeason===null?"미설정":currentSeason+"차")+".");
  report("GitHub DB 불러오기 완료: "+remoteCount+"명");
 }catch(e){
  setCloudStatus("GitHub 오류",e.message);
 }finally{$("githubLoad").disabled=false}
}
async function publishCloud(){
 if(!RKBOGitHubDB.isConnected()){setCloudStatus("토큰 필요","GitHub 쓰기 토큰을 연결하세요.");return}
 if(!cloudLoadedForPublish){
  setCloudStatus("불러오기 필요","GitHub에 기존 기록이 있습니다. 다른 기기의 기록을 덮어쓰지 않도록 먼저 GitHub DB를 불러오세요.");
  return;
 }
 const count=Object.keys(players).length;
 if(!count){setCloudStatus("저장 중단","빈 선수 DB로 GitHub 공용 기록을 덮어쓰지 않습니다.");return}
 if(currentSeason===null){setCloudStatus("시즌 설정 필요","최신 시즌 차수를 먼저 입력하고 '시즌 저장'을 누르세요.");return}
 if(!confirm("GitHub의 공개 저장소에 선수 "+count+"명과 최신 "+currentSeason+"차 시즌 설정을 저장합니다.\n기존 GitHub DB 파일은 새 버전으로 커밋됩니다. 진행할까요?"))return;
 $("githubSave").disabled=true;
 setCloudStatus("GitHub 저장 중","선수 "+count+"명의 DB를 커밋하고 있습니다.");
 try{
  const result=await RKBOGitHubDB.save({schema:2,currentSeason,champions:championMap,players});
  cloudLoadedForPublish=true;cloudHasPlayers=true;
  setCloudStatus("저장 완료","GitHub에 "+count+"명 · 최신 "+currentSeason+"차 저장 완료 ("+new Date(result.updatedAt).toLocaleString("ko-KR")+").");
  report("GitHub 공용 DB 저장 완료. 다른 기기에서도 최신 기록을 불러올 수 있습니다.");
 }catch(e){setCloudStatus("저장 실패",e.message)}
 finally{refreshGithubControls()}
}

function strip(v){return String(v||"").replace(/<[^>]*>/g,"").replace(/&nbsp;/ig," ").replace(/&amp;/ig,"&").trim();}
function parseTable(source) {
 const loc=source.indexOf("Stats By Season");
 if(loc<0)return null;
 const end=source.indexOf("</table>",loc);
 if(end<0)return null;
 const part=source.slice(loc,end);
 const rows=[];
 for(const match of part.matchAll(/<tr(?:\s[^>]*)?>([\s\S]*?)(?=<tr(?:\s[^>]*)?>|<\/table>|$)/gi)){
  const cells=Array.from(match[1].matchAll(/<td\b[^>]*>([\s\S]*?)(?=<\/td>|<\/tr>|<tr|$)/gi),m=>strip(m[1]));
  if(cells.length)rows.push(cells);
 }
 // HTML input contains missing </tr> tags in its summary rows; the regex above still separates records.
 const header=rows.find(row=>row[0]==="Year");
 if(!header||header.length<8)return null;
 const kind=header.includes("ERA")?"pitcher":"batter", headers=header.slice(1);
 const seasons={};let career=null,last3=null;
 for(const row of rows) {
  const year=String(row[0]||"").match(/^((?:19|20)\d{2})\s*(?:\(([^)]*)\))?/);
  const stats={};headers.forEach((h,i)=>{if(row[i+1]!=null&&row[i+1]!=="")stats[h]=row[i+1]});
  if(year) {
   const level=(year[2]||"").toUpperCase();
   if(["A","AA","AAA"].includes(level))continue; // do not include minor-league rows in ML career
   const y=Number(year[1]),team=TEAM[level]?level:null;
   seasons[y]={year:y,team,stats};
  } else if(row[0]==="ML Career")career=stats;
  else if(row[0]==="Last 3")last3=stats;
 }
 return {kind,headers,seasons,career,last3};
}
function inferSeasonCode(raw){ // If the HHRecord is 2010 with user-facing RKBO season 60, this is a league-specific mapping.
 return raw;
}
function parsePlayerFile(text,path){
 const n=text.match(/<title>(.*?) Player Card<\/title>/i);
 const id=path.match(/p_(\d+)\.htm$/i);
 const main=parseTable(text);
 if(!id||!n||!main)return null;
 const teamLong=text.match(/<b>Team:<\/b>\s*([^<]+)/i);
 const number=text.match(/<b>Number:<\/b>\s*([^<]+)/i);
 const currentTeam=LONG_TO_CODE[(teamLong?.[1]||"").trim().toUpperCase()]||null;
 const latestYear=Math.max(0,...Object.keys(main.seasons).map(Number));
 if(latestYear&&currentTeam&&!main.seasons[latestYear].team)main.seasons[latestYear].team=currentTeam;
 return {id:id[1],name:strip(n[1]),number:strip(number?.[1]),team:currentTeam,kind:main.kind,seasons:main.seasons,career:main.career,last3:main.last3,latestYear,hhLatestYear:latestYear,source:"HHRecord player page"};
}
function mergeRecord(old,p){
 if(!old)return p;
 if(old.kind!==p.kind)return old;
 const newer=p.latestYear>=old.latestYear;
 const seasons={...old.seasons};
 for(const [year,rec] of Object.entries(p.seasons)){
  const prev=seasons[year];
  seasons[year]={...prev,...rec,team:rec.team||prev?.team||null,stats:rec.stats};
 }
 return {...old,...(newer?{name:p.name,number:p.number,team:p.team||old.team,career:p.career||old.career,last3:p.last3||old.last3,latestYear:p.latestYear}:{}),seasons,
  postSeasons:{...(old.postSeasons||{}),...(p.postSeasons||{})},
  postAliases:[...new Set([...(old.postAliases||[]),...(p.postAliases||[])])],
  koreanNameOverride:p.koreanNameOverride??old.koreanNameOverride,
  numberOverride:p.numberOverride??old.numberOverride};
}
let idb;
function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore("data");r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function store(){if(!idb)return;return new Promise((resolve,reject)=>{const tr=idb.transaction("data","readwrite");tr.objectStore("data").put(players,"players");tr.oncomplete=resolve;tr.onerror=()=>reject(tr.error)})}
async function restore(){idb=await openDb();return new Promise((resolve,reject)=>{const tr=idb.transaction("data","readonly");const q=tr.objectStore("data").get("players");q.onsuccess=()=>{players=q.result||{};resolve()};q.onerror=()=>reject(q.error)})}
async function importZip(file){
 if(!window.JSZip){report("ZIP 해제 모듈을 로딩할 수 없습니다. 인터넷 연결을 확인하세요.");return}
 $("zipInput").disabled=true;
 try{
  report("ZIP 해제 중: "+file.name);
  const zip=await JSZip.loadAsync(file),files=Object.keys(zip.files).filter(x=>/^(?:.*\/)?Results\/Players\/p_\d+\.htm$/i.test(x));
  if(!files.length)throw Error("Results/Players/p_숫자.htm 파일을 찾지 못했습니다.");
  let valid=0,fail=0;const incoming={};
  for(let i=0;i<files.length;i++){
   try{
    const txt=await zip.files[files[i]].async("string");
    const p=parsePlayerFile(txt,files[i]);
    if(!p){fail++;continue}
    incoming[p.id]=mergeRecord(incoming[p.id],p);valid++;
   }catch(e){fail++}
   if(i%20===0){report("선수 기록 추출 중 "+(i+1)+"/"+files.length);await new Promise(r=>setTimeout(r,0))}
  }
  if(!valid)throw Error("읽을 수 있는 선수 기록이 없습니다.");
  for(const p of Object.values(incoming)){
    // Resolve XLS-first imports: move an exact-matched provisional XLS player to the stable HHRecord ID.
    const xlsOnly=Object.fromEntries(Object.entries(players).filter(([key])=>key.startsWith("xls:")));
    const matched=window.RKBOXls?.match(p,xlsOnly);
    if(matched?.id&&!players[p.id]){
      const restored=RKBOXls.merge(p,players[matched.id]);restored.id=p.id;
      delete players[matched.id];players[p.id]=restored;
    }else players[p.id]=mergeRecord(players[p.id],p);
    players[p.id].hhLatestYear=Math.max(players[p.id].hhLatestYear||0,p.latestYear||0);
   }
  const reattached=RKBOPostseason.relink(players);
  players=reattached.players;
  await store();populate();report("완료: "+valid+"명 처리"+(fail?" · "+fail+"개 파일 분석 실패":"")+" · DB 총 "+Object.keys(players).length+"명"+(reattached.linked?" · 포시 이력 연결 "+reattached.linked+"명":""));
 }catch(e){console.error(e);report("불러오기 실패: "+e.message)}finally{$("zipInput").disabled=false}
}

function updatePostseasonStatus(message){
 const count=Object.values(players).reduce((n,p)=>n+Object.keys(p.postSeasons||{}).length,0);
 $("postseasonDbStatus").textContent=count.toLocaleString()+"개 시즌 기록";
 if(message)$("postImportStatus").textContent=message;
}
async function applyPostseasonRecords(rows,sourceDescription){
 if(!rows.length)throw Error("가져올 메이저리그 포스트시즌 기록이 없습니다.");
 const {players:updated,counts}=RKBOPostseason.merge(players,rows);
 const restored=RKBOPostseason.relink(updated);
 players=restored.players;await store();populate();
 updatePostseasonStatus(sourceDescription+" · "+rows.length+"개 기록 분석, 신규 시즌 "+
  counts.added+"건 · 갱신 "+counts.updated+"건 · 모호한 선수 "+counts.ambiguous+
  "명 · 팀 충돌 "+counts.conflicts+"건.");
 return counts;
}
async function importPostseasonZip(file){
 const season=parseSeasonNumber($("postSeasonInput").value);
 if(season===null){
  updatePostseasonStatus("먼저 이 ZIP의 포스트시즌 차수(예: 60)를 입력해 주세요. HTML의 '2002 시즌'은 무시합니다.");
  return;
 }
 if(!window.JSZip)throw Error("ZIP 처리 모듈을 불러올 수 없습니다.");
 $("postZipInput").disabled=true;
 try{
  updatePostseasonStatus(season+"차 포스트시즌 ZIP 읽는 중…");
  const zip=await JSZip.loadAsync(file);
  const sourceFiles=Object.keys(zip.files).filter(path=>/(?:^|\/)[A-Z]{2,3}\.html?$/i.test(path));
  const all=[];let count=0;let failed=0;
  for(const path of sourceFiles){
   const base=path.split("/").at(-1),code=base.replace(/\.html?$/i,"").toUpperCase();
   if(!RKBOPostseason.team(code))continue;
   try{
    const html=await zip.files[path].async("string");
    all.push(...RKBOPostseason.parseMajorLeagueHtml(html,code,season));
    count++;
   }catch(error){failed++;console.error("Postseason parse: "+path,error)}
  }
  if(!count||!all.length)throw Error("ZIP에서 지원되는 구단의 Major League 개인 성적을 찾지 못했습니다.");
  await applyPostseasonRecords(all,season+"차 · "+count+"개 팀"+(failed?", 실패 "+failed+"개 파일":""));
  $("postSeasonInput").value=String(season);
 }finally{$("postZipInput").disabled=false}
}
async function importPostseasonWorkbook(file){
 if(!window.XLSX)throw Error("Excel 처리 모듈을 불러올 수 없습니다.");
 $("postHistoryInput").disabled=true;
 try{
  updatePostseasonStatus("과거 포스트시즌 XLSX 읽는 중…");
  const rows=RKBOPostseason.parseWorkbook(await file.arrayBuffer());
  await applyPostseasonRecords(rows,"과거 포스트시즌 통산 XLSX");
 }finally{$("postHistoryInput").disabled=false}
}

function toText(name){return TEAM[name]?.[0]||"소속 구단 미확인"}
function availableTeams(){return [...new Set(Object.values(players).map(p=>p.team).filter(Boolean))].sort()}
function populate(){
 const prev=$("teamSelect").value;
 $("teamSelect").replaceChildren(new Option("전체 구단","ALL"),...availableTeams().map(t=>new Option(toText(t),t)));
 $("teamSelect").value=availableTeams().includes(prev)?prev:"ALL";
 $("dbStatus").textContent=Object.keys(players).length.toLocaleString()+"명 저장";
 updatePostseasonStatus();
 updatePlayerList();
}
function updatePlayerList(){
 const team=$("teamSelect").value;
 const year=currentSeason===null?0:currentSeason+1950;
 const includeRetired=$("includeRetired").checked;
 const post=$("careerModeSelect").value==="postseason";
 const list=post
  ?Object.values(players).filter(p=>
     (team==="ALL"||p.team===team)&&
     (includeRetired?Object.keys(p.postSeasons||{}).length>0:year>0&&!!p.postSeasons?.[year]))
    .sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"ko"))
  :year===0&&!includeRetired?[]:RKBOPlayerFilter.list(players,{team,includeRetired,year});
 $("latestSeasonHint").textContent=post
  ?(includeRetired?"역대 포스트시즌 출전 선수 표시 중":currentSeason===null?
     "최신 시즌 차수를 저장하거나 ‘은퇴 선수 포함’을 선택하세요.":
     "포스트시즌 "+currentSeason+"차 출전 선수만 표시")
  :currentSeason===null
   ?(includeRetired?"최신 시즌 미설정 · 전체 선수 표시 중":"최신 시즌 차수를 저장하면 해당 시즌 현역 선수만 표시됩니다.")
   :("기준 "+currentSeason+"차 · "+(includeRetired?"은퇴 선수 포함":"해당 시즌 출전 선수만 표시"));
 $("playerSelect").replaceChildren(new Option(list.length?list.length+"명 중 선수 선택":"검색 결과 없음",""),
  ...list.map(p=>new Option(rosterInfo(p).displayName+" · "+toText(p.team)+" · "+
    (p.kind==="pitcher"?"투수":"타자"),p.id)));
 if(list.some(p=>p.id===selectedId))$("playerSelect").value=selectedId;
 else{selectedId="";$("playerSelect").value=""}
 showIdentityEditor();
 draw();
}
function roundedRect(ctx,x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill()}
function text(ctx,str,x,y,opt={}){ctx.fillStyle=opt.color||"#122139";ctx.font=(opt.bold?"700 ":"500 ")+(opt.size||23)+"px 'Noto Sans KR',sans-serif";ctx.textAlign=opt.align||"left";ctx.textBaseline="middle";ctx.fillText(String(str),x,y,opt.max||1e4)}
function fmt(s,key){
 const v=s?.[key];
 if(key==="OPS")return s?.OBP!=null&&s?.SLG!=null?(Number(s.OBP)+Number(s.SLG)).toFixed(3):"—";
 if(v==null||v==="")return "—";
 if(["AVG","OBP","SLG"].includes(key))return Number(v).toFixed(3).replace(/^0\./,".");
 if(key==="ERA")return Number(v).toFixed(2);
 if(key==="IP"){
  const [whole,frac="0"]=String(v).split(".");
  return whole+(frac==="33"?".1":frac==="67"?".2":frac==="00"||frac==="0"?"":("."+frac));
 }
 return String(v);
}
function computeFA(p){
 const s=p.career||{}; if(p.kind==="batter"){
  const a=Number(s.AVG||0),o=Number(s.OBP||0),sl=Number(s.SLG||0),ab=Number(s.AB||0);
  const n=Number(a>=.3)+Number(o-a>=.08)+Number(sl-a>=.18);
  return ab>=750?n>=2?"A":n===1?"B":"C":"C";
 }
 const games=Number(s.G||0),starts=Number(s.GS||0),ip=Number(s.IP||0);
 const starter=games>0&&starts/games>=.3;
 const n=Number(Number(s.AVG||1)<=.24)+Number(Number(s.OBP||1)<=.29)+Number(Number(s.SLG||1)<=.34);
 return ip>=(starter?300:120)?(n>=2?"A":n===1?"B":"C"):"C";
}
function drawImageContain(ctx,img,x,y,w,h,zoom,dx,dy){
 const ratio=Math.min(w/img.width,h/img.height);
 const ww=img.width*ratio*zoom,hh=img.height*ratio*zoom;
 ctx.drawImage(img,x+(w-ww)/2+dx,y+(h-hh)/2+dy,ww,hh);
}
function loadRowSprite(){
 if(rowSprite)return;
 const img=new Image();
 rowSprite=img;
 img.onload=()=>draw();
 img.onerror=()=>{console.warn("User-supplied round team badges could not be loaded");rowSprite=false};
 img.src="./assets/row-team-logos.png?v=20261021";
}
async function fetchLogo(team){
 if(!team||logos[team]!==undefined)return;
 logos[team]=null;
 const img=new Image();img.onload=()=>{logos[team]=img;draw()};img.onerror=()=>{logos[team]=false;draw()};
 img.crossOrigin="anonymous";img.src="https://raw.githubusercontent.com/p0emkite/RKBO-/main/logos/"+team+".webp";
}
function draw(){
 if(window.RKBOCard){
  const p=players[selectedId],identity=rosterInfo(p);
  const mode=$("careerModeSelect").value;
  const data=RKBOCard.draw({displayName:identity.displayName,displayNumber:identity.number,
   canvas:$("cardCanvas"),p,mode,teamInfo:TEAM,image:photo,logos,rowSprite,wins:championMap,
   gradient:$("bgStyle").value==="gradient",color2:$("bgColor2").value,angle:$("bgAngle").value,
   photoZoom:$("zoom").value,photoX:$("offsetX").value,photoY:$("offsetY").value,
   fa:$("faCheck").checked,faGrade:$("faGrade").value||computeFA(p||{kind:"batter"})});
  $("downloadBtn").disabled=!p||(mode==="postseason"&&data.rows===0);
  $("playerInfo").textContent=p
   ?("선수 ID "+p.id+" · "+toText(p.team)+" · "+
     (mode==="postseason"?data.rows+"개 포스트시즌 기록":Object.keys(p.seasons||{}).length+"시즌 · FA "+computeFA(p))+
     " · 우승 "+data.won+"회")
   :"선수를 선택하세요.";
  $("previewDescription").textContent=p
   ?identity.displayName+" · "+(mode==="postseason"?"포스트시즌 ":"정규 시즌 ")+data.rows+"개 시즌"
   :"데이터를 가져온 뒤 선수를 선택하세요.";
  $("kindBadge").textContent=p?.kind==="pitcher"?"PITCHER":p?"BATTER":"CAREER";
  if(p)Object.values((mode==="postseason"?p.postSeasons:p.seasons)||{}).forEach(r=>fetchLogo(r.team));
  return;
 }
 const canvas=$("cardCanvas"),ctx=canvas.getContext("2d");
 const p=players[selectedId],list=p?Object.values(p.seasons||{}).sort((a,b)=>a.year-b.year):[];
 const cols=p?(p.kind==="pitcher"?pitCols:batCols):batCols;
 const rowH=49,top=590,rows=list.length+2;
 canvas.width=1640;canvas.height=Math.max(850,top+(rows+1)*rowH+75);
 const W=canvas.width,H=canvas.height;ctx.fillStyle="#f8fbff";ctx.fillRect(0,0,W,H);
 const theme=TEAM[p?.team]||["RKBO","#153b66","RKBO LEAGUE"];const tc=theme[1];
 ctx.fillStyle=tc;ctx.fillRect(0,0,W,36);ctx.fillStyle="#07172c";ctx.fillRect(0,36,W,500);
 ctx.fillStyle="#fff";ctx.globalAlpha=.05;
 for(let i=-200;i<W+300;i+=140){ctx.save();ctx.translate(i,150);ctx.rotate(-.4);ctx.fillRect(0,0,50,490);ctx.restore()}ctx.globalAlpha=1;
 text(ctx,"RKBO  /  CAREER RECORD",68,95,{bold:true,size:24,color:"#adc5e3"});
 text(ctx,p?theme[2]:"RKBO CAREER STUDIO",68,154,{bold:true,size:36,color:"#fff"});
 if(p){
  fetchLogo(p.team);
  if(logos[p.team] instanceof Image)ctx.drawImage(logos[p.team],W-200,68,128,128);
  text(ctx,(rosterInfo(p).number?"#"+rosterInfo(p).number+"  ":"")+rosterInfo(p).displayName,68,247,{bold:true,size:61,max:790,color:"#fff"});
  text(ctx,(p.kind==="pitcher"?"PITCHER":"BATTER")+"   •   "+list.length+" SEASONS",70,312,{bold:true,size:23,color:"#a9c4df"});
  const faOn=$("faCheck").checked,grade=$("faGrade").value||computeFA(p);
  if(faOn){roundedRect(ctx,70,351,176,50,8,"#263c58");text(ctx,"FA  "+grade+"등급",87,377,{bold:true,size:25,color:grade==="A"?"#ffdf4e":"#fff"})}
  if(photo){
   ctx.save();ctx.beginPath();ctx.rect(975,40,455,496);ctx.clip();
   drawImageContain(ctx,photo,975,54,455,460,Number($("zoom").value)/100,Number($("offsetX").value),Number($("offsetY").value));ctx.restore();
  }else{
   roundedRect(ctx,1080,170,320,260,18,"#21334a");text(ctx,"UPLOAD PNG",1240,302,{align:"center",size:26,color:"#9ab3d6",bold:true});
  }
 } else {text(ctx,"SEASON DATABASE",70,249,{bold:true,size:65,color:"#fff"});text(ctx,"HHRecord ZIP을 업로드한 뒤 선수를 선택하세요.",70,320,{size:25,color:"#a9c4df"})}
 ctx.fillStyle=tc;ctx.fillRect(0,536,W,54);text(ctx,p?"정규 시즌 통산 기록  /  REGULAR SEASON":"SEASON-BY-SEASON CAREER RECORD",68,563,{color:"#fff",size:24,bold:true});
 const startX=32,endX=W-32,tableWidth=endX-startX,labelW=160;
 const cw=(tableWidth-labelW)/cols.length;
 ctx.fillStyle="#e0e8f2";ctx.fillRect(startX,top,tableWidth,rowH);
 text(ctx,"시즌 / 구단",startX+16,top+rowH/2,{bold:true,size:17});
 cols.forEach((key,i)=>text(ctx,key==="OPS"?"OPS":key,startX+labelW+(i+.5)*cw,top+rowH/2,{bold:true,size:Math.min(19,cw*.38),align:"center"}));
 const entries=p?[...list.map(row=>({...row,label:(row.year-1950)+"차"})),{label:"LAST 3",team:null,stats:p.last3||{}},{label:"ML 통산",team:null,stats:p.career||{}}]:[];
 entries.forEach((rec,i)=>{
  const y=top+(i+1)*rowH,total=i>=list.length;
  ctx.fillStyle=total?(i===list.length?"#d8e4f3":"#bed4ec"):i%2?"#f0f4fa":"#fff";ctx.fillRect(startX,y,tableWidth,rowH);
  if(!total&&rec.team){ctx.fillStyle=TEAM[rec.team]?.[1]||tc;ctx.fillRect(startX,y,9,rowH)}
  text(ctx,rec.label,startX+18,y+rowH/2,{bold:true,size:total?19:18});
  if(!total)text(ctx,rec.team||"—",startX+116,y+rowH/2,{size:17,align:"center",color:rec.team?"#233951":"#8997aa"});
  cols.forEach((key,j)=>text(ctx,fmt(rec.stats,key),startX+labelW+(j+.5)*cw,y+rowH/2,{size:Math.min(18,cw*.37),align:"center",bold:total}));
  ctx.fillStyle="#dae2eb";ctx.fillRect(startX,y+rowH-1,tableWidth,1);
 });
 text(ctx,"RKBO CAREER MAKER   •   STATS FROM HHRECORD",W-32,H-34,{size:17,align:"right",color:"#8497af"});
 $("downloadBtn").disabled=!p;
 $("playerInfo").textContent=p?"선수 ID "+p.id+" · "+toText(p.team)+" · 등번호 "+(p.number||"미확인")+" · "+list.length+"시즌 · 최근 시즌 "+(p.latestYear||"—")+"차 · FA 계산 등급 "+computeFA(p):"선수를 선택하면 시즌별 기록과 ML Career가 자동 표시됩니다.";
 $("previewDescription").textContent=p?p.name+" · 총 "+list.length+"개 ML 시즌 · "+(p.kind==="pitcher"?"투수":"타자"):"데이터를 가져온 뒤 선수를 선택하세요.";
 $("kindBadge").textContent=p?.kind==="pitcher"?"PITCHER":p?"BATTER":"CAREER";
}
async function init(){
 try{await restore();try{championMap={...RKBOChampions.DEFAULT,...JSON.parse(localStorage.getItem("rkbo-champions")||"{}")}}catch(e){championMap={...RKBOChampions.DEFAULT}}; $("champions").value=RKBOChampions.format(championMap);showChampionStatus("기본 22~60차 "+Object.keys(RKBOChampions.DEFAULT).length+"개 우승 시즌을 불러왔습니다. 수정한 뒤 저장하면 즉시 반영됩니다.");let savedSeason=null;try{savedSeason=localStorage.getItem(CURRENT_SEASON_KEY)}catch(e){}applySeason(savedSeason,{persist:false});populate();report("브라우저 DB 준비 완료 · 기준 시즌을 직접 저장할 수 있습니다.")}catch(e){report("브라우저 저장소를 열지 못했습니다: "+e.message)}
 for(const id of ["teamSelect","includeRetired"])$(id).addEventListener("change",updatePlayerList);
 $("careerModeSelect").addEventListener("change",updatePlayerList);

 $("saveCurrentSeason").addEventListener("click",()=>{
  const val=parseSeasonNumber($("currentSeasonInput").value);
  if(val===null){
   $("currentSeasonStatus").textContent="1~999 사이의 시즌 차수를 정수로 입력해 주세요.";
   return;
  }
  applySeason(val);
  updatePlayerList();
  report("최신 시즌을 "+val+"차로 저장했습니다. GitHub 공용 설정에도 반영하려면 '현재 DB를 GitHub에 저장'을 누르세요.");
 });
 $("currentSeasonInput").addEventListener("keydown",e=>{
  if(e.key==="Enter"){$("saveCurrentSeason").click();e.preventDefault()}
 });
 $("githubConnect").addEventListener("click",async()=>{
  const value=$("githubToken").value;
  $("githubToken").value="";
  $("githubConnect").disabled=true;
  setCloudStatus("인증 확인 중","GitHub 토큰 권한을 확인 중입니다.");
  try{
   await RKBOGitHubDB.connect(value);
   setCloudStatus("토큰 연결됨","토큰은 현재 열린 페이지의 메모리에만 보관됩니다. 저장 버튼을 누르면 공개 GitHub DB에 커밋합니다.");
  }catch(e){setCloudStatus("인증 실패",e.message)}
  finally{refreshGithubControls()}
 });
 $("githubDisconnect").addEventListener("click",()=>{
  RKBOGitHubDB.disconnect();refreshGithubControls();
  setCloudStatus("토큰 연결 해제","읽기는 계속 가능하지만 GitHub에 기록하려면 토큰을 다시 연결해야 합니다.");
 });
 $("githubLoad").addEventListener("click",()=>loadCloud());
 $("githubSave").addEventListener("click",publishCloud);

 $("playerSelect").addEventListener("change",()=>{selectedId=$("playerSelect").value;showIdentityEditor();photoGeneration++;photo=null;originalPhotoFile=null;$("photoInput").value="";photoButtons();cutoutStatus("사진을 선택하면 AI 누끼를 사용할 수 있습니다.");$("faCheck").checked=false;$("faGrade").disabled=true;draw()});

 $("saveIdentity").addEventListener("click",async()=>{
  const p=players[selectedId];if(!p)return;
  const kor=$("koreanNameInput").value.trim(),jersey=$("jerseyNumberInput").value.trim();
  if(jersey&&!/^[0-9A-Za-z-]{1,6}$/.test(jersey)){
   $("identityStatus").textContent="등번호는 00처럼 숫자 또는 6자 이내의 영문/숫자로 입력해 주세요.";return
  }
  const auto=RKBOReference.get({...p,koreanNameOverride:"",numberOverride:""});
  p.koreanNameOverride=kor&&kor!==auto.koreanName?kor:"";
  p.numberOverride=jersey&&jersey!==(auto.number||"")?jersey:"";
  await store();populate();
  $("identityStatus").textContent="한글 닉네임·등번호 저장 완료 · GitHub에도 반영하려면 공용 DB 저장을 눌러 주세요.";
 });
 $("clearIdentity").addEventListener("click",async()=>{
  const p=players[selectedId];if(!p)return;
  delete p.koreanNameOverride;delete p.numberOverride;
  await store();populate();
  $("identityStatus").textContent="수동 수정 초기화 완료 · CSV 매칭값을 다시 적용했습니다.";
 });

 $("xlsInput").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;try{report("RKBO XLS 읽는 중...");const parsed=RKBOXls.parse(await file.arrayBuffer());const result=RKBOXls.reconcile(players,RKBOXls.group(parsed));const reassigned=RKBOPostseason.relink(result.players);players=reassigned.players;await store();populate();report("XLS "+parsed.length+"개 기록 · 연결 "+result.info.linked+"명 · 신규 "+result.info.created+"명 · 중복·충돌 "+result.info.conflicts+"건 · 판정 보류 "+result.info.ambiguous+"명");}catch(e){console.error(e);report("XLS 불러오기 실패: "+e.message)}e.target.value=""});
 for(const id of ["bgStyle","bgColor2","bgAngle"])$(id).addEventListener("change",draw);
 $("saveChampions").onclick=()=>{
  const result=RKBOChampions.parse($("champions").value);
  if(result.errors.length){
   showChampionStatus("저장 실패: "+result.errors.slice(0,3).join(" / "));
   return;
  }
  if(!result.count){showChampionStatus("저장할 우승 시즌이 없습니다.");return}
  setChampionMap(result.map,"우승 시즌 "+result.count+"개 저장 완료 · 미리보기의 우승 별에 즉시 반영했습니다.");
 };
 $("resetChampions").onclick=()=>setChampionMap(RKBOChampions.DEFAULT,
  "기본 22~60차 우승팀 "+Object.keys(RKBOChampions.DEFAULT).length+"개 복원 완료.");
 $("postZipInput").addEventListener("change",async e=>{
  const file=e.target.files[0];if(!file)return;
  try{await importPostseasonZip(file)}
  catch(error){console.error(error);updatePostseasonStatus("ZIP 등록 실패: "+error.message)}
  finally{e.target.value=""}
 });
 $("postHistoryInput").addEventListener("change",async e=>{
  const file=e.target.files[0];if(!file)return;
  try{await importPostseasonWorkbook(file)}
  catch(error){console.error(error);updatePostseasonStatus("과거 포시 기록 등록 실패: "+error.message)}
  finally{e.target.value=""}
 });
 $("postSeasonInput").addEventListener("input",()=>{
  const season=parseSeasonNumber($("postSeasonInput").value);
  if(season!==null)updatePostseasonStatus("ZIP에 적용할 포스트시즌 차수: "+season+"차 (HTML의 2002 시즌 표기 무시)");
 });
 $("zipInput").addEventListener("change",async e=>{if(e.target.files[0])await importZip(e.target.files[0]);e.target.value=""});
 $("photoInput").addEventListener("change",async e=>{
  const file=e.target.files[0];if(!file)return;
  if(!["image/png","image/jpeg","image/webp"].includes(file.type)){
   cutoutStatus("PNG, JPG, WEBP 파일만 선택할 수 있습니다.");return;
  }
  const version=++photoGeneration;originalPhotoFile=file;photoButtons();
  try{await loadPhotoBlob(file,version,"원본 사진 적용됨 · AI 누끼를 누르면 배경을 제거합니다.")}
  catch(error){if(version===photoGeneration){originalPhotoFile=null;photoButtons();cutoutStatus(error.message)}}
 });
 $("cutoutBtn").addEventListener("click",doCutout);
 $("restorePhotoBtn").addEventListener("click",async()=>{
  if(!originalPhotoFile||cutoutBusy)return;
  try{await loadPhotoBlob(originalPhotoFile,photoGeneration,"원본 사진 복원 완료")}
  catch(error){cutoutStatus(error.message)}
 });
 for(const id of ["zoom","offsetX","offsetY"])$(id).addEventListener("input",()=>{$(id+"Val").textContent=$(id).value+(id==="zoom"?"%":"");draw()});
 $("resetPhoto").onclick=()=>{for(const id of ["zoom","offsetX","offsetY"]){$(id).value=id==="zoom"?100:0;$(id+"Val").textContent=$(id).value+(id==="zoom"?"%":"")}draw()};
 $("faCheck").onchange=()=>{$("faGrade").disabled=!$("faCheck").checked;if($("faCheck").checked&&!$("faGrade").value)$("faGrade").value=computeFA(players[selectedId]||{kind:"batter"});draw()};
 $("faGrade").onchange=draw;
 $("downloadBtn").onclick=async()=>{const p=players[selectedId];if(!p)return;try{await document.fonts.load('700 20px "Noto Sans KR"');await document.fonts.ready;}catch(e){console.warn("Font loading failed",e)}draw();const a=document.createElement("a");a.href=$("cardCanvas").toDataURL("image/png");a.download="RKBO_"+($("careerModeSelect").value==="postseason"?"Postseason_":"Regular_")+"Career_"+p.name.replace(/[^a-zA-Z0-9가-힣_-]/g,"_")+".png";a.click()};
 $("exportDb").onclick=()=>{const blob=new Blob([JSON.stringify({schema:1,exportedAt:new Date().toISOString(),players})],{type:"application/json"});const a=document.createElement("a"),u=URL.createObjectURL(blob);a.href=u;a.download="RKBO_Career_DB_"+new Date().toISOString().slice(0,10)+".json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
 $("importDb").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const payload=JSON.parse(await f.text());if(payload.schema!==1||!payload.players||typeof payload.players!=="object")throw Error("지원되지 않는 백업입니다.");for(const p of Object.values(payload.players)){if(p&&p.id&&p.seasons&&p.kind)players[p.id]=mergeRecord(players[p.id],p)}await store();populate();report("백업 복원 완료: "+Object.keys(players).length+"명")}catch(err){report("복원 실패: "+err.message)}e.target.value=""};
 $("resetDb").onclick=async()=>{if(!confirm("이 브라우저의 RKBO 선수 DB를 모두 지울까요?"))return;players={};await store();selectedId="";populate();report("DB 초기화 완료")};
 updatePostseasonStatus();
 draw();
 loadRowSprite();
 refreshGithubControls();
 void RKBOReference.load().then(summary=>{
  populate();showUnmatchedRoster();
  report("한글 닉네임 매칭표 "+summary.englishUnique+"개 · 60차 등번호 이름 일치 "+summary.matchedJerseys+"행 · 미매칭 "+summary.unmatched.length+"명 보관 (동명이인·60차 출전 여부는 별도 확인)");
 }).catch(e=>{console.error(e);$("unmatchedRosterDetails").textContent="CSV 로드 실패: "+e.message});
 void loadCloud({automatic:true});
}
document.addEventListener("DOMContentLoaded",()=>{init();if(document.fonts)document.fonts.ready.then(draw).catch(()=>{});});
