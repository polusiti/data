/**
 * シンプル認証対応コメントシステム
 * ID/パスワード認証でのテスト実装
 */

class CommentSystem {
    constructor() {
        console.log('🚀 CommentSystem constructor開始');
        
        // 状態管理
        this.currentUser = null;
        this.currentProblemId = 'math_001';
        this.comments = [];
        
        // DOM要素の取得を安全に行う
        this.elements = this.initializeElements();
        
        // 重要な要素が存在するかチェック
        const requiredElements = ['loginBtn', 'authModal', 'authenticateBtn'];
        const missingElements = requiredElements.filter(key => !this.elements[key]);
        
        if (missingElements.length > 0) {
            console.error('❌ 必要なDOM要素が見つかりません:', missingElements);
            console.log('📄 現在のHTML構造を確認してください');
            return;
        }
        
        this.initializeEventListeners();
        this.loadComments();
        this.initializeSampleComments();
        
        console.log('💬 シンプル認証コメントシステム初期化完了');
    }
    
    initializeElements() {
        const elements = {};
        
        // 各要素を安全に取得
        const elementIds = {
            currentUser: 'currentUser',
            loginBtn: 'loginBtn',
            logoutBtn: 'logoutBtn',
            authModal: 'authModal',
            closeModal: 'closeModal',
            userId: 'userId',
            password: 'password',
            authenticateBtn: 'authenticateBtn',
            cancelBtn: 'cancelBtn',
            commentForm: 'commentForm',
            loginPrompt: 'loginPrompt',
            commentType: 'commentType',
            commentText: 'commentText',
            postComment: 'postComment',
            cancelComment: 'cancelComment',
            commentsList: 'commentsList',
            commentCount: 'commentCount',
            refreshComments: 'refreshComments',
            commentsLoading: 'commentsLoading',
            noComments: 'noComments',
            submitAnswer: 'submitAnswer'
        };
        
        for (const [key, id] of Object.entries(elementIds)) {
            elements[key] = document.getElementById(id);
            if (!elements[key]) {
                console.warn(`⚠️ 要素が見つかりません: ${id}`);
            } else {
                console.log(`✅ 要素発見: ${id}`);
            }
        }
        
        return elements;
    }
    
    initializeEventListeners() {
        console.log('🔧 イベントリスナー初期化中...');
        
        // 各ボタンのイベントリスナーを安全に設定
        this.safeAddEventListener('loginBtn', 'click', () => {
            console.log('🔑 ログインボタンクリック');
            this.showAuthModal();
        });
        
        this.safeAddEventListener('logoutBtn', 'click', () => {
            console.log('👋 ログアウトボタンクリック');
            this.logout();
        });
        
        this.safeAddEventListener('closeModal', 'click', () => {
            console.log('❌ モーダル閉じるボタンクリック');
            this.hideAuthModal();
        });
        
        this.safeAddEventListener('cancelBtn', 'click', () => {
            console.log('❌ キャンセルボタンクリック');
            this.hideAuthModal();
        });
        
        this.safeAddEventListener('authenticateBtn', 'click', () => {
            console.log('🔐 認証ボタンクリック');
            this.authenticate();
        });
        
        // コメント関連
        this.safeAddEventListener('postComment', 'click', () => this.postComment());
        this.safeAddEventListener('cancelComment', 'click', () => this.cancelComment());
        this.safeAddEventListener('refreshComments', 'click', () => this.loadComments());
        this.safeAddEventListener('submitAnswer', 'click', () => this.submitAnswer());
        
        // モーダル外クリックで閉じる
        if (this.elements.authModal) {
            this.elements.authModal.addEventListener('click', (e) => {
                if (e.target === this.elements.authModal) {
                    this.hideAuthModal();
                }
            });
        }
        
        // Enterキーでの操作
        this.safeAddEventListener('userId', 'keypress', (e) => {
            if (e.key === 'Enter' && this.elements.password) {
                this.elements.password.focus();
            }
        });
        
        this.safeAddEventListener('password', 'keypress', (e) => {
            if (e.key === 'Enter') {
                this.authenticate();
            }
        });
        
        console.log('✅ イベントリスナー初期化完了');
    }
    
    // 安全なイベントリスナー追加
    safeAddEventListener(elementKey, eventType, callback) {
        const element = this.elements[elementKey];
        if (element) {
            element.addEventListener(eventType, callback);
            console.log(`✅ ${elementKey}にイベントリスナー設定成功`);
        } else {
            console.warn(`⚠️ ${elementKey}が見つからないため、イベントリスナー設定をスキップ`);
        }
    }
    
