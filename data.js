/* ZERO PROBLEMS — 데이터 계층 · 정규화 · 판정/정렬 엔진 (정적 사이트용)
 * 구조: adapters(mock|visitseoul) → normalize(16필드 → 통합 모델) → engine(6축 배제 + 7축 정렬)
 * 실제 API 어댑터는 서버 프록시(VISITSEOUL_PROXY_URL)가 있어야 동작한다. README 참고. */
(function(global){
  const ZP = {};

  /* ── 설정 (config.js가 있으면 덮어씀) ── */
  ZP.config = Object.assign({ GOOGLE_MAPS_KEY: "", VISITSEOUL_PROXY_URL: "", DATA_SOURCE: "mock" }, global.ZP_CONFIG || {});

  /* ── 2026 대한민국 공휴일 (공공데이터포털 특일정보 API로 대체 예정) ── */
  ZP.holidays2026 = ["2026-01-01","2026-02-16","2026-02-17","2026-02-18","2026-03-01","2026-03-02","2026-05-05","2026-05-24","2026-05-25","2026-06-06","2026-08-15","2026-08-17","2026-09-24","2026-09-25","2026-09-26","2026-10-03","2026-10-09","2026-12-25"];

  /* ── 출발지 프리셋 (실제 좌표) ── */
  ZP.areas = {
    "광화문·종로":{lat:37.5710,lng:126.9769},"명동·을지로":{lat:37.5636,lng:126.9840},"북촌·삼청동":{lat:37.5826,lng:126.9831},
    "홍대·연남":{lat:37.5563,lng:126.9237},"성수":{lat:37.5446,lng:127.0559},"이태원·한남":{lat:37.5345,lng:126.9946},
    "강남·역삼":{lat:37.4979,lng:127.0276},"잠실":{lat:37.5133,lng:127.1001},"여의도":{lat:37.5219,lng:126.9245},"서울역":{lat:37.5547,lng:126.9707}
  };

  /* ── 비짓서울 API 어댑터 ──
   * 확인된 명세: POST /api/v1/contents/list {com_ctgry_sn, lang_code_id, keyword, sort_type, page_no}
   *              POST /api/v1/contents/info {cid}     헤더 VISITSEOUL-API-KEY
   * 브라우저 직접 호출은 CORS로 차단됨 → 프록시 URL을 통해 호출 (키는 프록시가 보유) */
  ZP.adapters = {
    visitseoul: {
      name: "비짓서울 API",
      async list(params){ return proxy("/api/v1/contents/list", params); },
      async info(cid){ return proxy("/api/v1/contents/info", { cid }); },
    },
    mock: {
      name: "시연 데이터",
      async list(){ return { items: ZP.mockRaw.map(r => ({ cid:r.cid, post_sj:r.post_sj, com_ctgry_sn:r.com_ctgry_sn, cate_depth:r.cate_depth })) }; },
      async info(cid){ const r = ZP.mockRaw.find(x => x.cid===cid); if(!r) throw new Error("not found"); return r; },
    }
  };
  async function proxy(path, body){
    const base = ZP.config.VISITSEOUL_PROXY_URL;
    if(!base) throw new Error("VISITSEOUL_PROXY_URL이 설정되지 않았습니다. README의 프록시 배포 절차를 따르세요.");
    const r = await fetch(base.replace(/\/$/,"") + path, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body||{}) });
    if(r.status===429) throw new Error("호출 제한에 걸렸습니다. 잠시 후 다시 시도하세요.");
    if(!r.ok) throw new Error("API 오류 " + r.status);
    return r.json();
  }

  /* ── 시연 데이터: 비짓서울 16필드 형태 그대로 (좌표·주소는 실제, 운영정보는 공개 안내 기준 표본. 실제 서비스는 API 실시간 값 사용) ── */
  ZP.mockRaw = [
    {cid:"D-001",post_sj:"서울역사박물관",com_ctgry_sn:"Cg1x6l1",cate_depth:"문화관광 > 박물관",adres:"서울 종로구 새문안로 55",map_position_y:37.5703,map_position_x:126.9702,
     cmmn_use_time:"화-일 09:00~18:00 (입장마감 17:30) ※매주 금요일 21:00까지 연장운영",closed_days:"공휴일을 제외한 매주 월요일, 1월 1일 ※월요일이 휴일인 경우 정상개관",
     schdul_info_bgnde:"",schdul_info_endde:"",trrsrt_use_chrge:"F",trrsrt_use_chrge_guidance:"무료(특별전 일부 유료)",cmmn_hmpg_lang:["ko","en","ja","zh-CN"],
     disabled_facility:["접근가능","엘리베이터","장애인화장실","휠체어 대여","장애인 전용 주차장"],cmmn_important:"단체 관람은 사전 예약",cmmn_telno:"02-724-0274",cmmn_hmpg_url:"https://museum.seoul.go.kr",subway_info:"5호선 광화문역 7번 출구 도보 7분",updt_dt_text:"2026-08-20",indoor:true},
    {cid:"D-002",post_sj:"경희궁",com_ctgry_sn:"Cg1x6l1",cate_depth:"역사관광 > 궁궐",adres:"서울 종로구 새문안로 45",map_position_y:37.5713,map_position_x:126.9683,
     cmmn_use_time:"09:00~18:00 (입장마감 17:30)",closed_days:"매주 월요일",schdul_info_bgnde:"",schdul_info_endde:"",trrsrt_use_chrge:"F",trrsrt_use_chrge_guidance:"무료",
     cmmn_hmpg_lang:["ko","en","ja","zh-CN"],disabled_facility:["장애인화장실"],cmmn_important:"궁내 계단 구간 다수",cmmn_telno:"02-724-0274",cmmn_hmpg_url:"https://museum.seoul.go.kr",subway_info:"5호선 서대문역 4번 출구 도보 8분",updt_dt_text:"2026-08-20",indoor:false},
    {cid:"D-003",post_sj:"세종이야기·충무공이야기",com_ctgry_sn:"Cg1x6l1",cate_depth:"문화관광 > 전시시설",adres:"서울 종로구 세종대로 175",map_position_y:37.5724,map_position_x:126.9769,
     cmmn_use_time:"10:30~22:30 (입장마감 22:00)",closed_days:"매주 월요일",schdul_info_bgnde:"",schdul_info_endde:"",trrsrt_use_chrge:"F",trrsrt_use_chrge_guidance:"무료",
     cmmn_hmpg_lang:["ko","en","ja","zh-CN"],disabled_facility:["접근가능","엘리베이터","장애인화장실"],cmmn_important:"광화문광장 지하",cmmn_telno:"02-399-1000",cmmn_hmpg_url:"https://www.sejongpac.or.kr",subway_info:"5호선 광화문역 2번 출구 도보 3분",updt_dt_text:"2026-08-11",indoor:true},
    {cid:"D-004",post_sj:"돈의문박물관마을",com_ctgry_sn:"Cg1x6l1",cate_depth:"문화관광 > 체험",adres:"서울 종로구 송월길 14-3",map_position_y:37.5700,map_position_x:126.9679,
     cmmn_use_time:"10:00~19:00",closed_days:"매주 월요일",schdul_info_bgnde:"",schdul_info_endde:"",trrsrt_use_chrge:"F",trrsrt_use_chrge_guidance:"무료(일부 체험 유료)",
     cmmn_hmpg_lang:["ko","en"],disabled_facility:["접근가능","장애인화장실"],cmmn_important:"골목 경사 구간 있음",cmmn_telno:"02-739-6994",cmmn_hmpg_url:"https://dmvillage.info",subway_info:"5호선 서대문역 4번 출구 도보 5분",updt_dt_text:"2026-08-11",indoor:false},
    {cid:"D-005",post_sj:"국립현대미술관 서울",com_ctgry_sn:"Cg1x6l1",cate_depth:"문화관광 > 미술관",adres:"서울 종로구 삼청로 30",map_position_y:37.5788,map_position_x:126.9804,
     cmmn_use_time:"월·화·목·금·일 10:00~18:00 / 수·토 10:00~21:00 (입장마감 종료 1시간 전)",closed_days:"1월 1일, 설날, 추석 당일",schdul_info_bgnde:"",schdul_info_endde:"",trrsrt_use_chrge:"C",trrsrt_use_chrge_guidance:"통합관람권 유료(만 24세 이하·65세 이상 무료, 수·토 야간 무료)",
     cmmn_hmpg_lang:["ko","en"],disabled_facility:["접근가능","엘리베이터","장애인화장실","휠체어 대여","장애인 전용 주차장"],cmmn_important:"일부 전시 사전예약",cmmn_telno:"02-3701-9500",cmmn_hmpg_url:"https://www.mmca.go.kr",subway_info:"3호선 안국역 1번 출구 도보 10분",updt_dt_text:"2026-09-01",indoor:true},
    {cid:"D-006",post_sj:"대한민국역사박물관",com_ctgry_sn:"Cg1x6l1",cate_depth:"문화관광 > 박물관",adres:"서울 종로구 세종대로 198",map_position_y:37.5735,map_position_x:126.9787,
     cmmn_use_time:"10:00~18:00 (수·토 21:00까지, 입장마감 종료 1시간 전)",closed_days:"1월 1일, 설날·추석 당일",schdul_info_bgnde:"",schdul_info_endde:"",trrsrt_use_chrge:"F",trrsrt_use_chrge_guidance:"무료",
     cmmn_hmpg_lang:["ko","en","ja","zh-CN"],disabled_facility:["접근가능","엘리베이터","장애인화장실","휠체어 대여"],cmmn_important:"",cmmn_telno:"02-3703-9200",cmmn_hmpg_url:"https://www.much.go.kr",subway_info:"5호선 광화문역 2번 출구 도보 2분",updt_dt_text:"2026-08-28",indoor:true},
    {cid:"D-007",post_sj:"덕수궁",com_ctgry_sn:"Cg1x6l1",cate_depth:"역사관광 > 궁궐",adres:"서울 중구 세종대로 99",map_position_y:37.5658,map_position_x:126.9752,
     cmmn_use_time:"09:00~21:00 (입장마감 20:00)",closed_days:"매주 월요일",schdul_info_bgnde:"",schdul_info_endde:"",trrsrt_use_chrge:"C",trrsrt_use_chrge_guidance:"성인 1,000원 (만 24세 이하·65세 이상 무료, 한복 착용 무료)",
     cmmn_hmpg_lang:["ko","en","ja","zh-CN"],disabled_facility:["접근가능","장애인화장실","휠체어 대여"],cmmn_important:"",cmmn_telno:"02-771-9951",cmmn_hmpg_url:"https://www.deoksugung.go.kr",subway_info:"1·2호선 시청역 2번 출구 도보 1분",updt_dt_text:"2026-08-28",indoor:false},
    {cid:"D-008",post_sj:"서울시립미술관 서소문본관",com_ctgry_sn:"Cg1x6l1",cate_depth:"문화관광 > 미술관",adres:"서울 중구 덕수궁길 61",map_position_y:37.5640,map_position_x:126.9738,
     cmmn_use_time:"평일(화-금) 10:00~20:00 / 토·일·공휴일 하절기(3-10월) 10:00~19:00, 동절기(11-2월) 10:00~18:00 (관람 종료 1시간 전까지 입장)",closed_days:"1월 1일, 매주 월요일 (월요일이 공휴일인 경우 정상 개관)",
     schdul_info_bgnde:"",schdul_info_endde:"",trrsrt_use_chrge:"F",trrsrt_use_chrge_guidance:"무료(기획전 일부 유료)",cmmn_hmpg_lang:["ko","en"],
     disabled_facility:["접근가능","엘리베이터","장애인화장실","휠체어 대여"],cmmn_important:"",cmmn_telno:"02-2124-8800",cmmn_hmpg_url:"https://sema.seoul.go.kr",subway_info:"1·2호선 시청역 10번 출구 도보 5분",updt_dt_text:"2026-09-02",indoor:true},
    {cid:"D-009",post_sj:"북촌한옥마을 (특별관리지역 레드존)",com_ctgry_sn:"Cg1x6l1",cate_depth:"문화관광 > 한옥",adres:"서울 종로구 북촌로11길 일대",map_position_y:37.5826,map_position_x:126.9831,
     cmmn_use_time:"관광객 방문 허용 10:00~17:00 (특별관리지역 규정, 위반 시 과태료)",closed_days:"연중무휴",schdul_info_bgnde:"",schdul_info_endde:"",trrsrt_use_chrge:"F",trrsrt_use_chrge_guidance:"무료",
     cmmn_hmpg_lang:["ko","en","ja","zh-CN"],disabled_facility:[],cmmn_important:"주민 거주지역 · 정숙 · 골목 경사 급함",cmmn_telno:"02-2148-4160",cmmn_hmpg_url:"https://www.jongno.go.kr",subway_info:"3호선 안국역 2번 출구 도보 10분",updt_dt_text:"2026-08-15",indoor:false,reg:{open:10,close:17,label:"북촌 특별관리지역 · 방문 10:00~17:00"}},
    {cid:"D-010",post_sj:"청계천 광통교",com_ctgry_sn:"Cp3b3j9",cate_depth:"자연관광 > 하천",adres:"서울 종로구 서린동",map_position_y:37.5690,map_position_x:126.9780,
     cmmn_use_time:"상시 개방",closed_days:"연중무휴",schdul_info_bgnde:"",schdul_info_endde:"",trrsrt_use_chrge:"F",trrsrt_use_chrge_guidance:"무료",
     cmmn_hmpg_lang:["ko","en","ja","zh-CN"],disabled_facility:["접근가능"],cmmn_important:"호우·수위 상승 시 산책로 출입 통제",cmmn_telno:"02-2290-6114",cmmn_hmpg_url:"https://www.sisul.or.kr/open_content/cheonggye",subway_info:"5호선 광화문역 5번 출구 도보 5분",updt_dt_text:"2026-08-30",indoor:false},
    {cid:"D-011",post_sj:"[예시] 종료된 기획전",com_ctgry_sn:"Cv7s8m5",cate_depth:"축제/공연/행사 > 전시",adres:"서울 종로구 삼청로 (예시)",map_position_y:37.5775,map_position_x:126.9820,
     cmmn_use_time:"10:00~18:00",closed_days:"월요일 휴관",schdul_info_bgnde:"2026-06-01",schdul_info_endde:"2026-08-31",trrsrt_use_chrge:"C",trrsrt_use_chrge_guidance:"15,000원",
     cmmn_hmpg_lang:["ko","en"],disabled_facility:["접근가능","엘리베이터"],cmmn_important:"종료 행사 배제 시연용",cmmn_telno:"",cmmn_hmpg_url:"",subway_info:"3호선 안국역 도보 8분",updt_dt_text:"2026-06-01",indoor:true,demo:true},
  ];

  /* ── 정규화: 16필드 → 통합 모델 (원문 raw 보존 + 추출 결과) ── */
  const LANG = {ko:"한국어",en:"English",ja:"日本語","zh-CN":"中文"};
  ZP.normalize = function(r){
    const hours = extractHours(r.cmmn_use_time);
    const closed = extractClosed(r.closed_days);
    return {
      id:r.cid, name:r.post_sj, category:(r.cate_depth||"").split(">").pop().trim(), categoryTop:(r.cate_depth||"").split(">")[0].trim(),
      address:r.adres, lat:+r.map_position_y, lng:+r.map_position_x, subway:r.subway_info,
      hours, closed, period:{start:r.schdul_info_bgnde||null, end:r.schdul_info_endde||null},
      fee:{free:r.trrsrt_use_chrge==="F", text:r.trrsrt_use_chrge_guidance||""},
      langs:(r.cmmn_hmpg_lang||[]).map(l=>LANG[l]||l), langCodes:r.cmmn_hmpg_lang||[],
      access:{list:r.disabled_facility||[], wheelchair:(r.disabled_facility||[]).includes("접근가능")||(r.disabled_facility||[]).includes("엘리베이터"), elevator:(r.disabled_facility||[]).includes("엘리베이터")},
      reservation:/예약/.test(r.cmmn_important||""), notice:r.cmmn_important||"", tel:r.cmmn_telno||"", url:r.cmmn_hmpg_url||"",
      indoor:!!r.indoor, reg:r.reg||null, demo:!!r.demo, updated:r.updt_dt_text,
      raw:{cmmn_use_time:r.cmmn_use_time, closed_days:r.closed_days}, source: r.demo?"예시":"시연 표본"
    };
  };
  // AI 추출 계층 자리: 정적 사이트에서는 규칙 기반 근사 + 신뢰도 표기. 실제 서비스는 LLM 추출 → 규칙 검증 → 사람 확인.
  function extractHours(s){
    s=s||""; if(/상시|24시간/.test(s)) return {open:0,close:24,lastEntry:null,confidence:"high",note:"상시"};
    const m=s.match(/(\d{1,2}):(\d{2})\s*[~\-–]\s*(\d{1,2}):(\d{2})/); if(!m) return {open:null,close:null,confidence:"low",note:"확인 필요"};
    const le=s.match(/입장\s*마감\s*(\d{1,2}):(\d{2})/);
    const conf = /※|단,|다만|경우|공휴일|하절기|동절기|수·토|연장/.test(s) ? "medium" : "high";
    return {open:+m[1]+(+m[2])/60, close:+m[3]+(+m[4])/60, lastEntry: le? +le[1]+(+le[2])/60 : (/종료 1시간 전/.test(s)? +m[3]+(+m[4])/60-1 : null), confidence:conf, note: conf==="medium"?"예외 조항 있음":""};
  }
  function extractClosed(s){
    s=s||""; const days=[]; const map={월:1,화:2,수:3,목:4,금:5,토:6,일:0};
    if(/연중무휴|휴관일 없음/.test(s)) return {weekdays:[],holidayException:false,fixed:[],confidence:"high"};
    Object.keys(map).forEach(k=>{ if(new RegExp("(매주\\s*)?"+k+"요일|매주 "+k).test(s)) days.push(map[k]); });
    return {weekdays:days, holidayException:/공휴일을 제외|공휴일인 경우 정상/.test(s), fixed:(/1월\s*1일/.test(s)?["01-01"]:[]), setsuChuseok:/설|추석/.test(s), confidence: days.length||/1월|설|추석/.test(s)?"high":"low"};
  }

  /* ── 지리·이동 ── */
  ZP.distKm=(a,b)=>{const R=6371,dLat=(b.lat-a.lat)*Math.PI/180,dLng=(b.lng-a.lng)*Math.PI/180,x=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(x));};
  // 추정치. Google Directions/Routes 키가 있으면 실제 값으로 대체 (search.html에서 교체 지점 표시)
  ZP.travelMin=(km,mode)=>{const path=km*1.3;if(mode==="car")return Math.round(4+path/0.5);if(mode==="transit")return Math.round(6+path/0.35+(path>1?4:0));return Math.round(path/0.075);};

  /* ── 판정 엔진 (6축) ── */
  ZP.judge=function(p, ctx){
    // ctx: {date(Date), hour(float), remainMin, origin{lat,lng}, mode, wheel, stroller, senior, langs[], free, rainy}
    const no=[], ok=[], axis={};
    const dateStr=fmtDate(ctx.date), wd=ctx.date.getDay(), isHol=ZP.holidays2026.includes(dateStr);
    // 기간
    if(p.period.end && p.period.end < dateStr){ no.push({axis:"기간",t:`${p.period.end.slice(5).replace("-","/")} 종료`}); }
    else if(p.period.end){ ok.push(`${p.period.end.slice(5).replace("-","/")}까지`); }
    // 시간: 휴무
    let closedToday=false;
    if(p.closed.weekdays.includes(wd)) closedToday = !(isHol && p.closed.holidayException);
    if(p.closed.fixed.includes(dateStr.slice(5))) closedToday=true;
    if(p.closed.setsuChuseok && ["2026-02-17","2026-09-25"].includes(dateStr)) closedToday=true;
    if(closedToday) no.push({axis:"시간",t:`${"일월화수목금토"[wd]}요일 휴관`}); else ok.push("오늘 개관");
    // 시간: 운영
    const km=ZP.distKm(ctx.origin,p), tmin=ZP.travelMin(km,ctx.mode), arrive=ctx.hour+tmin/60;
    if(p.hours.open===null){ no.push({axis:"확인 필요",t:"운영시간 판정 불가"}); }
    else if(p.hours.close!==24){
      const gate=p.hours.lastEntry??p.hours.close;
      if(arrive < p.hours.open) no.push({axis:"시간",t:`${fmtH(p.hours.open)} 개장 (도착 ${fmtH(arrive)})`});
      else if(arrive >= gate) no.push({axis:"시간",t:`입장 마감 ${fmtH(gate)} (도착 ${fmtH(arrive)})`});
      else ok.push(`${fmtH(p.hours.close)}까지`);
    } else ok.push("상시 개방");
    if(tmin > ctx.remainMin-20) no.push({axis:"시간",t:`이동 ${tmin}분 > 남은 시간`});
    // 접근
    if(ctx.wheel){ p.access.wheelchair? ok.push("휠체어 출입 가능") : no.push({axis:"접근",t:"휠체어 접근 정보 없음"}); }
    else if(ctx.stroller){ (p.access.wheelchair||p.access.list.length)? ok.push("유모차 이동 가능") : no.push({axis:"접근",t:"경사·계단 구간"}); }
    // 언어
    (ctx.langs||[]).forEach(l=>{ if(l==="ko")return; p.langCodes.includes(l)? ok.push(`${LANG[l]} 안내`) : no.push({axis:"언어",t:`${LANG[l]} 안내 없음`}); });
    // 비용
    if(ctx.free){ p.fee.free? ok.push("입장 무료") : no.push({axis:"비용",t:"유료"}); }
    else if(p.fee.free) ok.push("입장 무료");
    // 규제
    if(p.reg){ (arrive>=p.reg.open && arrive<p.reg.close)? ok.push("방문 허용 시간") : no.push({axis:"규제",t:`${p.reg.label}`}); }
    // 보강: 날씨
    if(ctx.rainy && !p.indoor) ok.push("야외 · 강수 예보 참고"); else if(ctx.rainy && p.indoor) ok.push("실내 · 비 피하기 좋음");
    ok.unshift(`${ctx.mode==="walk"?"도보":ctx.mode==="transit"?"대중교통":"차량"} ${tmin}분`);
    const conf = p.hours.confidence==="low"||p.closed.confidence==="low";
    return {ok:no.length===0, why:ok, no, km, tmin, needCheck:conf};
  };
  ZP.sorters={
    near:(a,b)=>a.km-b.km, fast:(a,b)=>a.tmin-b.tmin,
    closing:(a,b)=>(a.p.hours.lastEntry??a.p.hours.close??99)-(b.p.hours.lastEntry??b.p.hours.close??99),
    ending:(a,b)=>(a.p.period.end||"9999")<(b.p.period.end||"9999")?-1:1,
    free:(a,b)=>(a.p.fee.free?0:1)-(b.p.fee.free?0:1),
    quiet:(a,b)=>(a.p.indoor?0:1)-(b.p.indoor?0:1)||a.km-b.km, // 실시간 도시데이터 연동 전: 실내·거리 근사
    latest:(a,b)=>(a.p.updated<b.p.updated?1:-1)
  };
  ZP.sortLabels={near:"가까운 순",fast:"빨리 도착하는 순",closing:"오늘 마감 임박순",ending:"종료 임박순",free:"무료 우선",quiet:"한산한 순",latest:"최신순"};

  /* ── 상태 저장 (세션 범위만, 서버 저장 없음) ── */
  ZP.saveState=s=>{ try{ sessionStorage.setItem("zp_state", JSON.stringify(s)); }catch(e){} };
  ZP.loadState=()=>{ try{ return JSON.parse(sessionStorage.getItem("zp_state")||"null"); }catch(e){ return null; } };

  /* ── 상태 → 판정 컨텍스트 ── */
  ZP.context=function(st){
    const now=new Date(); const date=new Date(now); if(st.day==="tomorrow") date.setDate(date.getDate()+1);
    let hour = now.getHours()+now.getMinutes()/60;
    if(st.time){ const [h,m]=st.time.split(":").map(Number); hour=h+m/60; }
    const remainMin = st.remain==="today"? Math.max(0,(23-hour))*60 : (+st.remain||3)*60;
    const origin = st.origin || ZP.areas["광화문·종로"];
    const langs = st.langs&&st.langs.length? st.langs : ["ko"];
    return { date, hour, remainMin, origin, originLabel: st.originLabel||"광화문·종로", mode: st.mode||"walk",
             wheel: !!(st.who||[]).find(w=>/휠체어/.test(w)) || (st.access||[]).includes("휠체어 접근"),
             stroller: !!(st.who||[]).find(w=>/유모차/.test(w)) || (st.access||[]).includes("유모차"),
             senior: !!(st.who||[]).find(w=>/고령/.test(w)), langs, free: st.budget==="free" || (st.why||[]).includes("무료 이용"),
             rainy: !!st.rainy, why: st.why||[], what: st.what||[] };
  };
  ZP.defaultSort=function(st){ const w=st.why||[]; if(w.includes("조용한 휴식"))return "quiet"; if(w.includes("무료 이용"))return "free"; if(st.remain&&+st.remain<=2)return "closing"; return "near"; };

  /* ── 파이프라인: 후보 수집 → 정규화 → 판정 → 정렬 ── */
  ZP.run=async function(st, sortKey){
    const ad = ZP.adapters[ZP.config.DATA_SOURCE]||ZP.adapters.mock;
    const list = await ad.list({});
    const items = list.items||[]; const details=[];
    for(const it of items){ try{ details.push(ZP.normalize(await ad.info(it.cid))); }catch(e){} }
    const ctx=ZP.context(st);
    const wanted = st.what&&st.what.length? st.what: null;
    const CAT={"박물관":/박물관/,"전시":/전시|미술관|기획전/,"체험·공방":/체험|공방|마을/,"쇼핑":/쇼핑/,"공연":/공연/,"자연":/자연|하천|공원/,"음식":/음식|카페/,"궁궐·역사":/궁궐|역사|한옥/};
    let judged = details.map(p=>({p,...ZP.judge(p,ctx)}));
    let catOut=0;
    if(wanted){ judged = judged.filter(x=>{ const hit=wanted.some(w=>(CAT[w]||/./).test(x.p.category+x.p.categoryTop+x.p.name)); if(!hit)catOut++; return hit; }); }
    const open = judged.filter(x=>x.ok).sort(ZP.sorters[sortKey]||ZP.sorters.near), shut=judged.filter(x=>!x.ok);
    const byAxis={}; shut.forEach(x=>x.no.forEach(n=>{byAxis[n.axis]=(byAxis[n.axis]||0)+1;}));
    return {ctx, open, shut, byAxis, catOut, total:details.length, source: ad.name};
  };

  function fmtDate(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
  function fmtH(h){ const H=Math.floor(h), M=Math.round((h-H)*60); return String(H).padStart(2,"0")+":"+String(M).padStart(2,"0"); }
  ZP.fmtH=fmtH; ZP.fmtDate=fmtDate;

  /* ── 날씨 (Open-Meteo, 키 불필요) — 실패해도 조용히 무시 ── */
  ZP.weather=async function(lat,lng){ try{ const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=precipitation,temperature_2m&timezone=Asia%2FSeoul`); const j=await r.json(); return {rainy:(j.current&&j.current.precipitation>0.2), temp:j.current&&j.current.temperature_2m}; }catch(e){ return null; } };

  /* ── 지도: Google(키 있음) → Leaflet/OSM(키 없음) ── */
  ZP.map=function(el, center, zoom, onFail){
    const key=ZP.config.GOOGLE_MAPS_KEY; const api={markers:[], provider:null};
    function leaflet(){
      if(!global.L){ onFail&&onFail("지도 라이브러리를 불러오지 못했습니다."); return null; }
      const m=global.L.map(el,{scrollWheelZoom:false}).setView([center.lat,center.lng],zoom);
      global.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(m);
      api.provider="osm"; api.add=(pos,opt)=>{const mk=global.L.circleMarker([pos.lat,pos.lng],{radius:opt.me?8:9,color:"#fff",weight:3,fillColor:opt.color,fillOpacity:1}).addTo(m);if(opt.label)mk.bindTooltip(opt.label,{permanent:!!opt.me,direction:"top",offset:[0,-8]});if(opt.onClick)mk.on("click",opt.onClick);api.markers.push({mk,pos,opt});return mk;};
      api.focus=(pos,on)=>{ const it=api.markers.find(x=>x.pos===pos); if(it) it.mk.setStyle({radius:on?13:9}); if(on) m.panTo([pos.lat,pos.lng]); };
      api.fit=()=>{ if(api.markers.length) m.fitBounds(api.markers.map(x=>[x.pos.lat,x.pos.lng]),{padding:[24,24]}); };
      return api;
    }
    if(!key) return leaflet();
    return new Promise(res=>{
      const s=document.createElement("script"); s.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&language=ko`; s.async=true;
      s.onerror=()=>{ onFail&&onFail("Google Maps를 불러오지 못했습니다. 키를 확인하세요."); res(leaflet()); };
      s.onload=()=>{ const g=global.google.maps; const m=new g.Map(el,{center,zoom,mapTypeControl:false,streetViewControl:false});
        api.provider="google"; api.add=(pos,opt)=>{const mk=new g.Marker({position:pos,map:m,title:opt.label||"",label:opt.num?String(opt.num):undefined});if(opt.onClick)mk.addListener("click",opt.onClick);api.markers.push({mk,pos,opt});return mk;};
        api.focus=(pos,on)=>{ const it=api.markers.find(x=>x.pos===pos); if(it) it.mk.setAnimation(on?g.Animation.BOUNCE:null); if(on) m.panTo(pos); };
        api.fit=()=>{ const b=new g.LatLngBounds(); api.markers.forEach(x=>b.extend(x.pos)); if(api.markers.length) m.fitBounds(b); };
        res(api); };
      document.head.appendChild(s);
    });
  };
  ZP.directionsUrl=(to,mode)=>`https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}&travelmode=${mode==="car"?"driving":mode==="transit"?"transit":"walking"}`;

  global.ZP=ZP;
})(window);
