// background.js (省略なし・完成版)

// --- デフォルト設定 (初回起動時やリセット時に使用) ---
const DEFAULT_SETTINGS = {
  scriptId: "",
  deploymentId: "",
  aiModel: 'gemini-1.5-flash-latest' // AIモデルのデフォルト値を追加
};

let activePort = null;

// --- 接続リスナー ---
chrome.runtime.onConnect.addListener((port) => {
  console.assert(port.name === "generate-channel");
  activePort = port;

  port.onMessage.addListener((msg) => {
    if (msg.action === "generateSlidesWithAI") {
      handleGenerateNew(msg.prompt, msg.settings);
    } else if (msg.action === "regenerateWithDesign") {
      handleRegenerate(msg.settings);
    }
  });

  port.onDisconnect.addListener(() => {
    activePort = null;
  });
});

// --- メッセージリスナー (popup.jsからの同期的な要求に応える) ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getDefaultApiSettings') {
    sendResponse({
      scriptId: DEFAULT_SETTINGS.scriptId,
      deploymentId: DEFAULT_SETTINGS.deploymentId,
      aiModel: DEFAULT_SETTINGS.aiModel
    });
  }
  return true;
});

// --- 進捗をポップアップに送信するヘルパー関数 ---
function sendProgress(response) {
  if (activePort) {
    activePort.postMessage(response);
  }
}

// --- 機能: デザイン設定で0.gsの内容を書き換える ---
function createFile0Source(baseSource, settings) {
    let source = baseSource;
    if (settings) {
        if (settings.footerText) { source = source.replace(/const str_FOOTER_TEXT = `.*`;/, `const str_FOOTER_TEXT = \`${settings.footerText}\`;`); }
        if (settings.headerLogo) { source = source.replace(/const str_LOGOS_header= '.*'/, `const str_LOGOS_header= '${settings.headerLogo}'`); }
        if (settings.closingLogo) { source = source.replace(/const str_LOGOS_closing= '.*'/, `const str_LOGOS_closing= '${settings.closingLogo}'`); }
        if (settings.primaryColor) { source = source.replace(/const str_primary_color= '.*';/, `const str_primary_color= '${settings.primaryColor}';`); }
        if (settings.fontColor) { source = source.replace(/const str_text_primary= '.*';/, `const str_text_primary= '${settings.fontColor}';`); }
        if (settings.fontFamily) { source = source.replace(/const str_font_family= '.*';/, `const str_font_family= '${settings.fontFamily}';`); }
        if (settings.bgStartColor) { source = source.replace(/const str_bg_gradient_start_color= '.*';/, `const str_bg_gradient_start_color= '${settings.bgStartColor}';`); }
        if (settings.bgEndColor) { source = source.replace(/const str_bg_gradient_end_color= '.*';/, `const str_bg_gradient_end_color= '${settings.bgEndColor}';`); }
        if (settings.gradientDirection) { source = source.replace(/const str_GRADIENT_DIRECTION= '.*';/, `const str_GRADIENT_DIRECTION= '${settings.gradientDirection}';`); }
        const formatUrl = (url) => url ? `'${url}'` : 'null';
        if (settings.titleBg !== undefined) { source = source.replace(/const str_title_background_image_url= .*?;/, `const str_title_background_image_url= ${formatUrl(settings.titleBg)};`); }
        if (settings.contentBg !== undefined) { source = source.replace(/const str_content_background_image_url= .*?;/, `const str_content_background_image_url= ${formatUrl(settings.contentBg)};`); }
        if (settings.closingBg !== undefined) { source = source.replace(/const str_closing_background_image_url= .*?;/, `const str_closing_background_image_url= ${formatUrl(settings.closingBg)};`); }
      }
    return source;
}

/**
 * GASプロジェクトの更新とデプロイ、実行までを行う共通関数
 * @param {object} settings ユーザーが設定した値（scriptId, deploymentIdなど）
 * @param {object} payload GASのdoPostに送信するデータ（action, prompt, aiModelなど）
 */
