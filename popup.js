// popup.js
document.addEventListener('DOMContentLoaded', () => {
  // --- DOM要素の取得 ---
  const userPrompt = document.getElementById('user-prompt');
  const statusMessage = document.getElementById('status-message');
  const generateBtn = document.getElementById('generate-button');
  const regenerateBtn = document.getElementById('regenerate-button');
  
  const designInputs = {
    footerText: document.getElementById('footer-text'),
    headerLogo: document.getElementById('header-logo'),
    closingLogo: document.getElementById('closing-logo'),
    titleBg: document.getElementById('title-bg'),
    contentBg: document.getElementById('content-bg'),
    closingBg: document.getElementById('closing-bg'),
    primaryColor: document.getElementById('primary-color'),
    fontColor: document.getElementById('font-color'),
    fontFamily: document.getElementById('font-family'),
    bgStartColor: document.getElementById('bg-gradient-start-color'),
    bgEndColor: document.getElementById('bg-gradient-end-color'),
  };

  const apiInputs = {
    deploymentId: document.getElementById('deployment-id'),
    //apiKey: document.getElementById('api-key'),
    aiModel: document.getElementById('ai-model'),
    scriptId: document.getElementById('script-id'),
  };
  const overwriteConfirm = document.getElementById('overwrite-confirm'); // ★ チェックボックスを取得

  const gradientDirectionRadios = document.querySelectorAll('input[name="gradient-direction"]');

  const saveBtn = document.getElementById('save-settings-button');
  const resetBtn = document.getElementById('reset-settings-button');
  const feedbackMessage = document.getElementById('feedback-message');
  
  const collapsible1 = document.querySelector('.collapsible1');
  const collapsible1Content = document.querySelector('.collapsible1-content');
  const collapsible2 = document.querySelector('.collapsible2');
  const collapsible2Content = document.querySelector('.collapsible2-content');
  const collapsible3 = document.querySelector('.collapsible3');
  const collapsible3Content = document.querySelector('.collapsible3-content');
  const collapsible4 = document.querySelector('.collapsible4');
  const collapsible4Content = document.querySelector('.collapsible4-content');

  const SETTINGS_KEY = 'userAppSettings';
  let port = null;

  // --- 機能: 折りたたみメニューの制御 ---
  collapsible1.addEventListener('click', () => {
    const isExpanded = collapsible1.classList.toggle('active');
    collapsible1Content.style.display = isExpanded ? 'block' : 'none';
    collapsible1.textContent = isExpanded ? '▲ API・GAS設定 (必須)' : '▼ API・GAS設定 (必須)';
  });

  collapsible2.addEventListener('click', () => {
    const isExpanded = collapsible2.classList.toggle('active');
    collapsible2Content.style.display = isExpanded ? 'block' : 'none';
    collapsible2.textContent = isExpanded ? '▲ ロゴ・フッターテキスト設定' : '▼ ロゴ・フッターテキスト設定';
  });

  collapsible3.addEventListener('click', () => {
    const isExpanded = collapsible3.classList.toggle('active');
    collapsible3Content.style.display = isExpanded ? 'block' : 'none';
    collapsible3.textContent = isExpanded ? '▲ 背景画像設定' : '▼ 背景画像設定';
  });

  collapsible4.addEventListener('click', () => {
    const isExpanded = collapsible4.classList.toggle('active');
    collapsible4Content.style.display = isExpanded ? 'block' : 'none';
    collapsible4.textContent = isExpanded ? '▲ フォント・カラー設定' : '▼ フォント・カラー設定';
  });

  function aaaashowFeedback(message, isError = false) {
    feedbackMessage.textContent = message;
    feedbackMessage.style.color = isError ? '#D93025' : '#0F9D58';
    setTimeout(() => { feedbackMessage.textContent = ''; }, 4000);
  }

  // --- 機能: フィードバックメッセージを表示 ---
  function showFeedback(message, isError = false) {
    // 表示先を statusMessage に変更
    statusMessage.textContent = message;
    
    // メッセージの種類に応じてスタイルを一時的に変更
    statusMessage.style.color = isError ? '#D93025' : '#0F9D58';
    statusMessage.style.backgroundColor = isError ? '#FCE8E6' : '#E6F4EA'; // 赤系 or 緑系の背景色
  
    // 4秒後にメッセージとスタイルを元に戻す
    setTimeout(() => {
      statusMessage.textContent = '';
      statusMessage.style.color = '#333'; // 元の文字色
      statusMessage.style.backgroundColor = '#e8f0fe'; // 元の背景色
    }, 4000);
  }

  // --- 機能: デフォルト設定の取得 ---
  async function getDefaultSettings() {
    const designDefaults = await (async () => {
      try {
        const res = await fetch(chrome.runtime.getURL('0.gs'));
        const text = await res.text();
        return {
          footerText: (text.match(/const str_FOOTER_TEXT = `([^`]+)`/) || [])[1]?.replace('${new Date().getFullYear()}', new Date().getFullYear()) || '',
          headerLogo: (text.match(/const str_LOGOS_header= '([^']+)'/) || [])[1] || '',
          closingLogo: (text.match(/const str_LOGOS_closing= '([^']+)'/) || [])[1] || '',
          primaryColor: (text.match(/const str_primary_color= '([^']+)';/) || [])[1] || '#4285F4',
          fontColor: (text.match(/const str_text_primary= '([^']+)';/) || [])[1] || '#333333',
          fontFamily: (text.match(/const str_font_family= '([^']+)';/) || [])[1] || 'Arial',
          bgStartColor: (text.match(/const str_bg_gradient_start_color= '([^']+)';/) || [])[1] || '#4285F4',
          bgEndColor: (text.match(/const str_bg_gradient_end_color= '([^']+)';/) || [])[1] || '#4285F4',
          titleBg: (text.match(/const str_title_background_image_url= (.*?);/) || [])[1]?.replace(/["']/g, '').replace('null', '') || '',
          contentBg: (text.match(/const str_content_background_image_url= (.*?);/) || [])[1]?.replace(/["']/g, '').replace('null', '') || '',
          closingBg: (text.match(/const str_closing_background_image_url= (.*?);/) || [])[1]?.replace(/["']/g, '').replace('null', '') || ''
        };
      } catch (e) { return {}; }
    })();
    const apiDefaults = await chrome.runtime.sendMessage({ action: "getDefaultApiSettings" });
    return { ...designDefaults, ...apiDefaults };
  }

  // --- 機能: 設定オブジェクトをフォームに反映 ---
  function applySettingsToForm(settings) {
    if (!settings) return;
    Object.keys(designInputs).forEach(key => { designInputs[key].value = settings[key] || ''; });
    Object.keys(apiInputs).forEach(key => { apiInputs[key].value = settings[key] || ''; });
  }
  
  // --- 機能: 現在のフォームの内容から設定オブジェクトを取得 ---
  function getSettingsFromForm() {
    const settings = {};
    Object.keys(designInputs).forEach(key => { settings[key] = designInputs[key].value.trim(); });
    Object.keys(apiInputs).forEach(key => { settings[key] = apiInputs[key].value.trim(); });
    // ラジオボタンの値を取得
    settings.gradientDirection = document.querySelector('input[name="gradient-direction"]:checked').value;    return settings;
  }

  // --- メインの読み込み処理 ---
  async function loadSettings() {
    const saved = (await chrome.storage.local.get([SETTINGS_KEY]))[SETTINGS_KEY];
    if (saved && Object.keys(saved).length > 0) {
      applySettingsToForm(saved);
    } else {
      const defaults = await getDefaultSettings();
      applySettingsToForm(defaults);
    }
  }

  loadSettings();

  // --- イベントリスナー: 保存ボタン ---
  saveBtn.addEventListener('click', () => {
    const settingsToSave = getSettingsFromForm();
    chrome.storage.local.set({ [SETTINGS_KEY]: settingsToSave }, () => {
      showFeedback('✓ 設定を保存しました');
    });
  });

  // --- イベントリスナー: リセットボタン ---
  resetBtn.addEventListener('click', () => {
    chrome.storage.local.remove([SETTINGS_KEY], async () => {
      const defaults = await getDefaultSettings();
      applySettingsToForm(defaults);
      showFeedback('設定をリセットしました');
    });
  });

  // --- 機能: ボタンを無効化し、ポート接続を準備する共通関数 ---
  function startProcess(action, payload) {
    const allSettings = getSettingsFromForm();
    
    // 必須項目チェック
    if (!allSettings.scriptId || !allSettings.deploymentId || !allSettings.aiModel) {// || !allSettings.apiKey) {
      statusMessage.textContent = "API・連携設定の必須項目を入力してください。";
      if (!collapsible.classList.contains('active')) {
        collapsible.click();
      }
      return;
    }
    
    if (!overwriteConfirm.checked) {
      statusMessage.textContent = "プロジェクトの上書き許可にチェックを入れてください。";
      // API設定セクションが開いていなければ開く
      if (!collapsible1.classList.contains('active')) {
        collapsible1.click();
      }
      return;
    }

    if (action === 'generateSlidesWithAI' && !payload.prompt.trim()) {
        statusMessage.textContent = "プロンプトを入力してください。";
        return;
    }

    generateBtn.disabled = true;
    regenerateBtn.disabled = true;
    statusMessage.textContent = "処理を開始します...";

    if (port) port.disconnect();
    port = chrome.runtime.connect({ name: "generate-channel" });

    port.onMessage.addListener((msg) => {
        statusMessage.innerHTML = msg.message;
        if (msg.status === 'success' || msg.status === 'error') {
            generateBtn.disabled = false;
            regenerateBtn.disabled = false;
            if (port) port.disconnect();
        }
    });

    port.onDisconnect.addListener(() => {
        if (!statusMessage.textContent.startsWith("完了") && !statusMessage.textContent.startsWith("エラー")) {
            statusMessage.textContent = "エラー: 接続が予期せず切れました。";
        }
        generateBtn.disabled = false;
        regenerateBtn.disabled = false;
        port = null;
    });
    
    port.postMessage({ action, ...payload });
  }


  // --- イベントリスナー: 生成ボタンクリック ---
  generateBtn.addEventListener('click', () => {
    startProcess('generateSlidesWithAI', {
        prompt: userPrompt.value,
        settings: getSettingsFromForm()
    });
  });

  // --- イベントリスナー: 再生成ボタンクリック ---
  regenerateBtn.addEventListener('click', () => {
    startProcess('regenerateWithDesign', {
        settings: getSettingsFromForm()
    });
  });
});