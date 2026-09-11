// 공개 설정 — 비밀 값 없음. 비짓서울 API 키는 절대 여기 넣지 않습니다 (프록시 Secret에만).
window.ZP_CONFIG = {
  DATA_SOURCE: "visitseoul",       // 공개 배포본 고정값. 다른 값이면 diagnostics 배포 검증 실패
  VISITSEOUL_PROXY_URL: "https://zp-proxy.alstjqdmf.workers.dev",   // 배포 완료 (2026-09-10)
  GOOGLE_MAPS_KEY: "AIzaSyB9-dAe3XC9x8s4LQioQaoLRq81BYLl5EQ",             // ← 여기에 Google Maps 키를 넣으세요 (리퍼러 제한된 공개 키). 비우면 OpenStreetMap
  ALLOW_DEMO: true,                // 프록시 오류 화면에서 사용자가 직접 "시연 데이터로 보기"를 누를 수 있게 허용. 심사 후 false 권장
  MAX_PAGES: 4, CONCURRENCY: 4
};
