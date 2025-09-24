// background.js (2.gs連携バージョン・省略なし完成版)

// --- デフォルト設定 ---
const DEFAULT_SETTINGS = {
  scriptId: "",
  deploymentId: "",
  aiModel: 'gemini-2.5-flash-lite'
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

// --- メッセージリスナー (popup.js & 内部からの要求に応える) ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getDefaultApiSettings') {
    sendResponse({
      scriptId: DEFAULT_SETTINGS.scriptId,
      deploymentId: DEFAULT_SETTINGS.deploymentId,
      aiModel: DEFAULT_SETTINGS.aiModel
    });
    return true;
  }

  if (message.action === "revokeToken") {
    chrome.identity.getAuthToken({ interactive: false }, (currentToken) => {
      if (chrome.runtime.lastError) {
        console.warn("トークン取得試行時に想定内のエラー:", chrome.runtime.lastError.message);
        sendResponse({ success: true });
        return;
      }
      if (currentToken) {
        fetch('https://accounts.google.com/o/oauth2/revoke?token=' + currentToken)
          .then(() => {
            chrome.identity.removeCachedAuthToken({ token: currentToken }, () => {
              console.log("トークンが正常に削除されました。");
              sendResponse({ success: true });
            });
          });
      } else {
        console.log("削除対象のトークンキャッシュはありませんでした。");
        sendResponse({ success: true });
      }
    });
    return true;
  }
});

// --- 進捗をポップアップに送信するヘルパー関数 ---
function sendProgress(response) {
  if (activePort) {
    activePort.postMessage(response);
  }
}

