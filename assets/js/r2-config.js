// R2のローカルフォールバック禁止。常に認証経路（AuthenticatedMediaClient/Worker）必須
(function () {
  function waitFor(fn, cond, step = 0) {
    if (cond()) return fn();
    if (step > 200) return;
    setTimeout(() => waitFor(fn, cond, step + 1), 100);
  }
  waitFor(() => {
    const r2 = window.questaR2;
    if (!r2) return;

    r2.fallbackToLocal = false;
    const ensureAuth = () => r2.mediaClient && r2.authClient && r2.authClient.isLoggedIn && r2.authClient.isLoggedIn();
    const fail = (msg) => Promise.resolve({ success: false, error: msg || 'R2 requires authenticated media client' });

    const origUpload = r2.uploadMedia?.bind(r2);
    r2.uploadMedia = async function (file, path, metadata = {}) {
      if (!ensureAuth()) return fail('ログインが必要です（R2アップロード: ローカル疑似保存は禁止）');
      return origUpload(file, path, metadata);
    };

    const origGet = r2.getMediaUrl?.bind(r2);
    r2.getMediaUrl = async function (path) {
      if (!ensureAuth()) return fail('ログインが必要です（R2取得: ローカル疑似保存は禁止）');
      return origGet(path);
    };

    const origList = r2.listMedia?.bind(r2);
    r2.listMedia = async function (prefix = '') {
      if (!ensureAuth()) return [];
      return origList(prefix);
    };

    const origDelete = r2.deleteMedia?.bind(r2);
    r2.deleteMedia = async function (path) {
      if (!ensureAuth()) return false;
      return origDelete(path);
    };

    console.log('[R2] Local fallback disabled. Auth required.');
  }, () => !!window.questaR2);
})();
