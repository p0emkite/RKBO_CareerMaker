"use strict";
window.RKBOGitHubDB = (() => {
  const owner="p0emkite", repo="RKBO_CareerMaker";
  const path="data/career-db.json";
  const api="https://api.github.com/repos/"+owner+"/"+repo;
  let token="",knownSha=null;
  function endpoint(){return api+"/contents/"+path}
  function decode(text){
    const binary=atob(String(text||"").replace(/\s+/g,""));
    const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  function encode(text){
    const bytes=new TextEncoder().encode(text);
    let binary="";
    for(let i=0;i<bytes.length;i+=32768)
      binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
    return btoa(binary);
  }
  // Settings are public, non-sensitive and keyed by the player's latest team.
  const validTeams=new Set(["KIA","HAN","SAM","LOT","LG","DOO","SSG","NC","SK","KT","KIW"]);
  const validDirections=new Set(["0","90","45","-45"]);
  function normalizeTeamGradients(source){
    if(!source||typeof source!=="object"||Array.isArray(source))return {};
    const output={};
    for(const [code,item] of Object.entries(source)){
      if(!validTeams.has(code)||!item||typeof item!=="object")continue;
      const color2=typeof item.color2==="string"&&/^#[0-9a-fA-F]{6}$/.test(item.color2)
        ?item.color2.toLowerCase():"#17263c";
      const angle=validDirections.has(String(item.angle))?String(item.angle):"0";
      output[code]={style:item.style==="gradient"?"gradient":"solid",color2,angle};
    }
    return output;
  }
  function validate(raw){
    if(!raw||typeof raw!=="object"||![1,2].includes(raw.schema)||!raw.players||typeof raw.players!=="object"||Array.isArray(raw.players))
      throw Error("GitHub DB 형식이 올바르지 않습니다.");
    const n=raw.currentSeason;
    return {schema:2,updatedAt:raw.updatedAt||null,
      currentSeason:Number.isInteger(Number(n))&&n!==null&&n!==""&&Number(n)>=1&&Number(n)<=999?Number(n):null,
      champions:raw.champions&&typeof raw.champions==="object"&&!Array.isArray(raw.champions)?raw.champions:{},
      teamGradients:normalizeTeamGradients(raw.teamGradients),
      // Compact per-season top-three leaderboards, separate from player statistics.
      rankings:window.RKBORankings?.normalizeRecords
        ?window.RKBORankings.normalizeRecords(raw.rankings)
        :(raw.rankings&&typeof raw.rankings==="object"&&!Array.isArray(raw.rankings)?raw.rankings:{}),
      players:raw.players};
  }
  async function request(url,options={}){
    const headers={"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28",...(options.headers||{})};
    if(token)headers.Authorization="Bearer "+token;
    let response;
    try{
      response=await fetch(url,{cache:"no-store",...options,headers});
    }catch(e){throw Error("GitHub 연결 실패: 인터넷 및 브라우저 보안 설정을 확인하세요.");}
    if(response.status===404&&options.allowNotFound)return null;
    if(!response.ok){
      const payload=await response.json().catch(()=>({}));
      const message=payload.message||response.statusText||"요청 실패";
      if(response.status===401||response.status===403)throw Error("GitHub 인증/권한 오류 ("+response.status+"): 토큰 만료 또는 Contents 쓰기 권한을 확인하세요. "+message);
      if(response.status===409||response.status===422)throw Error("GitHub DB 변경 충돌: 먼저 최신 데이터를 다시 불러오세요. "+message);
      throw Error("GitHub 오류 ("+response.status+"): "+message);
    }
    return response.json();
  }
  async function read(){
    const meta=await request(endpoint()+"?ref=main",{allowNotFound:true});
    if(!meta){knownSha=null;return null;}
    if(meta.type!=="file")throw Error("GitHub 저장 위치가 파일이 아닙니다.");
    let base64=meta.content;
    if(!base64){
      const blob=await request(api+"/git/blobs/"+encodeURIComponent(meta.sha));
      base64=blob.content;
    }
    if(!base64)throw Error("GitHub DB 파일 본문을 읽을 수 없습니다.");
    const data=validate(JSON.parse(decode(base64)));
    knownSha=meta.sha;
    return {sha:meta.sha,data};
  }
  async function connect(value){
    const candidate=String(value||"").trim();
    if(!candidate)throw Error("GitHub Fine-grained 토큰을 입력하세요.");
    token=candidate;
    try{
      // Verify access to the intended repository without changing any files.
      await request(api);
      return true;
    }catch(e){token="";throw e}
  }
  function disconnect(){token=""}
  function isConnected(){return !!token}
  async function save(raw){
    if(!token)throw Error("GitHub 저장 전 토큰을 연결하세요.");
    const data=validate(raw);
    data.updatedAt=new Date().toISOString();
    const meta=await request(endpoint()+"?ref=main",{allowNotFound:true});
    if(meta?.sha!==knownSha)
      throw Error("저장소의 DB가 확인 이후 변경되었습니다. 먼저 GitHub DB를 다시 불러온 다음 저장하세요.");
    const body={message:"data: update RKBO career database",branch:"main",
      content:encode(JSON.stringify(data))};
    if(meta?.sha)body.sha=meta.sha;
    const result=await request(endpoint(),{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(!result?.content?.sha)throw Error("저장 응답에 GitHub 파일 SHA가 없습니다. 저장소를 확인하세요.");
    knownSha=result.content.sha;
    return {sha:knownSha,updatedAt:data.updatedAt,commit:result.commit?.sha||null};
  }
  function getKnownSha(){return knownSha}
  return {read,save,connect,disconnect,isConnected,getKnownSha,validate,normalizeTeamGradients,decode,encode,repository:owner+"/"+repo,path};
})();