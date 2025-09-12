/**
 * D1/R2ハイブリッド問題データ取得ライブラリ
 * 問題を解くページ用 - 問題データはD1から、音声はR2から
 */

class QuestaQuestionLoader {
    constructor(options = {}) {
        this.d1BaseURL = options.d1BaseURL || '/api/d1';
        this.fallbackPath = options.fallbackPath || '/data/questions';
        this.cache = new Map();
    }

    // 問題データを取得（D1優先、静的JSONフォールバック）
    async loadQuestions(subject, category = null) {
        const cacheKey = `${subject}-${category || 'all'}`;
        
        // キャッシュチェック
        if (this.cache.has(cacheKey)) {
            console.log(`📋 キャッシュから取得: ${cacheKey}`);
            return this.cache.get(cacheKey);
        }

        try {
            // D1から取得を試行
            const d1Data = await this.loadFromD1(subject, category);
            
            if (d1Data.questions.length > 0) {
                // キャッシュに保存（5分間）
                this.cache.set(cacheKey, d1Data.questions);
                setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
                
                console.log(`🟢 D1から取得: ${subject}/${category || 'all'} (${d1Data.questions.length}問)`);
                return d1Data.questions;
            }
        } catch (error) {
            console.warn('D1取得失敗、フォールバック使用:', error.message);
        }

        // フォールバック: 静的JSONファイル
        return this.loadFromStatic(subject, category);
    }

    // D1から問題データ取得
    async loadFromD1(subject, category = null) {
        const params = new URLSearchParams({ subject });
        if (category) {
            params.append('topic', category);
        }
        
        const response = await fetch(`${this.d1BaseURL}/questions?${params}`);
        
        if (!response.ok) {
            throw new Error(`D1取得失敗: ${response.status}`);
        }
        
        return response.json();
    }

    // 静的JSONファイルから取得
    async loadFromStatic(subject, category) {
        const fileMappings = {
            'english-vocab': {
                lev1: ['english-vocab-lev1.json'],
                lev2: ['english-vocab-lev2.json'],
                lev3: ['english-vocab-lev3.json'],
                lev4: ['english-vocab-lev4.json'],
                all: ['english-vocab-lev1.json', 'english-vocab-lev2.json', 'english-vocab-lev3.json', 'english-vocab-lev4.json']
            },
            english: {
                vocab: ['english-vocab-lev1.json', 'english-vocab-lev2.json', 'english-vocab-lev3.json', 'english-vocab-lev4.json'],
                grammar: ['english-grammar-basic.json', 'english-grammar-4a.json'],
                reading: [], // 追加予定
                listening: [], // 追加予定
                summary: [] // 追加予定
            },
            math: {
                basic: ['math.json', 'math1a.json', 'math2b.json']
            }
        };

        const mapping = fileMappings[subject];
        if (!mapping) {
            console.error(`未対応の教科: ${subject}`);
            return [];
        }

        let allQuestions = [];

        if (category && mapping[category]) {
            // 特定カテゴリのファイルを読み込み
            const files = mapping[category];
            for (const file of files) {
                try {
                    const questions = await this.loadJSONFile(`${this.fallbackPath}/${file}`);
                    allQuestions = allQuestions.concat(questions);
                } catch (error) {
                    console.warn(`ファイル読み込み失敗: ${file}`, error);
                }
            }
        } else {
            // 全カテゴリのファイルを読み込み
            for (const [cat, files] of Object.entries(mapping)) {
                for (const file of files) {
                    try {
                        const questions = await this.loadJSONFile(`${this.fallbackPath}/${file}`);
                        // カテゴリ情報を追加
                        const categorizedQuestions = questions.map(q => ({
                            ...q,
                            category: q.category || cat
                        }));
                        allQuestions = allQuestions.concat(categorizedQuestions);
                    } catch (error) {
                        console.warn(`ファイル読み込み失敗: ${file}`, error);
                    }
                }
            }
        }

        console.log(`📁 静的ファイルから取得: ${subject}/${category} (${allQuestions.length}問)`);
        return allQuestions;
    }

    // JSONファイル読み込み
    async loadJSONFile(path) {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load: ${path}`);
        }
        return response.json();
    }

    // キャッシュクリア
    clearCache() {
        this.cache.clear();
        console.log('🗑️ 問題キャッシュをクリアしました');
    }

    // 音声ファイルURL取得（R2対応）
    getAudioURL(audioFile) {
        if (typeof audioFile === 'string') {
            // レガシー形式（相対パス）
            return audioFile;
        } else if (audioFile && audioFile.r2Url) {
            // R2形式
            return audioFile.r2Url;
        } else if (audioFile && audioFile.publicUrl) {
            // 公開URL形式
            return audioFile.publicUrl;
        }
        return null;
    }
}

// グローバルインスタンス
window.questionLoader = new QuestaQuestionLoader();

// 既存のloadQuestions関数を置き換え
window.loadQuestions = async function(subject, category = null) {
    return window.questionLoader.loadQuestions(subject, category);
};

console.log('📚 Questa Question Loader 初期化完了');