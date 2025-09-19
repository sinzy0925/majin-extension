// background.js (2ボタン対応・connect方式・最終版・省略なし)

// -----------------------------------------------------------------------------
// --- グローバル変数 & 接続リスナー ---
// -----------------------------------------------------------------------------
const DEPLOYMENT_ID = "AKfycbySvStV0tawHEK6ZX9JGlngVMd_OXe0ntJM7FbVzpCRCJ8tRMDJIp1fJKXYX78o1QO-"; 
const API_KEY = "AIzaSyBr4eFtrSHtx0eCeow1p56LJUMNFUkZJHs"; 
const MODEL   = 'gemini-2.5-flash-lite'
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
// ★★★★★★★★★★★★★★★★★★★★★

let activePort = null;

// 接続リスナーはこれ一つに統一する
chrome.runtime.onConnect.addListener((port) => {
  console.assert(port.name === "generate-channel");
  activePort = port;

  port.onMessage.addListener((msg) => {
    if (msg.action === "generateSlidesWithAI") {
      // popup.jsから渡された prompt と settings を正しく受け取る
      generateSlidesWithAI(msg.prompt, msg.settings);
    }
  });

  port.onDisconnect.addListener(() => {
    activePort = null;
  });
});

// 進捗をポップアップに送信するヘルパー関数
function sendProgress(response) {
  if (activePort) {
    activePort.postMessage(response);
  }
}

// メインのスライド生成関数
async function generateSlidesWithAI(userPrompt, userSettings) {
  try {
    let finalPrompt = userPrompt;
    
    sendProgress({ status: 'progress', message: 'AIがスライド構成案を作成中...'});
    const slideDataString = await getSlideDataFromAI(finalPrompt);
    
    sendProgress({ status: 'progress', message: 'GASプロジェクトを準備中...'});
    const token = await getAuthToken();

    // 1. 元の0.gsを読み込む
    let file0Source = await fetch(chrome.runtime.getURL('0.gs')).then(res => res.text());

    // 2. ユーザー設定が存在する場合のみ、内容を書き換える
    // このチェックで 'undefined' のエラーを防ぐ
    if (userSettings) {
      if (userSettings.footerText) {
        file0Source = file0Source.replace(/const str_FOOTER_TEXT = `.*`;/, `const str_FOOTER_TEXT = \`${userSettings.footerText}\`;`);
      }
      if (userSettings.headerLogo) {
        file0Source = file0Source.replace(/const str_LOGOS_header= '.*'/, `const str_LOGOS_header= '${userSettings.headerLogo}'`);
      }
      if (userSettings.closingLogo) {
        file0Source = file0Source.replace(/const str_LOGOS_closing= '.*'/, `const str_LOGOS_closing= '${userSettings.closingLogo}'`);
      }
      if (userSettings.primaryColor) {
        file0Source = file0Source.replace(/const str_primary_color= '.*';/, `const str_primary_color= '${userSettings.primaryColor}';`);
      }

      const formatUrl = (url) => url ? `"${url}"` : 'null';
      if (userSettings.titleBg !== undefined) {
        file0Source = file0Source.replace(/const str_title_background_image_url= .*?;/, `const str_title_background_image_url= ${formatUrl(userSettings.titleBg)};`);
      }
      if (userSettings.contentBg !== undefined) {
        file0Source = file0Source.replace(/const str_content_background_image_url= .*?;/, `const str_content_background_image_url= ${formatUrl(userSettings.contentBg)};`);
      }
      if (userSettings.closingBg !== undefined) {
        file0Source = file0Source.replace(/const str_closing_background_image_url= .*?;/, `const str_closing_background_image_url= ${formatUrl(userSettings.closingBg)};`);
      }
    }
    
    const file1Source = await fetch(chrome.runtime.getURL('1.gs')).then(res => res.text());
    const file3Source = await fetch(chrome.runtime.getURL('3.gs')).then(res => res.text());
    
    sendProgress({ status: 'progress', message: 'GASプロジェクトを更新中...'});
    const newSource = createProjectSource(file0Source, file1Source, slideDataString, file3Source);
    const SCRIPT_ID = "1rN_uajX9w8Y-x_HdqUuQvBgE6ICC2VrpE67iv1byuQFu3snzyJ0Ms1f5";
    await updateGasProject(SCRIPT_ID, token, newSource);

    sendProgress({ status: 'progress', message: '新バージョンを作成中...'});
    const versionResponse = await createNewVersion(SCRIPT_ID, token);
    const newVersionNumber = versionResponse.versionNumber;

    sendProgress({ status: 'progress', message: `デプロイを更新中 (v${newVersionNumber})...` });
    const DEPLOYMENT_ID = "AKfycbySvStV0tawHEK6ZX9JGlngVMd_OXe0ntJM7FbVzpCRCJ8tRMDJIp1fJKXYX78o1QO-";
    await updateDeployment(SCRIPT_ID, DEPLOYMENT_ID, token, newVersionNumber);

    sendProgress({ status: 'progress', message: 'スライドを生成しています...'});
    const WEB_APP_URL = `https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec`;
    const result = await executeWebApp(WEB_APP_URL);
    
    sendProgress({ status: 'success', message: '完了: ' + result.message });

  } catch (error) {
    console.error("【CRITICAL ERROR】:", error);
    sendProgress({ status: 'error', message: error.message || '不明なエラーです。' });
  }
}

