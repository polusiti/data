# Cloudflare関連情報

## 概要

このプロジェクトではCloudflare WorkersとD1データベースを使用して、日本語の物理・化学問題共有システムを構築しています。

## 基本情報

### Worker情報
- **Worker名**: `data-manager-auth`
- **URL**: https://data-manager-auth.t88596565.workers.dev
- **アカウントID**: `ba21c5b4812c8151fe16474a782a12d8`

### データベース情報
- **D1データベース名**: `data-manager-auth-db`
- **データベースID**: `3cef36ce-e141-4237-9fc7-3daddea2f11e`

### R2ストレージ情報
- **R2バケット名**: `data-manager-media`
- **公開URL**: https://pub-ba21c5b4812c8151fe16474a782a12d8.r2.dev

## 認証情報

### GitHub連携
- **認証メール**: t88596565@gmail.com
- **リポジトリ**: https://github.com/polusiti/data

### 管理者トークン
- **開発環境**: `questa-admin-2024`
- **本番環境**: `your-secure-admin-token-here`（要変更）

## 設定ファイル

### wrangler.toml
```toml
name = "data-manager-auth"
main = "cloudflare-auth-worker.js"
compatibility_date = "2024-01-15"
account_id = "ba21c5b4812c8151fe16474a782a12d8"

[[d1_databases]]
binding = "DB"
database_name = "data-manager-auth-db"
database_id = "3cef36ce-e141-4237-9fc7-3daddea2f11e"

[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "data-manager-media"

[vars]
ADMIN_TOKEN = "questa-admin-2024"
ALLOWED_ORIGINS = "https://data.allfrom0.top,https://polusiti.github.io,http://localhost:3000,http://127.0.0.1:5500"
R2_PUBLIC_URL = "https://pub-ba21c5b4812c8151fe16474a782a12d8.r2.dev"
```

## APIエンドポイント

### 認証関連
- `POST /api/auth/init` - 認証初期化
- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/passkey/register/begin` - パスキー登録開始
- `POST /api/auth/passkey/register/complete` - パスキー登録完了
- `POST /api/auth/passkey/login/begin` - パスキーログイン開始
- `POST /api/auth/passkey/login/complete` - パスキーログイン完了
- `GET /api/auth/me` - 現在ユーザー情報取得
- `POST /api/auth/logout` - ログアウト

### 問題管理
- `GET /api/problems` - 最近の問題取得
- `POST /api/problems` - 問題作成
- `GET /api/problems/:id` - 問題詳細取得

### コメント管理
- `GET /api/comments/problem/:problemId` - 問題のコメント取得
- `POST /api/comments` - コメント作成
- `DELETE /api/comments/:commentId` - コメント削除

### メディア管理
- `POST /api/media/upload` - メディアアップロード
- `GET /api/media/list` - メディア一覧取得
- `GET /api/media/:id` - メディアファイル取得
- `DELETE /api/media/:id` - メディア削除
- `PUT /api/media/:id` - メディア更新

### 管理者機能
- `GET /api/admin/stats` - 統計情報取得
- `GET /api/admin/users` - ユーザー一覧取得
- `POST /api/admin/promote` - 管理者権限付与
- `GET /api/admin/setup/promote` - 初期管理者設定
- `GET /api/admin/setup/users` - 設定ユーザー一覧

## データベーススキーマ

### 主要テーブル

#### users
- `id` (TEXT PRIMARY KEY)
- `userId` (TEXT UNIQUE)
- `displayName` (TEXT)
- `email` (TEXT)
- `inquiryNumber` (TEXT UNIQUE)
- `isAdmin` (INTEGER)
- `createdAt` (DATETIME)

#### questions
- `id` (TEXT PRIMARY KEY)
- `subject` (TEXT)
- `title` (TEXT)
- `question_text` (TEXT)
- `answer_format` (TEXT)
- `difficulty_level` (TEXT)
- `difficulty_amount` (INTEGER)
- `field_code` (TEXT)
- `choices` (TEXT)
- `correct_answer` (INTEGER)
- `explanation` (TEXT)
- `estimated_time` (INTEGER)
- `tags` (TEXT)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)
- `active` (TEXT)

#### comments
- `id` (TEXT PRIMARY KEY)
- `problem_id` (TEXT)
- `author_id` (TEXT)
- `author_name` (TEXT)
- `content` (TEXT)
- `likes` (INTEGER)
- `created_at` (DATETIME)

#### question_views
- `question_id` (TEXT PRIMARY KEY)
- `views` (INTEGER)
- `viewed_at` (DATETIME)

#### problem_solved
- `problem_id` (TEXT PRIMARY KEY)
- `solved_count` (INTEGER)
- `solved_at` (DATETIME)

## デプロイ手順

### 1. 認証
```bash
npx wrangler login
# メール: t88596565@gmail.com
```

### 2. デプロイ
```bash
npx wrangler deploy
```

### 3. データベース操作
```bash
# テーブル作成
npx wrangler d1 execute data-manager-auth-db --remote --command "CREATE TABLE IF NOT EXISTS ..."

