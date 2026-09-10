# ZERO PROBLEMS — 닫힌 문제로

내 상황을 입력하면 지금 갈 수 있는 곳만 남기고, 원하는 순서로 정렬해주는 서울 관광 서비스.
정적 사이트(GitHub Pages) 기준으로 동작합니다.

## 파일

| 파일 | 역할 |
|---|---|
| `index.html` | 입장 표지 — 서비스 핵심 + 육하원칙 입력(누가·언제·어디서·무엇을·어떻게·왜) |
| `search.html` | 결과 — 6축 배제 · 제외 사유 요약 · 7축 정렬 · 지도 연동 |
| `place.html` | 상세 — 운영/휴무/요금/언어/접근성/주의사항/지도/길찾기/축별 판정 |
| `data.js` | 어댑터(mock · visitseoul) → 정규화(16필드 → 통합 모델) → 판정·정렬 엔진 → 지도 추상화 |
| `shared.css` | 공통 스타일 |
| `config.example.js` | 설정 템플릿 → `config.js`로 복사해 사용 (커밋 금지) |
| `proxy.worker.js` | 비짓서울 API 프록시 (Cloudflare Worker). API 키는 여기서만 보유 |
| `logo-white.png` `logo-black.png` | 공식 로고 |

## 배포 (GitHub Pages)

위 파일 전부를 저장소 루트에 올립니다. `config.js`는 선택입니다(없으면 OpenStreetMap + 시연 데이터).

## 지도

- `config.js`의 `GOOGLE_MAPS_KEY`가 있으면 Google Maps JavaScript API로 렌더링합니다. 정적 사이트라 키가 노출되므로 **Google Cloud 콘솔에서 HTTP 리퍼러(`https://lkjh098-cell.github.io/*`)로 제한**하세요.
- 키가 없거나 로딩에 실패하면 OpenStreetMap(Leaflet)으로 실제 지도를 표시합니다. 가짜 지도는 사용하지 않습니다.
- 길찾기는 Google Maps 길찾기 URL(`/maps/dir/?api=1`)로 열립니다 — 키 불필요, 도보/대중교통/자동차 반영.
- 이동시간은 현재 거리 기반 추정치입니다. Google Routes API 연결 시 `data.js`의 `ZP.travelMin`을 교체하면 됩니다.

## 비짓서울 API

- 확인된 명세: `POST /api/v1/contents/list` (com_ctgry_sn, lang_code_id, keyword, sort_type, page_no) · `POST /api/v1/contents/info` (cid) · 헤더 `VISITSEOUL-API-KEY`
- 브라우저 직접 호출은 CORS로 차단됨(2026-09-07 확인). `proxy.worker.js`를 Cloudflare Workers에 배포하고 Secret `VISITSEOUL_API_KEY`를 등록한 뒤, `config.js`에 `VISITSEOUL_PROXY_URL`을 넣고 `DATA_SOURCE: "visitseoul"`로 전환합니다.
- 정규화 대상 필드: closed_days, cmmn_use_time, business_days, schdul_info_bgnde/endde, map_position_x/y, subway_info, disabled_facility[], cmmn_hmpg_lang[], multi_lang_list, trrsrt_use_chrge, trrsrt_use_chrge_guidance, cmmn_important, post_desc, updt_dt_text (+ cid, post_sj, cate_depth, adres, cmmn_telno, cmmn_hmpg_url)
- 원문(`raw.cmmn_use_time`, `raw.closed_days`)과 추출 결과(`hours`, `closed`)를 함께 보존하고 신뢰도(high/medium/low)를 표기합니다. 정적 버전의 추출은 규칙 기반 근사이며, 실제 서비스는 LLM 추출 → 규칙 검증 → 사람 확인 3단 구조를 씁니다.

## 개인정보

- 위치는 브라우저 권한 허용 후에만 사용하고 서버로 보내지 않습니다. 거부 시 권역 선택·직접 입력으로 모든 기능을 씁니다.
- 선택 조건은 `sessionStorage`(탭 닫으면 소멸)에만 저장됩니다. 서버 DB 없음.

## 검증 (2026-09-10)

- 표지 → 결과 → 상세 → 뒤로가기 → 표지 상태 복원: 통과
- 필수 항목(어디서) 누락 시 이동 차단 + 구체 안내: 통과
- 잘못된 id / 지도 라이브러리 실패 / 새벽 시각(전부 개장 전) 등 빈 결과: 화면 멈춤 없음
- 헤드리스 브라우저에서 pageerror 0건

## 남은 항목 (외부 키·서버 필요)

1. Google Maps 키 발급 + 리퍼러 제한 → `config.js`
2. Cloudflare Worker 프록시 배포 → 비짓서울 실시간 데이터 전환
3. 주소 직접 입력의 지오코딩(Google Geocoding), 실제 이동시간(Routes)
4. 공휴일 API(공공데이터포털 특일정보), 기상청, 서울시 실시간 도시데이터 연결 — 현재 공휴일은 2026년 표, 날씨는 Open-Meteo(키 불필요)