// --- YouTube文字起こし関連 ---
function isYouTubeUrl(url) {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
  return youtubeRegex.test(url);
}

function getVideoId(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === "youtu.be") return urlObj.pathname.slice(1);
    return urlObj.searchParams.get("v");
  } catch (e) { return null; }
}

async function getYouTubeTranscript(url) {
  try {
    const videoId = getVideoId(url);
    if (!videoId) throw new Error("有効なYouTube動画のURLではありません。");

    // 1. 現在アクティブなウィンドウのアクティブなタブを取得する
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 2. そのタブがYouTubeの動画ページであるか確認する
    if (!activeTab || !activeTab.url || !isYouTubeUrl(activeTab.url)) {
      throw new Error("YouTubeの動画ページをアクティブにしてから実行してください。");
    }
    
    // 3. アクティブなタブのContent Scriptに直接メッセージを送信する
    const response = await chrome.tabs.sendMessage(activeTab.id, {
      type: 'get-youtube-transcript-from-page',
      videoId: videoId
    });

    // 4. Content Scriptからの応答を検証して返す
    if (response && response.success) {
      return response.transcript;
    } else {
      throw new Error(response.error || "Content Scriptから予期せぬ応答がありました。");
    }

  } catch (error) {
    // エラーメッセージに、どのURLで試したかの情報を追加してデバッグしやすくする
    console.error(`URL: ${url} の文字起こし取得中にエラー:`, error);
    throw error;
  }
}

chrome.runtime.onConnect.addListener((port) => {
  console.assert(port.name === "generate-channel");
  activePort = port;

  port.onMessage.addListener((msg) => {
    if (msg.action === "generateSlidesWithAI") {
      generateSlidesWithAI(msg.prompt); 
    } else if (msg.action === "regenerateWithNewDesign") {
      regenerateWithNewDesign(msg.designSettings);
    }
  });

  port.onDisconnect.addListener(() => {
    activePort = null;
  });
});

// -----------------------------------------------------------------------------
// --- ヘルパー関数 ---
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// --- メイン処理フロー ②：微調整して再生成 (AIなし) ---
// -----------------------------------------------------------------------------

