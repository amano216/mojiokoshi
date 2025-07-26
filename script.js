let recognition = null;
let isRecording = false;
let recordingStartTime = null;
let recordingTimer = null;
let currentSession = null;
let sessions = [];
let transcriptionText = '';
let recognitionTimeout = null;
let audioContext = null;
let analyser = null;
let microphone = null;
let javascriptNode = null;
let undoStack = [];
let redoStack = [];
let searchMatches = [];
let currentSearchIndex = 0;
let noiseThreshold = { low: 20, medium: 40, high: 60 };
let silenceTimeout = null;
let noiseWarningShown = false;
let memoryCheckInterval = null;
const MAX_SESSION_LENGTH = 10000; // 1セッションあたりの最大文字数

const recordBtn = document.getElementById('recordBtn');
const recordingTime = document.getElementById('recordingTime');
const recordingStatus = document.getElementById('recordingStatus');
const transcriptionResult = document.getElementById('transcriptionResult');
const charCount = document.getElementById('charCount');
const copyBtn = document.getElementById('copyBtn');
const saveTxtBtn = document.getElementById('saveTxtBtn');
const saveDocxBtn = document.getElementById('saveDocxBtn');
const savePdfBtn = document.getElementById('savePdfBtn');
const saveMdBtn = document.getElementById('saveMdBtn');
const clearBtn = document.getElementById('clearBtn');
const newSessionBtn = document.getElementById('newSessionBtn');
const settingsBtn = document.querySelector('.settings-btn');
const settingsModal = document.getElementById('settingsModal');
const closeModalBtn = document.querySelector('.close-btn');
const themeToggle = document.getElementById('themeToggle');
const fontSizeSlider = document.getElementById('fontSizeSlider');
const fontSizeValue = document.getElementById('fontSizeValue');
const autoPunctuationToggle = document.getElementById('autoPunctuationToggle');
const errorBanner = document.getElementById('errorBanner');
const errorMessage = document.getElementById('errorMessage');
const errorClose = document.querySelector('.error-close');
const includeTimestampsToggle = document.getElementById('includeTimestampsToggle');
const noiseIndicator = document.getElementById('noiseIndicator');
const noiseLevel = document.getElementById('noiseLevel');

function initializeSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        showError('このブラウザは音声認識に対応していません。Chrome、Edge、またはSafariをご利用ください。');
        recordBtn.disabled = true;
        return false;
    }
    
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ja-JP';
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
        console.log('音声認識開始');
        updateRecordingStatus('録音中');
    };
    
    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        if (finalTranscript) {
            const timestamp = new Date().toISOString();
            const relativeTime = Math.floor((Date.now() - currentSession.startTime.getTime()) / 1000);
            
            currentSession.segments.push({
                text: finalTranscript,
                timestamp: timestamp,
                relativeTime: relativeTime
            });
            
            currentSession.text += finalTranscript;
            if (autoPunctuationToggle.checked) {
                currentSession.text = addAutoPunctuation(currentSession.text);
            }
            
            autoSaveToLocalStorage();
            
            // スクリーンリーダー用のライブリージョン更新
            const liveRegion = document.getElementById('liveRegion');
            if (liveRegion) {
                liveRegion.textContent = `新しい文字起こし: ${finalTranscript}`;
            }
        }
        
        updateTranscriptionDisplay(interimTranscript);
        updateCharCount();
    };
    
    recognition.onerror = (event) => {
        console.error('音声認識エラー:', event.error);
        handleRecognitionError(event.error);
    };
    
    recognition.onend = () => {
        console.log('音声認識終了');
        if (isRecording) {
            clearTimeout(recognitionTimeout);
            recognitionTimeout = setTimeout(() => {
                if (isRecording) {
                    try {
                        recognition.start();
                        console.log('音声認識を自動再開しました');
                    } catch (e) {
                        console.error('音声認識の再開に失敗:', e);
                        showError('音声認識の再開に失敗しました。録音を停止して再度開始してください。');
                    }
                }
            }, 100);
        }
    };
    
    return true;
}

function handleRecognitionError(error) {
    let errorMsg = '';
    switch(error) {
        case 'no-speech':
            errorMsg = '音声が検出されませんでした。';
            break;
        case 'audio-capture':
            errorMsg = 'マイクが使用できません。マイクの接続を確認してください。';
            break;
        case 'not-allowed':
            errorMsg = 'マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。';
            stopRecording();
            break;
        case 'network':
            errorMsg = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
            break;
        default:
            errorMsg = `エラーが発生しました: ${error}`;
    }
    showError(errorMsg);
}