// --- バリデーション用ヘルパー関数群 ---
function isValidHttpUrl(string) {
  if (!string) return false;
  let url;
  try { url = new URL(string); } catch (_) { return false; }
  return url.protocol === "http:" || url.protocol === "https:";
}
function isValidColorCode(string) {
  if (!string) return false;
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(string);
}
function escapeTemplateLiteral(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

// --- 機能: デザイン設定で0.gsの内容を書き換える ---
function test_createFile0Source(baseSource, settings) {
    let source = baseSource;
    if (settings) {
        const escapedText = JSON.stringify(settings.footerText || '');
        source = source.replace(/const str_FOOTER_TEXT = `.*`;/, `const str_FOOTER_TEXT = ${escapedText};`);
        if (isValidHttpUrl(settings.headerLogo)) { source = source.replace(/const str_LOGOS_header= '.*'/, `const str_LOGOS_header= '${settings.headerLogo}'`); }
        if (isValidHttpUrl(settings.closingLogo)) { source = source.replace(/const str_LOGOS_closing= '.*'/, `const str_LOGOS_closing= '${settings.closingLogo}'`); }
        if (isValidColorCode(settings.primaryColor)) { source = source.replace(/const str_primary_color= '.*';/, `const str_primary_color= '${settings.primaryColor}';`); }
        if (isValidColorCode(settings.fontColor)) { source = source.replace(/const str_text_primary= '.*';/, `const str_text_primary= '${settings.fontColor}';`); }
        if (isValidColorCode(settings.bgStartColor)) { source = source.replace(/const str_bg_gradient_start_color= '.*';/, `const str_bg_gradient_start_color= '${settings.bgStartColor}';`); }
        if (isValidColorCode(settings.bgEndColor)) { source = source.replace(/const str_bg_gradient_end_color= '.*';/, `const str_bg_gradient_end_color= '${settings.bgEndColor}';`); }
        if (settings.fontFamily) { source = source.replace(/const str_font_family= '.*';/, `const str_font_family= '${settings.fontFamily}';`); }
        if (settings.gradientDirection) { source = source.replace(/const str_GRADIENT_DIRECTION= '.*';/, `const str_GRADIENT_DIRECTION= '${settings.gradientDirection}';`); }
        const formatUrl = (url) => isValidHttpUrl(url) ? `'${url}'` : 'null';
        if (settings.titleBg !== undefined) { source = source.replace(/const str_title_background_image_url= .*?;/, `const str_title_background_image_url= ${formatUrl(settings.titleBg)};`); }
        if (settings.contentBg !== undefined) { source = source.replace(/const str_content_background_image_url= .*?;/, `const str_content_background_image_url= ${formatUrl(settings.contentBg)};`); }
        if (settings.closingBg !== undefined) { source = source.replace(/const str_closing_background_image_url= .*?;/, `const str_closing_background_image_url= ${formatUrl(settings.closingBg)};`); }
    }
    return source;
}

function createFile0Source(baseSource, settings) {
  let source = baseSource;
  if (settings) {
      // ★修正点: JSON.stringifyを使用して安全に文字列リテラルを生成する
      const footerText = JSON.stringify(settings.footerText || '');
      const headerLogo = JSON.stringify(isValidHttpUrl(settings.headerLogo) ? settings.headerLogo : '');
      const closingLogo = JSON.stringify(isValidHttpUrl(settings.closingLogo) ? settings.closingLogo : '');
      const primaryColor = JSON.stringify(isValidColorCode(settings.primaryColor) ? settings.primaryColor : '#4285F4');
      const fontColor = JSON.stringify(isValidColorCode(settings.fontColor) ? settings.fontColor : '#333333');
      const bgStartColor = JSON.stringify(isValidColorCode(settings.bgStartColor) ? settings.bgStartColor : '#FFFFFF');
      const bgEndColor = JSON.stringify(isValidColorCode(settings.bgEndColor) ? settings.bgEndColor : '#00FFFF');
      const fontFamily = JSON.stringify(settings.fontFamily || 'Arial');
      const gradientDirection = JSON.stringify(settings.gradientDirection || 'vertical');
      
      // isValidHttpUrlの結果に基づいて 'null' (文字列ではなく予約語) またはURL文字列を生成する
      const titleBg = isValidHttpUrl(settings.titleBg) ? JSON.stringify(settings.titleBg) : 'null';
      const contentBg = isValidHttpUrl(settings.contentBg) ? JSON.stringify(settings.contentBg) : 'null';
      const closingBg = isValidHttpUrl(settings.closingBg) ? JSON.stringify(settings.closingBg) : 'null';

      // ★修正点: 置換処理を修正後の変数で行う
      source = source.replace(/const str_FOOTER_TEXT = `.*`;/, `const str_FOOTER_TEXT = ${footerText};`);
      source = source.replace(/const str_LOGOS_header= '.*'/, `const str_LOGOS_header= ${headerLogo}`);
      source = source.replace(/const str_LOGOS_closing= '.*'/, `const str_LOGOS_closing= ${closingLogo}`);
      source = source.replace(/const str_primary_color= '.*';/, `const str_primary_color= ${primaryColor};`);
      source = source.replace(/const str_text_primary= '.*';/, `const str_text_primary= ${fontColor};`);
      source = source.replace(/const str_bg_gradient_start_color= '.*';/, `const str_bg_gradient_start_color= ${bgStartColor};`);
      source = source.replace(/const str_bg_gradient_end_color= '.*';/, `const str_bg_gradient_end_color= ${bgEndColor};`);
      source = source.replace(/const str_font_family= '.*';/, `const str_font_family= ${fontFamily};`);
      source = source.replace(/const str_GRADIENT_DIRECTION= '.*';/, `const str_GRADIENT_DIRECTION= ${gradientDirection};`);
      source = source.replace(/const str_title_background_image_url= .*?;/, `const str_title_background_image_url= ${titleBg};`);
      source = source.replace(/const str_content_background_image_url= .*?;/, `const str_content_background_image_url= ${contentBg};`);
      source = source.replace(/const str_closing_background_image_url= .*?;/, `const str_closing_background_image_url= ${closingBg};`);
  }
  return source;
}

// --- メインの処理フロー関数 ---

/**
 * 「全自動で生成」ボタンの処理
 */
/**
 * 「全自動で生成」ボタンの処理
 */
async function handleGenerateNew(userPrompt, settings) {
  const startTime = new Date().getTime();
  try {
    sendProgress({ status: 'progress', message: 'GASプロジェクトを準備中...' });
    const token = await getAuthToken();

    // ===================================================================
    // ステップ1: デザイン設定を反映したプロジェクトを一度デプロイする
    // ===================================================================
    const baseFile0Source = await fetch(chrome.runtime.getURL('0.gs')).then(res => res.text());
    const file1Source = await fetch(chrome.runtime.getURL('1.gs')).then(res => res.text());
    const file3Source = await fetch(chrome.runtime.getURL('3.gs')).then(res => res.text());
    
    const file0Source = createFile0Source(baseFile0Source, settings);
    
    // この時点では2.gsは空か、古い内容のままで良い
    const initialSlideData = "const slideData = [];";
    
    sendProgress({ status: 'progress', message: 'GASプロジェクトを更新中(1/2)...' });
    let newSource = createProjectSource(file0Source, file1Source, initialSlideData, file3Source);
    await updateGasProject(settings.scriptId, token, newSource);

    sendProgress({ status: 'progress', message: '新バージョンを作成中(1/2)...' });
    let versionResponse = await createNewVersion(settings.scriptId, token);
    let newVersionNumber = versionResponse.versionNumber;

    sendProgress({ status: 'progress', message: `デプロイを更新中(1/2) v${newVersionNumber}...` });
    await updateDeployment(settings.scriptId, settings.deploymentId, token, newVersionNumber);

    // ===================================================================
    // ステップ2: 更新されたGASを呼び出し、AIにslideDataを生成させる
    // ===================================================================
    sendProgress({ status: 'progress', message: 'AIが構成案を作成中...'});
    const WEB_APP_URL = `https://script.google.com/macros/s/${settings.deploymentId}/exec`;
    const payload = {
      action: 'get_slide_data',
      prompt: userPrompt,
      aiModel: settings.aiModel
    };
    const response = await executeWebApp(WEB_APP_URL, token, payload);
    let slideDataString = response.slideDataString;

    if (!slideDataString) {
      throw new Error("AIからのslideDataの取得に失敗しました。");
    }

    // 1. 前後のMarkdownコードフェンスを削除
    slideDataString = slideDataString.replace(/^```javascript\s*/, '').replace(/```\s*$/, '');

    // 2. 念のため、前後の空白を削除
    slideDataString = slideDataString.trim();

    // 応答文字列から `const slideData = [...]` の部分だけを安全に抽出する
    const match = slideDataString.match(/const slideData\s*=\s*(\[[\s\S]*\]);?/);
    if (!match || !match[1]) {
        throw new Error("AIが生成したslideDataの形式が不正です (配列が見つかりません)。");
    }
    // 抽出した配列部分だけを使い、再構成する
    const sanitizedSlideDataString = `const slideData = ${match[1]};`;

    // ===================================================================
    // ステップ3: AIが生成したslideData(2.gs)でプロジェクトを再度更新・実行
    // ===================================================================
    sendProgress({ status: 'progress', message: 'GASプロジェクトを更新中(2/2)...' });
    newSource = createProjectSource(file0Source, file1Source, sanitizedSlideDataString, file3Source);
    await updateGasProject(settings.scriptId, token, newSource);

    sendProgress({ status: 'progress', message: '新バージョンを作成中(2/2)...' });
    versionResponse = await createNewVersion(settings.scriptId, token);
    newVersionNumber = versionResponse.versionNumber;

    sendProgress({ status: 'progress', message: `デプロイを更新中(2/2) v${newVersionNumber}...` });
    await updateDeployment(settings.scriptId, settings.deploymentId, token, newVersionNumber);
    
    sendProgress({ status: 'progress', message: 'スライドを生成しています...' });
    const finalPayload = { action: 'generate_slides' };
    const result = await executeWebApp(WEB_APP_URL, token, finalPayload);
    
    if (result.status === 'error') {
      throw new Error(`GAS_ERROR: ${result.message}`);
    }

    const endTime = new Date().getTime();
    const elapsedTimeInSeconds = (endTime - startTime) / 1000;
    sendProgress({ status: 'success', message:  result.message + `<br>[${elapsedTimeInSeconds.toFixed(2)} 秒]` });

  } catch (error) {
    handleError(error);
  }
}

/**
 * 「デザインを反映して再生成」ボタンの処理
 */
async function handleRegenerate(settings) {
  const startTime = new Date().getTime();
  try {
    sendProgress({ status: 'progress', message: 'GASプロジェクトを準備中...' });
    const token = await getAuthToken();

    // 1. 既存の2.gsの内容を読み出す
    const slideDataString = await getProjectFileContent(settings.scriptId, token, '2');

    // 2. 新しいデザインと既存の2.gsでプロジェクトを更新
    const baseFile0Source = await fetch(chrome.runtime.getURL('0.gs')).then(res => res.text());
    const file1Source = await fetch(chrome.runtime.getURL('1.gs')).then(res => res.text());
    const file3Source = await fetch(chrome.runtime.getURL('3.gs')).then(res => res.text());
    const file0Source = createFile0Source(baseFile0Source, settings);
    
    sendProgress({ status: 'progress', message: 'GASプロジェクトを更新中...' });
    const newSource = createProjectSource(file0Source, file1Source, slideDataString, file3Source);
    await updateGasProject(settings.scriptId, token, newSource);

    sendProgress({ status: 'progress', message: '新バージョンを作成中...' });
    const versionResponse = await createNewVersion(settings.scriptId, token);
    const newVersionNumber = versionResponse.versionNumber;

    sendProgress({ status: 'progress', message: `デプロイを更新中 v${newVersionNumber}...` });
    await updateDeployment(settings.scriptId, settings.deploymentId, token, newVersionNumber);
    
    // 3. スライド生成を実行
    sendProgress({ status: 'progress', message: 'スライドを再生成しています...' });
    const WEB_APP_URL = `https://script.google.com/macros/s/${settings.deploymentId}/exec`;
    const finalPayload = { action: 'generate_slides' };
    const result = await executeWebApp(WEB_APP_URL, token, finalPayload);

    if (result.status === 'error') {
      throw new Error(`GAS_ERROR: ${result.message}`);
    }
    
    const endTime = new Date().getTime();
    const elapsedTimeInSeconds = (endTime - startTime) / 1000;
    sendProgress({ status: 'success', message:  result.message + `<br>[${elapsedTimeInSeconds.toFixed(2)} 秒]` });

  } catch (error) {
    handleError(error);
  }
}

/**
 * プロジェクトを更新し、スライド生成を実行する共通関数
 */
async function updateAndExecuteProject(settings, token, slideDataString, startTime) {
    sendProgress({ status: 'progress', message: 'GASプロジェクトの準備中...' });

    const baseFile0Source = await fetch(chrome.runtime.getURL('0.gs')).then(res => res.text());
    const file1Source = await fetch(chrome.runtime.getURL('1.gs')).then(res => res.text());
    const file3Source = await fetch(chrome.runtime.getURL('3.gs')).then(res => res.text());
    
    const file0Source = createFile0Source(baseFile0Source, settings);
    
    sendProgress({ status: 'progress', message: 'GASプロジェクトを更新中...' });
    const newSource = createProjectSource(file0Source, file1Source, slideDataString, file3Source);
    await updateGasProject(settings.scriptId, token, newSource);

    sendProgress({ status: 'progress', message: '新バージョンを作成中...' });
    const versionResponse = await createNewVersion(settings.scriptId, token);
    const newVersionNumber = versionResponse.versionNumber;

    sendProgress({ status: 'progress', message: `デプロイを更新中 (v${newVersionNumber})...` });
    await updateDeployment(settings.scriptId, settings.deploymentId, token, newVersionNumber);

    sendProgress({ status: 'progress', message: 'スライドを生成しています...' });
    const WEB_APP_URL = `https://script.google.com/macros/s/${settings.deploymentId}/exec`;
    const finalPayload = { action: 'generate_slides' };
    const result = await executeWebApp(WEB_APP_URL, token, finalPayload);
    
    if (result.status === 'error') {
      throw new Error(`GAS_ERROR: ${result.message}`);
    }

    const endTime = new Date().getTime();
    const elapsedTimeInSeconds = (endTime - startTime) / 1000;
    sendProgress({ status: 'success', message:  result.message + `<br>[${elapsedTimeInSeconds.toFixed(2)} 秒]` });
}

/**
 * 共通エラーハンドリング関数
 */
function handleError(error) {
    console.error("【CRITICAL ERROR】:", error);
    
    let userMessage = '不明なエラーが発生しました。<br>開発者コンソール（F12）で詳細を確認してください。';
    const errorMessage = error.message || '';

    if (errorMessage.startsWith('GAS_ERROR:')) {
        const gasErrorMessage = errorMessage.replace('GAS_ERROR: ', '');
        userMessage = `エラー: ${gasErrorMessage}`;
        if (gasErrorMessage.includes('APIキー設定に問題があります')) {
            userMessage += '<br><br><b>対処法:</b><br>GASプロジェクトの[カスタム設定] > [設定] > [Gemini APIキー] から正しいキーを設定してください。';
        } else if (gasErrorMessage.includes('AIが不正な形式')) {
            userMessage += '<br><br><b>対処法:</b><br>プロンプトを少し変更して再度お試しください。';
        } else if (gasErrorMessage.includes('セキュリティ検証に失敗')) {
            userMessage += '<br><br><b>対処法:</b><br>プロンプトに不正な文字が含まれている可能性があります。内容を確認してください。';
        }
    } else if (errorMessage.includes('401') || errorMessage.includes('invalid authentication credentials')) {
        userMessage = 'Googleアカウントの認証に失敗しました。<br><br><b>対処法:</b><br>API・GAS設定の「認証をリセット」ボタンを押してから、再度お試しください。';
    } else if (errorMessage.includes('403') || errorMessage.includes('caller does not have permission')) {
        userMessage = 'アクセス権限がありません。<br><br><b>対処法:</b><br>Script IDやDeployment IDが正しいか、共有設定が適切か確認してください。';
    } else if (errorMessage.includes('JSON解析に失敗')) {
        userMessage = 'GASからの応答が予期せぬ形式でした。ページを再読み込みするか、開発者にご連絡ください。';
    } else if (errorMessage.includes('Script ID not found')) {
        userMessage = '指定されたScript IDが見つかりません。';
    }
    
    sendProgress({ status: 'error', message: userMessage });
}

// --- Google API 連携 補助関数群 ---

async function getProjectFileContent(scriptId, token, fileName) {
  sendProgress({ status: 'progress', message: `既存の構成(${fileName}.gs)を取得中...`});
  const url = `https://script.googleapis.com/v1/projects/${scriptId}/content`;
  const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!response.ok) {
    if (response.status === 404) throw new Error(`Script IDが見つかりません。`);
    throw new Error(`プロジェクト内容の取得に失敗: ${response.statusText}`);
  }
  const projectContent = await response.json();
  const targetFile = projectContent.files.find(file => file.name === fileName);

  if (!targetFile || !targetFile.source) {
    return "const slideData = [];";
  }
  return targetFile.source;
}

function getAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) { reject(chrome.runtime.lastError); } else { resolve(token); }
    });
  });
}

function createProjectSource(file0, file1, slideDataString, file3) {
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
      { name: "2", type: "SERVER_JS", source: slideDataString },
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

  const text = await response.text();
  console.log("--- GASからの生の応答 ---", text);

  if (!response.ok) { 
    throw new Error(`ウェブアプリ実行エラー: ステータス ${response.status}. 応答: ${text}`); 
  }
  
  try {
    const jsonResponse = JSON.parse(text);
    if (jsonResponse.logs && Array.isArray(jsonResponse.logs)) {
      console.groupCollapsed("📋 Google Apps Scriptからのログ");
      jsonResponse.logs.forEach(log => console.log(log));
      console.groupEnd();
    }
    return jsonResponse; 
  } catch (e) {
    throw new Error(`ウェブアプリ応答のJSON解析に失敗しました。GASからの応答: ${text}`);
  }
}