/* ZERO PROBLEMS — 데이터 계층 v2
 * 브라우저 → 서버리스 프록시 → 비짓서울 API. 공개 배포본은 DATA_SOURCE "visitseoul"만 허용.
 * mock은 (a) config.ALLOW_DEMO=true 이고 (b) 사용자가 오류 화면에서 "시연 데이터로 보기"를 직접 누른 세션에만 활성화. 조용한 대체 없음. */
(function(global){
  const ZP={};
  ZP.config=Object.assign({GOOGLE_MAPS_KEY:"",VISITSEOUL_PROXY_URL:"",DATA_SOURCE:"visitseoul",ALLOW_DEMO:true,MAX_PAGES:4,CONCURRENCY:4},global.ZP_CONFIG||{});
  ZP.diag={source:null,proxy:ZP.config.VISITSEOUL_PROXY_URL||"(미설정)",lastCall:null,received:0,normalized:0,failed:0,passed:0,lastError:null,demo:false,cacheAt:null};
  ZP.holidays2026=["2026-01-01","2026-02-16","2026-02-17","2026-02-18","2026-03-01","2026-03-02","2026-05-05","2026-05-24","2026-05-25","2026-06-06","2026-08-15","2026-08-17","2026-09-24","2026-09-25","2026-09-26","2026-10-03","2026-10-09","2026-12-25"];
  ZP.areas={"광화문·종로":{lat:37.5710,lng:126.9769},"명동·을지로":{lat:37.5636,lng:126.9840},"북촌·삼청동":{lat:37.5826,lng:126.9831},"홍대·연남":{lat:37.5563,lng:126.9237},"성수":{lat:37.5446,lng:127.0559},"이태원·한남":{lat:37.5345,lng:126.9946},"강남·역삼":{lat:37.4979,lng:127.0276},"잠실":{lat:37.5133,lng:127.1001},"여의도":{lat:37.5219,lng:126.9245},"서울역":{lat:37.5547,lng:126.9707},"안국역":{lat:37.5764,lng:126.9855},"시청역":{lat:37.5646,lng:126.9770},"동대문":{lat:37.5712,lng:127.0095},"인사동":{lat:37.5740,lng:126.9857}};
  // 2026-09-07 실측으로 확인한 카테고리 코드 (역사관광 코드는 미확인 → 문화관광에 포함되어 수집)
  ZP.categoryCodes={"박물관":["Cg1x6l1"],"전시":["Cg1x6l1","Cv7s8m5"],"궁궐·역사":["Cg1x6l1"],"체험·공방":["Cq3m6s6","Cl8f8q1"],"쇼핑":["Cn0t1e0"],"공연":["Cv7s8m5"],"자연":["Cp3b3j9"],"음식":["Cx0t8m5","Cz9d1h6","Cl9s3y9"]};
  ZP.allCodes=[..."Cg1x6l1 Cv7s8m5 Cq3m6s6 Cl8f8q1 Cn0t1e0 Cp3b3j9 Cx0t8m5".split(" ")];

  const isDemo=()=>{ try{ return ZP.config.ALLOW_DEMO && sessionStorage.getItem("zp_demo")==="1"; }catch(e){ return false; } };
  ZP.enableDemo=()=>{ try{ sessionStorage.setItem("zp_demo","1"); }catch(e){} };
  ZP.disableDemo=()=>{ try{ sessionStorage.removeItem("zp_demo"); }catch(e){} };
  ZP.isDemo=isDemo;

  /* ── 프록시 호출 ── */
  async function proxy(path, body){
    const base=ZP.config.VISITSEOUL_PROXY_URL; if(!base) throw Object.assign(new Error("프록시 주소(VISITSEOUL_PROXY_URL)가 설정되지 않았습니다."),{code:"NO_PROXY"});
    const r=await fetch(base.replace(/\/$/,"")+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body||{})});
    ZP.diag.lastCall=new Date().toISOString(); const ca=r.headers.get("x-cache-at"); if(ca) ZP.diag.cacheAt=ca;
    if(r.status===429) throw Object.assign(new Error("비짓서울 API 호출 제한에 걸렸습니다. 잠시 후 다시 시도하세요."),{code:"RATE"});
    if(!r.ok) throw Object.assign(new Error("비짓서울 데이터를 불러오지 못했습니다 (HTTP "+r.status+")."),{code:"HTTP"});
    return r.json();
  }
  /* ── 어댑터 ── */
  ZP.adapters={
    visitseoul:{ name:"비짓서울 API", list:(p)=>proxy("/api/v1/contents/list",p), info:(cid)=>proxy("/api/v1/contents/info",{cid}) },
    mock:{ name:"시연 데이터", list:async(p)=>({items:ZP.mockRaw.filter(r=>!p.com_ctgry_sn||r.com_ctgry_sn===p.com_ctgry_sn).map(r=>({cid:r.cid,post_sj:r.post_sj,com_ctgry_sn:r.com_ctgry_sn}))}), info:async(cid)=>{const r=ZP.mockRaw.find(x=>x.cid===cid);if(!r)throw new Error("not found");return r;} }
  };
  ZP.adapter=()=>{ if(isDemo()) return ZP.adapters.mock; return ZP.adapters[ZP.config.DATA_SOURCE]||ZP.adapters.visitseoul; };

  /* ── 응답 구조 방어: 중첩 어디에 있든 키/배열을 찾음 (실측 스크립트와 동일 방식) ── */
  function dig(o,key){ if(o&&typeof o==="object"){ if(!Array.isArray(o)&&key in o) return o[key]; for(const v of (Array.isArray(o)?o:Object.values(o))){ const g=dig(v,key); if(g!==undefined&&g!==null) return g; } } return null; }
  function findItems(o){ if(Array.isArray(o)&&o.length&&typeof o[0]==="object"&&("cid" in o[0]||"post_sj" in o[0])) return o; if(o&&typeof o==="object"){ for(const v of Object.values(o)){ const g=findItems(v); if(g) return g; } } return null; }
  ZP.dig=dig; ZP.findItems=findItems;

  /* ── 정규화: 비짓서울 필드 → 통합 모델 (원문 보존 + 추출 결과 + 신뢰도). API에 없는 값은 null 로 두고 만들어 넣지 않음 ── */
  const LANG={ko:"한국어",en:"English",ja:"日本語","zh-CN":"中文","zh-TW":"中文(繁)",zh:"中文"};
  ZP.normalize=function(r){
    const g=k=>dig(r,k); const langsRaw=g("cmmn_hmpg_lang"); const facRaw=g("disabled_facility");
    const langCodes=Array.isArray(langsRaw)?langsRaw:(typeof langsRaw==="string"?langsRaw.split(/[,\s]+/).filter(Boolean):[]);
    const fac=Array.isArray(facRaw)?facRaw:(typeof facRaw==="string"?facRaw.split(/[,、]+/).map(s=>s.trim()).filter(Boolean):[]);
    const lat=parseFloat(g("map_position_y")), lng=parseFloat(g("map_position_x"));
    const useTime=g("cmmn_use_time")||"", closedRaw=g("closed_days")||"";
    const hours=extractHours(useTime+(closedRaw?" / "+closedRaw:"")), closed=extractClosed(closedRaw||useTime);
    const fee=g("trrsrt_use_chrge"); const img=g("main_img")||g("main_img_url")||null;
    const cate=String(g("cate_depth")||"");
    return { id:String(g("cid")||""), name:g("post_sj")||"(제목 없음)", category:cate.split(">").pop().trim()||null, categoryTop:cate.split(">")[0].trim()||null, categoryCode:g("com_ctgry_sn")||null,
      address:g("adres")||g("new_adres")||null, lat:isFinite(lat)?lat:null, lng:isFinite(lng)?lng:null, coordSource:isFinite(lat)?"api":null, subway:g("subway_info")||null,
      image:(typeof img==="string"&&/^https?:/.test(img))?img:null, hours, closed, period:{start:g("schdul_info_bgnde")||null,end:g("schdul_info_endde")||null},
      fee:{free:fee==="F", paid:fee==="C", known:fee==="F"||fee==="C", text:g("trrsrt_use_chrge_guidance")||null},
      langs:langCodes.map(l=>LANG[l]||l), langCodes, access:{list:fac, known:fac.length>0, wheelchair:fac.some(f=>/접근가능|엘리베이터|경사로/.test(f))},
      reservation:/예약/.test(g("cmmn_important")||""), notice:g("cmmn_important")||null, tel:g("cmmn_telno")||null, url:g("cmmn_hmpg_url")||null, summary:g("sumry")||null,
      indoor:/박물관|미술관|전시|공연|쇼핑|실내|백화점|카페/.test(cate+(g("post_sj")||"")), reg:r.reg||null, demo:!!r.demo,
      sourceUpdatedAt:g("updt_dt_text")||null, retrievedAt:new Date().toISOString(), raw:{cmmn_use_time:useTime||null, closed_days:closedRaw||null, cmmn_important:g("cmmn_important")||null} };
  };
  function extractHours(s){ s=s||""; if(!s.trim()) return {open:null,close:null,lastEntry:null,confidence:"none",note:"운영시간 정보 없음"};
    if(/상시|24시간/.test(s)) return {open:0,close:24,lastEntry:null,confidence:"high",note:"상시"};
    const m=s.match(/(\d{1,2})[:시](\d{2})?\s*[~\-–]\s*(\d{1,2})[:시](\d{2})?/); if(!m) return {open:null,close:null,lastEntry:null,confidence:"low",note:"확인 필요"};
    const le=s.match(/입장\s*마감[:\s]*(\d{1,2}):(\d{2})/); const conf=/※|단,|다만|경우|공휴일|하절기|동절기|수·토|연장|주말|평일/.test(s)?"medium":"high";
    return {open:+m[1]+(+(m[2]||0))/60, close:+m[3]+(+(m[4]||0))/60, lastEntry:le?+le[1]+(+le[2])/60:(/종료 1시간 전/.test(s)?+m[3]+(+(m[4]||0))/60-1:null), confidence:conf, note:conf==="medium"?"예외 조항 있음":""}; }
  function extractClosed(s){ s=s||""; const days=[]; const map={월:1,화:2,수:3,목:4,금:5,토:6,일:0};
    if(!s.trim()) return {weekdays:[],holidayException:false,fixed:[],confidence:"none"};
    if(/연중무휴|휴관일 없음|휴무 없음/.test(s)) return {weekdays:[],holidayException:false,fixed:[],confidence:"high"};
    Object.keys(map).forEach(k=>{ if(new RegExp("(매주\\s*)?"+k+"요일\\s*(휴|휴관|휴무|,|$|\\)|및)|매주 "+k+"|휴관[일:\\s]*[^.]*"+k+"요일").test(s)) days.push(map[k]); });
    return {weekdays:[...new Set(days)], holidayException:/공휴일을 제외|공휴일인 경우 정상|휴일인 경우 정상/.test(s), fixed:(/1월\s*1일/.test(s)?["01-01"]:[]), setsuChuseok:/설|추석/.test(s), confidence:days.length||/1월|설|추석/.test(s)?"high":"low"}; }

  ZP.distKm=(a,b)=>{const R=6371,dLat=(b.lat-a.lat)*Math.PI/180,dLng=(b.lng-a.lng)*Math.PI/180,x=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(x));};
  ZP.travelMin=(km,mode)=>{const path=km*1.3;if(mode==="car")return Math.round(4+path/0.5);if(mode==="transit")return Math.round(6+path/0.35+(path>1?4:0));return Math.round(path/0.075);}; // 추정치 — Routes 연결 전

  /* ── 판정 (6축). 정보가 없으면 탈락시키지 않고 '확인 필요'로 분리 ── */
  ZP.judge=function(p,ctx){
    const no=[],ok=[],chk=[]; const dateStr=fmtDate(ctx.date), wd=ctx.date.getDay(), isHol=ZP.holidays2026.includes(dateStr);
    if(p.lat==null){ return {ok:false,why:[],no:[{axis:"확인 필요",t:"좌표 없음"}],chk:["좌표 없음"],km:null,tmin:null,needCheck:true}; }
    if(p.period.end&&p.period.end.replace(/\./g,"-")<dateStr) no.push({axis:"기간",t:`${p.period.end} 종료`}); else if(p.period.end) ok.push(`${p.period.end}까지`);
    let closedToday=false;
    if(p.closed.weekdays.includes(wd)) closedToday=!(isHol&&p.closed.holidayException);
    if(p.closed.fixed.includes(dateStr.slice(5))) closedToday=true;
    if(p.closed.setsuChuseok&&["2026-02-17","2026-09-25"].includes(dateStr)) closedToday=true;
    if(closedToday) no.push({axis:"시간",t:`${"일월화수목금토"[wd]}요일 휴무`}); else if(p.closed.confidence!=="none") ok.push("오늘 개관");
    const km=ZP.distKm(ctx.origin,p); const modes=ctx.mode==="any"?["walk","transit","car"]:[ctx.mode]; let tmin=Math.min(...modes.map(m=>ZP.travelMin(km,m))); const usedMode=modes[modes.map(m=>ZP.travelMin(km,m)).indexOf(tmin)];
    const arrive=ctx.hour+tmin/60;
    if(p.hours.open===null){ chk.push("운영시간 확인 필요"); }
    else if(p.hours.close!==24){ const gate=p.hours.lastEntry??p.hours.close;
      if(arrive<p.hours.open) no.push({axis:"시간",t:`${fmtH(p.hours.open)} 개장 (도착 ${fmtH(arrive)})`});
      else if(arrive>=gate) no.push({axis:"시간",t:`입장 마감 ${fmtH(gate)} (도착 ${fmtH(arrive)})`});
      else ok.push(`오늘 ${fmtH(p.hours.close)}까지 운영`); } else ok.push("상시 개방");
    if(tmin>ctx.remainMin-20) no.push({axis:"시간",t:`이동 ${tmin}분 > 남은 시간`});
    if(ctx.wheel){ p.access.known?(p.access.wheelchair?ok.push("휠체어 출입 가능"):no.push({axis:"접근",t:"휠체어 접근 시설 없음"})):chk.push("접근성 정보 확인 필요"); }
    else if(ctx.stroller){ p.access.known?(p.access.wheelchair?ok.push("유모차 이동 가능"):no.push({axis:"접근",t:"경사·계단 구간"})):chk.push("접근성 정보 확인 필요"); }
    (ctx.langs||[]).forEach(l=>{ if(l==="ko"||l==="any")return; p.langCodes.length? (p.langCodes.includes(l)||(l==="zh-CN"&&p.langCodes.some(x=>/zh/.test(x)))?ok.push(`${LANG[l]} 안내`):no.push({axis:"언어",t:`${LANG[l]} 안내 없음`})) : chk.push("안내 언어 확인 필요"); });
    if(ctx.free){ p.fee.known?(p.fee.free?ok.push("입장료 무료"):no.push({axis:"비용",t:"유료"})):chk.push("요금 확인 필요"); } else if(p.fee.free) ok.push("입장료 무료");
    if(p.reg){ (arrive>=p.reg.open&&arrive<p.reg.close)?ok.push("방문 허용 시간"):no.push({axis:"규제",t:p.reg.label}); }
    if(ctx.rainy) ok.push(p.indoor?"강수 예보 · 실내":"강수 예보 · 야외");
    ok.unshift(`현재 위치에서 ${({walk:"도보",transit:"대중교통",car:"차량"})[usedMode]} 약 ${tmin}분 (추정)`);
    const lowConf=p.hours.confidence==="low"||p.closed.confidence==="low"; if(lowConf) chk.push("운영정보 해석 신뢰도 낮음");
    return {ok:no.length===0,why:ok,no,chk,km,tmin,usedMode,needCheck:chk.length>0};
  };
  ZP.sorters={near:(a,b)=>a.km-b.km,fast:(a,b)=>a.tmin-b.tmin,closing:(a,b)=>((a.p.hours.lastEntry??a.p.hours.close)??99)-((b.p.hours.lastEntry??b.p.hours.close)??99),ending:(a,b)=>(a.p.period.end||"9999")<(b.p.period.end||"9999")?-1:1,free:(a,b)=>(a.p.fee.free?0:1)-(b.p.fee.free?0:1),quiet:(a,b)=>(a.p.indoor?0:1)-(b.p.indoor?0:1)||a.km-b.km,latest:(a,b)=>((a.p.sourceUpdatedAt||"")<(b.p.sourceUpdatedAt||""))?1:-1};
  ZP.sortLabels={near:"가까운 순",fast:"빨리 도착하는 순",closing:"오늘 마감 임박순",ending:"종료 임박순",free:"무료 우선",quiet:"한산한 순 (실내·거리 근사)",latest:"최신순"};

  ZP.saveState=s=>{try{sessionStorage.setItem("zp_state",JSON.stringify(s));}catch(e){}}; ZP.loadState=()=>{try{return JSON.parse(sessionStorage.getItem("zp_state")||"null");}catch(e){return null;}};
  ZP.context=function(st){
    const now=new Date(); const date=new Date(now); if(st.day==="tomorrow") date.setDate(date.getDate()+1);
    let hour=now.getHours()+now.getMinutes()/60; if(st.time&&st.when!=="any"){const [h,m]=st.time.split(":").map(Number);hour=h+m/60;}
    const remainMin=(st.when==="any"||st.remain==="today")?Math.max(60,(23-hour)*60):(+st.remain||3)*60;
    const who=st.who||[]; const acc=st.access||[];
    return {date,hour,remainMin,origin:st.origin,originLabel:st.originLabel||"현재 위치",mode:st.mode||"walk",
      wheel:who.some(w=>/휠체어/.test(w))||acc.includes("휠체어 접근"), stroller:who.some(w=>/유모차/.test(w))||acc.includes("유모차"), senior:who.some(w=>/고령/.test(w)),
      langs:(st.langs&&st.langs.length&&!st.langs.includes("any"))?st.langs:["ko"], free:st.budget==="free"||(st.why||[]).includes("무료 이용"), rainy:!!st.rainy, why:st.why||[], what:(st.what||[]).filter(w=>w!=="any"), whatAny:(st.what||[]).includes("any")||!(st.what||[]).length, custom:st.custom||{}};
  };
  ZP.defaultSort=st=>{const w=st.why||[];if(w.includes("조용한 휴식"))return"quiet";if(w.includes("무료 이용"))return"free";if(st.remain&&+st.remain<=2)return"closing";return"near";};

  /* ── 파이프라인: 목록(페이지네이션) → 상세(제한 동시성, allSettled) → 정규화 → 판정 → 정렬 ── */
  ZP.run=async function(st,sortKey,onProgress){
    const ad=ZP.adapter(); const ctx=ZP.context(st); ZP.diag.source=ad.name; ZP.diag.demo=isDemo(); ZP.diag.lastError=null;
    const codes=ctx.whatAny?ZP.allCodes:[...new Set(ctx.what.flatMap(w=>ZP.categoryCodes[w]||[]))];
    const seen=new Map();
    for(const code of codes){ for(let page=1;page<=ZP.config.MAX_PAGES;page++){
      const res=await ad.list({com_ctgry_sn:code,lang_code_id:"ko",sort_type:"latest",page_no:page, ...(ctx.custom.what?{keyword:ctx.custom.what}:{})});
      const items=findItems(res)||[]; items.forEach(it=>{const id=it.cid??dig(it,"cid"); if(id!=null&&!seen.has(String(id))) seen.set(String(id),it);});
      onProgress&&onProgress(`목록 수집 ${seen.size}건`); if(items.length<50) break; } }
    ZP.diag.received=seen.size; const ids=[...seen.keys()]; const details=[]; let failed=0;
    const C=ZP.config.CONCURRENCY; for(let i=0;i<ids.length;i+=C){ const rs=await Promise.allSettled(ids.slice(i,i+C).map(id=>ad.info(id))); rs.forEach(r=>{ if(r.status==="fulfilled"){ try{ details.push(ZP.normalize(r.value)); }catch(e){failed++;} } else failed++; }); onProgress&&onProgress(`상세 조회 ${Math.min(i+C,ids.length)}/${ids.length}`); }
    ZP.diag.normalized=details.length; ZP.diag.failed=failed;
    const judged=details.map(p=>({p,...ZP.judge(p,ctx)}));
    const open=judged.filter(x=>x.ok&&!x.needCheck).sort(ZP.sorters[sortKey]||ZP.sorters.near), check=judged.filter(x=>x.ok&&x.needCheck), shut=judged.filter(x=>!x.ok);
    const byAxis={}; shut.forEach(x=>x.no.forEach(n=>{byAxis[n.axis]=(byAxis[n.axis]||0)+1;}));
    ZP.diag.passed=open.length;
    return {ctx,open,check,shut,byAxis,total:details.length,failed,source:ad.name,demo:isDemo(),retrievedAt:new Date()};
  };
  ZP.getPlace=async function(id){ const ad=ZP.adapter(); ZP.diag.source=ad.name; ZP.diag.demo=isDemo(); return ZP.normalize(await ad.info(id)); };

  function fmtDate(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
  function fmtH(h){const H=Math.floor(h),M=Math.round((h-H)*60);return String(H).padStart(2,"0")+":"+String(M).padStart(2,"0");} ZP.fmtH=fmtH;ZP.fmtDate=fmtDate;
  ZP.weather=async function(lat,lng){try{const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=precipitation,temperature_2m&timezone=Asia%2FSeoul`);const j=await r.json();return{rainy:(j.current&&j.current.precipitation>0.2),temp:j.current&&j.current.temperature_2m};}catch(e){return null;}};

  /* ── 지오코딩: Google 키 있으면 Geocoding API, 없으면 내부 프리셋(역·권역·관광지명) 매칭. 실패 시 대체 좌표 없음 ── */
  ZP.geocode=async function(q){ q=(q||"").trim(); if(!q) return [];
    const local=Object.keys(ZP.areas).filter(a=>a.split("·").some(t=>q.includes(t)||t.includes(q))).map(a=>({label:a,...ZP.areas[a],source:"preset"}));
    if(ZP.config.GOOGLE_MAPS_KEY){ try{ const r=await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q+" 서울")}&language=ko&region=kr&key=${encodeURIComponent(ZP.config.GOOGLE_MAPS_KEY)}`); const j=await r.json(); if(j.status==="OK") return j.results.slice(0,5).map(x=>({label:x.formatted_address,lat:x.geometry.location.lat,lng:x.geometry.location.lng,source:"google"})); }catch(e){} }
    return local; };

  /* ── 지도: Google Maps 우선, 키 없으면 Leaflet/OSM. 지도앱 수준 인터랙션(번호 마커·정보창·현재위치·경로) ── */
  ZP.map=function(el,center,zoom,onFail){
    const key=ZP.config.GOOGLE_MAPS_KEY; const api={markers:[],provider:null};
    function leaflet(){ if(!global.L){onFail&&onFail("지도를 불러오지 못했습니다. 결과 목록은 계속 사용할 수 있습니다.");return null;}
      const m=global.L.map(el,{scrollWheelZoom:true,zoomControl:true}).setView([center.lat,center.lng],zoom);
      global.L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",{maxZoom:20,attribution:"© OpenStreetMap, © CARTO"}).addTo(m);
      api.provider="osm";
      api.add=(pos,opt)=>{ let mk;
        if(opt.me){ mk=global.L.circleMarker([pos.lat,pos.lng],{radius:8,color:"#fff",weight:3,fillColor:"#7437B0",fillOpacity:1}).addTo(m);
          global.L.circle([pos.lat,pos.lng],{radius:120,color:"#7437B0",weight:1,fillOpacity:.08}).addTo(m); mk.bindTooltip(opt.label,{permanent:true,direction:"top",offset:[0,-8],className:"me-tip"}); }
        else { const icon=global.L.divIcon({className:"zp-pin",html:`<div class="pin ${opt.dim?"dim":""}"><b>${opt.num||""}</b></div>`,iconSize:[30,38],iconAnchor:[15,38],popupAnchor:[0,-34]});
          mk=global.L.marker([pos.lat,pos.lng],{icon,title:opt.label}).addTo(m); if(opt.popup) mk.bindPopup(opt.popup,{maxWidth:250}); if(opt.onClick) mk.on("click",opt.onClick); }
        api.markers.push({mk,pos,opt}); return mk; };
      api.focus=(pos,on)=>{const it=api.markers.find(x=>x.pos===pos);if(!it)return;const el2=it.mk.getElement&&it.mk.getElement();if(el2)el2.classList.toggle("on",on);if(on){m.panTo([pos.lat,pos.lng]);it.mk.openPopup&&it.mk.openPopup();}};
      api.fit=()=>{if(api.markers.length)m.fitBounds(api.markers.map(x=>[x.pos.lat,x.pos.lng]),{padding:[40,40],maxZoom:16});};
      api.clear=()=>{api.markers.forEach(x=>x.mk.remove());api.markers=[];}; api.resize=()=>m.invalidateSize(); return api; }
    if(!key) return leaflet();
    return new Promise(res=>{
      const done=()=>{ const g=global.google.maps;
        const m=new g.Map(el,{center,zoom,mapTypeControl:false,streetViewControl:true,fullscreenControl:true,zoomControl:true,gestureHandling:"greedy",clickableIcons:true,
          mapTypeId:"roadmap", styles:[{featureType:"poi.business",stylers:[{visibility:"on"}]}]});
        const info=new g.InfoWindow({maxWidth:260}); api.provider="google";
        api.add=(pos,opt)=>{ let mk;
          if(opt.me){ mk=new g.Marker({position:pos,map:m,zIndex:999,title:opt.label,
              icon:{path:g.SymbolPath.CIRCLE,scale:8,fillColor:"#7437B0",fillOpacity:1,strokeColor:"#fff",strokeWeight:3}});
            new g.Circle({map:m,center:pos,radius:120,strokeColor:"#7437B0",strokeWeight:1,strokeOpacity:.5,fillColor:"#7437B0",fillOpacity:.08}); }
          else { mk=new g.Marker({position:pos,map:m,title:opt.label,label:opt.num?{text:String(opt.num),color:"#fff",fontSize:"12px",fontWeight:"700"}:undefined,
              icon:{path:"M15 0C6.7 0 0 6.7 0 15c0 11 15 23 15 23s15-12 15-23C30 6.7 23.3 0 15 0z",fillColor:opt.dim?"#B0B8C1":"#0F9D58",fillOpacity:1,strokeColor:"#fff",strokeWeight:2,scale:1,labelOrigin:new g.Point(15,14),anchor:new g.Point(15,38)}});
            if(opt.popup){ mk.addListener("click",()=>{info.setContent(opt.popup);info.open({anchor:mk,map:m});}); }
            else if(opt.onClick) mk.addListener("click",opt.onClick); }
          api.markers.push({mk,pos,opt}); return mk; };
        api.focus=(pos,on)=>{const it=api.markers.find(x=>x.pos===pos);if(!it)return;
          it.mk.setZIndex&&it.mk.setZIndex(on?900:1); const ic=it.mk.getIcon&&it.mk.getIcon(); if(ic&&ic.path){ic.scale=on?1.35:1;it.mk.setIcon(ic);} if(on){m.panTo(pos);if(it.opt.popup){info.setContent(it.opt.popup);info.open({anchor:it.mk,map:m});}}};
        api.fit=()=>{const b=new g.LatLngBounds();api.markers.forEach(x=>b.extend(x.pos));if(api.markers.length){m.fitBounds(b,60);if(api.markers.length===1)m.setZoom(16);}};
        api.clear=()=>{api.markers.forEach(x=>x.mk.setMap(null));api.markers=[];info.close();};
        api.resize=()=>g.event.trigger(m,"resize"); res(api); };
      if(global.google&&global.google.maps){done();return;}
      const s=document.createElement("script"); s.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&language=ko&region=KR`; s.async=true;
      s.onerror=()=>{onFail&&onFail("Google Maps 키가 거부됐습니다. 리퍼러 제한과 API 사용 설정을 확인하세요. 임시로 OpenStreetMap을 표시합니다.");res(leaflet());};
      s.onload=done; document.head.appendChild(s); }); };
  ZP.directionsUrl=(to,mode)=>`https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}&travelmode=${mode==="car"?"driving":mode==="transit"?"transit":"walking"}`;
  ZP.esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  /* ── 시연 데이터 (명시적 시연 모드에서만 사용. 좌표·주소 실제, 운영정보는 공개 안내 기준 표본) ── */
  ZP.mockRaw=[
    {cid:"D-001",post_sj:"서울역사박물관",com_ctgry_sn:"Cg1x6l1",cate_depth:"문화관광 > 박물관",adres:"서울 종로구 새문안로 55",map_position_y:37.5703,map_position_x:126.9702,cmmn_use_time:"화-일 09:00~18:00 (입장마감 17:30) ※매주 금요일 21:00까지 연장운영",closed_days:"공휴일을 제외한 매주 월요일, 1월 1일 ※월요일이 휴일인 경우 정상개관",trrsrt_use_chrge:"F",trrsrt_use_chrge_guidance:"무료(특별전 일부 유료)",cmmn_hmpg_lang:["ko","en","ja","zh-CN"],disabled_facility:["접근가능","엘리베이터","장애인화장실","휠체어 대여","장애인 전용 주차장"],cmmn_important:"단체 관람은 사전 예약",cmmn_telno:"02-724-0274",cmmn_hmpg_url:"https://museum.seoul.go.kr",subway_info:"5호선 광화문역 7번 출구 도보 7분",updt_dt_text:"2026-08-20"},
    {cid:"D-002",post_sj:"경희궁",com_ctgry_sn:"Cg1x6l1",cate_depth:"역사관광 > 궁궐",adres:"서울 종로구 새문안로 45",map_position_y:37.5713,map_position_x:126.9683,cmmn_use_time:"09:00~18:00 (입장마감 17:30)",closed_days:"매주 월요일",trrsrt_use_chrge:"F",trrsrt_use_chrge_guidance:"무료",cmmn_hmpg_lang:["ko","en","ja","zh-CN"],disabled_facility:["장애인화장실"],cmmn_important:"궁내 계단 구간 다수",cmmn_telno:"02-724-0274",cmmn_hmpg_url:"https://museum.seoul.go.kr",subway_info:"5호선 서대문역 4번 출구 도보 8분",updt_dt_text:"2026-08-20"},
    {cid:"D-003",post_sj:"세종이야기·충무공이야기",com_ctgry_sn:"Cg1x6l1",cate_depth:"문화관광 > 전시시설",adres:"서울 종로구 세종대로 175",map_position_y:37.5724,map_position_x:126.9769,cmmn_use_time:"10:30~22:30 (입장마감 22:00)",closed_days:"매주 월요일",trrsrt_use_chrge:"F",trrsrt_use_chrge_guidance:"무료",cmmn_hmpg_lang:["ko","en","ja","zh-CN"],disabled_facility:["접근가능","엘리베이터","장애인화장실"],cmmn_important:"광화문광장 지하",cmmn_telno:"02-399-1000",cmmn_hmpg_url:"https://www.sejongpac.or.kr",subway_info:"5호선 광화문역 2번 출구 도보 3분",updt_dt_text:"2026-08-11"},
    {cid:"D-004",post_sj:"돈의문박물관마을",com_ctgry_sn:"Cq3m6s6",cate_depth:"체험관광 > 마을",adres:"서울 종로구 송월길 14-3",map_position_y:37.5700,map_position_x:126.9679,cmmn_use_time:"10:00~19:00",closed_days:"매주 월요일",trrsrt_use_chrge:"F",trrsrt_use_chrge_guidance:"무료(일부 체험 유료)",cmmn_hmpg_lang:["ko","en"],disabled_facility:["접근가능","장애인화장실"],cmmn_important:"골목 경사 구간 있음",cmmn_telno:"02-739-6994",cmmn_hmpg_url:"https://dmvillage.info",subway_info:"5호선 서대문역 4번 출구 도보 5분",updt_dt_text:"2026-08-11"},
    {cid:"D-005",post_sj:"국립현대미술관 서울",com_ctgry_sn:"Cg1x6l1",cate_depth:"문화관광 > 미술관",adres:"서울 종로구 삼청로 30",map_position_y:37.5788,map_position_x:126.9804,cmmn_use_time:"월·화·목·금·일 10:00~18:00 / 수·토 10:00~21:00 (입장마감 종료 1시간 전)",closed_days:"1월 1일, 설날, 추석 당일",trrsrt_use_chrge:"C",trrsrt_use_chrge_guidance:"통합관람권 유료(만 24세 이하·65세 이상 무료)",cmmn_hmpg_lang:["ko","en"],disabled_facility:["접근가능","엘리베이터","장애인화장실","휠체어 대여","장애인 전용 주차장"],cmmn_important:"일부 전시 사전예약",cmmn_telno:"02-3701-9500",cmmn_hmpg_url:"https://www.mmca.go.kr",subway_info:"3호선 안국역 1번 출구 도보 10분",updt_dt_text:"2026-09-01"},
    {cid:"D-006",post_sj:"대한민국역사박물관",com_ctgry_sn:"Cg1x6l1",cate_depth:"문화관광 > 박물관",adres:"서울 종로구 세종대로 198",map_position_y:37.5735,map_position_x:126.9787,cmmn_use_time:"10:00~18:00 (수·토 21:00까지, 입장마감 종료 1시간 전)",closed_days:"1월 1일, 설날·추석 당일",trrsrt_use_chrge:"F",trrsrt_use_chrge_guidance:"무료",cmmn_hmpg_lang:["ko","en","ja","zh-CN"],disabled_facility:["접근가능","엘리베이터","장애인화장실","휠체어 대여"],cmmn_important:"",cmmn_telno:"02-3703-9200",cmmn_hmpg_url:"https://www.much.go.kr",subway_info:"5호선 광화문역 2번 출구 도보 2분",updt_dt_text:"2026-08-28"},
    {cid:"D-007",post_sj:"덕수궁",com_ctgry_sn:"Cg1x6l1",cate_depth:"역사관광 > 궁궐",adres:"서울 중구 세종대로 99",map_position_y:37.5658,map_position_x:126.9752,cmmn_use_time:"09:00~21:00 (입장마감 20:00)",closed_days:"매주 월요일",trrsrt_use_chrge:"C",trrsrt_use_chrge_guidance:"성인 1,000원",cmmn_hmpg_lang:["ko","en","ja","zh-CN"],disabled_facility:["접근가능","장애인화장실","휠체어 대여"],cmmn_important:"",cmmn_telno:"02-771-9951",cmmn_hmpg_url:"https://www.deoksugung.go.kr",subway_info:"1·2호선 시청역 2번 출구 도보 1분",updt_dt_text:"2026-08-28"},
    {cid:"D-008",post_sj:"서울시립미술관 서소문본관",com_ctgry_sn:"Cg1x6l1",cate_depth:"문화관광 > 미술관",adres:"서울 중구 덕수궁길 61",map_position_y:37.5640,map_position_x:126.9738,cmmn_use_time:"평일(화-금) 10:00~20:00 / 토·일·공휴일 하절기 10:00~19:00 (관람 종료 1시간 전까지 입장)",closed_days:"1월 1일, 매주 월요일 (월요일이 공휴일인 경우 정상 개관)",trrsrt_use_chrge:"F",trrsrt_use_chrge_guidance:"무료(기획전 일부 유료)",cmmn_hmpg_lang:["ko","en"],disabled_facility:["접근가능","엘리베이터","장애인화장실","휠체어 대여"],cmmn_important:"",cmmn_telno:"02-2124-8800",cmmn_hmpg_url:"https://sema.seoul.go.kr",subway_info:"1·2호선 시청역 10번 출구 도보 5분",updt_dt_text:"2026-09-02"},
    {cid:"D-009",post_sj:"북촌한옥마을 (특별관리지역 레드존)",com_ctgry_sn:"Cg1x6l1",cate_depth:"문화관광 > 한옥",adres:"서울 종로구 북촌로11길 일대",map_position_y:37.5826,map_position_x:126.9831,cmmn_use_time:"관광객 방문 허용 10:00~17:00 (특별관리지역, 위반 시 과태료)",closed_days:"연중무휴",trrsrt_use_chrge:"F",trrsrt_use_chrge_guidance:"무료",cmmn_hmpg_lang:["ko","en","ja","zh-CN"],disabled_facility:[],cmmn_important:"주민 거주지역 · 정숙 · 골목 경사 급함",cmmn_telno:"02-2148-4160",cmmn_hmpg_url:"https://www.jongno.go.kr",subway_info:"3호선 안국역 2번 출구 도보 10분",updt_dt_text:"2026-08-15",reg:{open:10,close:17,label:"북촌 특별관리지역 · 방문 10:00~17:00"}},
    {cid:"D-010",post_sj:"청계천 광통교",com_ctgry_sn:"Cp3b3j9",cate_depth:"자연관광 > 하천",adres:"서울 종로구 서린동",map_position_y:37.5690,map_position_x:126.9780,cmmn_use_time:"상시 개방",closed_days:"연중무휴",trrsrt_use_chrge:"F",trrsrt_use_chrge_guidance:"무료",cmmn_hmpg_lang:["ko","en","ja","zh-CN"],disabled_facility:["접근가능"],cmmn_important:"호우 시 산책로 출입 통제",cmmn_telno:"02-2290-6114",cmmn_hmpg_url:"https://www.sisul.or.kr",subway_info:"5호선 광화문역 5번 출구 도보 5분",updt_dt_text:"2026-08-30"}
  ];
  global.ZP=ZP;
})(window);