function showError(message) {
    errorMessage.textContent = message;
    errorBanner.classList.remove('hidden');
    setTimeout(() => {
        errorBanner.classList.add('hidden');
    }, 5000);
}

function startRecording() {
    if (!recognition) {
        if (!initializeSpeechRecognition()) {
            return;
        }
    }
    
    createNewSession();
    
    isRecording = true;
    recordBtn.classList.add('recording');
    recordBtn.querySelector('.record-icon').textContent = 'stop';
    recordBtn.querySelector('.record-text').textContent = '録音停止';
    
    recordingStartTime = Date.now();
    updateRecordingTime();
    recordingTimer = setInterval(updateRecordingTime, 1000);
    
    transcriptionResult.contentEditable = false;
    
    startAudioVisualization();
    startMemoryManagement();
    
    try {
        recognition.start();
        startAutoRestartTimer();
    } catch (e) {
        console.error('音声認識の開始に失敗:', e);
        showError('音声認識の開始に失敗しました。');
        stopRecording();
    }
}


function updateRecordingTime() {
    if (!recordingStartTime) return;
    
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    recordingTime.textContent = `${minutes}:${seconds}`;
}

function updateRecordingStatus(status) {
    recordingStatus.textContent = status;
}

function createNewSession() {
    const now = new Date();
    currentSession = {
        id: Date.now(),
        startTime: now,
        text: '',
        timestamp: now.toLocaleTimeString('ja-JP'),
        segments: []
    };
    sessions.push(currentSession);
}

function updateTranscriptionDisplay(interimText = '') {
    let html = '';
    const maxDisplaySessions = 20; // 一度に表示する最大セッション数
    const totalSessions = sessions.length;
    
    // パフォーマンス最適化: 大量のセッションがある場合は最新のものだけ表示
    if (totalSessions > maxDisplaySessions) {
        html += `<div class="session-info">以前の${totalSessions - maxDisplaySessions}個のセッションは表示を省略しています。エクスポート機能ですべてのデータを取得できます。</div>`;
    }
    
    const displaySessions = totalSessions > maxDisplaySessions 
        ? sessions.slice(-maxDisplaySessions) 
        : sessions;
    
    displaySessions.forEach((session, index) => {
        const actualIndex = totalSessions > maxDisplaySessions 
            ? totalSessions - maxDisplaySessions + index 
            : index;
            
        html += `<div class="session" data-session-id="${session.id}">`;
        html += `<div class="session-header">セッション ${actualIndex + 1} - ${session.timestamp}</div>`;
        
        // 長いテキストの場合は折りたたみ表示
        if (session.text.length > 1000) {
            const preview = session.text.substring(0, 1000);
            html += `<span class="final session-text" data-full="${session.text.length > 1000}">${preview}`;
            html += `<span class="text-more">... <button class="expand-btn" onclick="expandSession('${session.id}')">全文を表示</button></span></span>`;
        } else {
            html += `<span class="final">${session.text}</span>`;
        }
        
        if (session === currentSession && interimText) {
            html += `<span class="interim">${interimText}</span>`;
        }
        
        html += `</div>`;
    });
    
    if (sessions.length === 0) {
        html = '<div class="placeholder">録音を開始すると、ここに文字が表示されます</div>';
    }
    
    transcriptionResult.innerHTML = html;
    
    // 最新の内容にスクロール（録音中の場合のみ）
    if (isRecording) {
        transcriptionResult.scrollTop = transcriptionResult.scrollHeight;
    }
}

function updateCharCount() {
    const totalChars = sessions.reduce((sum, session) => sum + session.text.length, 0);
    charCount.textContent = totalChars;
}

// XSS対策: HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function addAutoPunctuation(text) {
    text = text.replace(/([ぁ-ん]+)(です|ます|ました|でした|ません|ませんでした)([^。、]|$)/g, '$1$2。$3');
    text = text.replace(/([って|から|けど|けれど|が|し|て|で|と|や|か])([^、。])/g, '$1、$2');
    return text;
}

function getAllText(includeTimestamps = false) {
    if (!includeTimestamps || !includeTimestampsToggle.checked) {
        return sessions.map(session => session.text).join('\n\n');
    }
    
    return sessions.map(session => {
        let textWithTimestamps = `[${session.timestamp}]\n`;
        
        if (session.segments && session.segments.length > 0) {
            textWithTimestamps += session.segments.map(segment => {
                const minutes = Math.floor(segment.relativeTime / 60);
                const seconds = segment.relativeTime % 60;
                const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                return `[${timeStr}] ${segment.text}`;
            }).join('\n');
        } else {
            textWithTimestamps += session.text;
        }
        
        return textWithTimestamps;
    }).join('\n\n');
}

