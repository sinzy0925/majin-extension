// content.js (ボタン検索ロジック改善・最終FIX版)
if (typeof window.myFinalRobotListener === 'undefined') {
    window.myFinalRobotListener = true;
  
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'get-youtube-transcript-from-page') {
        (async () => {
          try {
            // --- ユーザー操作模倣ロジック ---
  
            let transcriptContainer = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-transcript"]');
            
            if (!transcriptContainer || transcriptContainer.offsetParent === null) {
  
              // ▼▼▼【最重要修正箇所】▼▼▼
              // 1a. 「...」メニューボタンを、より確実な方法で探す
              // "その他の操作" というラベルを持つボタンを探すのが最も確実
              const menuButton = Array.from(document.querySelectorAll('#menu.ytd-video-primary-info-renderer button'))
                                      .find(btn => btn.getAttribute('aria-label')?.includes('操作'));
              
              if (!menuButton) throw new Error("メニューボタン(...)が見つかりません。ページの読み込みが完了しているか確認してください。");
              menuButton.click();
              // ▲▲▲ ▲▲▲ ▲▲▲
  
              // 1b. 「文字起こしを表示」メニュー項目が表示されるのを待つ
              const openTranscriptButton = await waitForElement('ytd-menu-service-item-renderer.ytd-menu-popup-renderer tp-yt-paper-item');
              if (!openTranscriptButton || !openTranscriptButton.textContent.includes('文字起こし')) {
                  throw new Error("「文字起こしを表示」メニューが見つかりません。");
              }
              openTranscriptButton.click();
  
              // 1c. 文字起こしパネルが表示されるのを待つ
              transcriptContainer = await waitForElement('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-transcript"]');
            }
  
            // 2. 文字起こしパネルからテキストセグメントを取得
            // 確実に要素を取得するために少し待機時間を入れる
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const segments = transcriptContainer.querySelectorAll('ytd-transcript-segment-renderer .segment .yt-formatted-string');
            if (!segments || segments.length === 0) {
              throw new Error("文字起こしパネル内にテキストが見つかりません。");
            }
            
            // 3. 全てのテキストを結合する
            const fullTranscript = Array.from(segments).map(el => el.textContent.trim()).join(' ');
  
            if (!fullTranscript) throw new Error("文字起こしの抽出に失敗しました。");
  
            // 成功した結果をbackground.jsに返す
            sendResponse({ success: true, transcript: fullTranscript });
  
          } catch (error) {
            sendResponse({ success: false, error: `Content Script Error: ${error.message}` });
          }
        })();
        return true;
      }
    });
  
    // 特定の要素が表示されるまで待機するヘルパー関数
    function waitForElement(selector) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          observer.disconnect();
          reject(new Error(`要素'${selector}'がタイムアウトしました(5秒)。`));
        }, 5000); // 5秒のタイムアウト
  
        const element = document.querySelector(selector);
        if (element) {
          clearTimeout(timeout);
          return resolve(element);
        }
        const observer = new MutationObserver(mutations => {
          const element = document.querySelector(selector);
          if (element) {
            clearTimeout(timeout);
            resolve(element);
            observer.disconnect();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      });
    }
  }