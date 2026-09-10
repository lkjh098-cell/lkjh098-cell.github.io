// config.js 로 복사한 뒤 값을 채우세요. config.js 는 .gitignore 에 넣어 커밋하지 않습니다.
// 정적 사이트 특성상 Google Maps 키는 브라우저에 노출됩니다 → Google Cloud 콘솔에서 "HTTP 리퍼러: https://lkjh098-cell.github.io/*" 로 반드시 제한하세요.
window.ZP_CONFIG = {
  GOOGLE_MAPS_KEY: "",            // 비우면 OpenStreetMap(Leaflet)으로 실제 지도를 표시
  VISITSEOUL_PROXY_URL: "",       // 예: https://zp-proxy.<계정>.workers.dev  (키는 프록시가 보유, README 참고)
  DATA_SOURCE: "mock"             // "mock" | "visitseoul"  — 프록시 준비 후 "visitseoul" 로 전환
};