function copyToClipboard() {
    const text = getAllText(true);
    if (!text) {
        showError('コピーするテキストがありません。');
        return;
    }
    
    navigator.clipboard.writeText(text)
        .then(() => {
            showSuccess('クリップボードにコピーしました。');
        })
        .catch(err => {
            console.error('コピーに失敗:', err);
            showError('コピーに失敗しました。');
        });
}

function showSuccess(message) {
    const successBanner = errorBanner.cloneNode(true);
    successBanner.style.backgroundColor = '#D4EDDA';
    successBanner.style.color = '#155724';
    successBanner.querySelector('#errorMessage').textContent = message;
    successBanner.classList.remove('hidden');
    document.body.appendChild(successBanner);
    
    setTimeout(() => {
        successBanner.remove();
    }, 3000);
}

function saveTxt() {
    const text = getAllText(true);
    if (!text) {
        showError('保存するテキストがありません。');
        return;
    }
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('TXTファイルを保存しました。');
}

function clearAll() {
    if (sessions.length === 0) return;
    
    if (confirm('すべてのテキストをクリアしてもよろしいですか？')) {
        sessions = [];
        currentSession = null;
        updateTranscriptionDisplay();
        updateCharCount();
        showSuccess('すべてクリアしました。');
    }
}

function newSession() {
    if (isRecording) {
        showError('録音中は新規セッションを開始できません。');
        return;
    }
    
    createNewSession();
    updateTranscriptionDisplay();
    showSuccess('新規セッションを開始しました。');
}

function loadSettings() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.checked = savedTheme === 'dark';
    
    const savedFontSize = localStorage.getItem('fontSize') || '18';
    fontSizeSlider.value = savedFontSize;
    fontSizeValue.textContent = `${savedFontSize}px`;
    transcriptionResult.style.fontSize = `${savedFontSize}px`;
    
    const savedAutoPunctuation = localStorage.getItem('autoPunctuation') === 'true';
    autoPunctuationToggle.checked = savedAutoPunctuation;
    
    const savedIncludeTimestamps = localStorage.getItem('includeTimestamps') === 'true';
    includeTimestampsToggle.checked = savedIncludeTimestamps;
}

function saveSettings() {
    const theme = themeToggle.checked ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    
    const fontSize = fontSizeSlider.value;
    localStorage.setItem('fontSize', fontSize);
    transcriptionResult.style.fontSize = `${fontSize}px`;
    
    localStorage.setItem('autoPunctuation', autoPunctuationToggle.checked);
    localStorage.setItem('includeTimestamps', includeTimestampsToggle.checked);
}

recordBtn.addEventListener('click', () => {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
});

copyBtn.addEventListener('click', copyToClipboard);
saveTxtBtn.addEventListener('click', saveTxt);
clearBtn.addEventListener('click', clearAll);
newSessionBtn.addEventListener('click', newSession);

settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.add('hidden');
    }
});

themeToggle.addEventListener('change', saveSettings);
fontSizeSlider.addEventListener('input', (e) => {
    fontSizeValue.textContent = `${e.target.value}px`;
    saveSettings();
});
autoPunctuationToggle.addEventListener('change', saveSettings);
includeTimestampsToggle.addEventListener('change', saveSettings);

errorClose.addEventListener('click', () => {
    errorBanner.classList.add('hidden');
});


async function saveDocx() {
    const text = getAllText(true);
    if (!text) {
        showError('保存するテキストがありません。');
        return;
    }
    
    try {
        const doc = new docx.Document({
            sections: [{
                properties: {},
                children: [
                    new docx.Paragraph({
                        text: "音声文字起こし結果",
                        heading: docx.HeadingLevel.HEADING_1,
                        spacing: { after: 300 }
                    }),
                    new docx.Paragraph({
                        text: `作成日時: ${new Date().toLocaleString('ja-JP')}`,
                        spacing: { after: 200 }
                    }),
                    new docx.Paragraph({
                        text: `総文字数: ${text.length}文字`,
                        spacing: { after: 400 }
                    })
                ]
            }]
        });
        
        sessions.forEach((session, index) => {
            doc.sections[0].children.push(
                new docx.Paragraph({
                    text: `セッション ${index + 1} - ${session.timestamp}`,
                    heading: docx.HeadingLevel.HEADING_2,
                    spacing: { before: 400, after: 200 }
                })
            );
            
            if (includeTimestampsToggle.checked && session.segments && session.segments.length > 0) {
                session.segments.forEach(segment => {
                    const minutes = Math.floor(segment.relativeTime / 60);
                    const seconds = segment.relativeTime % 60;
                    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    
                    doc.sections[0].children.push(
                        new docx.Paragraph({
                            text: `[${timeStr}] ${segment.text}`,
                            spacing: { after: 200 }
                        })
                    );
                });
            } else {
                const paragraphs = session.text.split('\n').filter(p => p.trim());
                paragraphs.forEach(paragraph => {
                    doc.sections[0].children.push(
                        new docx.Paragraph({
                            text: paragraph,
                            spacing: { after: 200 }
                        })
                    );
                });
            }
        });
        
        const blob = await docx.Packer.toBlob(doc);
        saveAs(blob, `transcription_${new Date().toISOString().slice(0, 10)}.docx`);
        showSuccess('DOCXファイルを保存しました。');
    } catch (error) {
        console.error('DOCX保存エラー:', error);
        showError('DOCX形式での保存に失敗しました。');
    }
}