# テーブル一覧
npx wrangler d1 execute data-manager-auth-db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"

# データ確認
npx wrangler d1 execute data-manager-auth-db --remote --command "SELECT * FROM questions LIMIT 5;"
```

## CORS設定

### 許可オリジン
- https://data.allfrom0.top
- https://polusiti.github.io
- http://localhost:3000
- http://127.0.0.1:5500

### CORSヘッダー
```javascript
{
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': 'https://data.allfrom0.top'
}
```

## セキュリティ対策

### 1. 認証
- WebAuthn（パスキー）による認証
- セッションベースの認証管理

### 2. 権限管理
- 一般ユーザーと管理者の役割分離
- APIエンドポイントでの権限チェック

### 3. CORS保護
- 資格情報を含むリクエストのみ許可
- 特定オリジンのみアクセス許可

### 4. 入力検証
- APIでの必須フィールド検証
- SQLインジェクション対策（プレースホルダ使用）

## トラブルシューティング

### よくある問題

#### 1. CORSエラー
**症状**: `Access-Control-Allow-Credentials header is '' which must be 'true'`
**解決策**:
- `Access-Control-Allow-Credentials: true` を設定
- `Access-Control-Allow-Origin` をワイルドカードではなく特定ドメインに設定

#### 2. 認証エラー
**症状**: `You are not authenticated`
**解決策**:
- `npx wrangler login` で再認証
- 正しいメールアドレスでログイン

#### 3. データベースエラー
**症状**: `D1_ERROR: no such column`
**解決策**:
- データベーススキーマを確認
- 必要なカラムを追加

#### 4. APIエンドポイントNotFound
**症状**: `{"error":"Not found"}`
**解決策**:
- Workerが正しくデプロイされているか確認
- APIルート定義を確認

### デバッグ方法

#### 1. ログ確認
```bash
npx wrangler tail
```

#### 2. API直接テスト
```bash
curl -H "Origin: https://data.allfrom0.top" "https://data-manager-auth.t88596565.workers.dev/api/problems"
```

#### 3. データベース状態確認
```bash
npx wrangler d1 execute data-manager-auth-db --remote --command "SELECT COUNT(*) FROM questions;"
```

## パフォーマンス最適化

### 1. キャッシュ戦略
- Cloudflare CDNによる静的コンテンツキャッシュ
- APIレスポンスの適切なキャッシュヘッダー設定

### 2. データベース最適化
- 適切なインデックス設定
- LIMIT/OFFSETによるページネーション

### 3. R2ストレージ
- メディアファイルの直接配信
- CDNによるグローバル配信

## 監視とメンテナンス

### 1. ログ監視
```bash
# リアルタイムログ
npx wrangler tail

# 過去のログ確認
# Cloudflareダッシュボードで確認
```

### 2. パフォーマンス監視
- Cloudflare Analyticsでリクエスト状況を監視
- D1データベースのクエリパフォーマンスを監視

### 3. 定期メンテナンス
- 不要なデータのクリーンアップ
- データベースの最適化
- セキュリティ更新の適用

## 連絡先

### 技術サポート
- Cloudflareドキュメント: https://developers.cloudflare.com/
- Wrangler CLIドキュメント: https://developers.cloudflare.com/workers/wrangler/

### 緊急連絡
- プロジェクト管理者: t88596565@gmail.com

---
最終更新: 2024年10月6日
バージョン: 1.0