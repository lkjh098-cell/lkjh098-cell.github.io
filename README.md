# ZERO PROBLEMS — 닫힌 문제로

내 상황을 입력하면 지금 갈 수 있는 곳만 남기고, 원하는 순서로 정렬해주는 서울 관광 서비스. GitHub Pages(정적) + 서버리스 프록시 구조.

## 연동 상태 (정직하게)

| 항목 | 상태 |
|---|---|
| 클라이언트 → 프록시 → 비짓서울 API 호출 구조 | 구현 완료 (`data.js` visitseoul 어댑터, 페이지네이션, 제한 동시성 `Promise.allSettled`) |
| 프록시 코드 | 완성 (`proxy.worker.js`: 허용 엔드포인트·파라미터 검증·origin 제한·429 전달·캐시 시각 헤더) |
| **프록시 배포 + API 키 등록** | **미완료 — 계정 소유자만 가능.** 배포 전에는 결과 화면에 오류 + 재시도 + “시연 데이터로 보기(실시간 아님)” 버튼 |
| mock 조용한 대체 | 없음. 사용자가 버튼을 직접 눌러야 하며 배너·진단에 기록 |
| 실시간 표시 | `retrievedAt`(API 호출 시각)과 `sourceUpdatedAt`(원본 갱신일) 분리 표시 |

## 배포 절차 (10분)

1. **Cloudflare Worker**: workers.cloudflare.com → Create → `proxy.worker.js` 붙여넣기 → Deploy → Settings → Variables and Secrets → `VISITSEOUL_API_KEY` (Secret) 추가.
2. Worker 주소(예: `https://zp-proxy.<계정>.workers.dev`)를 `config.js`의 `VISITSEOUL_PROXY_URL`에 입력 → 커밋.
3. `diagnostics.html`에서 “프록시 연결 확인” → 성공 시 첫 항목 cid 표시. 이때부터 결과 화면이 비짓서울 실시간 데이터로 동작합니다.
4. 심사 종료 후 `ALLOW_DEMO: false`로 바꾸면 시연 데이터 버튼이 사라집니다.

## 파일

`index.html` 표지(육하원칙) · `search.html` 결과 · `place.html` 상세 · `diagnostics.html` 진단 · `data.js` 데이터·엔진 · `shared.css` · `config.js` 공개 설정(비밀 없음) · `proxy.worker.js` · 로고 2개

## 확인된 비짓서울 명세

`POST /api/v1/contents/list` {com_ctgry_sn, lang_code_id, keyword, sort_type(latest|abc), page_no(50건/쪽)} · `POST /api/v1/contents/info` {cid} · 헤더 `VISITSEOUL-API-KEY` · 브라우저 직접 호출은 CORS 차단(2026-09-07 확인) · 카테고리 코드는 실측값(`ZP.categoryCodes`), 역사관광 코드 미확인.
필드: cid, post_sj, cate_depth, com_ctgry_sn, adres, map_position_x/y, subway_info, main_img, cmmn_use_time, closed_days, business_days, schdul_info_bgnde/endde, trrsrt_use_chrge(F/C), trrsrt_use_chrge_guidance, cmmn_hmpg_lang[], multi_lang_list, disabled_facility[], cmmn_important, cmmn_telno, cmmn_hmpg_url, updt_dt_text. 응답 중첩 구조는 방어적으로 탐색(`ZP.dig`).

## 개인정보

위치는 브라우저 권한 후 클라이언트에서만 사용. 조건은 `sessionStorage`에만 저장. 서버 저장 없음.

## 검증 (2026-09-10, 헤드리스 Chromium, 네트워크 차단)

- 문구 3건 정확히 교체 · 요약 바 칩형(선택 즉시 갱신·미선택은 점선 안내) · 상관없음/기타 규칙(상호 배타·직접 입력·Enter 확정·삭제) · 단계 표시 `n/6` · 자동 이동 없음 · 필수 누락 시 해당 탭 포커스 · 스크롤 위치 유지
- 주소 검색 실패 시 대체 좌표 없음(origin null 유지) + 안내문 · 후보 선택 후에만 진행
- 프록시 미설정 시 mock 카드 0개 + 명시적 오류 화면 · 시연 모드는 버튼으로만 · 배너 표시
- 제외 장소는 접힌 영역에만 · 확인 필요 항목 분리 · 결과 0건 시 완화 제안 수치 · 스켈레톤 · 모바일(360/390) 지도 접힘 · 가로 스크롤 없음 · pageerror 0

## 남은 항목 (외부 권한)

1. Cloudflare Worker 배포 + `VISITSEOUL_API_KEY` Secret (계정 소유자)
2. Google Maps 키(리퍼러 제한) → Google 지도·지오코딩. 없으면 OSM + 역·권역 프리셋 검색
3. 실제 이동시간(Routes API) — 현재 “추정” 표기
4. 라이브 네트워크 증거(프록시 요청·cid 일치)는 1번 완료 후 `diagnostics.html`에서 확인