    // シンプル認証システム
    showAuthModal() {
        if (this.elements.authModal) {
            this.elements.authModal.style.display = 'block';
            if (this.elements.userId) {
                this.elements.userId.focus();
            }
            console.log('📱 認証モーダル表示');
        } else {
            console.error('❌ authModalが見つかりません');
        }
    }
    
    hideAuthModal() {
        if (this.elements.authModal) {
            this.elements.authModal.style.display = 'none';
            this.clearAuthForm();
            console.log('❌認証モーダル非表示');
        }
    }
    
    clearAuthForm() {
        if (this.elements.userId) this.elements.userId.value = '';
        if (this.elements.password) this.elements.password.value = '';
    }
    
    async authenticate() {
        if (!this.elements.userId || !this.elements.password) {
            console.error('❌ 認証フォーム要素が見つかりません');
            return;
        }
        
        const userId = this.elements.userId.value.trim();
        const password = this.elements.password.value.trim();
        
        if (!userId || !password) {
            this.showNotification('ユーザーIDとパスワードを入力してください', 'error');
            return;
        }
        
        // テスト用認証: ID=1, Password=123
        if (userId === '1' && password === '123') {
            this.currentUser = {
                id: '1',
                username: 'testuser',
                displayName: 'テストユーザー',
                loginTime: new Date().toISOString()
            };
            
            this.updateUserInterface();
            this.hideAuthModal();
            this.showNotification(`${this.currentUser.displayName}さん、ログインしました！`, 'success');
            console.log('✅ ログイン成功:', this.currentUser);
            
        } else {
            this.showNotification('ユーザーIDまたはパスワードが間違っています', 'error');
            console.log('❌ ログイン失敗: 無効な認証情報');
        }
    }
    
    logout() {
        this.currentUser = null;
        this.updateUserInterface();
        this.showNotification('👋 ログアウトしました', 'info');
        console.log('👋 ログアウト完了');
    }
    
    updateUserInterface() {
        if (this.currentUser) {
            if (this.elements.currentUser) {
                this.elements.currentUser.textContent = this.currentUser.displayName || this.currentUser.username;
            }
            if (this.elements.loginBtn) this.elements.loginBtn.style.display = 'none';
            if (this.elements.logoutBtn) this.elements.logoutBtn.style.display = 'inline-block';
            if (this.elements.commentForm) this.elements.commentForm.style.display = 'block';
            if (this.elements.loginPrompt) this.elements.loginPrompt.style.display = 'none';
        } else {
            if (this.elements.currentUser) {
                this.elements.currentUser.textContent = '未認証';
            }
            if (this.elements.loginBtn) this.elements.loginBtn.style.display = 'inline-block';
            if (this.elements.logoutBtn) this.elements.logoutBtn.style.display = 'none';
            if (this.elements.commentForm) this.elements.commentForm.style.display = 'none';
            if (this.elements.loginPrompt) this.elements.loginPrompt.style.display = 'block';
        }
        
        console.log('🔄 UI更新完了 - ユーザー状態:', this.currentUser ? 'ログイン済み' : '未認証');
    }
    
    // コメントシステム
    async postComment() {
        if (!this.currentUser) {
            this.showAuthModal();
            return;
        }
        
        const type = this.elements.commentType.value;
        const text = this.elements.commentText.value.trim();
        
        if (!text) {
            this.showNotification('コメント内容を入力してください', 'error');
            return;
        }
        
        const comment = {
            id: Date.now().toString(),
            problemId: this.currentProblemId,
            userId: this.currentUser.id,
            username: this.currentUser.displayName || this.currentUser.username,
            type: type,
            text: text,
            timestamp: new Date(),
            likes: 0,
            replies: []
        };
        
        // コメントを保存（実際の実装ではサーバーに送信）
        this.comments.unshift(comment);
        this.saveCommentsToStorage();
        
        // UIを更新
        this.cancelComment();
        this.renderComments();
        this.showNotification('💬 コメントを投稿しました！', 'success');
    }
    
    cancelComment() {
        this.elements.commentText.value = '';
        this.elements.commentType.value = 'question';
    }
    
