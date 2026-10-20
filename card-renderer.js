"use strict";
window.RKBOCard=(()=>{
 const bat=[["year","시즌",48],["team","소속팀",100],["G","경기수",70],["AVG","타율",80],["OBP","출루율",80],["SLG","장타율",80],["OPS","OPS",80],["AB","타수",76],["H","안타",75],["2B","2루타",72],["3B","3루타",72],["HR","홈런",70],["R","득점",70],["RBI","타점",70],["BB","볼넷",70],["K","삼진",70],["SB","도루",70],["CS","도루 실패",90]];
 const postBat=[["champ","우승",47],["year","시즌",48],["team","소속팀",100],["POS","포지션",62],
  ["G","경기수",70],["AVG","타율",80],["OBP","출루율",80],["SLG","장타율",80],["OPS","OPS",80],
  ["AB","타수",76],["H","안타",75],["2B","2루타",72],["3B","3루타",72],["HR","홈런",70],
  ["R","득점",70],["RBI","타점",70],["BB","볼넷",70],["K","삼진",70],["SB","도루",70],["CS","도루실패",86]];
 const postPit=[["champ","우승",48],["year","시즌",48],["team","소속팀",95],
  ["ERA","방어율",71],["W","승",51],["L","패",51],["SV","세",51],["BS","블론",61],
  ["G","경기",61],["GS","선발",61],["CG","완투",61],["SHO","완봉",61],["IP","투구이닝",90],
  ["K","탈삼진",72],["BB","볼넷",72],["H","피안타",72],["2B","2루",57],["3B","3루",57],
  ["HR","홈런",57],["SB","도루",57],["CS","도실",57],["BK","보크",57],["R","실점",57],
  ["ER","자책점",72],["AVG","피안",65],["OBP","피출",65],["SLG","피장",65]];
 const pit=[["year","시즌",48],["team","소속팀",95],["ERA","방어율",71],["W","승",51],["L","패",51],["SV","세",51],["BS","블론",61],["G","경기",61],["GS","선발",61],["CG","완투",61],["SHO","완봉",61],["IP","투구이닝",90],["K","탈삼진",72],["BB","볼넷",72],["H","피안타",72],["2B","2루",57],["3B","3루",57],["HR","홈런",57],["SB","도루",57],["CS","도실",57],["BK","보크",57],["WP","폭투",57],["R","실점",57],["ER","자책점",72],["AVG","피안",65],["OBP","피출",65],["SLG","피장",65],["HLD","홀드",55],["QS","퀄스",55]];
 function tint(hex,f){if(!/^#[0-9a-f]{6}$/i.test(hex))return hex;const parts=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return "#"+parts.map(n=>Math.max(0,Math.min(255,Math.round(n*f))).toString(16).padStart(2,"0")).join("")}
 function bg(ctx,W,H,palette,gradient,color2,angle){
  if(gradient){
   const a=Number(angle)||0,rad=a*Math.PI/180,dx=Math.cos(rad),dy=Math.sin(rad);
   const g=ctx.createLinearGradient(W/2-dx*W/2,H/2-dy*H/2,W/2+dx*W/2,H/2+dy*H/2);
   g.addColorStop(0,palette);g.addColorStop(1,color2||tint(palette,.48));ctx.fillStyle=g;
  }else ctx.fillStyle=palette;
  ctx.fillRect(0,0,W,H);
 }
 function write(ctx,val,x,y,size=19,align="center",bold=true,color="#fff",max=1000){
  ctx.font=(bold?"700 ":"500 ")+size+"px 'Noto Sans KR', sans-serif";
  ctx.textBaseline="middle";ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(String(val),x,y,max);
 }

 function fitFont(ctx,value,ideal,min,maxW,bold=true){
  let size=ideal;
  while(size>min){
   ctx.font=(bold?"700 ":"500 ")+size+"px 'Noto Sans KR', sans-serif";
   if(ctx.measureText(String(value)).width<=maxW)return size;
   size--;
  }
  return min;
 }
 function pitcherRole(p){
  const s=RKBOXls.summary(p,"career")||p?.career||{};
  const games=Number(s.G||0),starts=Number(s.GS||0);
  return games>0&&starts/games>=0.3?"선발투수":"불펜투수";
 }
 const ROW_SPRITE_TEAMS={LG:0,DOO:1,KIA:2,SAM:3,HAN:4,LOT:5,SSG:6,NC:7,KT:8,KIW:9};
 function rate(stat,k){
  if(k==="OPS")return stat?.OBP!=null&&stat?.SLG!=null?(Number(stat.OBP)+Number(stat.SLG)).toFixed(3):"—";
  const v=stat?.[k];if(v==null||v==="")return "—";
  if(["AVG","OBP","SLG"].includes(k))return Number(v).toFixed(3);
  if(k==="ERA")return Number(v).toFixed(2);
  if(k==="IP"){
   const n=Number(v);return Number.isFinite(n)?n.toFixed(2):String(v);
  }
  return String(v);
 }
 const logoBoundsCache=new WeakMap();
 function visibleLogoBounds(img){
  const cached=logoBoundsCache.get(img);
  if(cached)return cached;
  const fallback={sx:0,sy:0,sw:img.naturalWidth,sh:img.naturalHeight};
  if(typeof document==="undefined"||!img.naturalWidth||!img.naturalHeight)return fallback;
  try{
   const sampleMax=320,scale=Math.min(1,sampleMax/Math.max(img.naturalWidth,img.naturalHeight));
   const cw=Math.max(1,Math.round(img.naturalWidth*scale));
   const ch=Math.max(1,Math.round(img.naturalHeight*scale));
   const probe=document.createElement("canvas");probe.width=cw;probe.height=ch;
   const context=probe.getContext("2d",{willReadFrequently:true});
   if(!context)return fallback;
   context.drawImage(img,0,0,cw,ch);
   const data=context.getImageData(0,0,cw,ch).data;
   let left=cw,top=ch,right=-1,bottom=-1;
   for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
    if(data[(y*cw+x)*4+3]<8)continue;
    left=Math.min(left,x);right=Math.max(right,x);
    top=Math.min(top,y);bottom=Math.max(bottom,y);
   }
   if(right<left||bottom<top)return fallback;
   // Two sampled pixels of slack protect antialiased logo edges.
   left=Math.max(0,left-2);top=Math.max(0,top-2);
   right=Math.min(cw,right+2);bottom=Math.min(ch,bottom+2);
   const sx=Math.floor(left*img.naturalWidth/cw);
   const sy=Math.floor(top*img.naturalHeight/ch);
   const ex=Math.ceil((right+1)*img.naturalWidth/cw);
   const ey=Math.ceil((bottom+1)*img.naturalHeight/ch);
   const bounds={sx,sy,sw:Math.max(1,Math.min(img.naturalWidth,ex)-sx),
    sh:Math.max(1,Math.min(img.naturalHeight,ey)-sy)};
   logoBoundsCache.set(img,bounds);
   return bounds;
  }catch(error){
   console.warn("Cannot inspect logo transparency; using uncropped logo",error);
   logoBoundsCache.set(img,fallback);
   return fallback;
  }
 }
 function draw(args){
  const {canvas,p,teamInfo={},image,logos={},rowSprite=null,wins={},gradient=false,color2="",angle=0,photoZoom=100,photoX=0,photoY=0,fa=false,faGrade="",faRole=null,displayName=null,displayNumber=null,mode="regular"}=args;
  const ctx=canvas.getContext("2d");const pitcher=p?.kind==="pitcher";
  const post=mode==="postseason";
  const columns=post?(pitcher?postPit:postBat):(pitcher?pit:bat);
  const W=pitcher?1606:1492,H0=pitcher?231:220,headH=28,rowH=29;
  const rows=Object.values((post?p?.postSeasons:p?.seasons)||{}).filter(r=>r&&r.year).sort((a,b)=>a.year-b.year);
  const visibleRows=post?Math.max(1,rows.length):rows.length+2;
  const height=H0+headH+visibleRows*rowH;
  canvas.width=W;canvas.height=height;
  const current=p?.team||"LG",theme=teamInfo[current]||["RKBO","#c50136","RKBO LEAGUE"],teamColor=theme[1]||"#c50136";
  ctx.fillStyle="#fff";ctx.fillRect(0,0,W,height);
  ctx.save();ctx.beginPath();ctx.rect(0,0,W,H0);ctx.clip();
  bg(ctx,W,H0,teamColor,gradient,color2,angle);
  if(image){
   // Source photo reference is 761 x 365 transparent PNG. Preserve aspect ratio for all uploads.
   const refWidth=761,refHeight=365;
   const frameScale=Math.min((W*.38)/refWidth,(H0*1.07)/refHeight);
   const sourceFit=Math.min(refWidth/image.width,refHeight/image.height);
   const ratio=frameScale*sourceFit*Number(photoZoom)/100;
   const imgW=image.width*ratio,imgH=image.height*ratio;
   ctx.drawImage(image,W*.18-imgW/2+Number(photoX),H0-imgH+Number(photoY),imgW,imgH);
  }
  const midpoint=W*.505;
  const won=rows.filter(r=>r.team&&wins[r.year-1950]===r.team).length;

  const teamTitle=theme[2]||"RKBO";
  const playerLabel=p?((displayNumber||p.number||"—")+". "+(displayName||p.name)):"RKBO CAREER MAKER";
  const subtitle=post?"포스트시즌 통산 기록":"정규 시즌 통산 기록";
  if(won)write(ctx,"★".repeat(won),midpoint,16,22,"center",true,"#ffd33d");
  write(ctx,teamTitle,midpoint,49,fitFont(ctx,teamTitle,34,28,W*.36),"center",true,"#fff");
  write(ctx,playerLabel,midpoint,113,fitFont(ctx,playerLabel,53,41,W*.43),"center",true,"#fff");
  write(ctx,subtitle,midpoint,181,fitFont(ctx,subtitle,28,24,W*.34),"center",true,"#fff");
  if(fa&&p){
   const grade=String(faGrade||"").toUpperCase();
   const label=["A","B","C"].includes(grade)?grade+"등급":"등급 확인 필요";
   const role=faRole||pitcherRole(p);
   const faLabel=pitcher?("FA  "+label+"  "+role):("FA  "+label);
   const faColor=grade==="A"?"#FFD34D":"#ffffff";
   const fontSize=pitcher?23:20;
   const faY=pitcher?216:209;
   const maxLabelWidth=W*.35;
   write(ctx,faLabel,midpoint,faY,fitFont(ctx,faLabel,fontSize,18,maxLabelWidth),"center",true,faColor);
  }
  const logo=logos[current];
  if(logo&&logo.complete&&logo.naturalWidth){
   // Crop only transparent padding from the source logo, keeping all visible artwork.
   // This lets every team's header mark fill the original spreadsheet-sized logo area.
   const bounds=visibleLogoBounds(logo);
   const maxW=W*.30,maxH=H0*.96;
   const ratio=Math.min(maxW/bounds.sw,maxH/bounds.sh);
   const w=bounds.sw*ratio,h=bounds.sh*ratio;
   const rightMargin=W*.056;
   ctx.drawImage(logo,bounds.sx,bounds.sy,bounds.sw,bounds.sh,W-rightMargin-w,(H0-h)/2,w,h);
  }
  ctx.restore();
  const tableCols=columns;
  const naturalWidth=tableCols.reduce((sum,c)=>sum+c[2],0);
  const factor=W/naturalWidth;
  const starts=[],widths=[];let next=0;
  for(const [,label,w] of tableCols){starts.push(next);widths.push(w*factor);next+=w*factor}
  ctx.fillStyle="#070707";ctx.fillRect(0,H0,W,headH);
  ctx.fillStyle="#fff";ctx.fillRect(0,H0,W,1);
  tableCols.forEach(([key,label],i)=>write(ctx,label,starts[i]+widths[i]/2,H0+headH/2+1,fitFont(ctx,label,19,15,widths[i]-2),"center",true,"#fff"));
  const koreanTeam={KIA:"KIA",HAN:"한화",SAM:"삼성",LOT:"롯데",LG:"LG",DOO:"두산",SSG:"SSG",NC:"NC",SK:"SK",KT:"KT",KIW:"키움"};
 const entryRows=post
   ?rows.map(r=>({...r,title:(r.year-1950)+"차"}))
   :[
     ...rows.map(r=>({...r,title:(r.year-1950)+"차"})),
     {title:rows.length+"시즌 통산",stats:RKBOXls.summary(p,"career"),total:true},
     {title:"최근 3시즌 통산",stats:RKBOXls.summary(p,"last3"),total:true}
   ];
  const seasonIndex=post?1:0,teamIndex=post?2:1;
  entryRows.forEach((r,i)=>{
   const y=H0+headH+i*rowH;
   const rc=r.total?"#000":(teamInfo[r.team]?.[1]||"#31465c");
   ctx.fillStyle=rc;ctx.fillRect(0,y,W,rowH);
   ctx.fillStyle="#fff";ctx.fillRect(0,y,W,2);
   if(r.total){
    write(ctx,r.title,starts[0]+(widths[0]+widths[1])/2,y+16,17,"center",true,"#fff",widths[0]+widths[1]-8);
   }else{
    const rowlogo=logos[r.team],wTeam=widths[teamIndex];
    const iconX=starts[teamIndex]+wTeam*.29,iconY=y+rowH/2,iconSize=25;
    const isChampion=wins[r.year-1950]===r.team;
    if(post&&isChampion)write(ctx,"🏆",starts[0]+widths[0]/2,y+17,21,"center",true,"#ffd34d",widths[0]-3);
    write(ctx,r.title,starts[seasonIndex]+widths[seasonIndex]/2,y+17,18,"center",true,"#fff",widths[seasonIndex]-2);
    const index=ROW_SPRITE_TEAMS[r.team];
    if(rowSprite&&rowSprite.complete&&rowSprite.naturalWidth&&index!==undefined){
     const tile=48;
     ctx.drawImage(rowSprite,(index%5)*tile,Math.floor(index/5)*tile,tile,tile,
       iconX-iconSize/2,iconY-iconSize/2,iconSize,iconSize);
    }else if(rowlogo&&rowlogo.complete&&rowlogo.naturalWidth){
     // Historical SK has no user-provided badge; keep a round fallback.
     ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(iconX,iconY,12,0,Math.PI*2);ctx.fill();
     const ratio=Math.min(22/rowlogo.naturalWidth,22/rowlogo.naturalHeight);
     const ww=rowlogo.naturalWidth*ratio,hh=rowlogo.naturalHeight*ratio;
     ctx.drawImage(rowlogo,iconX-ww/2,iconY-hh/2,ww,hh);
    }
    write(ctx,koreanTeam[r.team]||"—",starts[teamIndex]+wTeam*.75,y+17,17,"center",true,"#fff",wTeam*.45);
   }
   for(let j=teamIndex+1;j<tableCols.length;j++){
    const value=rate(r.stats,tableCols[j][0]);
    write(ctx,value,starts[j]+widths[j]/2,y+17,fitFont(ctx,value,18,15,widths[j]-3),"center",true,"#fff");
   }
   // Summary first numeric falls at position 2, matching the original layout.
  });
  if(post&&rows.length===0){
   const y=H0+headH;
   ctx.fillStyle="#17263b";ctx.fillRect(0,y,W,rowH);
   write(ctx,"포스트시즌 기록 없음 · 포스트시즌 ZIP 또는 과거 통산 XLSX를 추가하세요",
     W/2,y+rowH/2,17,"center",true,"#fff",W-30);
  }
  ctx.fillStyle="#fff";ctx.fillRect(0,height-1,W,1);
  return {width:W,height,won,rows:rows.length,mode:post?"postseason":"regular"};
 }
 return {draw,tint,bat,pit,postBat,postPit,pitcherRole};
})();