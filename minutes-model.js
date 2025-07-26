// 議事録データモデル
class MinutesModel {
    constructor() {
        this.STORAGE_KEY = 'meetingMinutes';
        this.minutes = this.loadMinutes();
    }
    
    // 議事録の作成
    createMinutes(data) {
        const minutes = {
            id: Date.now(),
            createdAt: new Date().toISOString(),
            meetingInfo: {
                meetingName: data.meetingName || '',
                date: data.date || '',
                location: data.location || '',
                participants: data.participants || ''
            },
            transcription: data.transcription || '',
            generatedContent: data.generatedContent || '',
            format: data.format || 'markdown',
            status: 'draft' // draft, final
        };
        
        this.minutes.push(minutes);
        this.saveMinutes();
        return minutes;
    }
    
    // 議事録の更新
    updateMinutes(id, updates) {
        const index = this.minutes.findIndex(m => m.id === id);
        if (index !== -1) {
            this.minutes[index] = { ...this.minutes[index], ...updates };
            this.saveMinutes();
            return this.minutes[index];
        }
        return null;
    }
    
    // 議事録の削除
    deleteMinutes(id) {
        const index = this.minutes.findIndex(m => m.id === id);
        if (index !== -1) {
            this.minutes.splice(index, 1);
            this.saveMinutes();
            return true;
        }
        return false;
    }
    
    // 議事録の取得
    getMinutes(id) {
        return this.minutes.find(m => m.id === id);
    }
    
    // すべての議事録を取得
    getAllMinutes() {
        return this.minutes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    // LocalStorageから読み込み
    loadMinutes() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('議事録の読み込みエラー:', error);
            return [];
        }
    }
    
    // LocalStorageに保存
    saveMinutes() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.minutes));
        } catch (error) {
            console.error('議事録の保存エラー:', error);
        }
    }
    
    // エクスポート形式の変換
    exportAsText(minutes) {
        let text = `# 議事録\n\n`;
        text += `## 基本情報\n`;
        text += `- 会議名: ${minutes.meetingInfo.meetingName}\n`;
        text += `- 日時: ${minutes.meetingInfo.date}\n`;
        text += `- 場所: ${minutes.meetingInfo.location}\n`;
        text += `- 参加者: ${minutes.meetingInfo.participants}\n\n`;
        text += `## 内容\n${minutes.generatedContent}\n\n`;
        text += `---\n作成日時: ${new Date(minutes.createdAt).toLocaleString('ja-JP')}\n`;
        return text;
    }
}

// グローバルに公開
window.MinutesModel = MinutesModel;