document.addEventListener('DOMContentLoaded', () => {
  // --- DOM要素の取得 ---
  const userPrompt = document.getElementById('user-prompt');
  const statusMessage = document.getElementById('status-message');
  const generateBtn = document.getElementById('generate-button');
  const regenerateBtn = document.getElementById('regenerate-button'); // regenerate-buttonも取得
  const footerInput = document.getElementById('footer-text');
  const headerLogoInput = document.getElementById('header-logo');
  const closingLogoInput = document.getElementById('closing-logo');
  const colorPicker = document.getElementById('primary-color');
  
  let port = null;

  // --- 機能: 0.gsからデフォルト設定を読み込み、プレースホルダーに表示 ---
  async function loadDefaultSettings() {
    try {
      const response = await fetch(chrome.runtime.getURL('0.gs'));
      const text = await response.text();
      
      // 正規表現で各変数の値を抽出
      const footerMatch = text.match(/const str_FOOTER_TEXT = `([^`]+)`/);
      const headerLogoMatch = text.match(/const str_LOGOS_header= '([^']+)'/);
      const closingLogoMatch = text.match(/const str_LOGOS_closing= '([^']+)'/);
      
      if (footerMatch) footerInput.value = footerMatch[1].replace('${new Date().getFullYear()}', new Date().getFullYear());
      if (headerLogoMatch) headerLogoInput.value = headerLogoMatch[1];
      if (closingLogoMatch) closingLogoInput.value = closingLogoMatch[1];
    } catch (error) {
      console.error("0.gsの読み込みに失敗しました:", error);
      footerInput.placeholder = "設定の読み込みに失敗";
    }
  }

  // ポップアップが開かれたらデフォルト設定を読み込む
  loadDefaultSettings();

  // --- イベントリスナー: 生成ボタンクリック ---
  generateBtn.addEventListener('click', () => {
    const promptText = userPrompt.value;
    if (!promptText.trim()) {
      statusMessage.textContent = "プロンプトを入力してください。";
      return;
    }
    
    generateBtn.disabled = true;
    statusMessage.textContent = "処理を開始します...";

    if (regenerateBtn) {
      regenerateBtn.addEventListener('click', () => {
        disableButtons();
        statusMessage.textContent = "微調整を反映しています...";
        
        const designSettings = {
          primaryColor: colorPicker.value,
          // 他の設定もここに追加可能
        };
  
        startConnectionAndPostMessage({
          action: "regenerateWithNewDesign",
          designSettings: designSettings
        });
      });
    }
    
    // ユーザーが入力した設定値を取得
    const userSettings = {
      footerText: footerInput.value.trim(),
      headerLogo: headerLogoInput.value.trim(),
      closingLogo: closingLogoInput.value.trim(),
      primaryColor: colorPicker.value.trim()
    };
    
    if (port) port.disconnect();
    port = chrome.runtime.connect({ name: "generate-channel" });

    port.onMessage.addListener((msg) => {
      statusMessage.textContent = msg.message;
      if (msg.status === 'success' || msg.status === 'error') {
        generateBtn.disabled = false;
        if (port) port.disconnect();
      }
    });

    port.onDisconnect.addListener(() => {
      if (!statusMessage.textContent.startsWith("完了") && !statusMessage.textContent.startsWith("エラー")) {
        statusMessage.textContent = "エラー: 接続が予期せず切れました。";
      }
      generateBtn.disabled = false;
      port = null;
    });
    
    // background.jsにプロンプトとユーザー設定を渡す
    port.postMessage({
      action: "generateSlidesWithAI",
      prompt: promptText,
      settings: userSettings 
    });
  });
});