    async loadComments() {
        this.showCommentsLoading(true);
        
        // ローカルストレージからコメントを読み込み
        try {
            const savedComments = localStorage.getItem('comments_' + this.currentProblemId);
            if (savedComments) {
                this.comments = JSON.parse(savedComments);
            }
        } catch (error) {
            console.error('コメント読み込みエラー:', error);
        }
        
        // 読み込み遅延をシミュレート
        setTimeout(() => {
            this.showCommentsLoading(false);
            this.renderComments();
        }, 500);
    }
    
    saveCommentsToStorage() {
        try {
            localStorage.setItem('comments_' + this.currentProblemId, JSON.stringify(this.comments));
        } catch (error) {
            console.error('コメント保存エラー:', error);
        }
    }
    
    renderComments() {
        const container = this.elements.commentsList;
        container.innerHTML = '';
        
        // コメント数を更新
        this.elements.commentCount.textContent = `${this.comments.length}件のコメント`;
        
        if (this.comments.length === 0) {
            this.elements.noComments.style.display = 'block';
            return;
        } else {
            this.elements.noComments.style.display = 'none';
        }
        
        this.comments.forEach(comment => {
            const commentElement = this.createCommentElement(comment);
            container.appendChild(commentElement);
        });
    }
    
    createCommentElement(comment) {
        const div = document.createElement('div');
        div.className = 'comment-item';
        div.innerHTML = `
            <div class="comment-header-info">
                <span class="comment-author">👤 ${comment.username}</span>
                <div>
                    <span class="comment-type ${comment.type}">${this.getCommentTypeLabel(comment.type)}</span>
                    <span class="comment-time">${this.formatTime(comment.timestamp)}</span>
                </div>
            </div>
            <div class="comment-text">${this.escapeHtml(comment.text)}</div>
            <div class="comment-actions">
                <button class="btn btn-small" onclick="commentSystem.likeComment('${comment.id}')">
                    👍 ${comment.likes}
                </button>
                <button class="btn btn-small" onclick="commentSystem.replyToComment('${comment.id}')">
                    💬 返信
                </button>
                ${comment.userId === (this.currentUser?.id) ? 
                    `<button class="btn btn-small btn-secondary" onclick="commentSystem.deleteComment('${comment.id}')">
                        🗑️ 削除
                    </button>` : ''}
            </div>
        `;
        return div;
    }
    
