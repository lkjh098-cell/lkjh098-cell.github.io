/* 출처: 서울시 북촌 특별관리지역 관광객 방문시간 제한 안내.
 * https://news.seoul.go.kr/culture/archives/526017?listPage=3
 * 정책 확인일: 2026-09-11. 10:00~17:00 관광 방문 허용.
 * 주소/이름만으로 레드존 경계 내부라고 단정하지 않는다.
 */
(function(){
  const source='https://news.seoul.go.kr/culture/archives/526017?listPage=3';
  ZP.regulationRules.push({sourceValidated:true,source,checkedAt:'2026-09-11',
    matches:p=>/북촌.*한옥마을|특별관리지역.*레드존/.test(p.name)||/북촌로\s*11길/.test(p.address||''),
    evaluate(p,ctx,arrival){
      const explicitlyRedZone=p.demo&&p.id==='D-009';
      if(arrival.hour>=10&&arrival.hour+20/60<=17)return {status:'pass',reason:'북촌 레드존 관광 허용시간 10:00~17:00 안에 방문 가능 · 실제 출입 구역 확인'};
      if(explicitlyRedZone)return {status:'fail',reason:'북촌 레드존 관광 방문은 10:00~17:00만 허용됩니다. 최소 방문시간 20분도 이 시간 안에 필요합니다.'};
      return {status:'unknown',reason:'북촌 레드존은 10:00~17:00만 관광 방문이 허용됩니다. 이 장소의 실제 출입 동선이 제한 구역에 해당하는지 확인하세요.'};
    }
  });
})();
