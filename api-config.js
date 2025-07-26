// API設定管理
const ApiConfig = {
    // LocalStorageのキー
    STORAGE_KEY: 'geminiApiKey',
    
    // APIキーの取得
    getApiKey() {
        // config.jsから読み込み（存在する場合）
        if (window.API_CONFIG && window.API_CONFIG.GEMINI_API_KEY) {
            return window.API_CONFIG.GEMINI_API_KEY;
        }
        // LocalStorageから読み込み
        return localStorage.getItem(this.STORAGE_KEY) || '';
    },
    
    // APIキーの保存
    setApiKey(apiKey) {
        if (apiKey) {
            localStorage.setItem(this.STORAGE_KEY, apiKey);
            return true;
        }
        return false;
    },
    
    // APIキーの削除
    removeApiKey() {
        localStorage.removeItem(this.STORAGE_KEY);
    },
    
    // APIキーの検証
    isApiKeySet() {
        return !!this.getApiKey();
    },
    
    // Gemini APIエンドポイント
    getApiEndpoint() {
        // config.jsから読み込み（存在する場合）
        if (window.API_CONFIG && window.API_CONFIG.GEMINI_API_ENDPOINT) {
            return window.API_CONFIG.GEMINI_API_ENDPOINT;
        }
        return 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    }
};

// グローバルに公開
window.ApiConfig = ApiConfig;