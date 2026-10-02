# 신고 처리 (관리자)

App Store 가이드라인 1.2에 따라 신고는 **접수 후 24시간 이내**에 처리해야 합니다.

## 관리자 지정

앱에서는 관리자를 만들 수 없고, 서버에서만 지정합니다. (`DATABASE_URL` 필요)

```bash
npm run admin:set -- admin@example.com           # 관리자로 지정
npm run admin:set -- admin@example.com --revoke  # 해제
```

관리자 계정으로 로그인(`POST /api/auth/login`)해서 받은 토큰을 아래 요청에 사용합니다.

## API

모든 요청에 `Authorization: Bearer <관리자 토큰>`이 필요합니다. 관리자가 아니면 403입니다.

### 신고 목록 — `GET /api/admin/reports?status=pending`

같은 대상에 대한 신고를 묶어서 **오래 기다린 순서**로 돌려줍니다.

- `items[].target`: 신고된 게시글·댓글·사용자의 현재 내용과 작성자 (이미 삭제됐으면 `null`)
- `items[].reportCount`, `waitingHours`: 신고 건수, 첫 신고 후 지난 시간
- `overdue`: 24시간을 넘긴 대상 수

`status`는 `pending`(기본), `resolved`, `dismissed` 중 하나입니다.

### 신고 처리 — `POST /api/admin/reports/resolve`

```json
{ "targetType": "post", "targetId": "...", "action": "remove", "note": "스팸" }
```

같은 대상의 대기 중 신고를 모두 함께 처리하고, 처리한 관리자와 시각을 기록합니다.

| action | 처리 |
|---|---|
| `dismiss` | 정책 위반 아님. 콘텐츠 유지 |
| `remove` | 게시글·댓글 삭제 (사용자 신고에는 사용 불가) |
| `remove_and_suspend` | 콘텐츠 삭제 + 작성자 이용 정지 |

정지된 사용자는 로그인과 모든 API가 막히고, 앱을 쓰던 중이면 다음 요청 때 안내 후 로그아웃됩니다.

### 정지 해제 — `POST /api/admin/users/:id/unsuspend`
