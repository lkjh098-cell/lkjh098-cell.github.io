/* ZERO PROBLEMS — 데이터 계층 v2
 * 브라우저 → 서버리스 프록시 → 비짓서울 API. 공개 배포본은 DATA_SOURCE "visitseoul"만 허용.
 * mock은 (a) config.ALLOW_DEMO=true 이고 (b) 사용자가 오류 화면에서 "시연 데이터로 보기"를 직접 누른 세션에만 활성화. 조용한 대체 없음. */
(function(global){
  const ZP={};
  ZP.config=Object.assign({GOOGLE_MAPS_KEY:"",VISITSEOUL_PROXY_URL:"",DATA_SOURCE:"visitseoul",ALLOW_DEMO:true,MAX_PAGES:4,CONCURRENCY:3,MIN_PLACES:50},global.ZP_CONFIG||{});
  ZP.diag={source:null,proxy:ZP.config.VISITSEOUL_PROXY_URL||"(미설정)",lastCall:null,received:0,normalized:0,failed:0,passed:0,lastError:null,demo:false,cacheAt:null};
  // 2026 월력요항: https://www.kasi.re.kr/kor/post/newsMaterial/32031
  // 지방선거일: https://www.nec.go.kr/site/nec/ex/bbs/View.do?bcIdx=294445&cbIdx=1084
  ZP.holidays2026=["2026-01-01","2026-02-16","2026-02-17","2026-02-18","2026-03-01","2026-03-02","2026-05-05","2026-05-24","2026-05-25","2026-06-03","2026-06-06","2026-08-15","2026-08-17","2026-09-24","2026-09-25","2026-09-26","2026-10-03","2026-10-05","2026-10-09","2026-12-25"];
  ZP.areas={"광화문·종로":{lat:37.5710,lng:126.9769},"명동·을지로":{lat:37.5636,lng:126.9840},"북촌·삼청동":{lat:37.5826,lng:126.9831},"홍대·연남":{lat:37.5563,lng:126.9237},"성수":{lat:37.5446,lng:127.0559},"이태원·한남":{lat:37.5345,lng:126.9946},"강남·역삼":{lat:37.4979,lng:127.0276},"잠실":{lat:37.5133,lng:127.1001},"여의도":{lat:37.5219,lng:126.9245},"서울역":{lat:37.5547,lng:126.9707},"안국역":{lat:37.5764,lng:126.9855},"시청역":{lat:37.5646,lng:126.9770},"동대문":{lat:37.5712,lng:127.0095},"인사동":{lat:37.5740,lng:126.9857}};
  // 2026-09-07 실측으로 확인한 카테고리 코드 (역사관광 코드는 미확인 → 문화관광에 포함되어 수집)
  ZP.categoryCodes={"박물관":["Cg1x6l1"],"전시":["Cg1x6l1","Cv7s8m5"],"궁궐·역사":["Cg1x6l1"],"체험·공방":["Cq3m6s6","Cl8f8q1"],"쇼핑":["Cn0t1e0"],"공연":["Cv7s8m5"],"자연":["Cp3b3j9"],"음식":["Cx0t8m5","Cz9d1h6","Cl9s3y9"]};
  ZP.allCodes=[...new Set(Object.values(ZP.categoryCodes).flat())];

  const isDemo=()=>{ try{ return ZP.config.ALLOW_DEMO && sessionStorage.getItem("zp_demo")==="1"; }catch(e){ return false; } };
  ZP.enableDemo=()=>{ try{ sessionStorage.setItem("zp_demo","1"); }catch(e){} };
  ZP.disableDemo=()=>{ try{ sessionStorage.removeItem("zp_demo"); }catch(e){} };
  ZP.isDemo=isDemo;

  /* ── 프록시 호출 ── */
  async function proxy(path,body,options={}){
    const base=ZP.config.VISITSEOUL_PROXY_URL;if(!base)throw Object.assign(new Error("프록시 주소가 설정되지 않았습니다."),{code:"NO_PROXY"});
    const controller=new AbortController(),external=options.signal;let timedOut=false;const stop=()=>controller.abort();if(external&&external.aborted)throw Object.assign(new Error('요청이 취소되었습니다.'),{name:'AbortError'});if(external)external.addEventListener('abort',stop,{once:true});
    const timer=setTimeout(()=>{timedOut=true;controller.abort();},Number(ZP.config.REQUEST_TIMEOUT_MS)||15000);
    try{const r=await fetch(base.replace(/\/$/,"")+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body||{}),signal:controller.signal});ZP.diag.lastCall=new Date().toISOString();const ca=r.headers&&r.headers.get('x-cache-at');if(ca)ZP.diag.cacheAt=ca;if(r.status===429)throw Object.assign(new Error('비짓서울 호출 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.'),{code:'RATE',status:429,httpStatus:429});if(!r.ok)throw Object.assign(new Error('비짓서울 조회 실패 (HTTP '+r.status+')'),{code:'HTTP',status:r.status,httpStatus:r.status});return await r.json();}
    catch(e){if(timedOut)throw Object.assign(new Error('비짓서울 응답 시간이 초과되었습니다.'),{code:'TIMEOUT'});if(e.name==='TypeError')throw Object.assign(e,{code:'NETWORK'});throw e;}
    finally{clearTimeout(timer);if(external)external.removeEventListener('abort',stop);}
  }
  /* ── 어댑터 ── */
  ZP.adapters={
    visitseoul:{ name:"비짓서울 API", list:(p,o)=>proxy("/api/v1/contents/list",p,o), info:(cid,o)=>proxy("/api/v1/contents/info",{cid},o) },
    mock:{ name:"시연 데이터", list:async(p)=>({items:ZP.mockRaw.filter(r=>!p.com_ctgry_sn||r.com_ctgry_sn===p.com_ctgry_sn).map(r=>({cid:r.cid,post_sj:r.post_sj,com_ctgry_sn:r.com_ctgry_sn}))}), info:async(cid)=>{const r=ZP.mockRaw.find(x=>x.cid===cid);if(!r)throw new Error("not found");return r;} }
  };
  ZP.adapter=()=>{ if(isDemo()) return ZP.adapters.mock; return ZP.adapters[ZP.config.DATA_SOURCE]||ZP.adapters.visitseoul; };

  /* 응답 상태와 구조를 검증한다. 비어 있는 정상 목록과 잘못된 응답을 구분한다. */
  function dig(o,key){if(o&&typeof o==='object'){if(!Array.isArray(o)&&Object.prototype.hasOwnProperty.call(o,key))return o[key];for(const v of Object.values(o)){const x=dig(v,key);if(x!==undefined&&x!==null)return x;}}return null;}
  function findItems(o){if(Array.isArray(o))return !o.length||o.every(x=>x&&typeof x==='object'&&dig(x,'cid')!=null)?o:null;if(o&&typeof o==='object'){for(const k of ['items','data','contents','list']){if(k in o){const r=findItems(o[k]);if(r)return r;}}}return null;}
  function validate(r,kind){if(!r||typeof r!=='object')throw new Error('비짓서울 응답 형식이 올바르지 않습니다.');const code=dig(r,'result_code');if(code!==null&&String(code)!=='200')throw Object.assign(new Error('비짓서울 응답 오류 ('+String(code)+')'),{code:'API_RESULT',status:Number(code)||null,httpStatus:Number(code)||null});if(kind==='list'){const a=findItems(r);if(!a)throw new Error('관광 목록 응답에 목록이 없습니다.');return a;}if(!String(dig(r,'cid')||'').trim()||!String(dig(r,'post_sj')||'').trim())throw new Error('관광 상세 응답의 식별자 또는 이름이 없습니다.');return r;}
  ZP.dig=dig;ZP.findItems=findItems;
  const LANG={ko:'한국어',en:'영어',ja:'일본어','zh-CN':'중국어 간체','zh-TW':'중국어 번체',zh:'중국어',ru:'러시아어',ms:'말레이어',es:'스페인어',fr:'프랑스어',de:'독일어'};
  const langAlias={'한국어':'ko','국어':'ko','영어':'en','English':'en','일본어':'ja','日本語':'ja','중국어':'zh','中文':'zh','중국어(간체)':'zh-CN','중국어 간체':'zh-CN','중국어(번체)':'zh-TW','중국어 번체':'zh-TW','러시아어':'ru','말레이어':'ms'};
  const safeURL=v=>{let s=String(v||'').trim();if(/^www\./i.test(s))s='https://'+s;return /^https?:\/\/[^\s]+$/i.test(s)?s:null;};ZP.safeURL=safeURL;
  const textValue=v=>Array.isArray(v)?v.join(', '):v==null?'':String(v);
  const dateOnly=v=>{const m=String(v||'').trim().match(/^(\d{4})[.\-/]?(\d{2})[.\-/]?(\d{2})(?:$|[T\s.])/);if(!m)return null;const x=`${m[1]}-${m[2]}-${m[3]}`;const parsed=new Date(x+'T12:00:00+09:00');return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===x?x:null;};
  function extractHours(raw){const s=textValue(raw).trim();const out={open:null,close:null,lastEntry:null,confidence:'none',note:'운영시간 정보 없음',overnight:false};if(!s)return out;
    const ranges=[...s.matchAll(/(\d{1,2})(?::(\d{2})|시\s*(\d{1,2})?분?)\s*[~∼〜\-–—]\s*(\d{1,2})(?::(\d{2})|시\s*(\d{1,2})?분?)/g)];
    const exceptions=/※|단[,\s]|다만|경우|공휴일|하절기|동절기|연장|주말|평일|계절|변동|변경|브레이크|휴게|점심|격주|첫째|둘째|셋째|넷째|마지막|수·토|월·화|토·일/.test(s)||((s.match(/\d{1,2}:\d{2}/g)||[]).length>2&&!/(?:입장\s*마감|마지막\s*입장)[:\s]*\d{1,2}:\d{2}/.test(s));
    if(/상시|24\s*시간/.test(s)&&!ranges.length)return {...out,open:0,close:24,confidence:exceptions?'medium':'high',note:exceptions?'예외 조건 확인 필요':'상시 개방'};
    if(!ranges.length)return {...out,confidence:'low',note:'시간 범위를 해석할 수 없음'};
    const m=ranges[0],open=+m[1]+ +(m[2]||m[3]||0)/60,close=+m[4]+ +(m[5]||m[6]||0)/60;
    if(open>=24||close>24||+(m[2]||m[3]||0)>59||+(m[5]||m[6]||0)>59||open===close)return {...out,confidence:'low',note:'시간 범위 확인 필요'};
    const entry=s.match(/(?:입장\s*마감|마지막\s*입장)[:\s]*(\d{1,2}):(\d{2})/);let lastEntry=entry?+entry[1]+ +entry[2]/60:null;
    if(!entry&&/(?:종료|마감)\s*1시간\s*전/.test(s))lastEntry=(close+23)%24;
    if(lastEntry!==null&&(lastEntry>24||entry&&+entry[2]>59))lastEntry=null;
    return {open,close,lastEntry,overnight:close<open,confidence:ranges.length>1||exceptions?'medium':'high',note:ranges.length>1||exceptions?'여러 운영시간 또는 예외 조건 확인 필요':''};
  }
  function extractClosed(raw){const s=textValue(raw).trim(),base={weekdays:[],fixed:[],holidayException:false,setsuChuseok:false,confidence:'none',ambiguous:false};if(!s)return base;if(/연중무휴|휴관일\s*없음|휴무\s*없음/.test(s))return {...base,confidence:/단,|다만|제외|임시/.test(s)?'low':'high'};
    const days=[];for(const [k,n]of Object.entries({일:0,월:1,화:2,수:3,목:4,금:5,토:6})){if(new RegExp(k+'요일').test(s)||new RegExp('매주\\s*'+k+'(?:[·,\\s]|$)').test(s))days.push(n);}
    const fixed=[...s.matchAll(/(\d{1,2})월\s*(\d{1,2})일/g)].map(m=>String(+m[1]).padStart(2,'0')+'-'+String(+m[2]).padStart(2,'0'));
    const dateSpan=/\d{1,2}월\s*\d{1,2}일\s*[~∼〜\-–—]/.test(s),holidayClosed=/(?:^|[,、·/]|및|\s)공휴일(?:은|에)?(?:\s*(?:휴무|휴관)|\s*[,、·/]|$)/.test(s);
    const ambiguous=dateSpan||/격주|매월|주차|번째|첫째|둘째|셋째|넷째|마지막|임시|별도|변동|연휴|전후|단[,\s]|다만/.test(s)||(/정상|개관/.test(s)&&!/(?:휴일|공휴일).{0,10}정상/.test(s));
    return {weekdays:[...new Set(days)],fixed,dateSpan,holidayClosed,alwaysClosed:/영구\s*(?:폐관|폐쇄)|폐업|운영\s*종료/.test(s),setsuChuseok:/설|추석/.test(s),holidayException:/공휴일을 제외|공휴일인 경우 정상|휴일인 경우 정상|공휴일인 경우 정상\s*개관/.test(s),ambiguous,confidence:!ambiguous&&(days.length||fixed.length||holidayClosed||/설|추석/.test(s))?'high':'low'};
  }
  function accessEvidence(fac,notice){const s=[...fac,notice||''].join(' / '),uncertain=/여부|확인|문의|가능성|조건부|제한적|(?:가능|불가|금지|불가능).{0,8}(?:아님|아니|않)/.test(s);const negative=/(?:휠체어|유모차|장애인).{0,12}(?:출입|접근|이용|진입).{0,5}(?:불가|불가능|금지)|(?:휠체어|유모차).{0,5}(?:불가|불가능)|접근\s*불가/.test(s);const positive=/^접근가능$/.test(fac.join(''))||fac.some(f=>/^접근\s*가능$/.test(f))||/(?:휠체어).{0,8}(?:출입|접근|진입|이동).{0,3}가능/.test(s);const stepsNo=/(?:계단|단차).{0,3}없|무장애\s*(?:동선|경로)|전\s*구간.{0,5}평탄/.test(s);const stepsYes=/(?:계단만|계단으로만|계단\s*이용\s*필수)|우회.{0,4}불가/.test(s);return {list:fac,known:fac.length>0, wheelchair:uncertain?null:negative?false:positive?true:null, wheelchairStatus:uncertain?'unknown':negative?'fail':positive?'pass':'unknown',strollerStatus:uncertain?'unknown':/유모차.{0,12}(불가|금지|불가능)/.test(s)?'fail':/(유모차).{0,8}(출입|이동|접근).{0,3}가능/.test(s)?'pass':'unknown',stepFreeStatus:uncertain?'unknown':stepsYes?'fail':stepsNo?'pass':'unknown',uncertain,evidence:s};}
  const interestRules={'박물관':/박물관/,'전시':/미술관|전시|화랑|갤러리/,'궁궐·역사':/궁궐|역사|한옥|문화유산|유적|고궁/,'체험·공방':/체험|공방/,'쇼핑':/쇼핑|백화점|상점|시장/,'공연':/공연|콘서트|연극|뮤지컬|국악|음악회/,'자연':/자연관광|공원|하천|수목원|숲길/,'음식':/음식|식당|카페|맛집|한식|중식|일식|양식/};
  ZP.normalize=function(r){validate(r,'info');const g=k=>dig(r,k),langsRaw=g('cmmn_hmpg_lang');const langCodes=[...new Set((Array.isArray(langsRaw)?langsRaw:textValue(langsRaw).split(/[,、;/]+/)).flatMap(x=>{const s=String(x).trim();return langAlias[s]||LANG[s]?[(langAlias[s]||s)]:s.split(/\s+/).filter(y=>LANG[y]);}))];
    const fac=(Array.isArray(g('disabled_facility'))?g('disabled_facility'):textValue(g('disabled_facility')).split(/[,、]+/)).map(textValue).map(x=>x.trim()).filter(Boolean);const lat=parseFloat(g('map_position_y')),lng=parseFloat(g('map_position_x'));const valid=Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;const time=textValue(g('cmmn_use_time')),closed=textValue(g('closed_days')),fee=g('trrsrt_use_chrge'),cate=textValue(g('cate_depth')),notice=textValue(g('cmmn_important')),name=textValue(g('post_sj')).trim(),img=g('main_img')||g('main_img_url');
    const imageSources=[];const pushImage=(url,field)=>{if(typeof url==='string'&&/^https?:\/\//i.test(url)&&safeURL(url)&&!imageSources.some(x=>x.url===url))imageSources.push({url,field,response:'info',cid:String(g('cid'))});};pushImage(img,g('main_img')?'main_img':'main_img_url');(Array.isArray(g('relate_img'))?g('relate_img'):[]).forEach(url=>pushImage(url,'relate_img'));const images=imageSources.map(x=>x.url);
    const reservationNotice=/예약/.test(notice),reservationMention=reservationNotice&&!/(?:예약\s*(?:없이|불필요|필요\s*없)|예약제\s*아님|예약\s*권장|단체|일부)/.test(notice)&&/예약\s*(?:필수|필요|제|후)|사전\s*예약|예약자만|예약만/.test(notice);const categories=Object.entries(interestRules).filter(([,re])=>re.test(cate+' '+name)).map(([k])=>k);
    return {id:String(g('cid')),name,category:cate.split('>').pop().trim()||null,categoryTop:cate.split('>')[0].trim()||null,categoryCode:g('com_ctgry_sn')||null,interestTags:categories,address:g('adres')||g('new_adres')||null,lat:valid?lat:null,lng:valid?lng:null,coordSource:valid?'api':null,subway:g('subway_info')||null,image:images[0]||null,images,imageSources,imageSource:imageSources[0]||null,hours:extractHours(time),closed:extractClosed(closed),period:{start:dateOnly(g('schdul_info_bgnde')),end:dateOnly(g('schdul_info_endde')),rawStart:g('schdul_info_bgnde')||null,rawEnd:g('schdul_info_endde')||null},fee:{free:fee==='F',paid:fee==='C',known:['F','C'].includes(fee),text:g('trrsrt_use_chrge_guidance')||null,conditional:/일부|특별전|기획전|체험|조건|연령/.test(textValue(g('trrsrt_use_chrge_guidance')))},langs:langCodes.map(x=>LANG[x]),langCodes,languageScope:'website',access:accessEvidence(fac,notice),reservation:reservationMention,reservationNotice,visitRestriction:/직접적인?\s*출입은?\s*불가|섬\s*출입이?\s*전면\s*통제/.test(textValue(g('post_desc')).replace(/<[^>]*>/g,' '))?'공식 안내에 직접 출입 불가가 명시되어 있습니다. 별도 조망 장소를 확인하세요.':null,notice:notice||null,tel:g('cmmn_telno')||null,url:safeURL(g('cmmn_hmpg_url')),summary:g('sumry')||null,indoor:null,reg:r.demo&&r.reg&&r.reg.sourceValidated?r.reg:null,demo:!!r.demo,sourceUpdatedAt:g('updt_dt_text')||null,retrievedAt:new Date().toISOString(),raw:{cmmn_use_time:time||null,closed_days:closed||null,cmmn_important:notice||null,cmmn_hmpg_lang:langsRaw||null,disabled_facility:g('disabled_facility')||null},sourceRaw:r};
  };
  ZP.distKm=(a,b)=>{const rad=Math.PI/180,x=Math.sin((b.lat-a.lat)*rad/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin((b.lng-a.lng)*rad/2)**2;return 12742*Math.asin(Math.sqrt(Math.min(1,x)));};
  ZP.travelMin=(km,mode)=>{const path=km*1.3;return mode==='car'?Math.round(4+path/.5):mode==='transit'?Math.round(6+path/.35+(path>1?4:0)):Math.round(path/.075);};
  function seoulParts(d){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);const g=k=>p.find(x=>x.type===k).value;return {date:`${g('year')}-${g('month')}-${g('day')}`,hour:+g('hour')+ +g('minute')/60};}
  function addDays(s,n){return new Date(new Date(s+'T12:00:00+09:00').getTime()+n*86400000).toISOString().slice(0,10);}
  ZP.fmtDate=d=>typeof d==='string'?dateOnly(d):seoulParts(d).date;
  ZP.fmtH=h=>{const n=((Math.round(h*60)%1440)+1440)%1440;return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');};
  ZP.context=function(st={}){const now=st.now?new Date(st.now):new Date(),today=seoulParts(now),any=st.when==='any',departNow=any||st.departureMode==='now';const selected=departNow?today.date:dateOnly(st.date)||addDays(today.date,st.day==='tomorrow'?1:0);const tm=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(st.time||'');const hour=!departNow&&tm?+tm[1]+ +tm[2]/60:today.hour;const departureAt=new Date(selected+'T'+ZP.fmtH(hour)+':00+09:00');const who=st.who||[],acc=st.access||[],why=st.why||[];const estimate=Number(st.estimatedMaxMin??st.maxTravelMin??st.travelLimit);return {date:new Date(selected+'T12:00:00+09:00'),dateStr:selected,departureAt,hour,remainMin:any||st.remain==='today'?Math.max(0,(24-hour)*60):Number.isFinite(+st.remainMin)?Math.max(0,+st.remainMin):(+st.remain||3)*60,origin:st.origin,originLabel:st.originLabel||'현재 위치',mode:st.mode||'walk',wheel:who.some(w=>/휠체어/.test(w))||acc.some(x=>/휠체어/.test(x)),stroller:who.some(w=>/유모차/.test(w))||acc.some(x=>/유모차/.test(x)),noStairs:acc.some(x=>/계단 없는 길/.test(x))||who.some(w=>/계단 없는 길/.test(w)),senior:who.some(w=>/고령/.test(w)),access:acc,langs:(st.langPreference===true||(st.langs||[]).some(x=>!['ko','any'].includes(x))?(st.langs||[]):[]).filter(x=>x!=='any'),free:st.budget==='free'||why.includes('무료 이용'),costPriority:why.includes('무료 이용'),rainy:!!st.rainy,why,what:(st.what||[]).filter(x=>x!=='any'),whatAny:!(st.what||[]).length||(st.what||[]).includes('any'),custom:st.custom||{},estimatedMaxMin:Number.isFinite(estimate)&&estimate>0?estimate:null,bookedIds:st.bookedIds||st.reservationConfirmedIds||[]};};
  ZP.outsideSeoul=p=>/^(?:경기|경북|경남|경상|강원|충북|충남|충청|전북|전남|전라|제주|부산|대구|대전|울산|광주|인천|세종)/.test(String(p.address||'').trim());
  ZP.regulationRules=Array.isArray(ZP.config.REGULATION_RULES)?ZP.config.REGULATION_RULES:[];
  const axisLabels={period:'기간',hours:'시간',closure:'휴무',window:'남은 시간',access:'접근',reservation:'예약',regulation:'규제'};
  ZP.judge=function(p,ctx){const axes={},why=[],no=[],chk=[];const set=(axis,status,...reasons)=>axes[axis]={status,reasons};const originOK=ctx.origin&&Number.isFinite(ctx.origin.lat)&&Number.isFinite(ctx.origin.lng),posOK=Number.isFinite(p.lat)&&Number.isFinite(p.lng);const km=originOK&&posOK?ZP.distKm(ctx.origin,p):null,modes=ctx.mode==='any'?['walk','transit','car']:[['walk','transit','car'].includes(ctx.mode)?ctx.mode:'walk'];const usedMode=km===null?null:modes.reduce((a,b)=>ZP.travelMin(km,a)<=ZP.travelMin(km,b)?a:b);const tmin=km===null?null:ZP.travelMin(km,usedMode);const departure=ctx.departureAt||new Date((ctx.dateStr||ZP.fmtDate(ctx.date))+'T'+ZP.fmtH(ctx.hour)+':00+09:00');const arriveAt=tmin===null?null:new Date(departure.getTime()+tmin*60000),arrival=arriveAt?seoulParts(arriveAt):null;
    if(!p.period.start&&!p.period.end){set('period',p.period.rawStart||p.period.rawEnd?'unknown':'na',p.period.rawStart||p.period.rawEnd?'개최기간 형식 확인 필요':'별도 개최기간 정보 없음');}else if(!arrival){set('period','unknown','도착 날짜 확인 필요');}else if(p.period.start&&arrival.date<p.period.start){set('period','fail',p.period.start+' 시작 전');}else if(p.period.end&&arrival.date>p.period.end){set('period','fail',p.period.end+' 종료');}else if(p.period.rawStart&&!p.period.start||p.period.rawEnd&&!p.period.end)set('period','unknown','일부 개최기간 형식 확인 필요');else set('period','pass','도착일이 안내된 개최기간 안에 있음');
    let serviceDate=arrival&&arrival.date;const h=p.hours;if(arrival&&h.overnight&&arrival.hour<h.close)serviceDate=addDays(arrival.date,-1);
    let closingInMin=null;const travelMargin=tmin===null?null:tmin===0?0:Math.max(5,Math.ceil(tmin*.25));
    if(!arrival)set('hours','unknown','좌표 또는 출발지 없어 도착 시각 확인 필요');else if(h.confidence!=='high'||h.open===null)set('hours','unknown',h.note||'운영시간 확인 필요');else if(h.open===0&&h.close===24&&h.lastEntry===null){set('hours','pass','안내상 24시간 운영');}else{const clock=arrival.hour+(h.overnight&&arrival.hour<h.close?24:0),end=h.close+(h.overnight?24:0);let gate=h.lastEntry??h.close;if(h.overnight&&gate<h.open)gate+=24;const allow=clock>=h.open&&clock<gate&&clock+20/60<=end;closingInMin=Math.round((Math.min(gate,end-20/60)-clock)*60);const margin=travelMargin/60,edge=[h.open,gate,end-20/60].some(v=>Math.abs(clock-v)<margin),depart=seoulParts(departure),alreadyLate=depart.date===serviceDate&&!h.overnight&&depart.hour>=gate;if(edge&&!alreadyLate)set('hours','unknown',`추정 도착 ${ZP.fmtH(arrival.hour)}이 운영 경계에 가까움 · ${travelMargin}분 보수적 여유 적용, 실제 오차는 미확인`);else set('hours',allow?'pass':'fail',allow?`도착 ${ZP.fmtH(arrival.hour)} · ${ZP.fmtH(end)}까지 운영`:`도착 ${ZP.fmtH(arrival.hour)} · 입장 또는 최소 관람 가능 시간 밖`);}
    const c=p.closed;if(serviceDate&&c.holidayClosed&&ZP.holidays2026.includes(serviceDate)){set('closure','fail',serviceDate+' 안내된 공휴일 휴무');}else if(serviceDate&&c.holidayClosed&&!serviceDate.startsWith('2026')){set('closure','unknown','해당 연도 공휴일 휴무 확인 필요');}else if(c.alwaysClosed){set('closure','fail','운영 종료 또는 영구 폐쇄 안내');}else if(serviceDate&&c.confidence==='none'&&h.confidence==='high'&&h.open===0&&h.close===24){set('closure','pass','안내상 상시 개방');}else if(!serviceDate||c.confidence!=='high'){set('closure','unknown','휴무일 또는 적용 날짜 확인 필요');}else{const wd=new Date(serviceDate+'T12:00:00+09:00').getUTCDay(),hol=ZP.holidays2026.includes(serviceDate);let closed=c.weekdays.includes(wd)||(c.holidayClosed&&hol);if(closed&&c.holidayException){if(!serviceDate.startsWith('2026')){set('closure','unknown','해당 연도 공휴일 예외 확인 필요');closed=null;}else if(hol)closed=false;}if(c.fixed.includes(serviceDate.slice(5)))closed=true;if(c.setsuChuseok){if(!serviceDate.startsWith('2026')){set('closure','unknown','해당 연도 명절 휴무 확인 필요');closed=null;}else if(['2026-02-17','2026-09-25'].includes(serviceDate))closed=true;}if(closed!==null)set('closure',closed?'fail':'pass',closed?serviceDate+' 안내된 휴무일':serviceDate+' 안내된 정기휴무에 해당하지 않음');}
    if(tmin===null)set('window','unknown','좌표 또는 출발지 없어 이동시간 확인 필요');else set('window',ctx.remainMin>=20&&travelMargin>0&&Math.abs(tmin+20-ctx.remainMin)<travelMargin?'unknown':tmin+20<=ctx.remainMin?'pass':'fail',`추정 이동 ${tmin}분 + 최소 관람 20분 / 남은 ${Math.round(ctx.remainMin)}분`+(travelMargin>0?` · 경계에는 ${travelMargin}분 보수적 여유 적용`:''));
    const required=[];if(ctx.wheel)required.push(['휠체어 출입',p.access.wheelchairStatus||'unknown']);if(ctx.stroller)required.push(['유모차 이동',p.access.strollerStatus||'unknown']);if(ctx.noStairs)required.push(['계단 없는 전체 동선',p.access.stepFreeStatus||'unknown']);if(!required.length)set('access','na','필수 접근 조건 없음');else set('access',required.some(x=>x[1]==='fail')?'fail':required.some(x=>x[1]==='unknown')?'unknown':'pass',...required.map(([name,s])=>name+(s==='pass'?' 가능 정보 있음':s==='fail'?' 불가 정보 있음':' 확인 필요')));
    set('reservation',!p.reservation?'na':ctx.bookedIds.includes(p.id)?'pass':'unknown',!p.reservation?'필수 예약 안내가 확인되지 않음':ctx.bookedIds.includes(p.id)?'사용자가 이 장소의 예약 완료를 확인함':'예약 안내 있음 · 적용 대상과 예약 완료 여부 확인 필요');
    const rules=ZP.regulationRules.filter(r=>r.sourceValidated&&typeof r.matches==='function'&&r.matches(p));if(p.reg&&p.reg.sourceValidated)rules.push(p.reg);if(!rules.length)set('regulation','na','적용이 확인된 별도 방문 제한 없음');else{const statuses=rules.map(r=>{if(!arrival)return {status:'unknown',reason:'규제 적용 도착 시각 확인 필요'};if(typeof r.evaluate==='function')return r.evaluate(p,ctx,arrival);if(!Number.isFinite(r.open)||!Number.isFinite(r.close))return {status:'unknown',reason:r.label+' · 규제 시간 확인 필요'};const allowed=r.open<=r.close?arrival.hour>=r.open&&arrival.hour<r.close:arrival.hour>=r.open||arrival.hour<r.close;return {status:allowed?'pass':'fail',reason:r.label||'법정 방문 허용 시간'};});set('regulation',statuses.some(x=>x.status==='fail')?'fail':statuses.some(x=>x.status==='unknown')?'unknown':'pass',...statuses.map(x=>x.reason||x.text||'방문 제한 확인'));}
    if(p.visitRestriction)set('regulation','fail',p.visitRestriction);
    const soft=[];const add=(axis,status,text,weight)=>soft.push({axis,status,text,weight});if(required.length)add('access',axes.access.status,axes.access.reasons.join(' · '),30);if(ctx.free)add('cost',!p.fee.known||p.fee.conditional?'unknown':p.fee.free?'pass':'fail',!p.fee.known?'요금 정보 없음':p.fee.conditional?'일부 유료 또는 무료 적용 조건 확인 필요':p.fee.free?'입장료 무료':'유료 안내 · 무료 선호와 다름',25*(ctx.costPriority?2:1));
    if(ctx.langs.length){const codes=ctx.langs.map(x=>langAlias[x]||x),match=codes.every(x=>p.langCodes.includes(x)||x==='zh'&&p.langCodes.some(c=>c.startsWith('zh')));add('lang',!p.langCodes.length?'unknown':match?'pass':'fail',!p.langCodes.length?'홈페이지 언어 정보 없음':match?'선택 언어 홈페이지 제공 · 현장 안내 언어는 별도 확인':'선택 언어가 홈페이지 제공 언어에 없음 · 현장 안내 미확인',20);}
    if(ctx.estimatedMaxMin)add('travel',tmin===null?'unknown':tmin<=ctx.estimatedMaxMin?'pass':'fail',tmin===null?'이동시간 추정 불가':`추정 ${tmin}분 / 선호 ${ctx.estimatedMaxMin}분 이내`,15);
    if(!ctx.whatAny){const matched=ctx.what.filter(x=>(p.interestTags||[]).includes(x));add('interest',!(p.interestTags||[]).length?'unknown':matched.length?'pass':'fail',matched.length?'관심사 일치: '+matched.join(', '):!(p.interestTags||[]).length?'관심사 분류 근거 부족':'선택 관심사와 분류가 다름',10);}
    const unsupported=[...ctx.why.filter(x=>!['무료 이용','any'].includes(x)),...Object.entries(ctx.custom||{}).filter(([k,v])=>k!=='what'&&v).map(([,v])=>textValue(v))];if(unsupported.length)soft.push(...unsupported.map(x=>({axis:'unmatched',status:'unknown',text:`${x} · 판정할 근거 없음`,weight:0})));
    const weight=soft.reduce((a,x)=>a+x.weight,0),knownEarned=soft.filter(x=>x.status==='pass').reduce((a,x)=>a+x.weight,0),unknown=soft.filter(x=>x.status==='unknown').reduce((a,x)=>a+x.weight,0);const score={value:weight?Math.round(knownEarned/weight*100):null,unknownWeight:weight?Math.round(unknown/weight*100):0,active:weight>0,complete:soft.filter(x=>x.weight>0).every(x=>x.status==='pass'),reasons:soft.map(x=>({...x,weight:weight?Math.round(x.weight/weight*10000)/100:0}))};
    const hardStatus=Object.values(axes).some(x=>x.status==='fail')?'fail':Object.values(axes).some(x=>x.status==='unknown')?'unknown':'pass';for(const [k,a]of Object.entries(axes)){if(a.status==='fail')a.reasons.forEach(t=>no.push({axis:axisLabels[k],t}));else if(a.status==='unknown')chk.push(...a.reasons);else if(a.status==='pass')why.push(...a.reasons);}for(const x of score.reasons){if(x.status==='unknown')chk.push(x.text);}
    if(tmin!==null)why.unshift(`출발지에서 ${({walk:'도보',transit:'대중교통',car:'차량'})[usedMode]} 약 ${tmin}분 (추정)`);return {ok:hardStatus!=='fail',why,no,chk:[...new Set(chk)],km,tmin,usedMode,travelMargin,closingInMin,arriveAt,arrivalDate:arrival&&arrival.date,arrivalHour:arrival&&arrival.hour,needCheck:hardStatus==='unknown'||!score.complete,axes,hardStatus,score};
  };
  const num=(x)=>Number.isFinite(x)?x:Infinity,cmp=(a,b)=>a===b?0:a<b?-1:1;
  ZP.sorters={near:(a,b)=>cmp(num(a.km),num(b.km)),fast:(a,b)=>cmp(num(a.tmin),num(b.tmin)),closing:(a,b)=>cmp(num(a.closingInMin),num(b.closingInMin)),ending:(a,b)=>cmp(a.p.period.end||'9999',b.p.period.end||'9999'),free:(a,b)=>Number(b.p.fee.free)-Number(a.p.fee.free),quiet:()=>0,latest:(a,b)=>cmp(b.p.sourceUpdatedAt||'',a.p.sourceUpdatedAt||''),score:(a,b)=>cmp(b.score.value??-1,a.score.value??-1)};
  ZP.sortLabels={near:'가까운 순',fast:'빨리 도착하는 순',closing:'마감 임박순',ending:'종료 임박순',free:'무료 우선',latest:'정보 갱신순'};
  ZP.defaultSort=st=>(st.why||[]).includes('무료 이용')?'free':'near';
  ZP.snapshotDiag=()=>{try{sessionStorage.setItem('zp_diag',JSON.stringify(ZP.diag));}catch(e){}return {...ZP.diag};};
  ZP.saveState=s=>{try{sessionStorage.setItem('zp_state',JSON.stringify(s));}catch(e){}};ZP.loadState=()=>{try{return JSON.parse(sessionStorage.getItem('zp_state')||'null');}catch(e){return null;}};
  ZP.evaluate=function(places,st,sortKey,options={}){const ctx=ZP.context(st),threshold=Number.isFinite(+options.minScore)?Math.max(0,Math.min(100,+options.minScore)):70,completeOnly=!!options.completeOnly;const judged=places.map(p=>({p,...ZP.judge(p,ctx)})),open=[],partial=[],check=[],shut=[],below=[],hiddenPartial=[];for(const x of judged){if(x.hardStatus==='fail')shut.push(x);else if(x.hardStatus==='unknown')check.push(x);else if(x.score.active&&x.score.value<threshold)below.push(x);else if(x.score.complete)open.push(x);else (completeOnly?hiddenPartial:partial).push(x);}const sorter=ZP.sorters[sortKey]||ZP.sorters.near;[open,partial,check,shut,below,hiddenPartial].forEach(a=>a.sort(sorter));const byAxis={};shut.forEach(x=>x.no.forEach(n=>byAxis[n.axis]=(byAxis[n.axis]||0)+1));return {ctx,places,judged,open,partial,check:completeOnly?[]:check,hiddenCheck:completeOnly?check:[],shut,below,hiddenPartial,byAxis,total:places.length,minScore:threshold,completeOnly};};
  /* 장소별 캐시에는 출발지·현재 위치·판정 결과를 저장하지 않는다. */
  const detailCache=new Map();const cacheTTL=()=>Math.max(1000,Number(ZP.config.CACHE_TTL_MS)||15*60*1000);
  const cacheKey=(ad,id)=>'zp_place_v5:'+(ad.sourceKind||(ad===ZP.adapters.mock?'demo':'api'))+':'+ad.name+':'+id;
  function cached(ad,id){const key=cacheKey(ad,id);let x=detailCache.get(key);if(!x){try{x=JSON.parse(sessionStorage.getItem(key)||'null');}catch(e){}}if(x&&Date.now()-x.at<cacheTTL()){detailCache.set(key,x);return x.p;}if(x){detailCache.delete(key);try{sessionStorage.removeItem(key);}catch(e){}}return null;}
  function cachePut(ad,id,p){const key=cacheKey(ad,id),x={at:Date.now(),p};detailCache.set(key,x);try{sessionStorage.setItem(key,JSON.stringify(x));}catch(e){}}
  const abortError=()=>Object.assign(new Error('요청이 취소되었습니다.'),{name:'AbortError'});
  function transientError(error){return ['TIMEOUT','NETWORK'].includes(error&&error.code)||[500,502,503,504].includes(Number(error&&(error.status||error.httpStatus)))||error&&error.name==='TypeError';}
  function failureInfo(error,extra={}){return {...extra,message:String(error&&error.message||'조회 실패'),code:error&&error.code||null,status:Number(error&&(error.status||error.httpStatus))||null};}
  function supplementListImage(p,listing,id){if((p.images||[]).length||!listing||String(dig(listing,'cid'))!==id)return false;const main=dig(listing,'main_img')||dig(listing,'main_img_url');if(typeof main!=='string'||!/^https?:\/\//i.test(main)||!safeURL(main))return false;p.images=[main];p.image=main;p.imageSources=[{url:main,field:dig(listing,'main_img')?'main_img':'main_img_url',response:'list',cid:id}];p.imageSource=p.imageSources[0];return true;}
  async function detail(ad,id,options={}){if(options.signal&&options.signal.aborted)throw abortError();const old=cached(ad,id);if(old){if(supplementListImage(old,options.listItem,id))cachePut(ad,id,old);return old;}const raw=await ad.info(id,options);validate(raw,'info');if(String(dig(raw,'cid'))!==String(id))throw new Error('요청한 장소와 상세 응답 식별자가 다릅니다.');const p=ZP.normalize(raw);p.demo=ad===ZP.adapters.mock;p.sourceKind=ad.sourceKind||(p.demo?'demo':'api');p.sourceName=ad.name;if(p.demo&&raw.reg&&raw.reg.sourceValidated)p.reg=raw.reg;supplementListImage(p,options.listItem,id);cachePut(ad,id,p);return p;}
  async function pool(items,fn,signal){let next=0;await Promise.all(Array.from({length:Math.min(items.length,Math.max(1,Math.min(3,+ZP.config.CONCURRENCY||3)))},async()=>{while(next<items.length){if(signal&&signal.aborted)throw abortError();const i=next++;await fn(items[i],i);}}));}
  ZP.getPlace=async function(id,options={}){const ad=ZP.adapter();ZP.diag.source=ad.name;ZP.diag.demo=ad===ZP.adapters.mock;try{return await detail(ad,String(id),options);}catch(e){if(e.name==='AbortError'||options.retry===false||!transientError(e))throw e;return detail(ad,String(id),options);}};
  ZP.run=async function(st,sortKey,onProgress,options={}){
    const ad=ZP.adapter(),ctx=ZP.context(st),signal=options.signal,demo=ad===ZP.adapters.mock,sourceKind=ad.sourceKind||(demo?'demo':'api');
    const configured=Number(options.target??ZP.config.MIN_PLACES??50),target=Number.isFinite(configured)&&configured>0?Math.floor(configured):50;
    const maxPages=Math.max(1,Math.min(4,+ZP.config.MAX_PAGES||4)),concurrency=Math.max(1,Math.min(3,+ZP.config.CONCURRENCY||3));
    const requested=ctx.whatAny?ZP.allCodes:[...new Set(ctx.what.flatMap(x=>ZP.categoryCodes[x]||[]))],initialCategories=requested.length?requested:ZP.allCodes,remainingCategories=ZP.allCodes.filter(x=>!initialCategories.includes(x));
    const places=[],outOfScopeIds=[],seen=new Map(),perCategory={},failedDetails=new Map(),listFailures=[],expandedCategories=[],searchedCategories=[];let listSucceeded=0,attemptFailures=0,retriesScheduled=0,retriesRecovered=0,scopeExpanded=false,truncated=false;const retrievedAt=new Date();
    Object.assign(ZP.diag,{source:ad.name,demo,lastError:null,received:0,normalized:0,failed:0});
    const progress=msg=>{if(onProgress)onProgress(msg);};
    const metadata=()=>{const counts=Object.values(perCategory),known=counts.every(x=>x.availableTotal!==null)&&!listFailures.some(x=>x.page===1);return {source:ad.name,sourceKind,demo,outOfScopeIds:[...outOfScopeIds],failed:failedDetails.size+listFailures.length,failedIds:[...failedDetails.keys()],failures:[...failedDetails.values(),...listFailures],received:seen.size,availableTotal:known?counts.reduce((s,x)=>s+x.availableTotal,0):null,availableTotalIsCategorySum:true,target,targetMet:places.length>=target,scopeExpanded,initialCategories:[...initialCategories],expandedCategories:[...expandedCategories],searchedCategories:[...searchedCategories],attemptFailures,retriesScheduled,retriesRecovered,truncated,incomplete:failedDetails.size+listFailures.length>0||truncated||places.length<target,retrievedAt,perCategory};};
    const emit=()=>{if(options.onPartial)options.onPartial({...ZP.evaluate(places.slice(),st,sortKey,options),...metadata()});};
    function interleave(batches){const result=[];let i=0,added;do{added=false;for(const batch of batches){if(i<batch.length){result.push(batch[i]);added=true;}}i++;}while(added);return result;}
    async function loadDetails(rows){const queue=[],retryQueue=[];for(const row of rows){const id=String(dig(row,'cid')||'');if(id&&!seen.has(id)){seen.set(id,row);queue.push(id);}}
      let next=0;const attempt=async(id,retry)=>{try{const p=await detail(ad,id,{signal,listItem:seen.get(id)});if(ZP.outsideSeoul(p)){outOfScopeIds.push(id);}else places.push(p);failedDetails.delete(id);if(retry)retriesRecovered++;}catch(e){if(e.name==='AbortError')throw e;attemptFailures++;if(!retry&&transientError(e)){retryQueue.push(id);retriesScheduled++;}else failedDetails.set(id,failureInfo(e,{cid:id,kind:'detail',attempts:retry?2:1}));}progress(`실제 상세 ${places.length}/${target}곳 · 재시도 대기 ${retryQueue.length}건`);emit();};
      await Promise.all(Array.from({length:Math.min(concurrency,queue.length)},async()=>{while(next<queue.length&&places.length<target){if(signal&&signal.aborted)throw abortError();await attempt(queue[next++],false);}}));
      // 정상 후보를 먼저 표시한 후 실패 항목을 한 차례만 뒷순서에서 재시도한다.
      await pool(retryQueue,id=>attempt(id,true),signal);
      if(next<queue.length)truncated=true;
    }
    async function phase(codes,expanded){const state=new Map();for(let page=1;page<=maxPages&&places.length<target;page++){
      const active=page===1?codes:codes.filter(code=>{const q=state.get(code);return q&&!q.stopped&&q.lastCount>=q.pageSize&&(q.total===null||q.ids.size<q.total);});if(!active.length)break;const batches=new Map(),retryLists=[];
      const readList=async(code,retry)=>{if(!searchedCategories.includes(code))searchedCategories.push(code);if(expanded&&!expandedCategories.includes(code))expandedCategories.push(code);
        try{const raw=await ad.list({com_ctgry_sn:code,lang_code_id:'ko',sort_type:'latest',page_no:page,...(ctx.custom.what?{keyword:ctx.custom.what}:{})},{signal});const rows=validate(raw,'list');if(dig(raw,'page_no')!==null&&Number(dig(raw,'page_no'))!==page)throw new Error('목록 응답 페이지가 요청과 다릅니다.');const totalRaw=dig(raw,'total_count'),total=Number(totalRaw),q=state.get(code)||{ids:new Set(),pageSize:50,total:null,stopped:false};if(page===1){q.pageSize=Math.max(1,Number(dig(raw,'page_size'))||50);q.total=totalRaw!==null&&Number.isFinite(total)&&total>=0?total:null;}const fresh=rows.filter(row=>!q.ids.has(String(dig(row,'cid'))));if(rows.length&&!fresh.length)throw new Error('목록 페이지가 앞선 결과를 반복했습니다.');rows.forEach(row=>q.ids.add(String(dig(row,'cid'))));q.lastCount=rows.length;q.page=page;state.set(code,q);perCategory[code]={availableTotal:q.total,received:q.ids.size,pages:page};batches.set(code,fresh);listSucceeded++;if(retry)retriesRecovered++;}
        catch(e){if(e.name==='AbortError')throw e;attemptFailures++;if(!retry&&transientError(e)){retryLists.push(code);retriesScheduled++;}else{listFailures.push(failureInfo(e,{category:code,page,kind:'list',attempts:retry?2:1}));const q=state.get(code);if(q)q.stopped=true;truncated=true;}}
      };
      await pool(active,code=>readList(code,false),signal);
      await loadDetails(interleave(active.map(code=>batches.get(code)||[])));
      // 목록의 일시 오류도 이미 받은 정상 상세를 보여준 뒤 재시도한다.
      batches.clear();await pool(retryLists,code=>readList(code,true),signal);
      if(batches.size&&places.length<target)await loadDetails(interleave(active.map(code=>batches.get(code)||[])));
      else if(batches.size)truncated=true;
    }
    for(const q of state.values()){if(q.total!==null&&q.ids.size<q.total||q.total===null&&q.lastCount>=q.pageSize)truncated=true;}
    }
    await phase(initialCategories,false);
    if(places.length<target&&remainingCategories.length){scopeExpanded=true;progress(`실제 상세 ${places.length}곳 · ${target}곳 확보를 위해 다른 분류도 조회합니다.`);emit();await phase(remainingCategories,true);}
    const finalMetadata=metadata();if(!listSucceeded&&listFailures.length){const e=Object.assign(new Error('모든 관광 목록 조회가 실패했습니다. 다시 시도해 주세요.'),{code:'ALL_FAILED',...finalMetadata});ZP.diag.lastError=e.message;throw e;}
    if(seen.size&&!places.length){const e=Object.assign(new Error('장소 상세 정보를 모두 불러오지 못했습니다. 다시 시도해 주세요.'),{code:'ALL_FAILED',...finalMetadata});ZP.diag.lastError=e.message;throw e;}
    const result={...ZP.evaluate(places,st,sortKey,options),...finalMetadata};Object.assign(ZP.diag,{received:seen.size,normalized:places.length,failed:result.failed,passed:result.open.length});return result;
  };

  ZP.weather=async function(lat,lng){try{const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=precipitation,temperature_2m&timezone=Asia%2FSeoul`);const j=await r.json();return{rainy:(j.current&&j.current.precipitation>0.2),temp:j.current&&j.current.temperature_2m};}catch(e){return null;}};

  /* ── 지오코딩: Google 키 있으면 Geocoding API, 없으면 내부 프리셋(역·권역·관광지명) 매칭. 실패 시 대체 좌표 없음 ── */
  ZP.geocode=async function(q){q=(q||'').trim();if(!q)return [];
    const local=Object.keys(ZP.areas).filter(a=>a.split('·').some(t=>q.includes(t)||t.includes(q))).map(a=>({label:a,...ZP.areas[a],source:'preset'}));
    if(local.length||!ZP.config.GOOGLE_MAPS_KEY)return local;
    const controller=new AbortController();let timer;
    const timeout=new Promise(resolve=>{timer=setTimeout(()=>{controller.abort();resolve(null);},Number(ZP.config.GEOCODE_TIMEOUT_MS)||8000);});
    try{const request=(async()=>{const r=await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q+' 서울')}&language=ko&region=kr&key=${encodeURIComponent(ZP.config.GOOGLE_MAPS_KEY)}`,{signal:controller.signal});if(!r.ok)return null;return r.json();})();const j=await Promise.race([request,timeout]);if(j&&j.status==='OK'&&Array.isArray(j.results))return j.results.filter(x=>x&&x.geometry&&x.geometry.location&&Number.isFinite(x.geometry.location.lat)&&Number.isFinite(x.geometry.location.lng)).slice(0,5).map(x=>({label:String(x.formatted_address||q),lat:x.geometry.location.lat,lng:x.geometry.location.lng,source:'google'}));}catch(e){}finally{clearTimeout(timer);}return local;
  };

/* data.js의 기존 ZP.map 정의 전체를 이 블록으로 교체합니다. */
{
  const GOOGLE_MAP_ERROR_MESSAGES={
    ApiNotActivatedMapError:'Google Maps JavaScript API가 활성화되지 않았습니다.',
    RefererNotAllowedMapError:'현재 사이트 주소가 Google Maps 허용 목록에 없습니다.',
    BillingNotEnabledMapError:'Google Maps 결제 계정이 활성화되지 않았습니다.',
    InvalidKeyMapError:'Google Maps API 키가 유효하지 않습니다.'
  };
  const GOOGLE_MAP_ERROR_CODES=Object.keys(GOOGLE_MAP_ERROR_MESSAGES);
  const GOOGLE_CALLBACK='__zpGoogleMapsReady';
  const USER_MAP_ERROR='지도를 불러오지 못했습니다. 결과 목록은 계속 사용할 수 있습니다.';

  function setMapDiag(status,code,message){
    ZP.diag.map={status,...(code?{code}:{}),message};
  }

  function findKnownGoogleCode(args){
    for(const value of args){
      let text='';
      try{text=typeof value==='string'?value:String(value&&value.message||value||'');}catch(_){text='';}
      const code=GOOGLE_MAP_ERROR_CODES.find(candidate=>text.includes(candidate));
      if(code)return code;
    }
    return null;
  }

  function watchGoogleConsole(listener){
    if(!global.console||typeof global.console.error!=='function')return()=>{};
    if(!ZP._googleConsoleHub){
      const original=global.console.error;
      const listeners=new Set();
      const wrapped=function(...args){
        original.apply(this,args);
        const code=findKnownGoogleCode(args);
        if(code)for(const fn of [...listeners]){try{fn(code);}catch(_){}}
      };
      ZP._googleConsoleHub={original,listeners,wrapped};
      global.console.error=wrapped;
    }
    const hub=ZP._googleConsoleHub;
    hub.listeners.add(listener);
    return()=>{
      hub.listeners.delete(listener);
      if(!hub.listeners.size){
        if(global.console&&global.console.error===hub.wrapped)global.console.error=hub.original;
        if(ZP._googleConsoleHub===hub)ZP._googleConsoleHub=null;
      }
    };
  }

  function watchGoogleAuth(listener){
    if(!ZP._googleAuthHub){
      const previous=global.gm_authFailure;
      const listeners=new Set();
      const dispatch=function(){
        for(const fn of [...listeners]){try{fn();}catch(_){}}
        if(typeof previous==='function'){try{previous.call(global);}catch(_){}}
      };
      ZP._googleAuthHub={previous,listeners,dispatch};
      global.gm_authFailure=dispatch;
    }
    const hub=ZP._googleAuthHub;
    hub.listeners.add(listener);
    return()=>hub.listeners.delete(listener);
  }

  function googleMapsLoader(key){
    if(global.google&&global.google.maps&&typeof global.google.maps.Map==='function')return Promise.resolve(global.google.maps);
    if(ZP._googleMapsLoad&&ZP._googleMapsLoad.key===key)return ZP._googleMapsLoad.promise;

    const state={key,promise:null};
    state.promise=new Promise((resolve,reject)=>{
      let settled=false,script=null,timer=null;
      const previousCallback=global[GOOGLE_CALLBACK];
      let stopConsole=()=>{},stopAuth=()=>{};
      const cleanup=failed=>{
        clearTimeout(timer);
        stopConsole();stopAuth();
        if(global[GOOGLE_CALLBACK]===ready){
          if(typeof previousCallback==='function')global[GOOGLE_CALLBACK]=previousCallback;
          else{try{delete global[GOOGLE_CALLBACK];}catch(_){global[GOOGLE_CALLBACK]=undefined;}}
        }
        if(script){script.onerror=null;if(failed&&script.parentNode)script.parentNode.removeChild(script);}
        if(failed&&ZP._googleMapsLoad===state)ZP._googleMapsLoad=null;
      };
      const fail=(code,message)=>{
        if(settled)return;
        settled=true;cleanup(true);
        reject(Object.assign(new Error(message),{code}));
      };
      const ready=function(){
        if(settled)return;
        const maps=global.google&&global.google.maps;
        if(!maps||typeof maps.Map!=='function'){fail('GoogleMapsUnavailable','Google 지도 모듈이 준비되지 않았습니다.');return;}
        settled=true;cleanup(false);resolve(maps);
        if(typeof previousCallback==='function'){try{previousCallback.call(global);}catch(_){}}
      };
      stopConsole=watchGoogleConsole(code=>fail(code,GOOGLE_MAP_ERROR_MESSAGES[code]));
      stopAuth=watchGoogleAuth(()=>fail('GoogleMapsAuthenticationError','Google 지도 인증에 실패했습니다.'));
      global[GOOGLE_CALLBACK]=ready;
      timer=setTimeout(()=>fail('GoogleMapsTimeout','Google 지도 로더가 10초 안에 응답하지 않았습니다.'),Number(ZP.config.MAP_TIMEOUT_MS)||10000);
      script=document.createElement('script');
      script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=${encodeURIComponent(GOOGLE_CALLBACK)}&loading=async&language=ko&region=KR`;
      script.async=true;
      script.onerror=()=>fail('GoogleMapsNetworkError','Google 지도 스크립트를 불러오지 못했습니다.');
      try{document.head.appendChild(script);}catch(_){fail('GoogleMapsNetworkError','Google 지도 스크립트를 추가하지 못했습니다.');}
    });
    ZP._googleMapsLoad=state;
    return state.promise;
  }

  ZP.map=function(el,center,zoom,onFail){
    const key=ZP.config.GOOGLE_MAPS_KEY;
    const container=typeof el==='string'?document.getElementById(el):el;
    const notify=message=>{try{if(onFail)onFail(message);}catch(_){}};
    if(!container){
      setMapDiag('error','MapContainerMissing','지도 표시 영역을 찾을 수 없습니다.');
      notify(USER_MAP_ERROR);return null;
    }

    let surface=document.createElement('div');
    surface.style.width='100%';surface.style.height='100%';
    container.replaceChildren(surface);

    const api={markers:[],overlays:[],provider:null};
    const makeUnavailable=()=>{
      api.provider='none';api.markers=[];api.overlays=[];
      api.add=()=>null;api.focus=()=>{};api.fit=()=>{};api.clear=()=>{};api.resize=()=>{};
    };

    function leaflet(){
      if(!global.L){
        setMapDiag('error','LeafletUnavailable','지도 라이브러리를 사용할 수 없습니다.');
        notify(USER_MAP_ERROR);return null;
      }
      try{
        const m=global.L.map(surface,{scrollWheelZoom:true,zoomControl:false}).setView([center.lat,center.lng],zoom);
        global.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{maxZoom:20,attribution:'© OpenStreetMap, © CARTO'}).addTo(m);
        global.L.control.zoom({zoomInTitle:'확대',zoomOutTitle:'축소'}).addTo(m);api.provider='osm';
        api.add=(pos,opt)=>{let mk;if(opt.me){mk=global.L.circleMarker([pos.lat,pos.lng],{radius:8,color:'#fff',weight:3,fillColor:'#7437B0',fillOpacity:1}).addTo(m);api.overlays.push(global.L.circle([pos.lat,pos.lng],{radius:120,color:'#7437B0',weight:1,fillOpacity:.08}).addTo(m));mk.bindTooltip(opt.label,{permanent:true,direction:'top',offset:[0,-8],className:'me-tip'});}else{const icon=global.L.divIcon({className:'zp-pin',html:`<div class="pin ${opt.dim?'dim':''}"><b>${opt.num||''}</b></div>`,iconSize:[30,38],iconAnchor:[15,38],popupAnchor:[0,-34]});mk=global.L.marker([pos.lat,pos.lng],{icon,title:opt.label}).addTo(m);if(opt.popup)mk.bindPopup(opt.popup,{maxWidth:250});if(opt.onClick)mk.on('click',opt.onClick);}api.markers.push({mk,pos,opt});return mk;};
        api.focus=(pos,on)=>{const item=api.markers.find(x=>x.pos===pos);if(!item)return;const markerElement=item.mk.getElement&&item.mk.getElement();if(markerElement)markerElement.classList.toggle('on',on);if(on){m.panTo([pos.lat,pos.lng]);if(item.mk.openPopup)item.mk.openPopup();}};
        api.fit=()=>{if(api.markers.length)m.fitBounds(api.markers.map(x=>[x.pos.lat,x.pos.lng]),{padding:[40,40],maxZoom:16});};
        api.clear=()=>{api.markers.forEach(x=>{if(x.mk.unbindTooltip)x.mk.unbindTooltip();x.mk.remove();});api.overlays.forEach(x=>x.remove());api.markers=[];api.overlays=[];};
        api.resize=()=>m.invalidateSize();api.destroy=()=>{api.clear();m.remove();};
        setMapDiag('ready',null,'OpenStreetMap 지도를 사용합니다.');return api;
      }catch(_){
        makeUnavailable();setMapDiag('error','LeafletInitializationError','OpenStreetMap 지도를 준비하지 못했습니다.');notify(USER_MAP_ERROR);return null;
      }
    }

    if(!key)return leaflet();

    setMapDiag('loading',null,'Google 지도를 불러오는 중입니다.');
    let failed=false,m=null,info=null;
    let stopConsole=()=>{},stopAuth=()=>{};
    const cleanupGoogle=()=>{
      try{api.markers.forEach(x=>x.mk.setMap(null));api.overlays.forEach(x=>x.setMap(null));if(info)info.close();const g=global.google&&global.google.maps;if(m&&g&&g.event&&g.event.clearInstanceListeners)g.event.clearInstanceListeners(m);}catch(_){}
      api.markers=[];api.overlays=[];
    };
    const failGoogle=(code,message)=>{
      if(failed)return;
      failed=true;stopConsole();stopAuth();cleanupGoogle();makeUnavailable();setMapDiag('error',code,message);notify(USER_MAP_ERROR);
    };
    stopConsole=watchGoogleConsole(code=>failGoogle(code,GOOGLE_MAP_ERROR_MESSAGES[code]));
    stopAuth=watchGoogleAuth(()=>failGoogle('GoogleMapsAuthenticationError','Google 지도 인증에 실패했습니다.'));

    return googleMapsLoader(key).then(g=>{
      if(failed)return null;
      try{
        m=new g.Map(surface,{center,zoom,mapTypeControl:false,streetViewControl:true,fullscreenControl:true,zoomControl:true,gestureHandling:'greedy',clickableIcons:true,mapTypeId:'roadmap',styles:[{featureType:'poi.business',stylers:[{visibility:'on'}]}]});
        if(failed){cleanupGoogle();return null;}
        info=new g.InfoWindow({maxWidth:260});api.provider='google';
        api.add=(pos,opt)=>{let mk;if(opt.me){mk=new g.Marker({position:pos,map:m,zIndex:999,title:opt.label,icon:{path:g.SymbolPath.CIRCLE,scale:8,fillColor:'#7437B0',fillOpacity:1,strokeColor:'#fff',strokeWeight:3}});api.overlays.push(new g.Circle({map:m,center:pos,radius:120,strokeColor:'#7437B0',strokeWeight:1,strokeOpacity:.5,fillColor:'#7437B0',fillOpacity:.08}));}else{mk=new g.Marker({position:pos,map:m,title:opt.label,label:opt.num?{text:String(opt.num),color:'#fff',fontSize:'12px',fontWeight:'700'}:undefined,icon:{path:'M15 0C6.7 0 0 6.7 0 15c0 11 15 23 15 23s15-12 15-23C30 6.7 23.3 0 15 0z',fillColor:opt.dim?'#B0B8C1':'#0F9D58',fillOpacity:1,strokeColor:'#fff',strokeWeight:2,scale:1,labelOrigin:new g.Point(15,14),anchor:new g.Point(15,38)}});if(opt.popup)mk.addListener('click',()=>{info.setContent(opt.popup);info.open({anchor:mk,map:m});});else if(opt.onClick)mk.addListener('click',opt.onClick);}api.markers.push({mk,pos,opt});return mk;};
        api.focus=(pos,on)=>{const item=api.markers.find(x=>x.pos===pos);if(!item)return;if(item.mk.setZIndex)item.mk.setZIndex(on?900:1);const icon=item.mk.getIcon&&item.mk.getIcon();if(icon&&icon.path){icon.scale=on?1.35:1;item.mk.setIcon(icon);}if(on){m.panTo(pos);if(item.opt.popup){info.setContent(item.opt.popup);info.open({anchor:item.mk,map:m});}}};
        api.fit=()=>{const bounds=new g.LatLngBounds();api.markers.forEach(x=>bounds.extend(x.pos));if(api.markers.length){m.fitBounds(bounds,60);if(api.markers.length===1)m.setZoom(16);}};
        api.clear=()=>{api.markers.forEach(x=>x.mk.setMap(null));api.overlays.forEach(x=>x.setMap(null));api.markers=[];api.overlays=[];info.close();};
        api.resize=()=>g.event.trigger(m,'resize');
        api.destroy=()=>{stopConsole();stopAuth();cleanupGoogle();makeUnavailable();};
        setMapDiag('ready',null,'Google 지도를 사용합니다.');return api;
      }catch(_){failGoogle('GoogleMapInitializationError','Google 지도 객체를 준비하지 못했습니다.');return null;}
    }).catch(error=>{
      failGoogle(error&&error.code||'GoogleMapsLoadError',error&&error.message||'Google 지도를 불러오지 못했습니다.');
      stopConsole();stopAuth();return null;
    });
  };
}
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
