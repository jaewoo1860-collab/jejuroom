# Build workflow README (internal)

## 1) Purpose

- 공통 head/SEO/스크립트 자동화
- 새 페이지 만들 때 매번 head를 손대지 않기 위한 구조

## 2) Files overview

- `templates/head.html`
  - placeholders: `{{TITLE}}`, `{{CANONICAL}}`, `{{ROBOTS}}`, `{{JSON_LD}}`, `{{HEAD_SCRIPTS}}`
- `templates/header.html` / `templates/footer.html`
  - 페이지 공통 header/footer 조합
- `build/pageMeta.config.json`
  - `blogPosts[]` + `globalHeadScripts` (선택)
  - 각 post의 head 값(제목/캐노니컬/robots/JSON-LD)을 “단일 소스”로 관리
- `pages/blog/posts/<slug>.body.html`
  - 본문 fragment 규칙: wrappers 금지 (아래 규칙 참고)
- `build_output/*.generated.html`
  - 검증용 산출물 (production 덮어쓰기 전 확인 전용)

## 3) Add a new post (Step-by-step)

1) slug 결정 (확장자 제외, 파일명에 사용)
   - 예: `20260221-1200-제주-가이드-예시` 처럼 파일명으로 안전한 문자열 권장

2) `pages/blog/posts/<slug>.body.html` 생성
   - 포함해야 하는 것
     - 포스트 본문에 해당하는 마크업(예: `article`/`section` 등)
     - 페이지 내부에서 필요한 최소 구성(예: 본문 시작/끝)
   - 금지(중요)
     - `html`, `head`, `body` 태그
     - `site-wrap`, `bg`, `stage`, `phone` 같은 “페이지 프레임(wrappers)”
       - 이 프레임은 템플릿에서 제공하므로 fragment에 넣으면 중복/레이아웃 깨짐 원인이 됩니다.

3) `build/pageMeta.config.json`에 항목 추가
   - `blogPosts[]`에 object 추가
     - 필수 필드: `slug`, `title`, `robots`, `canonical`, `jsonLd`
   - `jsonLd`는 object로 작성 (빌드에서 stringify)
     - 최소 예시(개념):
       - `{"@context":"https://schema.org","@type":"Article", ... }`

4) `node build/build.js` 실행

5) PASS 확인 (FAIL이면 원인에 따라 수정)
   - 출력에 각 post별로 `PASS <slug>` 또는 `FAIL <slug>`가 뜹니다.

6) production 교체는 항상 “1개씩” + overwrite 규칙 + 브라우저 확인
   - build_output에서 생성 결과가 정상인지 먼저 확인
   - 실제 production 파일을 교체할 때도 1개씩 진행
   - 교체 후에는 브라우저로 레이아웃/SEO/스크립트 이상 여부 확인

## 4) Common failures

- invalid JSON (fail-fast)
  - `build/pageMeta.config.json` 파싱/스키마 검증 단계에서 즉시 종료됩니다.
  - 콘솔에 어떤 키/인덱스가 잘못됐는지 에러가 출력됩니다.

- disallowed globalHeadScripts (injection skipped warning)
  - `globalHeadScripts`에 허용되지 않은 태그가 포함되면 빌드가 경고를 출력하고 주입을 건너뜁니다.
  - 허용 태그(allowlist): `script`, `noscript`, `meta`, `link`

- missing body fragment (FAIL ...)
  - `pages/blog/posts/<slug>.body.html`가 없으면 해당 post만:
    - stderr: missing fragment 경고 출력
    - stdout: `FAIL <slug> (missing body fragment)` 출력
  - 전체 빌드는 중단되지 않고 다음 post를 계속 처리합니다.

## 5) Safety rules (LOCK)

- production 파일은 자동으로 덮어쓰지 않는다
- 항상 `build_output/`으로 먼저 확인 후 진행
- KEEP/UNDO 기준(간단)
  - KEEP: `build_output` 결과가 PASS이고, 브라우저 확인에서 레이아웃/링크/메타가 정상
  - UNDO: PASS 실패, 또는 브라우저에서 레이아웃 깨짐/중복 head/스크립트 문제 발생 시 즉시 롤백
