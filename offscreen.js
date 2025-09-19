// offscreen.js (データ取得と解析の主役)

// background.jsからのメッセージを待つリスナー
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target === 'offscreen' && message.type === 'fetch-and-parse-transcript') {
      // 非同期で全処理を実行
      (async () => {
        try {
          const videoId = message.videoId;
  
          // --- ステップ1: Offscreenから動画ページのHTMLを取得 ---
          const videoPageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
          if (!videoPageResponse.ok) throw new Error(`YouTubeページの取得に失敗 (Status: ${videoPageResponse.status})`);
          const videoPageHtml = await videoPageResponse.text();
  
          const splittedHtml = videoPageHtml.split('"captions":');
          if (splittedHtml.length < 2) throw new Error("文字起こし情報が見つかりません (captionsセクションなし)。");
          
          const captionsJsonText = splittedHtml[1].split(',"videoDetails')[0].replace(/\n/g, '');
          const captionsJson = JSON.parse(captionsJsonText);
          const captionTracks = captionsJson.playerCaptionsTracklistRenderer.captionTracks;
          if (!captionTracks || captionTracks.length === 0) throw new Error("文字起こし情報が見つかりません (captionTracksなし)。");
          
          const transcriptUrl = captionTracks[0].baseUrl;
  
          // --- ステップ2: Offscreenから文字起こしデータ本体(XML)を取得 ---
          const transcriptPageResponse = await fetch(transcriptUrl);
          if (!transcriptPageResponse.ok) throw new Error(`文字起こしAPIへのアクセスに失敗 (Status: ${transcriptPageResponse.status})`);
          
          const transcriptPageXml = await transcriptPageResponse.text();
          if (!transcriptPageXml) throw new Error("文字起こしAPIから空のデータが返されました。");
  
          // --- ステップ3: Offscreen内でXMLを解析 ---
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(transcriptPageXml, "text/xml");
          if (xmlDoc.getElementsByTagName("parsererror").length) throw new Error("DOMParserがXMLの解析に失敗しました。");
  
          const textNodes = xmlDoc.getElementsByTagName('text');
          const transcriptText = Array.from(textNodes).map(node => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = node.textContent;
            return tempDiv.textContent || "";
          }).join(' ');
  
          if (!transcriptText || transcriptText.trim() === '') throw new Error("解析後の文字起こしテキストが空です。");
          
          // --- 最終結果をbackground.jsに返す ---
          sendResponse({ success: true, transcript: transcriptText });
  
        } catch (error) {
          console.error("Offscreen Document内でエラー:", error);
          sendResponse({ success: false, error: error.message });
        }
      })();
      
      // 非同期応答のために必須
      return true;
    }
  });