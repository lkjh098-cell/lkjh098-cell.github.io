# ZERO PROBLEMS — 배포 안내 (2026-09-10)

## 이미 끝난 것
- Cloudflare Worker **배포 완료**: `https://zp-proxy.alstjqdmf.workers.dev`
- `config.js`에 프록시 주소 반영 완료
- 지도 계층을 Google Maps 우선 + OSM 폴백으로 교체 (번호 마커, 정보창, 현재위치 원, 카드↔마커 연동)

## 직접 하실 것 3가지

### 1. Worker 코드 붙여넣기 (Cloudflare 대시보드가 자동 입력을 막아 제가 못 했습니다)
Workers & Pages → zp-proxy → **Edit code** → 왼쪽 편집기 클릭 → `Cmd+A` → `proxy.worker.js` 내용 전체 붙여넣기 → 우측 상단 **Deploy**

### 2. API 키 Secret 등록
zp-proxy → **Settings** → Variables and Secrets → **Add** → Type `Secret`,
Name `VISITSEOUL_API_KEY`, Value 에 비짓서울 키 → Save → **Deploy**

### 3. Google Maps 키 넣기
`config.js` 의 `GOOGLE_MAPS_KEY: ""` 안에 발급받은 키를 넣고 저장.
Google Cloud 콘솔에서 키 제한이 아래로 되어 있어야 합니다.
- 애플리케이션 제한: 웹사이트 → `https://lkjh098-cell.github.io/*`
- API 제한: Maps JavaScript API, Geocoding API

## 그 다음
이 폴더의 파일 11개를 GitHub 저장소에 **Add file → Upload files** 로 올리고 Commit.
`https://lkjh098-cell.github.io/diagnostics.html` 에서 **프록시 연결 확인**을 눌러
"성공 — N건 수신 / 첫 항목 cid"가 나오면 실시간 연동이 증명된 것입니다.

## 확인 순서
1. diagnostics.html → 데이터 소스 `visitseoul`, 프록시 URL 표시, mock 사용 `아니오`
2. index.html → 조건 고르고 "갈 수 있는 곳 보기"
3. search.html → 결과 카드 + 지도 마커, 카드에 마우스 올리면 마커 확대
4. 카드 클릭 → place.html 상세 + 지도 + 길찾기

키 2개가 들어가기 전까지는 결과 화면에 "비짓서울 데이터를 불러오지 못했습니다" + 재시도 + "시연 데이터로 보기" 버튼이 뜹니다. 이는 의도된 동작이며, mock으로 몰래 넘어가지 않습니다.
