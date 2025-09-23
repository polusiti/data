(function(){
  const API_BASE = 'https://data-manager-auth.t88596565.workers.dev/api';

  class QuestaD1Client {
    constructor(config = {}) {
      this.baseUrl = config.baseUrl || API_BASE;
    }

    // Common helpers
    getAuthHeaders() {
      // Cookie セッション前提なので Authorization は付与しない
      return { 'Content-Type': 'application/json' };
    }

    async _request(path, { method='GET', headers={}, body=undefined, query=null } = {}) {
      const url = new URL(this.baseUrl + path);
      if (query && typeof query === 'object') {
        Object.entries(query).forEach(([k,v]) => {
          if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
        });
      }
      const res = await fetch(url.toString(), {
        method,
        headers: { ...this.getAuthHeaders(), ...headers },
        credentials: 'include',
        body
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || (json && json.success === false)) {
        const msg = json?.error || `${method} ${path} failed: ${res.status}`;
        throw new Error(msg);
      }
      return json;
    }

    // Health
    async isD1Available() {
      try {
        const res = await this._request('/health', { method: 'GET' });
        return res?.ok !== false;
      } catch {
        return false;
      }
    }

    // --------------------------------
    // Questions (検索/取得/保存/削除/統計)
    // --------------------------------

    /**
     * 検索: /search/questions?q=&sort=&limit=&offset=&...filters
     */
    async searchQuestions(query = '', filters = {}, sort = 'created_desc', limit = 20, offset = 0) {
      const q = {
        q: query || '',
        sort,
        limit,
        offset,
        ...this._buildFilterParams(filters)
      };
      const res = await this._request('/search/questions', { query: q });
      return Array.isArray(res.questions) ? res.questions.map(this.formatQuestion) : [];
    }

    /**
     * 科目別取得: /questions?subject=&limit=&offset=&filters...
     */
    async getQuestionsBySubject(subject, filters = {}, limit = 50, offset = 0) {
      const q = {
        subject,
        limit,
        offset,
        ...this._buildFilterParams(filters)
      };
      const res = await this._request('/questions', { query: q });
      return Array.isArray(res.questions) ? res.questions.map(this.formatQuestion) : [];
    }

    /**
     * サジェスト: /search/suggestions?q=&limit=
     */
    async getSearchSuggestions(q = '', limit = 10) {
      if (!q || q.length < 2) return [];
      const res = await this._request('/search/suggestions', { query: { q, limit } });
      return Array.isArray(res.suggestions) ? res.suggestions : [];
    }

    /**
     * 質問単体取得: /questions/:id
     */
    async getQuestionById(questionId) {
      const res = await this._request(`/questions/${encodeURIComponent(questionId)}`, { method: 'GET' });
      return res.question ? this.formatQuestion(res.question) : null;
    }

    /**
     * 質問保存: POST /questions
     */
    async saveQuestion(questionData) {
      const res = await this._request('/questions', {
        method: 'POST',
        body: JSON.stringify(questionData)
      });
      return { success: true, mode: 'd1', data: res };
    }

    /**
     * 質問削除: DELETE /questions/:id
     */
    async deleteQuestion(questionId) {
      const res = await this._request(`/questions/${encodeURIComponent(questionId)}`, { method: 'DELETE' });
      return { success: true, data: res };
    }

    /**
     * 科目統計: GET /statistics/subject?subject=
     */
    async getSubjectStatistics(subject) {
      const res = await this._request('/statistics/subject', { query: { subject } });
      return { success: true, data: res.data || res };
    }

    _buildFilterParams(filters = {}) {
      const params = {};
      if (filters.subjects?.length) params.subjects = filters.subjects.join(',');
      if (filters.difficulties?.length) params.difficulties = filters.difficulties.join(',');
      if (filters.types?.length) params.types = filters.types.join(',');
      if (filters.tags?.length) params.tags = filters.tags.join(',');
      if (filters.field_code) params.field_code = filters.field_code;
      if (filters.answer_format) params.answer_format = filters.answer_format;
      if (filters.answer_formats?.length) params.answer_formats = filters.answer_formats.join(',');
      if (filters.search) params.search = filters.search;
      if (filters.sort_by) params.sort_by = filters.sort_by;
      if (filters.sort_order) params.sort_order = filters.sort_order;
      return params;
    }

    // --------------------------------
    // Problems（最近の問題・投稿・取得・削除・ユーザー別）
    // --------------------------------

    /**
     * 最近の問題一覧: GET /problems?limit&offset
     */
    async getRecentProblems(limit = 10, offset = 0) {
      const res = await this._request('/problems', { query: { limit, offset } });
      return Array.isArray(res.problems) ? res.problems : [];
    }

    /**
     * 問題作成: POST /problems
     */
    async addProblem(problem) {
      const res = await this._request('/problems', {
        method: 'POST',
        body: JSON.stringify(problem)
      });
      return { success: true, id: res.id || res.problem?.id };
    }

    /**
     * 問題単体取得: GET /problems/:id
     */
    async getProblemById(id) {
      const res = await this._request(`/problems/${encodeURIComponent(id)}`, { method: 'GET' });
      return res.problem || null;
    }

    /**
     * ユーザー別問題: GET /problems?author=
     */
    async getProblemsByUser(author, limit = 50, offset = 0) {
      const res = await this._request('/problems', { query: { author, limit, offset } });
      return Array.isArray(res.problems) ? res.problems : [];
    }

    /**
     * 問題削除: DELETE /problems/:id
     */
    async deleteProblem(problemId) {
      await this._request(`/problems/${encodeURIComponent(problemId)}`, { method: 'DELETE' });
      return { success: true };
    }

    // --------------------------------
    // Comments（保存・一覧・返信・いいね・削除・通報・統計）
    // --------------------------------

    /**
     * コメント保存: POST /comments
     */
    async saveComment(comment) {
      const res = await this._request('/comments', {
        method: 'POST',
        body: JSON.stringify(comment)
      });
      return res.comment ? this.formatComment(res.comment) : null;
    }

    /**
     * 問題のコメント一覧: GET /comments?problem_id=&limit=&offset=
     */
    async getCommentsByProblem(problemId, limit = 50, offset = 0) {
      const res = await this._request('/comments', { query: { problem_id: problemId, limit, offset } });
      return Array.isArray(res.comments) ? res.comments.map(this.formatComment) : [];
    }

    /**
     * 返信一覧: GET /comments/:id/replies
     */
    async getCommentReplies(commentId) {
      const res = await this._request(`/comments/${encodeURIComponent(commentId)}/replies`, { method: 'GET' });
      return Array.isArray(res.comments) ? res.comments.map(this.formatComment) : [];
    }

    /**
     * いいねトグル: POST /comments/:id/like
     */
    async toggleCommentLike(commentId) {
      await this._request(`/comments/${encodeURIComponent(commentId)}/like`, { method: 'POST' });
      return { success: true };
    }

    /**
     * コメント削除: DELETE /comments/:id
     */
    async deleteComment(commentId) {
      await this._request(`/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' });
      return { success: true };
    }

    /**
     * コメント通報: POST /comments/:id/report
     */
    async reportComment(commentId, reason = '') {
      await this._request(`/comments/${encodeURIComponent(commentId)}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      return { success: true };
    }

    /**
     * コメント統計: GET /comments/stats?problem_id=
     */
    async getCommentStats(problemId) {
      const res = await this._request('/comments/stats', { query: { problem_id: problemId } });
      return { success: true, stats: res.stats || res };
    }

    // --------------------------------
    // Answers（必要に応じて）
    // --------------------------------

    /**
     * 解答投稿: POST /answers
     */
    async addAnswer({ problem_id, content }) {
      const res = await this._request('/answers', {
        method: 'POST',
        body: JSON.stringify({ problem_id, content })
      });
      return res.answer || null;
    }

    /**
     * 解答一覧: GET /answers?problem_id=
     */
    async getAnswersByProblem(problemId, limit = 50, offset = 0) {
      const res = await this._request('/answers', { query: { problem_id: problemId, limit, offset } });
      return Array.isArray(res.answers) ? res.answers : [];
    }

    // --------------------------------
    // Utilities (formatters)
    // --------------------------------

    formatQuestion(question) {
      const formatted = { ...question };
      // JSON文字列の安全パース
      try {
        if (formatted.choices && typeof formatted.choices === 'string') {
          formatted.choices = JSON.parse(formatted.choices);
        }
      } catch { formatted.choices = []; }
      try {
        if (formatted.tags && typeof formatted.tags === 'string') {
          formatted.tags = JSON.parse(formatted.tags);
        }
      } catch { formatted.tags = []; }
      try {
        if (formatted.media_urls && typeof formatted.media_urls === 'string') {
          formatted.media_urls = JSON.parse(formatted.media_urls);
        }
      } catch { formatted.media_urls = []; }
      return formatted;
    }

    formatComment(comment) {
      const formatted = { ...comment };
      try {
        if (formatted.media_urls && typeof formatted.media_urls === 'string') {
          formatted.media_urls = JSON.parse(formatted.media_urls);
        }
      } catch { formatted.media_urls = []; }
      formatted.likes = parseInt(formatted.likes || 0, 10);
      return formatted;
    }
  }

  // Global instance
  window.QuestaD1Client = QuestaD1Client;
  window.questaD1 = new QuestaD1Client();
})();
