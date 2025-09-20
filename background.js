// background.js

// --- デフォルト設定 (初回起動時やリセット時に使用) ---
const DEFAULT_SETTINGS = {
  deploymentId: "AKfycbySvStV0tawHEK6ZX9JGlngVMd_OXe0ntJM7FbVzpCRCJ8tRMDJIp1fJKXYX78o1QO-",
  apiKey: "",
  aiModel: 'gemini-2.5-flash'
};

let activePort = null;

// --- 接続リスナー ---
chrome.runtime.onConnect.addListener((port) => {
  console.assert(port.name === "generate-channel");
  activePort = port;

  port.onMessage.addListener((msg) => {
    if (msg.action === "generateSlidesWithAI") {
      // popup.jsから渡された prompt と settings を受け取る
      generateSlidesWithAI(msg.prompt, msg.settings);
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
      deploymentId: DEFAULT_SETTINGS.deploymentId,
      apiKey: DEFAULT_SETTINGS.apiKey,
      aiModel: DEFAULT_SETTINGS.aiModel
    });
  }
  return true; // 非同期応答のためにtrueを返す
});


// --- 進捗をポップアップに送信するヘルパー関数 ---
function sendProgress(response) {
  if (activePort) {
    activePort.postMessage(response);
  }
}

// --- メインのスライド生成関数 ---
async function generateSlidesWithAI(userPrompt, settings) {
  try {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${settings.aiModel}:generateContent?key=${settings.apiKey}`;

    sendProgress({ status: 'progress', message: 'AIがスライド構成案を作成中...'});
    const slideDataString = await getSlideDataFromAI(userPrompt, API_URL);
    
    sendProgress({ status: 'progress', message: 'GASプロジェクトを準備中...'});
    const token = await getAuthToken();

    let file0Source = await fetch(chrome.runtime.getURL('0.gs')).then(res => res.text());
    
    // デザイン設定で0.gsを書き換える
    if (settings) {
      if (settings.footerText) { file0Source = file0Source.replace(/const str_FOOTER_TEXT = `.*`;/, `const str_FOOTER_TEXT = \`${settings.footerText}\`;`); }
      if (settings.headerLogo) { file0Source = file0Source.replace(/const str_LOGOS_header= '.*'/, `const str_LOGOS_header= '${settings.headerLogo}'`); }
      if (settings.closingLogo) { file0Source = file0Source.replace(/const str_LOGOS_closing= '.*'/, `const str_LOGOS_closing= '${settings.closingLogo}'`); }
      if (settings.primaryColor) { file0Source = file0Source.replace(/const str_primary_color= '.*';/, `const str_primary_color= '${settings.primaryColor}';`); }
      const formatUrl = (url) => url ? `"${url}"` : 'null';
      if (settings.titleBg !== undefined) { file0Source = file0Source.replace(/const str_title_background_image_url= .*?;/, `const str_title_background_image_url= ${formatUrl(settings.titleBg)};`); }
      if (settings.contentBg !== undefined) { file0Source = file0Source.replace(/const str_content_background_image_url= .*?;/, `const str_content_background_image_url= ${formatUrl(settings.contentBg)};`); }
      if (settings.closingBg !== undefined) { file0Source = file0Source.replace(/const str_closing_background_image_url= .*?;/, `const str_closing_background_image_url= ${formatUrl(settings.closingBg)};`); }
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
    await updateDeployment(SCRIPT_ID, settings.deploymentId, token, newVersionNumber);

    sendProgress({ status: 'progress', message: 'スライドを生成しています...'});
    const WEB_APP_URL = `https://script.google.com/macros/s/${settings.deploymentId}/exec`;
    const result = await executeWebApp(WEB_APP_URL);
    
    sendProgress({ status: 'success', message: '完了: ' + result.message });

  } catch (error) {
    console.error("【CRITICAL ERROR】:", error);
    sendProgress({ status: 'error', message: error.message || '不明なエラーです。' });
  }
}


// -----------------------------------------------------------------------------
// --- 補助関数群 (変更なしの部分は省略) ---
// -----------------------------------------------------------------------------

async function getSlideDataFromAI(userPrompt, apiUrl) {
  const systemPrompt = await fetch(chrome.runtime.getURL('system_prompt.txt')).then(res => res.text());
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(apiUrl, { // 引数で受け取ったURLを使用
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