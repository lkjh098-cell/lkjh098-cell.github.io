/* 화면 공통 표현. 방문 판정과 점수 계산은 data.js에만 둡니다. */
(function (global) {
  const esc=ZP.esc;
  const axisNames={period:'운영 기간',hours:'운영시간',closure:'휴무일',window:'남은 시간',access:'필수 접근 조건',reservation:'예약',regulation:'방문 규제'};
  const statuses={pass:'충족',fail:'불충족',unknown:'확인 필요',na:'해당 없음'};
  const modeNames={walk:'도보',transit:'대중교통',car:'자동차',any:'가장 빠른 수단'};
  function scoreText(j){const s=j.score;if(!s||!s.active)return '선호 조건 없음';if(s.complete)return '선호 조건 모두 충족';return `확인된 적합도 ${Math.round(s.value)}점${s.unknownWeight?` · ${Math.round(s.unknownWeight)}점 미확인`:''}`;}
  function differences(j){return(j.score?.reasons||[]).filter(r=>!['pass','matched','na'].includes(r.status)).sort((a,b)=>(b.weight||0)-(a.weight||0)).map(r=>r.text).filter(Boolean);}
  function stateText(j){return j.hardStatus==='fail'?'방문 불가':j.hardStatus==='unknown'?'방문 전 확인':j.score?.active&&!j.score.complete?'일부 조건 다름':'방문 조건 확인';}
  function imageFallback(img,p){if(!img)return;const urls=[...new Set([p.image,...(p.images||[])].filter(Boolean))];let i=Math.max(0,urls.indexOf(p.image));img.onerror=()=>{i++;if(i<urls.length)img.src=urls[i];else img.parentNode.textContent='사진을 불러오지 못했습니다';};}
  function explanation(p){const d=global.ZPDescriptions?.describe(p,ZP.loadState()||{});return d?`<div class="ai-intro"><span class="ai-label">${esc(d.label)}</span><p>${esc(d.text)}</p>${d.matched.length?`<small>${d.matched.map(esc).join(' · ')}에 맞춘 소개</small>`:d.unmatched?'<small>선택 키워드와의 직접적인 관련성은 확인되지 않았습니다.</small>':''}</div>`:'';}
  function card(j,index,onFocus){
    const p=j.p,a=document.createElement('a'),kind=j.hardStatus==='fail'?'shut':j.hardStatus==='unknown'?'chk':j.score?.active&&!j.score.complete?'partial':'open';
    a.className='card '+kind;a.href='place.html?id='+encodeURIComponent(p.id);a.dataset.id=p.id;
    const reasons=[...new Set(kind==='shut'?(j.no||[]).map(x=>x.t):kind==='chk'?j.chk||[]:differences(j))].slice(0,2);
    const gate=p.hours?.lastEntry??p.hours?.close,hours=j.hardStatus==='pass'&&gate!=null&&gate!==24?`${ZP.fmtH(gate)} ${p.hours.lastEntry!=null?"입장 마감":"운영 종료"}`:'';
    const travel=Number.isFinite(j.tmin)?`${modeNames[j.usedMode]||'이동'} 약 ${j.tmin}분`:'이동시간 확인 필요',cost=p.fee?.known?(p.fee.free?'무료':'유료'):'요금 미확인';
    a.innerHTML=`<div class="img">${p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)} 사진" loading="lazy" decoding="async">`:'<span>이미지 없음</span>'}</div><div class="card-main"><h3>${index?`<span class="card-number">${index}</span>`:''}<span class="n">${esc(p.name)}</span><span class="pill ${kind==='open'?'':kind}">${stateText(j)}</span></h3><div class="cat">${esc([p.category,p.address].filter(Boolean).join(' · '))}</div><p class="card-travel">${esc(travel)}${Number.isFinite(j.tmin)?' <small>추정</small>':''} · ${cost}${hours?' · '+esc(hours):''}</p>${explanation(p)}${kind!=='shut'?`<p class="score">${esc(scoreText(j))}</p>`:''}${reasons.length?`<div class="reasons">${reasons.map(t=>`<p>${esc(t)}</p>`).join('')}</div>`:''}</div>`;
    imageFallback(a.querySelector('img'),p);
    a.onmouseenter=()=>onFocus?.(p,true);a.onmouseleave=()=>onFocus?.(p,false);a.onfocus=()=>onFocus?.(p,true);a.onblur=()=>onFocus?.(p,false);return a;
  }
  function conditions(s){
    const language={ko:'한국어 웹사이트',en:'영어 웹사이트',ja:'일본어 웹사이트','zh-CN':'중국어 웹사이트','zh-TW':'중국어 번체 웹사이트'};
    const values=[...(s.who||[]).filter(x=>x!=='any'),s.originLabel,...(s.what||[]).filter(x=>x!=='any'),modeNames[s.mode||'walk'],...(s.langs||[]).filter(x=>x!=='any').map(x=>language[x]||x),s.budget==='free'?'무료 우선':null,...(s.access||[]).filter(x=>x!=='any'),...(s.why||[]).filter(x=>x!=='any')];
    if(s.estimatedMaxMin&&s.estimatedMaxMin!=='any')values.push(`이동 ${s.estimatedMaxMin}분 선호`);if(s.custom?.what)values.push(`검색: ${s.custom.what}`);return values.filter(Boolean);
  }
  function rememberDiag(extra={}){try{sessionStorage.setItem('zp_last_diag',JSON.stringify({...ZP.diag,...extra,savedAt:new Date().toISOString()}));}catch(_){}}
  global.ZPUI={esc,axisNames,statuses,modeNames,scoreText,differences,stateText,card,conditions,rememberDiag,imageFallback,explanation};
})(window);
