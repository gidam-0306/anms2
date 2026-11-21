# 안지담 포트폴리오 — 라이트 미니멀

Claude Design 시안 `project/안지담 포트폴리오 - 라이트 미니멀.dc.html`을 빌드 없이 바로 올릴 수 있는 정적 사이트로 구현한 것입니다.

```
site/
├─ index.html   마크업 (섹션 순서: 히어로 → 인사말 → 전 세대 교육 → AI → 경력 → 자격 → 교육 철학 → 문의)
├─ styles.css   디자인 토큰과 스타일, 모바일 대응
├─ main.js      스크롤 효과(나타나기·내비 블러·히어로 페이드·패럴랙스)와 교육 문의 폼
└─ assets/      사진 (원본에서 크기를 줄이고 웹용으로 변환)
```

## 미리보기

```bash
cd site && python3 -m http.server 8000   # http://localhost:8000
```

## 교육 문의 받기

`main.js` 맨 위의 `CONFIG`에서 설정합니다.

- **Formspree (추천):** formspree.io에서 폼을 만들고 나오는 `https://formspree.io/f/…` 주소를 `FORM_ENDPOINT`에 넣습니다. 문의가 올 때마다 메일로 받습니다.
- **이메일:** `INQUIRY_EMAIL`에 주소를 넣으면 방문자의 메일 앱이 열리고 내용이 미리 채워집니다.

둘 다 비어 있으면 폼은 방문자에게 카페로 문의하라고 안내합니다.

## 배포

`site/` 폴더를 그대로 GitHub Pages, Netlify, Vercel 등에 올리면 됩니다.
