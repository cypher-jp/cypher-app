# CYPHER デプロイ手順（ターミナル不要版）

このフォルダ（`cypher-app/`）一式を、**ブラウザのボタンクリックだけ**で公開する手順。
所要時間：合計 **40〜60分**。

---

## ゴール

```
このフォルダ → GitHub（コードの保管庫）→ Vercel（自動公開）
                                   ↑
                              Supabase（DB）と連携
```

最終的に `https://cypher-xxxx.vercel.app` で公開された状態にする。

---

## ⓪ 事前準備（10分）

メアド `maryasdwww@gmail.com` で以下のアカウントを作る。**全部無料**。

| サービス | URL | 用途 |
|---------|-----|------|
| GitHub  | https://github.com/signup | コード保管 |
| Vercel  | https://vercel.com/signup | 自動デプロイ |
| Supabase | https://supabase.com/dashboard/sign-up | DB |

**Tip:** Vercel と Supabase は「Sign up with GitHub」を選ぶと一発。GitHubだけ最初に作っておけば残りは1クリック。

---

## ① GitHub にコードを上げる（10分）

### 1-1. リポジトリを作る

1. https://github.com/new を開く
2. **Repository name**: `cypher-app`
3. **Public** を選択（無料プランの制約。後でPrivateにも変えられる）
4. **Create repository** をクリック

### 1-2. このフォルダの中身をアップロード

リポジトリ作成後の画面に **"uploading an existing file"** というリンクがある。クリック。

または直接：`https://github.com/<あなたのユーザー名>/cypher-app/upload/main`

1. **このフォルダ（`cypher-app`）の中身を全部** ドラッグ＆ドロップ
   - `src/` フォルダ
   - `package.json`
   - `next.config.js`
   - `tsconfig.json`
   - `tailwind.config.ts`
   - `postcss.config.js`
   - `.gitignore`
   - `.env.local.example`
   - `README.md`
   - `DEPLOY.md`
   - `supabase/` フォルダ
   - **⚠️ `node_modules/` は絶対に上げない**（今このフォルダにそもそも無いはず）
2. 下部の **Commit changes** をクリック
3. メッセージは `initial commit` でOK → **Commit changes**

> **ハマりやすい点：** ドラッグ＆ドロップでフォルダごと上げると、フォルダ階層が保たれる。
> 上手くいかなかった場合は、ブラウザを Chrome / Edge / Firefox にすると確実。

---

## ② Vercel に繋ぐ（5分）

1. https://vercel.com/new を開く
2. **Import Git Repository** で `cypher-app` を選択
3. 設定はそのまま **Deploy** をクリック
   - Framework は自動で **Next.js** が検出される
   - Build Command, Output Directory も自動

4〜5分待つと、`https://cypher-xxxx.vercel.app` が発行される。
**この時点でモックデータで動くサイトが世界に公開されている。**

---

## ③ Supabase をセットアップ（15分）

### 3-1. プロジェクト作成

1. https://supabase.com/dashboard/projects → **New project**
2. Name: `cypher`
3. Database password: **強いパスワード生成 → メモ必須**
4. Region: **Tokyo (Northeast Asia)** が無難
5. **Create new project** → 約2分でセットアップ完了

### 3-2. テーブルを作る

1. 左メニュー **SQL Editor** → **New query**
2. このリポジトリの `supabase/schema.sql` の中身を**全部コピペ**
3. 右下の **RUN** をクリック → "Success. No rows returned" が出ればOK

### 3-3. テストデータを入れる（任意）

1. 同じ SQL Editor で新しい query を作る
2. `supabase/seed.sql` の中身をコピペ → **RUN**

### 3-4. APIキーを取得

1. 左メニュー **Project Settings**（歯車）→ **API**
2. 以下2つをメモ：
   - **Project URL** （`https://xxxxx.supabase.co`）
   - **anon public** key （`eyJ...` から始まる長い文字列）

---

## ④ Vercel に環境変数を登録（5分）

1. Vercel ダッシュボード → `cypher-app` プロジェクト → **Settings** → **Environment Variables**
2. 以下2つを追加：

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | （3-4でコピーしたProject URL） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | （3-4でコピーしたanon public key） |

3. **Save** → 上部メニュー **Deployments** → 最新デプロイの **⋯** → **Redeploy**

これで Supabase と繋がる。データを足したらサイトに即反映される。

---

## ⑤ 動作確認

1. 公開URLを開く → ヒーロー＋15件のイベントカードが見える
2. 種別/ジャンル/エリアのドロップダウンで絞り込めるか
3. カードをクリック → 詳細ページが出るか
4. 上部メニュー **Calendar** → 月別カレンダーが出るか

全部OKなら成功。

---

## ⑥ コードを更新したくなったら

GitHubのファイルを編集してCommitすれば、Vercel が自動で再デプロイする。
編集はGitHub Web UI上で直接できる：

1. GitHubで対象ファイルを開く → ✏️ 鉛筆アイコン
2. 編集 → **Commit changes**
3. Vercel が1〜2分で自動デプロイ

ローカルで本格的に開発する場合は、`CYPHER_setup_guide.md`（前回作ったやつ）の Phase 1〜3 を順番に。

---

## トラブルシューティング

| 症状 | 対処 |
|------|------|
| Vercelで "Build failed" | Logs を見る。だいたい `package.json` か `tsconfig.json` の文字化け。再アップロード |
| サイトは出るがイベントが0件 | Supabase未接続でモックデータも入っていない。`mockEvents.ts` を確認 |
| Supabaseに繋いだのにデータが出ない | Vercelの環境変数が **Production** にチェック入っているか／RLSポリシーが効いているか |
| TypeScriptエラー | `tsconfig.json` の `paths` 設定を確認。`@/types/...` の解決 |

詰まったらエラーメッセージそのままClaudeに貼って聞く。