function savePdf() {
    const text = getAllText(true);
    if (!text) {
        showError('保存するテキストがありません。');
        return;
    }
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            unit: 'mm',
            format: 'a4'
        });
        
        doc.addFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/ipag.ttf', 'ipag', 'normal');
        doc.setFont('ipag');
        
        let yPosition = 20;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;
        const lineHeight = 7;
        
        doc.setFontSize(16);
        doc.text('音声文字起こし結果', margin, yPosition);
        yPosition += lineHeight * 2;
        
        doc.setFontSize(10);
        doc.text(`作成日時: ${new Date().toLocaleString('ja-JP')}`, margin, yPosition);
        yPosition += lineHeight;
        doc.text(`総文字数: ${text.length}文字`, margin, yPosition);
        yPosition += lineHeight * 2;
        
        doc.setFontSize(11);
        
        sessions.forEach((session, index) => {
            if (yPosition > pageHeight - margin * 2) {
                doc.addPage();
                yPosition = margin;
            }
            
            doc.setFontSize(12);
            doc.text(`セッション ${index + 1} - ${session.timestamp}`, margin, yPosition);
            yPosition += lineHeight * 1.5;
            
            doc.setFontSize(11);
            let textToExport = session.text;
            
            if (includeTimestampsToggle.checked && session.segments && session.segments.length > 0) {
                textToExport = session.segments.map(segment => {
                    const minutes = Math.floor(segment.relativeTime / 60);
                    const seconds = segment.relativeTime % 60;
                    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    return `[${timeStr}] ${segment.text}`;
                }).join('\n');
            }
            
            const lines = doc.splitTextToSize(textToExport, 170);
            
            lines.forEach(line => {
                if (yPosition > pageHeight - margin) {
                    doc.addPage();
                    yPosition = margin;
                }
                doc.text(line, margin, yPosition);
                yPosition += lineHeight;
            });
            
            yPosition += lineHeight;
        });
        
        doc.save(`transcription_${new Date().toISOString().slice(0, 10)}.pdf`);
        showSuccess('PDFファイルを保存しました。');
    } catch (error) {
        console.error('PDF保存エラー:', error);
        showError('PDF形式での保存に失敗しました。日本語フォントの読み込みに問題がある可能性があります。');
    }
}

function saveMarkdown() {
    const text = getAllText(true);
    if (!text) {
        showError('保存するテキストがありません。');
        return;
    }
    
    let markdown = '# 音声文字起こし結果\n\n';
    markdown += `**作成日時:** ${new Date().toLocaleString('ja-JP')}\n\n`;
    markdown += `**総文字数:** ${text.length}文字\n\n`;
    markdown += `**セッション数:** ${sessions.length}\n\n`;
    markdown += '---\n\n';
    
    sessions.forEach((session, index) => {
        markdown += `## セッション ${index + 1}\n\n`;
        markdown += `**開始時刻:** ${session.timestamp}\n\n`;
        
        if (includeTimestampsToggle.checked && session.segments && session.segments.length > 0) {
            markdown += '### タイムスタンプ付き文字起こし\n\n';
            session.segments.forEach(segment => {
                const minutes = Math.floor(segment.relativeTime / 60);
                const seconds = segment.relativeTime % 60;
                const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                markdown += `- **[${timeStr}]** ${segment.text}\n`;
            });
            markdown += '\n';
        } else {
            markdown += '### 文字起こし内容\n\n';
            const paragraphs = session.text.split('\n').filter(p => p.trim());
            paragraphs.forEach(paragraph => {
                markdown += `${paragraph}\n\n`;
            });
        }
        
        markdown += '---\n\n';
    });
    
    markdown += '\n## メタデータ\n\n';
    markdown += '```json\n';
    markdown += JSON.stringify({
        exportDate: new Date().toISOString(),
        totalSessions: sessions.length,
        totalCharacters: text.length,
        includesTimestamps: includeTimestampsToggle.checked,
        sessions: sessions.map(session => ({
            id: session.id,
            startTime: session.startTime.toISOString(),
            timestamp: session.timestamp,
            segmentCount: session.segments ? session.segments.length : 0
        }))
    }, null, 2);
    markdown += '\n```\n';
    
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('Markdownファイルを保存しました。');
}

