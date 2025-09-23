(function(){
  // Wait for DOM and make sure D1 client exists
  document.addEventListener('DOMContentLoaded', async () => {
    // Prefer global instance created by questa-d1-client.js
    const d1 = window.questaD1 || new (window.QuestaD1Client || function(){})();
    // Ensure problems table exists (no-op if already there)
    try {
      if (d1 && typeof d1.executeQuery === 'function') {
        await d1.executeQuery(`
          CREATE TABLE IF NOT EXISTS problems (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            difficulty INTEGER DEFAULT 1,
            author TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            views INTEGER DEFAULT 0,
            solved INTEGER DEFAULT 0
          )
        `, []);
      }
    } catch (e) {
      console.warn('problemsテーブル作成スキップ:', e);
    }

    // Patch MobileProblemApp if defined
    if (typeof window.MobileProblemApp === 'function') {
      // Override loadProblems to fetch from D1 (fallback to local/mock)
      window.MobileProblemApp.prototype.loadProblems = async function(limit = 10, offset = 0) {
        const container = document.getElementById('problems-container');
        if (container) {
          container.innerHTML = `
            <div class="loading">
              <i class="fas fa-spinner"></i>
              <p>問題を読み込み中...</p>
            </div>
          `;
        }

        try {
          let problems = [];
          if (d1 && typeof d1.executeQuery === 'function') {
            const res = await d1.executeQuery(
              `SELECT id, subject, title, content, difficulty, author, created_at, views, solved
               FROM problems
               ORDER BY datetime(created_at) DESC
               LIMIT ? OFFSET ?`,
              [limit, offset]
            );
            if (res && res.success) {
              problems = (res.results || []).map(row => ({
                id: row.id,
                subject: row.subject || 'general',
                title: row.title || '(無題)',
                content: row.content || '',
                difficulty: parseInt(row.difficulty || 1, 10),
                author: row.author || 'unknown',
                createdAt: row.created_at ? new Date(row.created_at).toLocaleString() : '',
                views: parseInt(row.views || 0, 10),
                solved: parseInt(row.solved || 0, 10)
              }));
              // keep a local backup for offline
              try { localStorage.setItem('recent_problems_backup', JSON.stringify(problems)); } catch(_e){}
            }
          }

          // Fallback to local backup
          if (!problems || problems.length === 0) {
            const backup = localStorage.getItem('recent_problems_backup');
            if (backup) {
              problems = JSON.parse(backup);
            }
          }

          // Final fallback to mock (keep your original mock shape)
          if (!problems || problems.length === 0) {
            problems = [
              {
                id: 1,
                subject: 'math',
                title: '二次方程式の解の公式を使って次の方程式を解きなさい',
                difficulty: 3,
                author: 'math_teacher',
                createdAt: '2時間前',
                views: 45,
                solved: 12,
                content: '...'
              },
              {
                id: 2,
                subject: 'english',
                title: '斜方投射における最高点の高さを求める問題',
                difficulty: 4,
                author: 'physics_teacher',
                createdAt: '4時間前',
                views: 78,
                solved: 34,
                content: '...'
              },
              {
                id: 3,
                subject: 'science',
                title: '化学反応式のバランス調整と反応量計算',
                difficulty: 3,
                author: 'chem_sensei',
                createdAt: '6時間前',
                views: 23,
                solved: 8,
                content: '...'
              }
            ];
          }

          this.problems = problems;
          this.renderProblems();
        } catch (error) {
          console.error('Failed to load recent problems:', error);
          if (container) {
            container.innerHTML = `
              <div class="text-center text-muted py-4">
                <i class="fas fa-exclamation-circle"></i>
                <p>問題の読み込みに失敗しました</p>
              </div>
            `;
          }
        }
      };

      // Add helper to load "all" (larger limit)
      if (typeof window.MobileProblemApp.prototype.loadProblemsAll !== 'function') {
        window.MobileProblemApp.prototype.loadProblemsAll = async function() {
          await this.loadProblems(100, 0);
        };
      }
    }

    // Instantiate app once
    if (!window.app && typeof window.MobileProblemApp === 'function') {
      try {
        window.app = new window.MobileProblemApp();
      } catch (e) {
        console.error('MobileProblemApp 初期化エラー:', e);
      }
    }

    // Global hooks used by markup
    window.viewProblem = (id) => {
      if (window.app && typeof window.app.showProblemDetail === 'function') {
        window.app.showProblemDetail(id);
      }
    };
    window.showHome = () => {
      const home = document.getElementById('home-view');
      const detail = document.getElementById('problem-view');
      if (home && detail) {
        home.style.display = 'block';
        detail.style.display = 'none';
      }
    };
    window.showAllProblems = async () => {
      if (window.app && typeof window.app.loadProblemsAll === 'function') {
        await window.app.loadProblemsAll();
        window.showHome();
      }
    };
    window.showSearch = () => {
      // 移動先の検索ページがある場合はこちらへ
      try { window.location.href = 'browse.html'; } catch(_e){}
    };
    window.showProfile = () => {
      const isLoggedIn = !!(window.authClient && typeof window.authClient.isLoggedIn === 'function' && window.authClient.isLoggedIn());
      window.location.href = isLoggedIn ? 'profile.html' : 'auth.html';
    };
  });
})();