async function regenerateWithNewDesign(designSettings) {
  try {
    const SCRIPT_ID = "1rN_uajX9w8Y-x_HdqUuQvBgE6ICC2VrpE67iv1byuQFu3snzyJ0Ms1f5";
    const WEB_APP_URL = `https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec`;
    
    sendProgress({ status: 'progress', message: 'STEP 1/7: 認証...' });
    const token = await getAuthToken();

    sendProgress({ status: 'progress', message: 'STEP 2/7: 現在の2.gsを読込中...' });
    const currentProject = await getGasProjectContent(SCRIPT_ID, token);
    const file2Source = currentProject.files.find(f => f.name === '2').source;

    sendProgress({ status: 'progress', message: 'STEP 3/7: 新デザイン設定を準備中...' });
    let file1Source = await fetch(chrome.runtime.getURL('1.gs')).then(res => res.text());
    if (designSettings.primaryColor) {
      file1Source = file1Source.replace(/primary_color: '.*?',/, `primary_color: '${designSettings.primaryColor}',`);
    }

    const file3Source = await fetch(chrome.runtime.getURL('3.gs')).then(res => res.text());

    sendProgress({ status: 'progress', message: 'STEP 4/7: GASコード(デザインのみ)更新...' });
    const newSource = createProjectSource(file1Source, file2Source, file3Source);
    await updateGasProject(SCRIPT_ID, token, newSource);

    sendProgress({ status: 'progress', message: 'STEP 5/7: 新バージョン作成...' });
    const versionResponse = await createNewVersion(SCRIPT_ID, token);
    const newVersionNumber = versionResponse.versionNumber;

    sendProgress({ status: 'progress', message: `STEP 6/7: デプロイ更新 (v${newVersionNumber})...` });
    await updateDeployment(SCRIPT_ID, DEPLOYMENT_ID, token, newVersionNumber);

    sendProgress({ status: 'progress', message: 'STEP 7/7: スライド再生成...' });
    const result = await executeWebApp(WEB_APP_URL);
    
    sendProgress({ status: 'success', message: '完了: 微調整が反映されました。' });

  } catch (error) {
    console.error("【CRITICAL ERROR in regenerateWithNewDesign】:", error);
    sendProgress({ status: 'error', message: error.message || '不明なエラーです。' });
  }
}

function sendProgress(response) {
  if (activePort) {
    activePort.postMessage(response);
  }
}

// -----------------------------------------------------------------------------
// --- メイン処理フロー ①：スライド生成 (AIあり) ---
// -----------------------------------------------------------------------------

async function generateSlidesWithAIaaa(userPrompt) {
  try {
    const SCRIPT_ID = "1rN_uajX9w8Y-x_HdqUuQvBgE6ICC2VrpE67iv1byuQFu3snzyJ0Ms1f5";
    const WEB_APP_URL = `https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec`;

    let finalPrompt = userPrompt;

    if (isYouTubeUrl(userPrompt)) {
      sendProgress({ status: 'progress', message: 'STEP 1/9: YouTube動画の文字起こしを取得中...'});
      try {
        finalPrompt = await getYouTubeTranscript(userPrompt);
        sendProgress({ status: 'progress', message: '文字起こしの取得に成功しました。'});
      } catch (error) {
        sendProgress({ status: 'error', message: error.message });
        return;
      }
    }

    sendProgress({ status: 'progress', message: 'STEP 1/8: AIデータ生成...' });
    const slideDataString = await getSlideDataFromAI(finalPrompt);

    sendProgress({ status: 'progress', message: 'STEP 2/8: 1.gs読込...' });
    const file1Source = await fetch(chrome.runtime.getURL('1.gs')).then(res => res.text());

    sendProgress({ status: 'progress', message: 'STEP 3/8: 3.gs読込...' });
    const file3Source = await fetch(chrome.runtime.getURL('3.gs')).then(res => res.text());

    sendProgress({ status: 'progress', message: 'STEP 4/8: 認証...' });
    const token = await getAuthToken();

    sendProgress({ status: 'progress', message: 'STEP 5/8: GASコード更新...' });
    const newSource = createProjectSource(file1Source, slideDataString, file3Source);
    await updateGasProject(SCRIPT_ID, token, newSource);

    sendProgress({ status: 'progress', message: 'STEP 6/8: 新バージョン作成...' });
    const versionResponse = await createNewVersion(SCRIPT_ID, token);
    const newVersionNumber = versionResponse.versionNumber;

    sendProgress({ status: 'progress', message: `STEP 7/8: デプロイ更新 (v${newVersionNumber})...` });
    await updateDeployment(SCRIPT_ID, DEPLOYMENT_ID, token, newVersionNumber);

    sendProgress({ status: 'progress', message: 'STEP 8/8: スライド生成...' });
    const result = await executeWebApp(WEB_APP_URL);
    
    sendProgress({ status: 'success', message: '完了: ' + result.message });

  } catch (error) {
    console.error("【CRITICAL ERROR in generateSlidesWithAI】:", error);
    sendProgress({ status: 'error', message: error.message || '不明なエラーです。' });
  }
}



// -----------------------------------------------------------------------------
// --- 補助関数群 ---
// -----------------------------------------------------------------------------

