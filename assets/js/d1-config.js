// D1クライアントをサーバ専用モードに固定（localStorage廃止、Cookie認証前提）
(function () {
  function waitFor(fn, cond, step = 0) {
    if (cond()) return fn();
    if (step > 200) return;
    setTimeout(() => waitFor(fn, cond, step + 1), 100);
  }
  waitFor(() => {
    const d1 = window.questaD1 || (window.QuestaD1Client && new window.QuestaD1Client()) || null;
    if (!d1) return;

    // 1) ローカルフォールバック禁止
    d1.fallbackMode = false;

    // 2) 認証はHttpOnly Cookie（Authorizationヘッダは付与しない）
    if (typeof d1.getAuthHeaders === 'function') {
      const original = d1.getAuthHeaders.bind(d1);
      d1.getAuthHeaders = function () {
        const h = original();
        delete this.sessionToken;
        delete this.adminToken;
        delete h.Authorization;
        return h;
      };
    }

    // 3) フォールバック系関数は使用不可に
    const noLocal = async () => { throw new Error('Local fallback disabled'); };
    [
      'searchQuestionsFromLocalStorage',
      'getQuestionsFromLocalStorage',
      'getAllQuestionsFromLocalStorage',
      'getQuestionFromLocalStorageById',
      'getSearchSuggestionsFromLocalStorage',
      'saveQuestionToLocalStorage'
    ].forEach(name => { if (typeof d1[name] === 'function') d1[name] = noLocal; });

    // 4) 最近の問題API（Worker経由）に統一
    d1.getRecentProblems = async function (limit = 10, offset = 0) {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      const res = await fetch(`${this.baseUrl}/problems?${params}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error || `D1 getRecentProblems error: ${res.status}`);
      return json.problems || [];
    };

    // 5) 問題作成API（Worker経由）
    d1.addProblem = async function (problem) {
      const res = await fetch(`${this.baseUrl}/problems`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(problem),
        credentials: 'include'
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error || `D1 addProblem error: ${res.status}`);
      return { success: true, id: json.id || json.problem?.id };
    };

    window.questaD1 = d1;
    console.log('[D1] Server-only mode enabled (no local fallback, cookie-auth)');
  }, () => !!(window.questaD1 || window.QuestaD1Client));
})();
