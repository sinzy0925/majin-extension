// --- グローバルデザイン設定 ---
// 以下の定数はスライド全体のデザインの初期値を定義します。
// ★★★これらの値はすべて、Chrome拡張機能のポップアップ画面からユーザーが自由に変更可能です★★★


// フッターに表示するテキストの初期値を定義します。
// `${new Date().getFullYear()}` で現在の西暦年を自動的に埋め込みます。（例: "© 2025 Google Inc."）
// [拡張機能の場所: ロゴ・フッターテキスト設定 > フッターテキスト]
const str_FOOTER_TEXT = `© ${new Date().getFullYear()} Google Inc.`;

// 各スライドのヘッダーに表示するロゴ画像のURLの初期値を定義します。
// [拡張機能の場所: ロゴ・フッターテキスト設定 > ヘッダーロゴURL]
const str_LOGOS_header= 'https://upload.wikimedia.org/wikipedia.commons/thumb/2/2f/Google_2015_logo.svg/640px-Google_2015_logo.svg.png';

// 最終ページ（クロージングスライド）に表示するロゴ画像のURLの初期値を定義します。
// [拡張機能の場所: ロゴ・フッターテキスト設定 > クロージングロゴURL]
const str_LOGOS_closing= 'https://upload.wikimedia.org/wikipedia.commons/thumb/2/2f/Google_2015_logo.svg/640px-Google_2015_logo.svg.png';

// スライドデザインのテーマカラー（主要な色、例: タイトル下の線など）の初期値を定義します。(#4285F4はGoogleブルー)
// [拡張機能の場所: カラー設定 > ラインカラー]
const str_primary_color= '#4285F4';

// スライドの基本的な文字色の初期値を定義します。(#333333は目に優しい濃いグレー)
// [拡張機能の場所: カラー設定 > フォントカラー]
const str_text_primary= '#333333';//ほぼ黒のグレー

// スライド全体で使用するフォント（書体）の初期値を定義します。
// [拡張機能の場所: カラー設定 > フォント]
const str_font_family= 'Arial';// 'Roboto''Arial'デフォルト、プロパティから動的に変更可能

// 背景グラデーションの「開始色」の初期値を定義します。(#FFFFFFは白)
// [拡張機能の場所: カラー設定 > 背景グラデーション[start]]
const str_bg_gradient_start_color= '#FFFFFF';

// 背景グラデーションの「終了色」の初期値を定義します。(#00FFFFは水色)
// [拡張機能の場所: カラー設定 > 背景グラデーション[End]]
const str_bg_gradient_end_color= '#00FFFF';

// 本文スライドの背景に画像を使用する場合のURLの初期値を定義します。
// `null` は「画像を使用しない」を意味し、この場合はグラデーション背景が適用されます。
// [拡張機能の場所: 背景画像設定 > 本文 背景画像URL]
const str_content_background_image_url= null;

// タイトルスライド専用の背景画像URLの初期値を定義します。`null`の場合はグラデーション背景になります。
// [拡張機能の場所: 背景画像設定 > タイトル頁 背景画像URL]
const str_title_background_image_url= null; 

// 最終ページ専用の背景画像URLの初期値を定義します。`null`の場合はグラデーション背景になります。
// [拡張機能の場所: 背景画像設定 > 最終頁 背景画像URL]
const str_closing_background_image_url= null; 

// 背景グラデーションの方向の初期値を定義します。'vertical'は垂直（上から下へ）です。
// [拡張機能の場所: カラー設定 > グラデーションの向き]
const str_GRADIENT_DIRECTION= 'vertical';// 'vertical', 'diagonal-lr', 'diagonal-rl'

/*
const str_FOOTER_TEXT = `© ${new Date().getFullYear()} Google Inc.`;
const str_LOGOS_header= 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/640px-Google_2015_logo.svg.png';
const str_LOGOS_closing= 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/640px-Google_2015_logo.svg.png';
const str_primary_color= '#4285F4';
const str_text_primary= '#333333';//ほぼ黒のグレー
const str_font_family= 'Arial';// 'Roboto''Arial'デフォルト、プロパティから動的に変更可能

const str_bg_gradient_start_color= '#FFFFFF';
const str_bg_gradient_end_color= '#00FFFF';
const str_content_background_image_url= null;
const str_title_background_image_url= null; 
const str_closing_background_image_url= null; 
const str_GRADIENT_DIRECTION= 'vertical';// 'vertical', 'diagonal-lr', 'diagonal-rl'
*/