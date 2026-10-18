# 가족 안부 허브 — 자녀용 웹앱 MVP

형제 공동구독 "엄마가 먼저 묻는 가족방"의 자녀 쪽 화면. 부모님 쪽은 전화·ARS(vox.ai)만 쓴다.

## 화면
- `/f/[자녀토큰]` 가족방 — 엄마 질문, AI 안부콜 주간 요약, 이번 주 물어볼 것 3가지, 누가 통화했나 + "통화했어요", 엄마 우체통(음성·글)
- `/f/[자녀토큰]/q/[질문ID]` 답장 페이지 (알림톡 "답장하기" 링크) — 빠른 답 버튼, 메모, 음성 녹음, "엄마께는 빼줘"
- `/admin` 운영자 — 엄마 질문 등록(AI 유형 분류), 마감·요약(문자 45자 / ARS 문구), 주간 요약 입력, 우체통 재생 처리

## 실행
```
npm install
npm run dev
```
데모 링크: `/f/minsu-demo`, `/f/jiyoung-demo`, `/f/junho-demo`, `/admin`

## 환경변수 (.env.local)
- `ANTHROPIC_API_KEY` — 있으면 질문 분류·답장 요약을 Claude로, 없으면 규칙 템플릿으로 동작
- `CLAUDE_MODEL` — 기본 `claude-opus-5-5`
- `ADMIN_KEY` — 설정 시 `/admin?key=...` 필요

## 데이터
`data/db.json` + `data/audio/` (첫 실행 시 데모 가족 자동 생성, 지우면 초기화). 2단계에서 Supabase로 이전.

## 아직 없는 것
vox.ai 웹훅(통화 수신·요약 자동 적재), 솔라피 알림톡 발송, 음성 답장 STT, 결제.
