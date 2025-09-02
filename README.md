# ridi-comic-new-bot
- 리디 만화책 신간 봇
- https://bsky.app/profile/ridi-comic-new-bot.bsky.social

## 실행
- `bun post`

## 코드
- comic.ts: 리디북스의 만화책 신간 정보를 스크랩합니다.
  - JSDOM: 스크래핑

- post.ts: comic.ts의 만화책 정보를 블루스카이에 포스팅합니다.
  - @atproto/api: 블루스카이 API
  - sharp: 가로로 긴 카드의 og:image는 세로로 긴 만화책 이미지를 넣기에는 어색합니다. 그래서 약간의 리사이즈와 여백 등의 조정이 필요합니다.