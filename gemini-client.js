// Gemini APIクライアント
class GeminiClient {
    constructor() {
        this.apiKey = ApiConfig.getApiKey();
        this.endpoint = ApiConfig.getApiEndpoint();
    }
    
    // APIキーの更新
    updateApiKey() {
        this.apiKey = ApiConfig.getApiKey();
    }
    
    // プロンプトテンプレート
    createMinutesPrompt(transcription, meetingInfo) {
        const prompt = `あなたは議事録作成の専門家です。以下の会議内容から、シンプルで読みやすいテキスト形式の議事録を作成してください。

出力する際の重要な注意事項：
- 記号（★、●、■、▼など）は使用しない
- 表や枠線は使用しない
- 箇条書きは「・」のみを使用
- 見出しは行頭から始める
- 段落間は空行で区切る

会議情報
会議名: ${meetingInfo.meetingName || '会議名未設定'}
日時: ${meetingInfo.date || '日時未設定'}
場所: ${meetingInfo.location || '場所未設定'}
参加者: ${meetingInfo.participants || '参加者未設定'}

文字起こし内容:
${transcription}

以下の構成で議事録を作成してください：

議事録

1. 会議概要
会議名、日時、場所、参加者を段落形式で記載

2. 決定事項
会議で決定した重要事項を箇条書きで記載
・決定事項1
・決定事項2
（決定事項がない場合は「特になし」と記載）

3. 議論内容
議論された内容を時系列に沿って要約
話者名は含めず、どのような意見や提案があったかを中心に記載
段落形式で読みやすく整理

4. 今後の対応事項
実施すべきタスクを箇条書きで記載
・タスク内容（担当者: 未定、期限: 未定）
・タスク内容（担当者: 未定、期限: 未定）
（対応事項がない場合は「特になし」と記載）

5. 次回予定
次回の会議や確認事項があれば記載
（予定がない場合は「未定」と記載）

備考
その他の補足事項があれば記載`;

        return prompt;
    }
    
    // 議事録生成
    async generateMinutes(transcription, meetingInfo) {
        if (!this.apiKey) {
            throw new Error('APIキーが設定されていません。設定画面からAPIキーを入力してください。');
        }
        
        const prompt = this.createMinutesPrompt(transcription, meetingInfo);
        
        try {
            const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    },
                    safetySettings: [
                        {
                            category: "HARM_CATEGORY_HARASSMENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_HATE_SPEECH",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        }
                    ]
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text;
            } else {
                throw new Error('議事録の生成に失敗しました。');
            }
        } catch (error) {
            console.error('Gemini API Error:', error);
            throw error;
        }
    }
}

// グローバルに公開
window.GeminiClient = GeminiClient;