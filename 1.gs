const str_FOOTER_TEXT = `© ${new Date().getFullYear()} Google Inc.`;
const str_LOGOS_header= 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/640px-Google_2015_logo.svg.png'
const str_LOGOS_closing= 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/640px-Google_2015_logo.svg.png'


// --- 1. 実行設定 ---
const SETTINGS = {
SHOULD_CLEAR_ALL_SLIDES: true,
TARGET_PRESENTATION_ID: null
};

// --- 2. マスターデザイン設定 (Pixel Perfect Ver.) ---
const CONFIG = {
BASE_PX: { W: 960, H: 540 },

// レイアウトの基準となる不変のpx値
POS_PX: {
titleSlide: {
logo:       { left: 55,  top: 105,  width: 135 },
title:      { left: 50,  top: 200, width: 830, height: 90 },
date:       { left: 50,  top: 450, width: 250, height: 40 },
},

// 共通ヘッダーを持つ各スライド  
contentSlide: {  
  headerLogo:     { right: 20, top: 20, width: 75 },  
  title:          { left: 25, top: 50,  width: 830, height: 65 },  
  titleUnderline: { left: 25, top: 118, width: 260, height: 4 },  
  subhead:        { left: 25, top: 130, width: 830, height: 40 },  
  body:           { left: 25, top: 172, width: 910, height: 290 },  
  twoColLeft:     { left: 25,  top: 172, width: 440, height: 290 },  
  twoColRight:    { left: 495, top: 172, width: 440, height: 290 }  
},  
compareSlide: {  
  headerLogo:     { right: 20, top: 20, width: 75 },  
  title:          { left: 25, top: 50,  width: 830, height: 65 },  
  titleUnderline: { left: 25, top: 118, width: 260, height: 4 },  
  subhead:        { left: 25, top: 130, width: 830, height: 40 },  
  leftBox:        { left: 25,  top: 152, width: 430, height: 290 },  
  rightBox:       { left: 485, top: 152, width: 430, height: 290 }  
},  
processSlide: {  
  headerLogo:     { right: 20, top: 20, width: 75 },  
  title:          { left: 25, top: 50,  width: 830, height: 65 },  
  titleUnderline: { left: 25, top: 118, width: 260, height: 4 },  
  subhead:        { left: 25, top: 130, width: 830, height: 40 },  
  area:           { left: 25, top: 152, width: 910, height: 290 }  
},  
timelineSlide: {  
  headerLogo:     { right: 20, top: 20, width: 75 },  
  title:          { left: 25, top: 50,  width: 830, height: 65 },  
  titleUnderline: { left: 25, top: 118, width: 260, height: 4 },  
  subhead:        { left: 25, top: 130, width: 830, height: 40 },  
  area:           { left: 25, top: 172, width: 910, height: 290 }  
},  
diagramSlide: {  
  headerLogo:     { right: 20, top: 20, width: 75 },  
  title:          { left: 25, top: 50,  width: 830, height: 65 },  
  titleUnderline: { left: 25, top: 118, width: 260, height: 4 },  
  subhead:        { left: 25, top: 130, width: 830, height: 40 },  
  lanesArea:      { left: 25, top: 172, width: 910, height: 290 }  
},  
cardsSlide: { // This POS_PX is used by both cards and headerCards
  headerLogo:     { right: 20, top: 20, width: 75 },  
  title:          { left: 25, top: 50,  width: 830, height: 65 },  
  titleUnderline: { left: 25, top: 118, width: 260, height: 4 },  
  subhead:        { left: 25, top: 130, width: 830, height: 40 },  
  gridArea:       { left: 25, top: 160, width: 910, height: 290 }  
},  
tableSlide: {  
  headerLogo:     { right: 20, top: 20, width: 75 },  
  title:          { left: 25, top: 50,  width: 830, height: 65 },  
  titleUnderline: { left: 25, top: 118, width: 260, height: 4 },  
  subhead:        { left: 25, top: 130, width: 830, height: 40 },  
  area:           { left: 25, top: 160, width: 910, height: 290 }  
},  
progressSlide: {  
  headerLogo:     { right: 20, top: 20, width: 75 },  
  title:          { left: 25, top: 50,  width: 830, height: 65 },  
  titleUnderline: { left: 25, top: 118, width: 260, height: 4 },  
  subhead:        { left: 25, top: 130, width: 830, height: 40 },  
  area:           { left: 25, top: 172, width: 910, height: 290 }  
},

quoteSlide: {
  headerLogo:     { right: 20, top: 20, width: 75 },
  title:          { left: 25, top: 50,  width: 830, height: 65 },
  titleUnderline: { left: 25, top: 118, width: 260, height: 4 },
  subhead:        { left: 25, top: 130, width: 830, height: 40 },
  quoteMark:      { left: 40, top: 180, width: 100, height: 100 },
  quoteText:      { left: 150, top: 210, width: 700, height: 150 },
  author:         { right: 110, top: 370, width: 700, height: 30 }
},

kpiSlide: {
  headerLogo:     { right: 20, top: 20, width: 75 },
  title:          { left: 25, top: 50,  width: 830, height: 65 },
  titleUnderline: { left: 25, top: 118, width: 260, height: 4 },
  subhead:        { left: 25, top: 130, width: 830, height: 40 },
  gridArea:       { left: 25, top: 172, width: 910, height: 290 }
},

statsCompareSlide: {
  headerLogo:     { right: 20, top: 20, width: 75 },
  title:          { left: 25, top: 50,  width: 830, height: 65 },
  titleUnderline: { left: 25, top: 118, width: 260, height: 4 },
  subhead:        { left: 25, top: 130, width: 830, height: 40 },
  leftArea:       { left: 25, top: 172, width: 430, height: 290 },
  rightArea:      { left: 485, top: 172, width: 430, height: 290 }
},

sectionSlide: {  
  title:      { left: 55, top: 230, width: 840, height: 80 },  
  ghostNum:   { left: 35, top: 120, width: 400, height: 200 }
},

footer: {  
  leftText:  { left: 15, top: 505, width: 250, height: 20 },  
  rightPage: { right: 15, top: 505, width: 50,  height: 20 }  
},  
bottomBar: { left: 0, top: 534, width: 960, height: 6 }  

},

FONTS: {
family: 'Arial', // デフォルト、プロパティから動的に変更可能
sizes: {
title: 32, 
sectionTitle: 30, 
contentTitle: 24, 
subhead: 20,
body: 16, 
laneTitle: 14, 
processStep: 17, 
date: 16, 
footer: 9, 
chip: 11, 
small: 10,
axis: 12, 
ghostNum: 180
}
},
COLORS: {
primary_color: '#4285F4', 
text_primary: '#333333', 

background_white: '#FFFFFF',
background_gray: '#f8f9fa', 

  // --- グラデーション用の色定義 ---
  background_gradient_start: '#FFFFFF', // グラデーション開始色 (白)
  //background_gradient_end: '#FFFFFF', // グラデーション開始色 (白)
  //background_gradient_end: '#FFF0F5',   // グラデーション終了色 (薄いピンク)
  background_gradient_end: '#00ffff',   // グラデーション終了色 (アクア)

faint_gray: '#e8eaed', lane_title_bg: '#f8f9fa',
table_header_bg: '#f8f9fa', lane_border: '#dadce0', card_bg: '#ffffff',
card_border: '#dadce0', neutral_gray: '#9e9e9e', ghost_gray: '#efefed'
},
DIAGRAM: {
laneGap_px: 24, lanePad_px: 10, laneTitle_h_px: 30, cardGap_px: 12,
cardMin_h_px: 48, cardMax_h_px: 70, arrow_h_px: 10, arrowGap_px: 8
},

LOGOS: {
header: str_LOGOS_header,
closing: str_LOGOS_header
},

BACKGROUNDS: {
    // 全本文スライド共通の背景画像URL。nullの場合はグラデーション背景になる。
    content_background_image_url: "https://raw.githubusercontent.com/sinzy0925/logo/refs/heads/main/bg01.png",
    
    // （オプション）タイトルスライド専用の背景画像
    title_background_image_url: "https://raw.githubusercontent.com/sinzy0925/logo/refs/heads/main/bg01.png", 
    
    // （オプション）クロージングスライド専用の背景画像
    closing_background_image_url: null 
},

FOOTER_TEXT: str_FOOTER_TEXT
};