/* 공식 자료를 근거로 AI가 사전에 작성한 설명을 선택 키워드에 맞춰 표시한다.
 * 브라우저에서 AI API를 호출하거나 안내되지 않은 운영 조건을 생성하지 않는다. */
(function(global){
  const catalog=()=>global.ZP_CATALOG||{places:[]};
  const clean=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  const aliases={'궁궐·역사':['역사','궁궐','문화유산'],'체험·공방':['체험','공방'],'자연':['자연','공원','산책','숲'],'음식':['음식','맛집','식사','카페'],'전시':['전시','미술','예술'],'공연':['공연','음악','콘서트'],'박물관':['박물관','전시','역사'],'쇼핑':['쇼핑','시장','상점'],'무료 이용':['무료']};
  const find=id=>catalog().places.find(x=>x.cid===String(id));
  function keywords(state={}){return [...new Set([...(state.what||[]),...(state.why||[]),...(state.custom?.what?[state.custom.what]:[])].filter(x=>x&&x!=='any').flatMap(x=>[x,...(aliases[x]||[]),...x.split(/[\s,·]+/)]).filter(x=>x.length>1))];}
  function describe(place,state={}){
    const entry=find(place.id),words=keywords(state),ai=entry?.ai;
    if(!ai)return {kind:'official',label:'공식 소개',text:clean(place.summary)||'공식 소개가 아직 제공되지 않았습니다.',matched:[],unmatched:false};
    const variants=(ai.variants||[]).map(v=>({...v,hits:(v.keywords||[]).filter(k=>words.some(w=>w===k||w.includes(k)||k.includes(w)))})).sort((a,b)=>b.hits.length-a.hits.length);
    const chosen=variants.find(v=>v.hits.length);
    return {kind:'prepared-ai',label:chosen?'키워드 맞춤 AI 설명':'AI 장소 소개',text:chosen?chosen.text:ai.summary,matched:chosen?.hits||[],unmatched:words.length>0&&!chosen,sourceDate:entry.fetchedAt};
  }
  function places(){return catalog().places.map(entry=>{const p=ZP.normalize(entry.raw);p.retrievedAt=entry.fetchedAt;p.snapshot=true;p.sourceKind='snapshot';return p;});}
  function snapshot(id){const e=find(id);if(!e)return null;const p=ZP.normalize(e.raw);p.retrievedAt=e.fetchedAt;p.snapshot=true;p.sourceKind='snapshot';return p;}
  function unverified(p,state){const j=ZP.judge(p,ZP.context(state));j.hardStatus='unknown';j.ok=false;j.needCheck=true;j.no=[];j.why=[];j.chk=['공식 자료로 조사한 장소입니다. 현재 운영·입장 가능 여부는 아직 확인되지 않았습니다.'];for(const a of Object.values(j.axes)){if(a.status!=='na'){a.status='unknown';a.reasons=['조사 당시 자료 · 현재 조건 재확인 필요'];}}return {p,...j};}
  global.ZPDescriptions={describe,keywords,places,snapshot,unverified,count:()=>catalog().places.length,generatedAt:()=>catalog().generatedAt};
})(window);
