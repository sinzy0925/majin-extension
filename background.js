// background.js

// --- デフォルト設定 (初回起動時やリセット時に使用) ---
const DEFAULT_SETTINGS = {
  scriptId: "",
  deploymentId: "",
  apiKey: "",
  aiModel: 'gemini-2.5-flash-lite'
};

//const SCRIPT_ID = "1YUAmadVwnkM44Uld694CgPgmmkEFiSNmjklnhosfW7P6G7D5uAgv0R5o";
let activePort = null;

// --- 接続リスナー ---
chrome.runtime.onConnect.addListener((port) => {
  console.assert(port.name === "generate-channel");
  activePort = port;

  port.onMessage.addListener((msg) => {
    if (msg.action === "generateSlidesWithAI") {
      generateSlidesWithAI(msg.prompt, msg.settings);
    } else if (msg.action === "regenerateWithDesign") { // ▼▼▼ 追加 ▼▼▼
      regenerateWithDesign(msg.settings);
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
      apiKey: DEFAULT_SETTINGS.apiKey,
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
        const formatUrl = (url) => url ? `"${url}"` : 'null';
        if (settings.titleBg !== undefined) { source = source.replace(/const str_title_background_image_url= .*?;/, `const str_title_background_image_url= ${formatUrl(settings.titleBg)};`); }
        if (settings.contentBg !== undefined) { source = source.replace(/const str_content_background_image_url= .*?;/, `const str_content_background_image_url= ${formatUrl(settings.contentBg)};`); }
        if (settings.closingBg !== undefined) { source = source.replace(/const str_closing_background_image_url= .*?;/, `const str_closing_background_image_url= ${formatUrl(settings.closingBg)};`); }
      }
    return source;
}

// --- メインのスライド生成関数 ---
async function generateSlidesWithAI(userPrompt, settings) {
  const startTime = new Date().getTime();
  try {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${settings.aiModel}:generateContent?key=${settings.apiKey}`;

    sendProgress({ status: 'progress', message: 'AIがスライド構成案を作成中...'});
    const slideDataString = await getSlideDataFromAI(userPrompt, API_URL);
    
    sendProgress({ status: 'progress', message: 'GASプロジェクトを準備中...'});
    const token = await getAuthToken();

    const baseFile0Source = await fetch(chrome.runtime.getURL('0.gs')).then(res => res.text());
    const file0Source = createFile0Source(baseFile0Source, settings);
    
    const file1Source = await fetch(chrome.runtime.getURL('1.gs')).then(res => res.text());
    const file3Source = await fetch(chrome.runtime.getURL('3.gs')).then(res => res.text());
    
    sendProgress({ status: 'progress', message: 'GASプロジェクトを更新中...'});
    const newSource = createProjectSource(file0Source, file1Source, slideDataString, file3Source);
    //await updateGasProject(SCRIPT_ID, token, newSource);
    await updateGasProject(settings.scriptId, token, newSource);

    sendProgress({ status: 'progress', message: '新バージョンを作成中...'});
    //const versionResponse = await createNewVersion(SCRIPT_ID, token);
    const versionResponse = await createNewVersion(settings.scriptId, token);
    const newVersionNumber = versionResponse.versionNumber;

    sendProgress({ status: 'progress', message: `デプロイを更新中 (v${newVersionNumber})...` });
    //await updateDeployment(SCRIPT_ID, settings.deploymentId, token, newVersionNumber);
    await updateDeployment(settings.scriptId, settings.deploymentId, token, newVersionNumber);

    sendProgress({ status: 'progress', message: 'スライドを生成しています...'});
    const WEB_APP_URL = `https://script.google.com/macros/s/${settings.deploymentId}/exec`;
    const result = await executeWebApp(WEB_APP_URL);

    const endTime = new Date().getTime();
    const elapsedTimeInSeconds = (endTime - startTime) / 1000;
    
    sendProgress({ status: 'success', message:  result.message + `<br>[${elapsedTimeInSeconds.toFixed(2)} 秒]` });

  } catch (error) {
    console.error("【CRITICAL ERROR】:", error);
    sendProgress({ status: 'error', message: error.message || '不明なエラーです。' });
  }
}

// --- ▼▼▼ 新しい関数 ▼▼▼ ---
// --- デザインのみ反映して再生成する関数 ---

async function regenerateWithDesign(settings) {
  const startTime = new Date().getTime();

    try {
        sendProgress({ status: 'progress', message: 'デザイン反映の準備を開始...'});
        const token = await getAuthToken();

        sendProgress({ status: 'progress', message: '現在のスライド構成(2.gs)を取得中...'});
        //const currentProject = await getGasProjectContent(SCRIPT_ID, token);
        const currentProject = await getGasProjectContent(settings.scriptId, token);
        const slideDataString = currentProject.files.find(f => f.name === '2')?.source;

        if (!slideDataString) {
            throw new Error("既存のスライド構成(2.gs)が見つかりません。先に一度「全自動で生成」を実行してください。");
        }

        const baseFile0Source = await fetch(chrome.runtime.getURL('0.gs')).then(res => res.text());
        const file0Source = createFile0Source(baseFile0Source, settings);

        const file1Source = await fetch(chrome.runtime.getURL('1.gs')).then(res => res.text());
        const file3Source = await fetch(chrome.runtime.getURL('3.gs')).then(res => res.text());
        
        sendProgress({ status: 'progress', message: 'GASプロジェクトを更新中...'});
        const newSource = createProjectSource(file0Source, file1Source, slideDataString, file3Source);
        await updateGasProject(settings.scriptId, token, newSource);

        sendProgress({ status: 'progress', message: '新バージョンを作成中...'});
        const versionResponse = await createNewVersion(settings.scriptId, token);
        const newVersionNumber = versionResponse.versionNumber;

        sendProgress({ status: 'progress', message: `デプロイを更新中 (v${newVersionNumber})...` });
        await updateDeployment(settings.scriptId, settings.deploymentId, token, newVersionNumber);

        sendProgress({ status: 'progress', message: 'スライドを再生成しています...'});
        const WEB_APP_URL = `https://script.google.com/macros/s/${settings.deploymentId}/exec`;
        const result = await executeWebApp(WEB_APP_URL);
        
        //sendProgress({ status: 'success', message: '完了: デザインが反映されました。' });
        const endTime = new Date().getTime();
        const elapsedTimeInSeconds = (endTime - startTime) / 1000;
        
        sendProgress({ status: 'success', message:  '完了: デザインが反映されました。' + `<br>[${elapsedTimeInSeconds.toFixed(2)} 秒]` });
    
    } catch (error) {
        console.error("【CRITICAL ERROR in regenerate】:", error);
        sendProgress({ status: 'error', message: error.message || '不明なエラーです。' });
    }
}
// --- ▲▲▲ 新しい関数ここまで ▲▲▲ ---


// -----------------------------------------------------------------------------
// --- 補助関数群 (変更なしのものは省略) ---
// -----------------------------------------------------------------------------

async function getSlideDataFromAI(userPrompt, apiUrl) {
  const systemPrompt = await fetch(chrome.runtime.getURL('system_prompt.txt')).then(res => res.text());
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(apiUrl, {
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
    if (!data.candidates || data.candidates.length === 0) { throw new Error("AIからの応答がありませんでした。"); }
    let rawText = data.candidates[0].content.parts[0].text;
    rawText = rawText.replace(/^```javascript\s*/, '').replace(/```\s*$/, '');
    return rawText.trim();
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
  const manifestContent = `{
    "timeZone": "Asia/Tokyo",
    "dependencies": {},
    "exceptionLogging": "STACKDRIVER",
    "runtimeVersion": "V8",
    "webapp": { "executeAs": "USER_DEPLOYING", "access": "ANYONE_ANONYMOUS" },
    "oauthScopes": [
      "https://www.googleapis.com/auth/presentations",
      "https://www.googleapis.com/auth/drive.file"
    ]
  }`;  return {
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