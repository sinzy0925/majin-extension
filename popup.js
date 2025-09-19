// popup.js (2ボタン対応・connect方式・最終版)

document.addEventListener('DOMContentLoaded', () => {
  const userPrompt = document.getElementById('user-prompt');
  const statusMessage = document.getElementById('status-message');
  const generateBtn = document.getElementById('generate-button');
  const regenerateBtn = document.getElementById('regenerate-button');
  const colorPicker = document.getElementById('primary-color');
  
  let port = null;

  // --- ボタン①：スライド生成 (AIあり) ---
  generateBtn.addEventListener('click', () => {
    const promptText = userPrompt.value;
    if (!promptText.trim()) {
      statusMessage.textContent = "プロンプトを入力してください。";
      return;
    }
    
    disableButtons();
    statusMessage.textContent = "処理を開始します...";
    startConnectionAndPostMessage({
      action: "generateSlidesWithAI",
      prompt: promptText
    });
  });

  // --- ボタン②：微調整して再生成 (AIなし) ---
  regenerateBtn.addEventListener('click', () => {
    disableButtons();
    statusMessage.textContent = "微調整を反映しています...";
    
    const designSettings = {
      primaryColor: colorPicker.value
      // (ここにロゴURLなどを追加するなら `logoUrl: document.getElementById('logo-url').value` のようにする)
    };

    startConnectionAndPostMessage({
      action: "regenerateWithNewDesign",
      designSettings: designSettings
    });
  });

  // --- バックグラウンドとの通信を開始する共通関数 ---
  function startConnectionAndPostMessage(message) {
    if (port) {
      port.disconnect();
    }
    port = chrome.runtime.connect({ name: "generate-channel" });

    // バックグラウンドからのメッセージを待機
    port.onMessage.addListener(handlePortMessage);
    // 接続が切断されたときのハンドラ
    port.onDisconnect.addListener(handlePortDisconnect);
    // 接続が確立したら、処理開始のメッセージを送信
    port.postMessage(message);
  }

  // --- 共通のメッセージハンドラ ---
  function handlePortMessage(msg) {
    if (msg.status === 'progress' || msg.status === 'success') {
      statusMessage.textContent = msg.message;
    } else if (msg.status === 'error') {
      statusMessage.textContent = `エラー: ${msg.message}`;
    }
    
    if (msg.status === 'success' || msg.status === 'error') {
      enableButtons();
      if (port) port.disconnect();
    }
  }

  // --- 共通の切断ハンドラ ---
  function handlePortDisconnect() {
    console.log("ポートが切断されました。");
    if (!statusMessage.textContent.startsWith("完了") && !statusMessage.textContent.startsWith("エラー")) {
      statusMessage.textContent = "エラー: 接続が予期せず切れました。";
    }
    enableButtons(); // 切断されたら必ずボタンを有効に戻す
    port = null;
  }
  
  // --- UI制御ヘルパー ---
  function disableButtons() {
    generateBtn.disabled = true;
    regenerateBtn.disabled = true;
  }

  function enableButtons() {
    generateBtn.disabled = false;
    regenerateBtn.disabled = false;
  }
});