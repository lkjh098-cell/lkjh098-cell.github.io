// 공개 설정. 비짓서울 API 키는 Worker의 VISITSEOUL_API_KEY Secret에만 저장합니다.
// config.js로 복사합니다. Google 지도 키는 공개 키이며 웹사이트 리퍼러 제한이 필요합니다.
window.ZP_CONFIG = {
  DATA_SOURCE: "visitseoul",
  VISITSEOUL_PROXY_URL: "https://zp-proxy.example.workers.dev",
  GOOGLE_MAPS_KEY: "", // 빈 값이면 오픈스트리트맵 사용
  ALLOW_DEMO: true, // 사용자가 직접 선택한 시연 예시만 허용
  MAX_PAGES: 4,
  MIN_PLACES: 50,
  CONCURRENCY: 3,
  REQUEST_TIMEOUT_MS: 15000,
  CACHE_TTL_MS: 300000,
  MAP_TIMEOUT_MS: 10000,
  GEOCODE_TIMEOUT_MS: 8000
};