    getCommentTypeLabel(type) {
        const labels = {
            question: '❓ 質問',
            explanation: '💡 解説',
            hint: '🔍 ヒント',
            discussion: '💭 議論',
            feedback: '📝 フィードバック'
        };
        return labels[type] || type;
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffMinutes < 1) return 'たった今';
        if (diffMinutes < 60) return `${diffMinutes}分前`;
        
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours}時間前`;
        
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}日前`;
        
        return date.toLocaleDateString('ja-JP');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/\\n/g, '<br>');
    }
    
    showCommentsLoading(show) {
        this.elements.commentsLoading.style.display = show ? 'block' : 'none';
    }
    
    // コメントアクション
    async likeComment(commentId) {
        const comment = this.comments.find(c => c.id === commentId);
        if (comment) {
            comment.likes += 1;
            this.saveCommentsToStorage();
            this.renderComments();
            this.showNotification('いいね！を追加しました', 'success');
        }
    }
    
    async replyToComment(commentId) {
        if (!this.currentUser) {
            this.showAuthModal();
            return;
        }
        
        const reply = prompt('返信内容を入力してください:');
        if (reply && reply.trim()) {
            const comment = this.comments.find(c => c.id === commentId);
            if (comment) {
                comment.replies.push({
                    id: Date.now().toString(),
                    userId: this.currentUser.id,
                    username: this.currentUser.displayName || this.currentUser.username,
                    text: reply.trim(),
                    timestamp: new Date()
                });
                this.saveCommentsToStorage();
                this.renderComments();
                this.showNotification('💬 返信を投稿しました', 'success');
            }
        }
    }
    
    async deleteComment(commentId) {
        if (confirm('このコメントを削除しますか？')) {
            this.comments = this.comments.filter(c => c.id !== commentId);
            this.saveCommentsToStorage();
            this.renderComments();
            this.showNotification('コメントを削除しました', 'info');
        }
    }
    
    // 回答システム
    submitAnswer() {
        const selectedAnswer = document.querySelector('input[name="answer"]:checked');
        if (!selectedAnswer) {
            alert('回答を選択してください');
            return;
        }
        
        const answer = selectedAnswer.value;
        const correct = answer === 'A'; // 正解はA) x = -2, -3
        
        if (correct) {
            this.showNotification('🎉 正解です！', 'success');
        } else {
            this.showNotification('❌ 不正解です。もう一度考えてみてください', 'error');
        }
        
        // 自動的にコメントを促す
        setTimeout(() => {
            if (this.currentUser) {
                alert('解法についてコメントを残して他の学習者と議論してみませんか？');
            }
        }, 2000);
    }
    
    // 通知システム
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 1001;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // アニメーション
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 自動削除
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // サンプルデータの初期化
    initializeSampleComments() {
        const sampleComments = [
            {
                id: 'sample_1',
                problemId: this.currentProblemId,
                userId: 'sample_user_1',
                username: '数学太郎',
                type: 'explanation',
                text: 'この問題は因数分解で解けます！\nx² + 5x + 6 = (x + 2)(x + 3) = 0\nなので x = -2 または x = -3 が答えです。',
                timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30分前
                likes: 5,
                replies: []
            },
            {
                id: 'sample_2',
                problemId: this.currentProblemId,
                userId: 'sample_user_2',
                username: '学習花子',
                type: 'question',
                text: '因数分解のやり方がよく分かりません。もう少し詳しく教えてもらえますか？',
                timestamp: new Date(Date.now() - 1000 * 60 * 28), // 28分前
                likes: 2,
                replies: []
            },
            {
                id: 'sample_3',
                problemId: this.currentProblemId,
                userId: 'sample_user_3',
                username: '解法マスター',
                type: 'hint',
                text: '💡 ヒント：x² + 5x + 6 で、2つの数の積が6、和が5になる数を見つけてみてください。2と3がポイントです！',
                timestamp: new Date(Date.now() - 1000 * 60 * 26), // 26分前
                likes: 8,
                replies: []
            },
            {
                id: 'sample_4',
                problemId: this.currentProblemId,
                userId: 'sample_user_4',
                username: '中学生みき',
                type: 'question',
                text: '答えがマイナスになるのはなぜですか？普通の数じゃだめなんですか？',
                timestamp: new Date(Date.now() - 1000 * 60 * 24), // 24分前
                likes: 1,
                replies: []
            },
            {
                id: 'sample_5',
                problemId: this.currentProblemId,
                userId: 'sample_user_5',
                username: '先生A',
                type: 'explanation',
                text: '素晴らしい質問ですね！方程式 x² + 5x + 6 = 0 は「xの値を求めよ」という問題です。この場合、x = -2 と x = -3 を代入すると式が0になることを確認できます。実際に代入してみましょう：\n(-2)² + 5×(-2) + 6 = 4 - 10 + 6 = 0 ✓',
                timestamp: new Date(Date.now() - 1000 * 60 * 22), // 22分前
                likes: 12,
                replies: []
            },
            {
                id: 'sample_6',
                problemId: this.currentProblemId,
                userId: 'sample_user_6',
                username: '高校生けん',
                type: 'discussion',
                text: '解の公式を使って解くこともできますよね。x = (-5 ± √(25-24)) / 2 = (-5 ± 1) / 2 で、x = -2, -3 になります。',
                timestamp: new Date(Date.now() - 1000 * 60 * 20), // 20分前
                likes: 6,
                replies: []
            },
            {
                id: 'sample_7',
                problemId: this.currentProblemId,
                userId: 'sample_user_7',
                username: 'プログラマーさとし',
                type: 'feedback',
                text: 'この問題、プログラムで解を確認してみました！\nfor (let x = -10; x <= 10; x++) {\n  if (x*x + 5*x + 6 === 0) console.log(x);\n}\n結果: -3, -2 が出力されました。数学とプログラミングって繋がってますね！',
                timestamp: new Date(Date.now() - 1000 * 60 * 18), // 18分前
                likes: 9,
                replies: []
            },
            {
                id: 'sample_8',
                problemId: this.currentProblemId,
                userId: 'sample_user_8',
                username: 'ママ友ゆき',
                type: 'discussion',
                text: '息子に教えるのに苦労してます💦 因数分解って社会人になっても使うんですか？',
                timestamp: new Date(Date.now() - 1000 * 60 * 16), // 16分前
                likes: 3,
                replies: []
            },
            {
                id: 'sample_9',
                problemId: this.currentProblemId,
                userId: 'sample_user_9',
                username: '数学博士',
                type: 'explanation',
                text: 'はい、因数分解は様々な分野で活用されています！\n・コンピューターサイエンス（暗号化）\n・工学（信号処理、制御理論）\n・経済学（最適化問題）\n・物理学（波動方程式）\n基礎的な数学こそ、応用範囲が広いのです。',
                timestamp: new Date(Date.now() - 1000 * 60 * 14), // 14分前
                likes: 15,
                replies: []
            },
            {
                id: 'sample_10',
                problemId: this.currentProblemId,
                userId: 'sample_user_10',
                username: '受験生りく',
                type: 'hint',
                text: '覚え方のコツ：「かけて6、足して5」と覚えると良いですよ！\n1×6=6, 1+6=7 ❌\n2×3=6, 2+3=5 ✅\nこれで (x+2)(x+3) だとわかります！',
                timestamp: new Date(Date.now() - 1000 * 60 * 12), // 12分前
                likes: 4,
                replies: []
            },
            {
                id: 'sample_11',
                problemId: this.currentProblemId,
                userId: 'sample_user_11',
                username: '塾講師まり',
                type: 'explanation',
                text: '生徒によく教える方法です📚\n①まず x² + 5x + 6 を見る\n②かけて6、足して5になる2つの数は？\n③2と3！\n④だから (x+2)(x+3) = 0\n⑤x+2=0 または x+3=0\n⑥x=-2, x=-3 が答え✨',
                timestamp: new Date(Date.now() - 1000 * 60 * 10), // 10分前
                likes: 7,
                replies: []
            },
            {
                id: 'sample_12',
                problemId: this.currentProblemId,
                userId: 'sample_user_12',
                username: '工学部2年',
                type: 'discussion',
                text: '大学の工学部でもよく出てきます。制御工学で伝達関数の極を求めるときとか。数学の基礎って本当に大事だなと実感してます。',
                timestamp: new Date(Date.now() - 1000 * 60 * 8), // 8分前
                likes: 5,
                replies: []
            },
            {
                id: 'sample_13',
                problemId: this.currentProblemId,
                userId: 'sample_user_13',
                username: '元気な小6',
                type: 'question',
                text: 'まだ中学生じゃないけど、これ解けるかな？がんばって挑戦してみたい！どこから勉強すればいいですか？',
                timestamp: new Date(Date.now() - 1000 * 60 * 6), // 6分前
                likes: 8,
                replies: []
            },
            {
                id: 'sample_14',
                problemId: this.currentProblemId,
                userId: 'sample_user_14',
                username: '数学嫌いだった社会人',
                type: 'feedback',
                text: '学生時代は数学が大嫌いでしたが、最近AI・機械学習を勉強していて数学の重要性を実感。こういう基礎からやり直してます。分かりやすい解説ありがとうございます！',
                timestamp: new Date(Date.now() - 1000 * 60 * 4), // 4分前
                likes: 11,
                replies: []
            },
            {
                id: 'sample_15',
                problemId: this.currentProblemId,
                userId: 'sample_user_15',
                username: '双子のママ',
                type: 'discussion',
                text: '双子の娘たちが中3で、2人とも数学で苦戦中😅 この解法、分かりやすいので今度教えてみます！ありがとうございます🙏',
                timestamp: new Date(Date.now() - 1000 * 60 * 2), // 2分前
                likes: 6,
                replies: []
            }
        ];
        
        // 既存のコメントがない場合のみサンプルを追加
        if (this.comments.length === 0) {
            this.comments = sampleComments;
            this.saveCommentsToStorage();
            console.log('📝 サンプルコメント', sampleComments.length, '件を追加しました');
        } else {
            console.log('📝 既存コメント', this.comments.length, '件を読み込みました');
        }
    }
    
    // デバッグ用：データをリセット
    resetData() {
        localStorage.removeItem('comments_' + this.currentProblemId);
        this.comments = [];
        this.initializeSampleComments();
        this.renderComments();
        console.log('🔄 データをリセットしました');
    }
}

// グローバル変数として初期化
let commentSystem;

// DOMが読み込まれた後に初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM読み込み完了');
    
    // 少し待ってから初期化（他のリソースの読み込み待ち）
    setTimeout(() => {
        try {
            commentSystem = new CommentSystem();
            console.log('🚀 コメントシステムが初期化されました');
            
            // 初期化後にUIを更新
            commentSystem.updateUserInterface();
        } catch (error) {
            console.error('❌ コメントシステム初期化エラー:', error);
        }
    }, 100);
});