async function processAndDeploy(settings, payload) {
  const startTime = new Date().getTime();
  try {
    sendProgress({ status: 'progress', message: 'GASプロジェクトを準備中...' });
    const token = await getAuthToken();

    // 拡張機能にバンドルされているGASファイルを取得
    const baseFile0Source = await fetch(chrome.runtime.getURL('0.gs')).then(res => res.text());
    const file1Source = await fetch(chrome.runtime.getURL('1.gs')).then(res => res.text());
    const file3Source = await fetch(chrome.runtime.getURL('3.gs')).then(res => res.text());
    
    // ユーザー設定を反映した0.gsを生成
    const file0Source = createFile0Source(baseFile0Source, settings);
    
    sendProgress({ status: 'progress', message: 'GASプロジェクトを更新中...' });
    // 2.gs(slideData)はGAS側で生成・管理するため、拡張機能からは空の内容を渡す
    const newSource = createProjectSource(file0Source, file1Source, "/* Managed by GAS side */", file3Source);
    await updateGasProject(settings.scriptId, token, newSource);

    sendProgress({ status: 'progress', message: '新バージョンを作成中...' });
    const versionResponse = await createNewVersion(settings.scriptId, token);
    const newVersionNumber = versionResponse.versionNumber;

    sendProgress({ status: 'progress', message: `デプロイを更新中 (v${newVersionNumber})...` });
    await updateDeployment(settings.scriptId, settings.deploymentId, token, newVersionNumber);

    sendProgress({ status: 'progress', message: 'スライドを生成しています...' });
    const WEB_APP_URL = `https://script.google.com/macros/s/${settings.deploymentId}/exec`;
    const result = await executeWebApp(WEB_APP_URL, token, payload);

    const endTime = new Date().getTime();
    const elapsedTimeInSeconds = (endTime - startTime) / 1000;
    
    sendProgress({ status: 'success', message:  result.message + `<br>[${elapsedTimeInSeconds.toFixed(2)} 秒]` });

  } catch (error) {
    console.error("【CRITICAL ERROR】:", error);
    // ユーザーに表示するエラーメッセージを汎用化
    let userMessage = error.message || '不明なエラーです。';
    if (error.message.includes('401')) {
        userMessage = '認証に失敗しました。再度お試しください。';
    } else if (error.message.includes('403')) {
        userMessage = 'アクセス権限がありません。Script IDやDeployment IDを確認してください。';
    }
    sendProgress({ status: 'error', message: userMessage });
  }
}

/**
 * 「全自動で生成」ボタンの処理
 * @param {string} userPrompt ユーザーが入力したプロンプト
 * @param {object} settings ユーザーが設定した値
 */
async function handleGenerateNew(userPrompt, settings) {
  const payload = {
    action: 'generate_new',
    prompt: userPrompt,
    aiModel: settings.aiModel // ユーザーが選択したAIモデルを渡す
  };
  await processAndDeploy(settings, payload);
}

/**
 * 「デザインを反映して再生成」ボタンの処理
 * @param {object} settings ユーザーが設定した値
 */
async function handleRegenerate(settings) {
  const payload = {
    action: 'regenerate_only',
    aiModel: settings.aiModel // 再生成時もモデル情報を渡す
  };
  await processAndDeploy(settings, payload);
}

// --- Google API 連携 補助関数群 ---

function getAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) { reject(chrome.runtime.lastError); } else { resolve(token); }
    });
  });
}

function createProjectSource(file0, file1, file2, file3) {
  const manifestContent = `{
    "timeZone": "Asia/Tokyo",
    "dependencies": {},
    "exceptionLogging": "STACKDRIVER",
    "runtimeVersion": "V8",
    "webapp": { "executeAs": "USER_DEPLOYING", "access": "MYSELF" },
    "oauthScopes": [
      "https://www.googleapis.com/auth/presentations",
      "https://www.googleapis.com/auth/script.projects",
      "https://www.googleapis.com/auth/script.deployments",
      "https://www.googleapis.com/auth/script.external_request",
      "https://www.googleapis.com/auth/drive.file"
    ]
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

async function aaaexecuteWebApp(url, token, payload) {
  const response = await fetch(url, {
    method: 'POST',
    cache: 'no-cache',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) { const errorText = await response.text(); throw new Error(`ウェブアプリ実行エラー: ステータス ${response.status} ${errorText}`); }
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


async function executeWebApp(url, token, payload) {
  const response = await fetch(url, {
    method: 'POST',
    cache: 'no-cache',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  // ★★★ ここからデバッグ用のコードを追加 ★★★
  const text = await response.text();
  console.log("--- GASからの生の応答 ---");
  console.log(text); // 生のテキストをコンソールに出力
  console.log("-----------------------");
  // ★★★ ここまでデバッグ用のコードを追加 ★★★

  if (!response.ok) { 
    // エラーの場合も、生のテキストをエラーメッセージに含める
    throw new Error(`ウェブアプリ実行エラー: ステータス ${response.status} ${text}`); 
  }
  
  try {
    const jsonResponse = JSON.parse(text); // textを再利用
    if (jsonResponse.logs && Array.isArray(jsonResponse.logs)) {
      console.groupCollapsed("📋 Google Apps Scriptからのログ");
      jsonResponse.logs.forEach(log => { console.log(log); sendProgress({ status: 'progress', message: log }); });
      console.groupEnd();
    }
    if (jsonResponse.status === 'error') { throw new Error(`GAS側でエラーが発生: ${jsonResponse.message}`); }
    return jsonResponse;
  } catch (e) {
    // 解析失敗時も、生のテキストをエラーメッセージに含める
    throw new Error(`ウェブアプリ応答の解析に失敗しました。GASからの応答: ${text}`);
  }
}