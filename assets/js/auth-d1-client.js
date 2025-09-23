(function(){
  const API_BASE = 'https://data-manager-auth.t88596565.workers.dev/api';

  class AuthClient {
    constructor() {
      this._user = null;
      this._init();
    }

    async _init() {
      try {
        await this.refresh();
      } catch (_) {}
    }

    async refresh() {
      const res = await fetch(`${API_BASE}/auth/me`, {
        method: 'GET',
        credentials: 'include'
      });
      if (!res.ok) {
        this._user = null;
        return null;
      }
      const data = await res.json().catch(()=>null);
      if (data && data.success) {
        this._user = data.user || null;
      } else {
        this._user = null;
      }
      return this._user;
    }

    isLoggedIn() {
      return !!this._user;
    }

    getCurrentUser() {
      return this._user;
    }

    async demoLogin() {
      // 任意: デモログインが有効な場合のみ
      const res = await fetch(`${API_BASE}/auth/demo`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json().catch(()=>null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'demo login failed');
      }
      await this.refresh();
      return true;
    }

    async logout() {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      }).catch(()=>{});
      this._user = null;
    }
  }

  window.authClient = new AuthClient();
})();
