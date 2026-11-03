(function(){
  const D=window.ZPDescriptions,U=window.ZPUI,box=document.getElementById('catalogCards');if(!D||!box)return;
  const S=ZP.loadState()||{},places=D.places().map(p=>({p,d:D.describe(p,S)})).sort((a,b)=>b.d.matched.length-a.d.matched.length);
  document.getElementById('catalogTitle').textContent=`사진과 AI 설명으로 둘러보는 ${places.length}곳`;
  document.getElementById('catalogJump').textContent=`조사한 ${places.length}곳 · 사진과 AI 설명 보기 ↓`;
  document.getElementById('catalogNote').textContent=`비짓서울 공식 자료 조사 · ${new Date(D.generatedAt()).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'})}. AI가 미리 작성한 설명 중 선택 키워드에 맞는 내용을 표시합니다. 이 목록은 현재 방문 가능 추천과 별개입니다.`;
  for(const {p,d}of places){const a=document.createElement('a');a.className='catalog-card';a.href='place.html?id='+encodeURIComponent(p.id);a.innerHTML=`<div class="catalog-photo">${p.image?`<img src="${U.esc(p.image)}" alt="${U.esc(p.name)} 사진" loading="lazy" decoding="async">`:'공식 사진 없음'}</div><div class="catalog-body"><h3>${U.esc(p.name)}</h3><p class="cat">${U.esc([p.category,p.address].filter(Boolean).join(' · '))}</p>${U.explanation(p)}<span class="catalog-status">${p.visitRestriction?U.esc(p.visitRestriction):'현재 운영 여부는 상세에서 확인'}</span></div>`;U.imageFallback(a.querySelector('img'),p);box.appendChild(a);}
})();