saveDocxBtn.addEventListener('click', saveDocx);
savePdfBtn.addEventListener('click', savePdf);
saveMdBtn.addEventListener('click', saveMarkdown);

function startAutoRestartTimer() {
    clearTimeout(recognitionTimeout);
    recognitionTimeout = setTimeout(() => {
        if (isRecording && recognition) {
            console.log('60秒経過により音声認識を再起動します');
            recognition.stop();
        }
    }, 55000);
}

function stopAutoRestartTimer() {
    clearTimeout(recognitionTimeout);
}

function startAudioVisualization() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            microphone = audioContext.createMediaStreamSource(stream);
            javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
            
            analyser.smoothingTimeConstant = 0.8;
            analyser.fftSize = 1024;
            
            microphone.connect(analyser);
            analyser.connect(javascriptNode);
            javascriptNode.connect(audioContext.destination);
            
            javascriptNode.onaudioprocess = () => {
                const array = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(array);
                const values = array.reduce((a, b) => a + b, 0);
                const average = values / array.length;
                
                updateNoiseLevel(average);
                
                if (average > 5) {
                    recordBtn.style.transform = `scale(${1 + average / 200})`;
                    clearTimeout(silenceTimeout);
                } else {
                    recordBtn.style.transform = 'scale(1)';
                    if (!silenceTimeout && isRecording) {
                        silenceTimeout = setTimeout(() => {
                            showError('長時間音声が検出されません。マイクの位置を確認してください。');
                        }, 10000);
                    }
                }
            };
        })
        .catch(err => {
            console.error('音声ビジュアライゼーションエラー:', err);
        });
}

function stopAudioVisualization() {
    if (javascriptNode) {
        javascriptNode.disconnect();
        javascriptNode = null;
    }
    if (microphone) {
        microphone.disconnect();
        microphone = null;
    }
    if (analyser) {
        analyser.disconnect();
        analyser = null;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    recordBtn.style.transform = 'scale(1)';
}

function autoSaveToLocalStorage() {
    const saveData = {
        sessions: sessions,
        lastSaved: new Date().toISOString()
    };
    localStorage.setItem('speechTranscriptionData', JSON.stringify(saveData));
}

function loadFromLocalStorage() {
    const savedData = localStorage.getItem('speechTranscriptionData');
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            sessions = data.sessions || [];
            sessions.forEach(session => {
                session.startTime = new Date(session.startTime);
            });
            updateTranscriptionDisplay();
            updateCharCount();
            if (sessions.length > 0) {
                showSuccess('前回のセッションを復元しました。');
            }
        } catch (e) {
            console.error('セッションの復元に失敗:', e);
        }
    }
}

