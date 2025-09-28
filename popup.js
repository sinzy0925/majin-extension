// popup.js
document.addEventListener('DOMContentLoaded', () => {
  // --- DOM要素の取得 ---
  // ユーザーがスライドの内容を入力するテキストエリア
  const userPrompt = document.getElementById('user-prompt');
  // 処理の進捗や結果を表示するメッセージエリア
  const statusMessage = document.getElementById('status-message');
  // 「全自動でスライドを生成」ボタン
  const generateBtn = document.getElementById('generate-button');
  // 「デザインを反映して再生成」ボタン
  const regenerateBtn = document.getElementById('regenerate-button');
  // 「GAS認証をリセット」ボタン
  const revokeTokenBtn = document.getElementById('revoke-token-button');
  
  // デザイン関連の設定入力フィールドをまとめて管理するオブジェクト
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
    originalFontFamily: document.getElementById('original-font-family'),
    bgStartColor: document.getElementById('bg-gradient-start-color'),
    bgEndColor: document.getElementById('bg-gradient-end-color'),
  };

  // API・GAS連携関連の設定入力フィールドをまとめて管理するオブジェクト
  const apiInputs = {
    deploymentId: document.getElementById('deployment-id'),
    aiModel: document.getElementById('ai-model'),
    scriptId: document.getElementById('script-id'),
  };
  // プロジェクト上書き許可のチェックボックス
  const overwriteConfirm = document.getElementById('overwrite-confirm');
  // 上書き許可チェックボックスの右側にある説明文のspan要素
  const overwriteConfirmLabel = document.getElementById('overwrite-confirm-label');

  // グラデーションの向きを選択するラジオボタン群
  const gradientDirectionRadios = document.querySelectorAll('input[name="gradient-direction"]');

  // 設定の保存ボタンとリセットボタン
  const saveBtn = document.getElementById('save-settings-button');
  const resetBtn = document.getElementById('reset-settings-button');
  // 設定保存時にフィードバックを表示するエリア
  const feedbackMessage = document.getElementById('feedback-message');
  
  // 各設定セクションの折りたたみメニューのヘッダー部分
  const collapsible1 = document.querySelector('.collapsible1');
  const collapsible1Content = document.querySelector('.collapsible1-content');
  const collapsible2 = document.querySelector('.collapsible2');
  const collapsible2Content = document.querySelector('.collapsible2-content');
  const collapsible3 = document.querySelector('.collapsible3');
  const collapsible3Content = document.querySelector('.collapsible3-content');
  const collapsible4 = document.querySelector('.collapsible4');
  const collapsible4Content = document.querySelector('.collapsible4-content');
  const collapsible5 = document.querySelector('.collapsible5');
  const collapsible5Content = document.querySelector('.collapsible5-content');

  // Chromeストレージに設定を保存する際のキー
  const SETTINGS_KEY = 'userAppSettings';
  // background.jsとの通信用ポート
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

  collapsible5.addEventListener('click', () => {
    const isExpanded = collapsible5.classList.toggle('active');
    collapsible5Content.style.display = isExpanded ? 'block' : 'none';
    collapsible5.textContent = isExpanded ? '▲ GAS認証をリセット' : '▼ GAS認証をリセット';
  });

  // --- 機能: フィードバックメッセージを表示 ---
  function showFeedback(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? '#D93025' : '#0F9D58';
    setTimeout(() => {
      statusMessage.textContent = '';
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
          bgStartColor: (text.match(/const str_bg_gradient_start_color= '([^']+)';/) || [])[1] || '#FFFFFF',
          bgEndColor: (text.match(/const str_bg_gradient_end_color= '([^']+)';/) || [])[1] || '#00FFFF',
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
// --- 機能: 設定オブジェクトをフォームに反映 ---
function applySettingsToForm(settings) {
  if (!settings) return;

  // ★★★ ここからが変更箇所 ★★★
  // designInputsからoriginalFontFamilyを一旦除外して値を設定
  Object.keys(designInputs).filter(k => k !== 'originalFontFamily').forEach(key => {
      if(designInputs[key] && settings[key] !== undefined) {
          designInputs[key].value = settings[key];
      }
  });
  // originalFontFamilyは個別で設定
  if (designInputs.originalFontFamily) {
      designInputs.originalFontFamily.value = settings.originalFontFamily || '';
  }
  // ★★★ ここまで ★★★
  
  Object.keys(apiInputs).forEach(key => { if(apiInputs[key]) apiInputs[key].value = settings[key] || ''; });
  // ラジオボタンの状態も復元
  const savedDirection = settings.gradientDirection || 'vertical';
  document.querySelector(`input[name="gradient-direction"][value="${savedDirection}"]`).checked = true;
}

// --- 機能: 現在のフォームの内容から設定オブジェクトを取得 ---
function getSettingsFromForm() {
  const settings = {};
  // designInputsからoriginalFontFamilyを除くキーをループ
  Object.keys(designInputs).filter(k => k !== 'originalFontFamily').forEach(key => {
      if(designInputs[key]) {
          settings[key] = designInputs[key].value.trim();
      }
  });

  // ★★★ ここからが変更箇所 ★★★
  const originalFont = designInputs.originalFontFamily.value.trim();
  if (originalFont) {
    // オリジナルフォントに入力があれば、そちらを優先してfontFamilyに設定
    settings.fontFamily = originalFont;
  } else {
    // なければ、ドロップダウンの値をfontFamilyに設定
    settings.fontFamily = designInputs.fontFamily.value.trim();
  }
  // ★★★ ここまで ★★★

  // どのオリジナルフォントが設定されたかを保存しておく
  settings.originalFontFamily = originalFont;

  Object.keys(apiInputs).forEach(key => { settings[key] = apiInputs[key].value.trim(); });
  settings.gradientDirection = document.querySelector('input[name="gradient-direction"]:checked').value;
  return settings;
}
  // --- メインの読み込み処理 ---
  async function loadSettings() {
    const result = await chrome.storage.local.get([SETTINGS_KEY]);
    const saved = result[SETTINGS_KEY];
    if (saved && Object.keys(saved).length > 0) {
      applySettingsToForm(saved);
    } else {
      const defaults = await getDefaultSettings();
      applySettingsToForm(defaults);
    }
    // ★ 読み込み完了後に一度スタイルを更新
    updateOverwriteLabelStyle();
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
  resetBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove([SETTINGS_KEY]);
    const defaults = await getDefaultSettings();
    applySettingsToForm(defaults);
    showFeedback('設定をリセットしました');
  });

  // --- 機能: チェックボックスのラベルスタイル更新 ---
  function updateOverwriteLabelStyle() {
    if (overwriteConfirm.checked) {
      // チェックされている場合：緑色で太字にする
      overwriteConfirmLabel.style.color = '#0F9D58';
      overwriteConfirmLabel.style.fontWeight = 'bold';
    } else {
      // チェックされていない場合：元のスタイルに戻す
      overwriteConfirmLabel.style.color = '#333';
      overwriteConfirmLabel.style.fontWeight = 'normal';
    }
  }
  overwriteConfirm.addEventListener('change', updateOverwriteLabelStyle);

  // --- 機能: ボタンを無効化し、ポート接続を準備する共通関数 ---
  function startProcess(action, payload) {
    const allSettings = getSettingsFromForm();
    
    // 必須項目チェック
    if (!allSettings.scriptId || !allSettings.deploymentId || !allSettings.aiModel) {
      statusMessage.textContent = "API・連携設定の必須項目を入力してください。";
      if (!collapsible1.classList.contains('active')) {
        collapsible1.click();
      }
      return;
    }

    if (!overwriteConfirm.checked) {
      statusMessage.textContent = "プロジェクトの上書き許可にチェックを入れてください。";
      if (!collapsible1.classList.contains('active')) {
        collapsible1.click();
      }
      overwriteConfirm.focus(); // チェックボックスに画面を移動
      return;
    }

    if (action === 'generateSlidesWithAI' && !payload.prompt.trim()) {
        statusMessage.textContent = "スライド原稿を入力してください。";
        userPrompt.focus();
        return;
    }

    generateBtn.disabled = true;
    regenerateBtn.disabled = true;
    statusMessage.innerHTML = "処理を開始します..."; // innerHTMLで改行<br>にも対応できるように

    if (port) port.disconnect();
    port = chrome.runtime.connect({ name: "generate-channel" });

    port.onMessage.addListener((msg) => {
        statusMessage.innerHTML = msg.message;
        if (msg.status === 'success' || msg.status === 'error') {
            generateBtn.disabled = false;
            regenerateBtn.disabled = false;
            if (port) {
              port.disconnect();
              port = null;
            }
        }
    });

    port.onDisconnect.addListener(() => {
        if (statusMessage.innerHTML.includes("処理中") || statusMessage.innerHTML.includes("開始します")) {
            statusMessage.innerHTML = "エラー: 接続が予期せず切れました。";
        }
        generateBtn.disabled = false;
        regenerateBtn.disabled = false;
        port = null;
    });
    
    port.postMessage({ action, ...payload });
  }

  // --- イベントリスナー: 各種実行ボタン ---
  generateBtn.addEventListener('click', () => {
    startProcess('generateSlidesWithAI', {
        prompt: userPrompt.value,
        settings: getSettingsFromForm()
    });
  });

  regenerateBtn.addEventListener('click', () => {
    startProcess('regenerateWithDesign', {
        settings: getSettingsFromForm()
    });
  });

  revokeTokenBtn.addEventListener('click', () => {
    statusMessage.innerHTML = "認証情報をリセットしています...";
    chrome.runtime.sendMessage({ action: "revokeToken" }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("トークンのリセット中に想定内のエラー:", chrome.runtime.lastError.message);
        statusMessage.innerHTML = "認証をリセットしました。<br>次回実行時に再認証してください。";
        return;
      }
      if (response && response.success) {
        statusMessage.innerHTML = "認証をリセットしました。<br>次回実行時に再認証してください。";
      } else {
        statusMessage.innerHTML = "リセットに失敗しました。";
      }
    });
  });
});