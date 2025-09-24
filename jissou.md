実装ノート - Cloudflare Worker検索システム
🚨 重要な注意点（AIエージェント向け）
1. Worker URL の正確な設定
正しいURL: https://data-manager-auth.t88596565.workers.dev
間違ったURL: https://questa-auth-worker.allfrom0.workers.dev
browse.htmlでWorker URLを修正する際は、既存の他ファイルのURLを参考にする
2. デプロイメント手順
npx wrangler deploy  # Workerコードを本番環境にデプロイ
curl -X GET "https://data-manager-auth.t88596565.workers.dev/api/auth/init"  # DB初期化
curl -X POST "https://data-manager-auth.t88596565.workers.dev/api/admin/seed-sample-data" -H "Authorization: Bearer questa-admin-2024"  # サンプルデータ追加
3. D1データベース構造
questions テーブル: 問題データ本体
question_stats テーブル: 統計情報
重要: 初期化後は必ずサンプルデータを追加する
4. 検索エンドポイント仕様
GET /api/search/questions
Parameters:
- subject: math/physics/chemistry
- search: キーワード
- difficulty_level: 1-5
- tags: 大学名など（URL エンコード必要）
- yearFilter: YYYY-YYYY形式
- limit: 結果数制限
- offset: ページネーション
5. 日本語処理の注意
URL パラメータの日本語は必ずエンコードする
curl テストでは %E6%9D%B1%E4%BA%AC%E5%A4%A7%E5%AD%A6 のような形式
6. エラー対処法
"No such table: questions" → /api/auth/init を実行
"Failed to fetch" → Worker URLを確認
空の検索結果 → サンプルデータを追加
7. 認証トークン
Admin Token: questa-admin-2024
Bearer認証でWorkerアクセス
8. フロントエンド統合
performWorkerSearch() 関数がメイン処理
ローカルフォールバック機能を維持
currentSubject 変数で科目を管理
📊 実装済み機能
✅ 完了済み
 Worker検索エンドポイント実装
 D1データベーススキーマ作成
 サンプルデータ追加機能
 フロントエンド統合
 全フィルター機能テスト完了
 CORS問題解決
🎯 テスト済み検索パターン
科目別検索（math/physics/chemistry）
難易度フィルター（1-5星）
大学名タグ検索（東京大学、京都大学等）
キーワード検索
ページネーション
🔧 トラブルシューティング
Worker が "Not found" を返す場合
npx wrangler deploy でデプロイ
新しいエンドポイントが含まれているか確認
データベースエラー
/api/auth/init で初期化
テーブル作成の確認
検索結果が空の場合
サンプルデータ追加エンドポイント実行
検索パラメータの確認
📝 サンプルデータ構造
{
  "id": "q_sample_math_001",
  "subject": "math",
  "title": "問題タイトル",
  "question_text": "問題文",
  "difficulty_amount": 1-5,
  "tags": ["大学名", "分野", "年度"],
  "field_code": "数学Ⅲ"
}
🚀 次回の改善項目
コメントシステムのWorker統合
より多くの大学データ追加
年度フィルターの詳細実装
パフォーマンス最適化

2025/9/24
最近の記述を一番重視せよ。
サイト data.allfrom0.top 。

cloudflareで配信。

ここは、大学入試などの問題を投稿し、手軽に調べれるシステムにしたい。

現在は数学、物理、化学、その他の問題に対応。

スマホ向けに配信する。

データはD1、R2で管理する。

workerはdatabase1.t88596565.workers.dev 。

R２では画像を管理。

問題入力には、latexを多用する。

├── index.html              # メインシステムダッシュボード

├── browse.html             # 🔍 検索システム (NEW!)

├── auth.html               # 認証システム

├── profile.html            # ユーザープロフィール

├── _headers               # Cloudflare Pages設定

├── assets/

│   ├── css/

│   │   ├── global.css      # グローバルスタイル

│   │   └── search.css      # 検索ページ専用スタイル

│   └── js/

│       ├── search-manager.js      # 🔍 検索機能管理

│       ├── search-integration.js  # 検索統合スクリプト

│       └── questa-d1-client.js    # D1データベースクライアント

├── math/

│   └── index.html         # 英語問題管理システム

  |        -------geo

├── physics/

│   └── index.html         # 数学問題管理システム



geoでは、tikz機能を十分に。



ユーザーができること。

１：問題投稿。

２：問題にコメント。

３：自分の問題管理。

４：問題に解答案を付ける。

５：問題にいいねする。

６：問題検索。



認証

節約のため、パスキーを優先的に。



AIへ、git pushする際に、そのgitがふるいままで、一部しか変えてないかよく考えてください。例えば、Aという古いgitで、そこのBという部分を変えて、プッシュした場合、現在ある多くの機能が失われる可能性がある。プッシュした際の変化が自分の変化部分だけなのかよく考えてください。