function saveJson() {
    const text = getAllText();
    if (!text) {
        showError('保存するテキストがありません。');
        return;
    }
    
    const exportData = {
        exportDate: new Date().toISOString(),
        totalSessions: sessions.length,
        totalCharacters: text.length,
        sessions: sessions.map(session => ({
            id: session.id,
            startTime: session.startTime.toISOString(),
            timestamp: session.timestamp,
            text: session.text,
            segments: session.segments || []
        }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('JSONファイルを保存しました。');
}

const saveJsonBtn = document.createElement('button');
saveJsonBtn.className = 'action-btn';
saveJsonBtn.innerHTML = '<span class="material-icons">data_object</span>JSON';
saveJsonBtn.setAttribute('aria-label', 'JSONファイルとして保存');
saveJsonBtn.addEventListener('click', saveJson);

const exportActions = document.querySelector('.export-actions');
exportActions.appendChild(saveJsonBtn);

window.addEventListener('beforeunload', (e) => {
    if (isRecording) {
        e.preventDefault();
        e.returnValue = '録音中です。ページを離れると録音が停止されます。';
    }
});

const searchBtn = document.getElementById('searchBtn');
const searchBox = document.getElementById('searchBox');
const searchInput = document.getElementById('searchInput');
const replaceInput = document.getElementById('replaceInput');
const searchPrevBtn = document.getElementById('searchPrevBtn');
const searchNextBtn = document.getElementById('searchNextBtn');
const searchCount = document.getElementById('searchCount');
const replaceBtn = document.getElementById('replaceBtn');
const replaceAllBtn = document.getElementById('replaceAllBtn');
const closeSearchBtn = document.getElementById('closeSearchBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');

function saveState() {
    const state = {
        sessions: JSON.parse(JSON.stringify(sessions)),
        timestamp: Date.now()
    };
    undoStack.push(state);
    redoStack = [];
    
    if (undoStack.length > 50) {
        undoStack.shift();
    }
    
    updateUndoRedoButtons();
}

function undo() {
    if (undoStack.length > 1) {
        const currentState = undoStack.pop();
        redoStack.push(currentState);
        
        const previousState = undoStack[undoStack.length - 1];
        sessions = JSON.parse(JSON.stringify(previousState.sessions));
        
        updateTranscriptionDisplay();
        updateCharCount();
        updateUndoRedoButtons();
        autoSaveToLocalStorage();
    }
}

function redo() {
    if (redoStack.length > 0) {
        const state = redoStack.pop();
        undoStack.push(state);
        
        sessions = JSON.parse(JSON.stringify(state.sessions));
        
        updateTranscriptionDisplay();
        updateCharCount();
        updateUndoRedoButtons();
        autoSaveToLocalStorage();
    }
}

function updateUndoRedoButtons() {
    undoBtn.disabled = undoStack.length <= 1;
    redoBtn.disabled = redoStack.length === 0;
}

function openSearch() {
    searchBox.classList.remove('hidden');
    searchInput.focus();
    searchInput.select();
}

function closeSearch() {
    searchBox.classList.add('hidden');
    clearHighlights();
    searchMatches = [];
    currentSearchIndex = 0;
    updateSearchCount();
}

function performSearch() {
    const searchTerm = searchInput.value;
    if (!searchTerm) {
        clearHighlights();
        searchMatches = [];
        updateSearchCount();
        return;
    }
    
    clearHighlights();
    searchMatches = [];
    
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const content = transcriptionResult.innerText;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
        searchMatches.push({
            index: match.index,
            length: match[0].length
        });
    }
    
    highlightMatches();
    if (searchMatches.length > 0) {
        currentSearchIndex = 0;
        scrollToMatch(currentSearchIndex);
    }
    updateSearchCount();
}

function highlightMatches() {
    if (searchMatches.length === 0) return;
    
    const sessionDivs = transcriptionResult.querySelectorAll('.session');
    sessionDivs.forEach((sessionDiv, sessionIndex) => {
        const session = sessions[sessionIndex];
        if (!session) return;
        
        let html = session.text;
        const searchTerm = searchInput.value;
        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        
        html = html.replace(regex, '<span class="highlight">$1</span>');
        
        sessionDiv.innerHTML = `<div class="session-header">セッション ${sessionIndex + 1} - ${session.timestamp}</div><span class="final">${html}</span>`;
    });
    
    updateCurrentHighlight();
}

function clearHighlights() {
    const highlights = transcriptionResult.querySelectorAll('.highlight');
    highlights.forEach(highlight => {
        const text = highlight.textContent;
        const parent = highlight.parentNode;
        highlight.replaceWith(text);
    });
}

function updateCurrentHighlight() {
    const highlights = transcriptionResult.querySelectorAll('.highlight');
    highlights.forEach((highlight, index) => {
        highlight.classList.toggle('current', index === currentSearchIndex);
    });
}

function scrollToMatch(index) {
    const highlights = transcriptionResult.querySelectorAll('.highlight');
    if (highlights[index]) {
        highlights[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function searchPrev() {
    if (searchMatches.length === 0) return;
    currentSearchIndex = (currentSearchIndex - 1 + searchMatches.length) % searchMatches.length;
    updateCurrentHighlight();
    scrollToMatch(currentSearchIndex);
    updateSearchCount();
}

function searchNext() {
    if (searchMatches.length === 0) return;
    currentSearchIndex = (currentSearchIndex + 1) % searchMatches.length;
    updateCurrentHighlight();
    scrollToMatch(currentSearchIndex);
    updateSearchCount();
}

function updateSearchCount() {
    if (searchMatches.length === 0) {
        searchCount.textContent = '0/0';
    } else {
        searchCount.textContent = `${currentSearchIndex + 1}/${searchMatches.length}`;
    }
}

function replaceOne() {
    if (searchMatches.length === 0 || !replaceInput.value) return;
    
    saveState();
    
    const searchTerm = searchInput.value;
    const replaceTerm = replaceInput.value;
    
    sessions.forEach(session => {
        const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const match = session.text.match(regex);
        if (match) {
            session.text = session.text.replace(regex, replaceTerm);
            return;
        }
    });
    
    updateTranscriptionDisplay();
    updateCharCount();
    performSearch();
    autoSaveToLocalStorage();
}

function replaceAll() {
    if (searchMatches.length === 0 || !replaceInput.value) return;
    
    saveState();
    
    const searchTerm = searchInput.value;
    const replaceTerm = replaceInput.value;
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    
    sessions.forEach(session => {
        session.text = session.text.replace(regex, replaceTerm);
    });
    
    updateTranscriptionDisplay();
    updateCharCount();
    performSearch();
    autoSaveToLocalStorage();
    
    showSuccess(`${searchMatches.length}件を置換しました。`);
}

searchBtn.addEventListener('click', openSearch);
closeSearchBtn.addEventListener('click', closeSearch);
searchInput.addEventListener('input', performSearch);
searchPrevBtn.addEventListener('click', searchPrev);
searchNextBtn.addEventListener('click', searchNext);
replaceBtn.addEventListener('click', replaceOne);
replaceAllBtn.addEventListener('click', replaceAll);
undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
            searchPrev();
        } else {
            searchNext();
        }
    } else if (e.key === 'Escape') {
        closeSearch();
    }
});

const helpModal = document.getElementById('helpModal');
const closeHelpBtn = document.getElementById('closeHelpBtn');

function openHelp() {
    helpModal.classList.remove('hidden');
}

function closeHelp() {
    helpModal.classList.add('hidden');
}

closeHelpBtn.addEventListener('click', closeHelp);
helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) {
        closeHelp();
    }
});