async function getSlideDataFromAI(userPrompt) {
  const systemPrompt = await fetch(chrome.runtime.getURL('system_prompt.txt')).then(res => res.text());
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(API_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt + "\n\n---\n\n" + userPrompt }] }],
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" }, { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }, { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ]
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) { const errorData = await response.json(); throw new Error(`AI APIエラー: ${errorData.error.message}`); }
    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0) { throw new Error("AIからの応答がありませんでした。プロンプトがセーフティ機能に抵触した可能性があります。"); }
    if (data.candidates[0].content && data.candidates[0].content.parts[0].text) {
      let rawText = data.candidates[0].content.parts[0].text;
      rawText = rawText.replace(/^```javascript\s*/, '').replace(/```\s*$/, '');
      return rawText.trim();
    } else { throw new Error("AIからのレスポンス形式が不正です。"); }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') { throw new Error("AI APIからの応答がタイムアウトしました（120秒）。"); }
    throw error;
  }
}

function getAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) { reject(chrome.runtime.lastError); } else { resolve(token); }
    });
  });
}

function createProjectSource(file0,file1, file2, file3) {
  const manifestContent = `
  {
    "timeZone": "Asia/Tokyo", 
    "dependencies": {}, 
    "exceptionLogging": "STACKDRIVER",
    "runtimeVersion": "V8", 
    "webapp": { "executeAs": "USER_DEPLOYING", "access": "ANYONE_ANONYMOUS" }
  }`;
  return {
    files: [
      { name: "appsscript", type: "JSON", source: manifestContent }, 
      { name: "0", type: "SERVER_JS", source: file0 },
      { name: "1", type: "SERVER_JS", source: file1 },
      { name: "2", type: "SERVER_JS", source: file2 }, 
      { name: "3", type: "SERVER_JS", source: file3 }
    ]
  };
}

async function updateGasProject(scriptId, token, source) {
  const url = `https://script.googleapis.com/v1/projects/${scriptId}/content`;
  const response = await fetch(url, {
    method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(source)
  });
  if (!response.ok) { const errorData = await response.json(); throw new Error(`GASプロジェクトの更新に失敗: ${errorData.error.message}`); }
  return await response.json();
}

async function getGasProjectContent(scriptId, token) {
  const url = `https://script.googleapis.com/v1/projects/${scriptId}/content?fields=files(name,source)`;
  const response = await fetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } });
  if (!response.ok) { const errorData = await response.json(); throw new Error(`GASプロジェクト内容の取得に失敗: ${errorData.error.message}`); }
  return await response.json();
}

async function createNewVersion(scriptId, token) {
  const url = `https://script.googleapis.com/v1/projects/${scriptId}/versions`;
  const response = await fetch(url, {
    method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: `Auto-deployed by extension at ${new Date().toISOString()}` })
  });
  if (!response.ok) { const errorData = await response.json(); throw new Error(`GASの新しいバージョンの作成に失敗: ${errorData.error.message}`); }
  return await response.json();
}

async function updateDeployment(scriptId, deploymentId, token, versionNumber) {
  const url = `https://script.googleapis.com/v1/projects/${scriptId}/deployments/${deploymentId}`;
  const response = await fetch(url, {
    method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deploymentConfig: { scriptId: scriptId, versionNumber: versionNumber, description: `Updated by extension to v${versionNumber}` }
    })
  });
  if (!response.ok) { const errorData = await response.json(); throw new Error(`GASのデプロイ更新に失敗: ${errorData.error.message}`); }
  return await response.json();
}

async function executeWebApp(url) {
  const response = await fetch(url, { method: 'POST', cache: 'no-cache' });
  if (!response.ok) { const errorText = await response.text(); throw new Error(`ウェブアプリ実行エラー: ステータス ${response.status}`); }
  const text = await response.text();
  try {
    const jsonResponse = JSON.parse(text);
    if (jsonResponse.logs && Array.isArray(jsonResponse.logs)) {
      console.groupCollapsed("📋 Google Apps Scriptからのログ");
      jsonResponse.logs.forEach(log => { console.log(log); sendProgress({ status: 'progress', message: log }); });
      console.groupEnd();
    }
    if (jsonResponse.status === 'error') { throw new Error(`GAS側でエラーが発生: ${jsonResponse.message}`); }
    return jsonResponse;
  } catch (e) {
    throw new Error("ウェブアプリ応答の解析に失敗しました。");
  }
}