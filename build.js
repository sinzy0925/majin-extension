// build.js

// 必要なツールを読み込む
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const rimraf = require('rimraf');
require('dotenv').config(); // .envファイルから環境変数を読み込む

// フォルダやファイルの名前を定義
const SRC_DIR = 'src';
const DIST_DIR = 'dist';
const ZIP_NAME = 'majin-extension.zip';

// 1. 古いビルド成果物を削除
console.log(`古いビルドフォルダ (${DIST_DIR}) を削除しています...`);
rimraf.sync(DIST_DIR);
rimraf.sync(ZIP_NAME);

// 2. 新しいビルドフォルダを作成
console.log(`新しいビルドフォルダ (${DIST_DIR}) を作成しています...`);
fs.mkdirSync(DIST_DIR);

// 3. manifest.jsonを処理
console.log('manifest.jsonを処理中...');
const manifestPath = path.join(SRC_DIR, 'manifest.json');
let manifestContent = fs.readFileSync(manifestPath, 'utf-8');

const clientId = process.env.OAUTH_CLIENT_ID;
if (!clientId) {
  console.error('エラー: .envファイルにOAUTH_CLIENT_IDが設定されていません。');
  process.exit(1); // エラーで終了
}

// プレースホルダーを本物のクライアントIDに置換
manifestContent = manifestContent.replace('__OAUTH_CLIENT_ID__', clientId);

// ビルドフォルダに新しいmanifest.jsonを書き出す
fs.writeFileSync(path.join(DIST_DIR, 'manifest.json'), manifestContent);
console.log('manifest.jsonの処理が完了しました。');

// 4. manifest.json以外のすべてのファイルをsrcからdistにコピー
console.log('残りのファイルをコピーしています...');
const files = fs.readdirSync(SRC_DIR);
files.forEach(file => {
  if (file !== 'manifest.json') {
    fs.copyFileSync(path.join(SRC_DIR, file), path.join(DIST_DIR, file));
  }
});
console.log('ファイルのコピーが完了しました。');

// 5. distフォルダをZIPファイルに圧縮
console.log(`'${ZIP_NAME}' を作成中...`);
const output = fs.createWriteStream(ZIP_NAME);
const archive = archiver('zip', {
  zlib: { level: 9 } // 最大圧縮
});

output.on('close', () => {
  console.log(`ZIPファイルの作成が完了しました。合計サイズ: ${archive.pointer()} バイト`);
  console.log(`\n🎉 ビルド成功！ '${ZIP_NAME}' をChromeウェブストアにアップロードしてください。`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);
archive.directory(DIST_DIR, false);
archive.finalize();