document.addEventListener('keydown', (e) => {
    // テキスト入力中でない場合のショートカット
    const isInputting = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true';
    
    if (!isInputting) {
        if (e.key === ' ') {
            e.preventDefault();
            if (isRecording) {
                stopRecording();
            } else {
                startRecording();
            }
        } else if (e.key === '?') {
            e.preventDefault();
            openHelp();
        }
    }
    
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'f') {
            e.preventDefault();
            openSearch();
        } else if (e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
        } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
            e.preventDefault();
            redo();
        } else if (e.key === 's') {
            e.preventDefault();
            saveTxt();
        } else if (e.key === 'n') {
            e.preventDefault();
            newSession();
        }
    }
});

transcriptionResult.addEventListener('input', () => {
    if (!isRecording && sessions.length > 0) {
        saveState();
        const sessionDivs = transcriptionResult.querySelectorAll('.session');
        sessions.forEach((session, index) => {
            if (sessionDivs[index]) {
                const textContent = sessionDivs[index].querySelector('.final').textContent;
                session.text = textContent;
            }
        });
        updateCharCount();
        autoSaveToLocalStorage();
    }
});

saveState();
updateUndoRedoButtons();

function updateNoiseLevel(level) {
    noiseIndicator.classList.remove('hidden');
    noiseIndicator.classList.remove('low', 'medium', 'high');
    
    if (level < noiseThreshold.low) {
        noiseLevel.textContent = '低';
        noiseIndicator.classList.add('low');
        noiseWarningShown = false;
    } else if (level < noiseThreshold.medium) {
        noiseLevel.textContent = '中';
        noiseIndicator.classList.add('medium');
        if (!noiseWarningShown) {
            showError('周囲のノイズが検出されています。静かな環境での録音を推奨します。');
            noiseWarningShown = true;
        }
    } else {
        noiseLevel.textContent = '高';
        noiseIndicator.classList.add('high');
        if (!noiseWarningShown) {
            showError('ノイズレベルが高いです。認識精度が低下する可能性があります。');
            noiseWarningShown = true;
        }
    }
}

function stopRecording() {
    isRecording = false;
    recordBtn.classList.remove('recording');
    recordBtn.querySelector('.record-icon').textContent = 'mic';
    recordBtn.querySelector('.record-text').textContent = '録音開始';
    
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
    
    clearTimeout(recognitionTimeout);
    clearTimeout(silenceTimeout);
    stopAutoRestartTimer();
    stopAudioVisualization();
    
    noiseIndicator.classList.add('hidden');
    noiseWarningShown = false;
    
    updateRecordingStatus('待機中');
    recordingTime.textContent = '00:00';
    
    transcriptionResult.contentEditable = true;
    
    if (recognition) {
        recognition.stop();
    }
    
    autoSaveToLocalStorage();
}

const customDictionary = {
    words: [],
    
    load() {
        const saved = localStorage.getItem('customDictionary');
        if (saved) {
            this.words = JSON.parse(saved);
        }
    },
    
    save() {
        localStorage.setItem('customDictionary', JSON.stringify(this.words));
    },
    
    add(word) {
        if (word && !this.words.includes(word)) {
            this.words.push(word);
            this.save();
            showSuccess(`「${word}」を辞書に追加しました。`);
        }
    },
    
    remove(word) {
        const index = this.words.indexOf(word);
        if (index > -1) {
            this.words.splice(index, 1);
            this.save();
            showSuccess(`「${word}」を辞書から削除しました。`);
        }
    },
    
    applyToText(text) {
        this.words.forEach(word => {
            const regex = new RegExp(word.split('').join('\\s*'), 'gi');
            text = text.replace(regex, word);
        });
        return text;
    }
};

function startMemoryManagement() {
    stopMemoryManagement();
    
    memoryCheckInterval = setInterval(() => {
        // セッションの文字数チェック
        if (currentSession && currentSession.text.length > MAX_SESSION_LENGTH) {
            showError('セッションの文字数が上限に達しました。新しいセッションを開始します。');
            stopRecording();
            setTimeout(() => {
                startRecording();
            }, 1000);
        }
        
        // メモリ使用量の監視
        if (performance.memory) {
            const usedMemory = performance.memory.usedJSHeapSize;
            const totalMemory = performance.memory.totalJSHeapSize;
            const memoryUsagePercent = (usedMemory / totalMemory) * 100;
            
            if (memoryUsagePercent > 90) {
                showError('メモリ使用量が高くなっています。古いセッションを削除することを推奨します。');
            }
        }
        
        // 古いUndoスタックの削除
        if (undoStack.length > 100) {
            undoStack = undoStack.slice(-50);
        }
    }, 30000); // 30秒ごとにチェック
}

function stopMemoryManagement() {
    if (memoryCheckInterval) {
        clearInterval(memoryCheckInterval);
        memoryCheckInterval = null;
    }
}

function stopRecording() {
    isRecording = false;
    recordBtn.classList.remove('recording');
    recordBtn.querySelector('.record-icon').textContent = 'mic';
    recordBtn.querySelector('.record-text').textContent = '録音開始';
    
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
    
    clearTimeout(recognitionTimeout);
    clearTimeout(silenceTimeout);
    stopAutoRestartTimer();
    stopAudioVisualization();
    stopMemoryManagement();
    
    noiseIndicator.classList.add('hidden');
    noiseWarningShown = false;
    
    updateRecordingStatus('待機中');
    recordingTime.textContent = '00:00';
    
    transcriptionResult.contentEditable = true;
    
    if (recognition) {
        recognition.stop();
    }
    
    autoSaveToLocalStorage();
}

function expandSession(sessionId) {
    const session = sessions.find(s => s.id == sessionId);
    if (!session) return;
    
    const sessionDiv = document.querySelector(`[data-session-id="${sessionId}"]`);
    if (!sessionDiv) return;
    
    const textSpan = sessionDiv.querySelector('.session-text');
    if (textSpan) {
        textSpan.innerHTML = session.text + ' <button class="expand-btn" onclick="collapseSession(\'' + sessionId + '\')">折りたたむ</button>';
    }
}

function collapseSession(sessionId) {
    const session = sessions.find(s => s.id == sessionId);
    if (!session) return;
    
    const sessionDiv = document.querySelector(`[data-session-id="${sessionId}"]`);
    if (!sessionDiv) return;
    
    const textSpan = sessionDiv.querySelector('.session-text');
    if (textSpan && session.text.length > 1000) {
        const preview = session.text.substring(0, 1000);
        textSpan.innerHTML = preview + '<span class="text-more">... <button class="expand-btn" onclick="expandSession(\'' + sessionId + '\')">全文を表示</button></span>';
    }
}

// グローバルスコープに公開
window.expandSession = expandSession;
window.collapseSession = collapseSession;

customDictionary.load();

// ブラウザ互換性チェック
function checkBrowserCompatibility() {
    const warnings = [];
    
    // Web Speech API
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        warnings.push('このブラウザは音声認識に対応していません。Chrome、Edge、またはSafariをご利用ください。');
    }
    
    // MediaStream API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        warnings.push('このブラウザはマイクアクセスに対応していません。');
    }
    
    // LocalStorage
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
    } catch (e) {
        warnings.push('ローカルストレージが使用できません。設定が保存されない可能性があります。');
    }
    
    // Performance API
    if (!window.performance || !window.performance.memory) {
        console.warn('Performance APIが利用できません。メモリ監視機能が制限されます。');
    }
    
    // ブラウザ判定
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('firefox')) {
        warnings.push('Firefoxは音声認識に対応していません。Chrome、Edge、またはSafariをご利用ください。');
    }
    
    // 警告表示
    if (warnings.length > 0) {
        setTimeout(() => {
            warnings.forEach(warning => showError(warning));
        }, 1000);
    }
    
    return warnings.length === 0;
}

// 初期化
checkBrowserCompatibility();
loadSettings();
initializeSpeechRecognition();
loadFromLocalStorage();