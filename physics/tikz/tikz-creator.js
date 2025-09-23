class PhysicsTikZCreator {
  constructor() {
    // Elements
    this.input = document.getElementById('tikzInput');
    this.preview = document.getElementById('preview');
    this.status = document.getElementById('status');
    this.toolbar = document.getElementById('toolbar');
    this.debugOutput = document.getElementById('debugOutput');
    this.sampleGrid = document.getElementById('templateSampleGrid');
    this.searchInput = document.getElementById('templateSearch');
    this.searchBtn = document.getElementById('searchTemplateBtn');
    this.popularTags = document.getElementById('popularTags');

    // Controls
    this.axisOnBtn = document.getElementById('axisOn');
    this.axisOffBtn = document.getElementById('axisOff');
    this.clearBtn = document.getElementById('clearCode');
    this.exportPNGBtn = document.getElementById('exportPNG');
    this.exportSVGBtn = document.getElementById('exportSVG');
    this.saveTemplateBtn = document.getElementById('saveTemplateBtn');

    // State
    this.currentMode = 'mechanics';
    this.editor = null;
    this.boardCounter = 0;
    this.templates = []; // from D1 or fallback
    this.workerBaseUrl = 'https://data-manager-auth.t88596565.workers.dev';
    this.showAxis = true;

    // Init
    document.addEventListener('DOMContentLoaded', () => this.init());
  }

  log(message, type = 'info') {
    if (!this.debugOutput) return;
    const timestamp = new Date().toLocaleTimeString();
    const colors = { info: '#fbbf24', error: '#ef4444', warn: '#f59e0b', success: '#10b981' };
    const logEntry = document.createElement('div');
    logEntry.style.color = colors[type] || colors.info;
    logEntry.textContent = `[${timestamp}] [Physics] ${message}`;
    this.debugOutput.appendChild(logEntry);
    this.debugOutput.scrollTop = this.debugOutput.scrollHeight;
    if (this.debugOutput.children.length > 200) {
      this.debugOutput.removeChild(this.debugOutput.firstChild);
    }
  }

  setStatus(text, error = false) {
    if (!this.status) return;
    this.status.textContent = text;
    this.status.className = error ? 'status error' : 'status';
  }

  async init() {
    this.log('Physics TikZ Creator v2.0 システム初期化開始');
    this.setupCodeEditor();
    this.setupEventListeners();
    this.setupPhysicsModes();
    this.updateToolbar();
    this.initJSXGraph();
    await this.loadTemplatesFromDB();
    this.buildPopularTags();
    this.renderTemplateButtons();
    this.log('物理図制作システム準備完了', 'success');
  }

  initJSXGraph() {
    this.log('JSXGraph物理描画エンジン初期化開始');
    try {
      if (typeof JXG !== 'undefined') {
        const testBoard = JXG.JSXGraph.initBoard('test-board', {
          boundingbox: [-4, 4, 4, -4],
          axis: false,
          showCopyright: false,
          showNavigation: false
        });
        const arrow = testBoard.create('arrow', [[0, 0], [2, 1]], { strokeColor: 'blue', strokeWidth: 3 });
        testBoard.create('text', [1, 0.7, 'F'], { fontSize: 16, color: 'blue' });
        testBoard.create('text', [0, -3, 'Physics TikZ Test'], { fontSize: 14, color: '#f59e0b' });
        this.log('JSXGraph物理描画エンジン初期化完了', 'success');
        this.setStatus('✅ Physics TikZ システム準備完了');
      } else {
        this.log('JSXGraph未読み込み', 'error');
        this.setStatus('❌ JSXGraph読み込みエラー', true);
      }
    } catch (error) {
      this.log('JSXGraph初期化エラー: ' + error.message, 'error');
      this.setStatus('❌ JSXGraph初期化エラー: ' + error.message, true);
    }
  }

  setupCodeEditor() {
    this.log('物理専用CodeMirrorエディタ初期化');
    try {
      this.editor = CodeMirror.fromTextArea(this.input, {
        mode: 'stex',
        theme: 'material-darker',
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 2,
        tabSize: 2,
        lineWrapping: true
      });
      this.editor.on('change', () => {
        clearTimeout(this._renderTimer);
        this._renderTimer = setTimeout(() => this.renderPhysicsTikZ(), 450);
      });
      this.log('物理専用エディタ初期化完了', 'success');
    } catch (error) {
      this.log('エディタ初期化エラー: ' + error.message, 'error');
      if (this.input) {
        this.input.style.display = 'block';
        this.input.addEventListener('input', () => {
          clearTimeout(this._renderTimer);
          this._renderTimer = setTimeout(() => this.renderPhysicsTikZ(), 450);
        });
      }
    }
  }

  setupEventListeners() {
    // モード切替
    document.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentMode = btn.dataset.mode;
        this.updateToolbar();
        this.renderTemplateButtons();
        this.log(`物理分野変更: ${this.currentMode}`);
      });
    });

    // 軸表示
    this.axisOnBtn?.addEventListener('click', () => {
      this.toggleAxis(true);
    });
    this.axisOffBtn?.addEventListener('click', () => {
      this.toggleAxis(false);
    });

    // エディタ制御
    this.clearBtn?.addEventListener('click', () => this.clearEditor());
    this.exportPNGBtn?.addEventListener('click', () => this.exportImage('png'));
    this.exportSVGBtn?.addEventListener('click', () => this.exportImage('svg'));
    this.saveTemplateBtn?.addEventListener('click', () => this.showSaveTemplateModal());

    // 検索
    this.searchBtn?.addEventListener('click', () => this.searchTemplates());
    this.searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.searchTemplates();
    });
  }

  toggleAxis(on) {
    document.querySelectorAll('.axis-controls .mode-btn').forEach(b => b.classList.remove('active'));
    (on ? this.axisOnBtn : this.axisOffBtn)?.classList.add('active');
    this.showAxis = !!on;
    this.log(`座標軸表示: ${on ? 'ON' : 'OFF'}`);
    this.renderPhysicsTikZ();
  }

  clearEditor() {
    if (confirm('物理図のコードをクリアしますか？')) {
      if (this.editor) this.editor.setValue('');
      if (this.preview) this.preview.innerHTML = '<p style="color:#92400e;margin-top:150px;">物理図のTikZコードを入力してください</p>';
      this.log('物理図コードクリア実行', 'success');
    }
  }

  async loadTemplatesFromDB() {
    this.log('データベースからテンプレートを読み込み中...');
    try {
      const response = await fetch(`${this.workerBaseUrl}/api/templates/tikz`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      if (data.success) {
        this.templates = data.templates || [];
        this.log(`テンプレート ${this.templates.length} 件の読み込み完了`, 'success');
      } else {
        throw new Error(data.error || 'Failed to load templates');
      }
    } catch (error) {
      this.log(`テンプレートの読み込みに失敗: ${error.message}（ローカル例で代替）`, 'error');
      // フォールバック（物理例）
      if (window.PHYSICS_TIKZ_EXAMPLES && Array.isArray(window.PHYSICS_TIKZ_EXAMPLES)) {
        this.templates = window.PHYSICS_TIKZ_EXAMPLES;
      } else {
        this.templates = [];
      }
    }
  }

  buildPopularTags() {
    if (!this.popularTags) return;
    // カテゴリをタグ風に
    const counts = {};
    for (const t of this.templates) {
      const cat = (t.category || 'general').trim();
      counts[cat] = (counts[cat] || 0) + 1;
    }
    const tags = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);
    this.popularTags.innerHTML = tags.map(([name,count]) =>
      `<span class="tag-filter" data-tag="${name}">${name} (${count})</span>`
    ).join('');
    this.popularTags.querySelectorAll('.tag-filter').forEach(el=>{
      el.addEventListener('click', ()=>{
        this.popularTags.querySelectorAll('.tag-filter').forEach(x=>x.classList.remove('active'));
        el.classList.add('active');
        this.searchInput.value = '';
        this.renderTemplateButtons(el.getAttribute('data-tag'));
      });
    });
  }

  searchTemplates() {
    const q = (this.searchInput?.value || '').trim().toLowerCase();
    this.renderTemplateButtons(undefined, q);
  }

  renderTemplateButtons(filterCategory = undefined, query = '') {
    if (!this.sampleGrid) return;
    this.sampleGrid.innerHTML = '';
    let list = this.templates || [];
    if (filterCategory) {
      list = list.filter(t => (t.category || 'general') === filterCategory);
    } else {
      // 現在のモード優先 + general
      list = list.filter(t => (t.category === this.currentMode) || (t.category === 'general'));
    }
    if (query) {
      list = list.filter(t => {
        const hay = `${t.name || ''} ${t.description || ''}`.toLowerCase();
        return hay.includes(query);
      });
    }
    if (list.length === 0) {
      this.sampleGrid.innerHTML = `<small class="text-muted">この条件のテンプレートはありません。</small>`;
      return;
    }
    list.forEach(template => {
      const btn = document.createElement('button');
      btn.className = 'sample-btn';
      btn.textContent = template.name || '(無題)';
      btn.title = template.description || '';
      btn.onclick = () => {
        const code = template.code || '';
        this.loadPhysicsTemplate(code);
        this.log(`テンプレート読み込み: ${template.name || '(無題)'}`);
      };
      this.sampleGrid.appendChild(btn);
    });
  }

  loadPhysicsTemplate(code) {
    if (this.editor) this.editor.setValue(code);
    else if (this.input) this.input.value = code;
    setTimeout(() => this.renderPhysicsTikZ(), 120);
  }

  showSaveTemplateModal() {
    const code = this.editor ? this.editor.getValue().trim() : '';
    if (!code) { alert('保存するコードがエディタにありません。'); return; }
    const nameEl = document.getElementById('templateName');
    const descEl = document.getElementById('templateDescription');
    const catEl = document.getElementById('templateCategory');
    if (nameEl) nameEl.value = '';
    if (descEl) descEl.value = '';
    if (catEl) catEl.value = this.currentMode;

    const modalEl = document.getElementById('saveTemplateModal');
    if (!modalEl || !window.bootstrap) { alert('モーダルの初期化に失敗しました'); return; }
    const modal = new bootstrap.Modal(modalEl);

    const confirmBtn = document.getElementById('confirmSaveTemplate');
    if (confirmBtn) {
      const newBtn = confirmBtn.cloneNode(true);
      confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
      newBtn.addEventListener('click', async () => {
        const name = nameEl.value.trim();
        if (!name) { alert('テンプレート名を入力してください。'); return; }
        const payload = {
          name: name,
          description: descEl.value.trim(),
          category: catEl.value,
          code: code
        };
        await this.handleSaveTemplate(payload);
        modal.hide();
      });
    }
    modal.show();
  }

  async handleSaveTemplate(templateData) {
    this.log(`テンプレート「${templateData.name}」を保存中...`);
    try {
      const response = await fetch(`${this.workerBaseUrl}/api/templates/tikz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sessionToken') || ''}`
        },
        body: JSON.stringify(templateData)
      });
      const result = await response.json();
      if (response.ok && result.success) {
        this.log('テンプレートの保存に成功しました', 'success');
        await this.loadTemplatesFromDB();
        this.buildPopularTags();
        this.renderTemplateButtons();
      } else {
        throw new Error(result.error || 'Save failed');
      }
    } catch (error) {
      this.log(`テンプレートの保存に失敗: ${error.message}`, 'error');
      alert(`テンプレートの保存に失敗しました: ${error.message}`);
    }
  }

  setupPhysicsModes() {
    // モード別ツール（スニペット）
    this.modes = {
      mechanics: [
        { label: '座標軸', code: 'draw[->] (-3,0) -- (3,0) node[right] {x}; \\draw[->] (0,-2) -- (0,2) node[above] {y};' },
        { label: '速度ベクトル', code: 'draw[->,thick,blue] (0,0) -- (2,1) node[midway,above] {$\\vec{v}$};' },
        { label: '力ベクトル', code: 'draw[->,red,thick] (0,0) -- (1.5,0.8) node[midway,above] {$\\vec{F}$};' },
        { label: '質点', code: 'draw[fill=black] (0,0) circle (1.5pt) node[below left] {P};' },
        { label: '放物運動概形', code: 'draw[->] (-1,0) -- (6,0) node[right] {x}; \\draw[->] (0,-1) -- (0,4) node[above] {y}; \\draw[thick] (0,0) .. controls (2,3) .. (5,0);' }
      ],
      electromagnetism: [
        { label: '電流I', code: 'draw[->] (0,0) -- (2,0) node[midway,above] {I};' },
        { label: '電場E', code: 'draw[->,blue] (0,0) -- (0,2) node[right] {E};' },
        { label: '磁場B', code: 'draw[->,green] (0,0) -- (2,0) node[midway,below] {B};' },
        { label: '矩形回路', code: 'draw (0,0) -- (3,0) -- (3,2) -- (0,2) -- (0,0);' }
      ],
      thermodynamics: [
        { label: 'PV軸', code: 'draw[->] (-1,0) -- (5,0) node[right] {V}; \\draw[->] (0,-1) -- (0,4) node[above] {P};' },
        { label: '準静過程', code: 'draw[thick] (0.5,0.5) -- (4,3);' }
      ],
      waves: [
        { label: '座標軸(波)', code: 'draw[->] (-6,0) -- (6,0) node[right] {x}; \\draw[->] (0,-2) -- (0,2) node[above] {y};' },
        { label: '正弦波概形', code: 'draw[blue] (-6,0) -- (-4,1) -- (-2,0) -- (0,-1) -- (2,0) -- (4,1) -- (6,0);' },
        { label: '波長λ', code: 'draw[<->] (-4,0) -- (0,0) node[midway,below] {$\\lambda$};' }
      ],
      modern: [
        { label: '原子モデル概形', code: 'draw (0,0) circle (1.5); \\draw[fill] (0,0) circle (1.5pt);' },
        { label: 'フォトン概形', code: 'draw[->,orange,thick] (-1,0) -- (2,0);' }
      ]
    };
  }

  updateToolbar() {
    if (!this.toolbar) return;
    const tools = this.modes[this.currentMode] || [];
    this.toolbar.innerHTML = tools.map(t => `<button class="tool-btn" data-code="${this._esc(t.code)}">${t.label}</button>`).join('');
    this.toolbar.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = '\\' + (btn.getAttribute('data-code') || '');
        this.insertCode(code);
      });
    });
  }

  _esc(s){ return (s || '').replace(/"/g,'&quot;'); }

  insertCode(code) {
    if (this.editor) {
      const cursor = this.editor.getCursor();
      this.editor.replaceRange(code + '\n', cursor);
      this.editor.focus();
    } else if (this.input) {
      this.input.value += '\n' + code + '\n';
      this.input.focus();
    }
  }

  renderPhysicsTikZ() {
    const src = (this.editor ? this.editor.getValue() : (this.input?.value || '')).trim();
    if (!src) {
      if (this.preview) this.preview.innerHTML = '<p style="color:#64748b;margin-top:150px;">TikZコードを入力してください</p>';
      return;
    }
    try {
      this.log('レンダリング開始');
      const cmds = this.parsePhysicsTikZCode(src);
      this.log(`解析結果: ${cmds.length} コマンド`);
      if (cmds.length > 0) {
        this.renderWithJSXGraph(cmds);
      } else {
        this.preview.innerHTML = '<p style="color:#f59e0b;margin-top:150px;">解析できるコマンドがありません（サブセット対応）</p>';
      }
    } catch (e) {
      this.setStatus('❌ 解析例外: ' + e.message, true);
      this.log('解析例外: ' + e.message, 'error');
    }
  }

  parsePhysicsTikZCode(text) {
    // \begin{tikzpicture} 包囲対応
    const lines0 = text.split('\n').map(l => l.replace(/%.*$/, '').trim()).filter(Boolean);
    const b = lines0.findIndex(l => l.includes('\\begin{tikzpicture}'));
    const e = lines0.findIndex(l => l.includes('\\end{tikzpicture}'));
    const lines = (b !== -1 && e !== -1 && e > b) ? lines0.slice(b+1, e) : lines0;

    const cmds = [];
    for (const line of lines) {
      if (!line.startsWith('\\draw')) continue;

      // circle
      if (line.includes('circle')) {
        const m = line.match(/\\draw(?:\[[^\]]*\])?.*?\(([-\d.+]+),([-\d.+]+)\).*?circle.*?\(([-\d.+]+)\)/);
        if (m) { cmds.push({ type:'circle', center:[+m[1], +m[2]], radius:+m[3] }); continue; }
      }

      // rectangle
      if (line.includes('rectangle')) {
        const m = line.match(/\\draw(?:\[[^\]]*\])?.*?\(([-\d.+]+),([-\d.+]+)\).*?rectangle.*?\(([-\d.+]+),([-\d.+]+)\)/);
        if (m) { cmds.push({ type:'rect', c1:[+m[1], +m[2]], c2:[+m[3], +m[4]] }); continue; }
      }

      // polyline with optional arrow
      if (line.includes('--')) {
        const pts = this.extractCoords(line);
        if (pts.length >= 2) {
          const style = this.extractStyle(line);
          cmds.push({ type:'poly', points: pts, style });
          continue;
        }
      }
    }
    return cmds;
  }

  extractCoords(line) {
    const out = [];
    const matches = line.match(/\(([-\d.+]+),([-\d.+]+)\)/g) || [];
    for (const s of matches) {
      const [x, y] = s.replace(/[()]/g,'').split(',');
      out.push([+x, +y]);
    }
    return out;
  }

  extractStyle(line) {
    const st = { arrow:false, dashed:false, dotted:false, thick:false, color:null };
    const m = line.match(/\\draw\[(.*?)\]/);
    if (m) {
      const parts = m[1].split(',').map(s => s.trim());
      st.arrow = parts.includes('->') || parts.includes('<->');
      st.dashed = parts.includes('dashed');
      st.dotted = parts.includes('dotted');
      st.thick = parts.includes('thick') || parts.includes('very thick');
      const color = parts.find(p => ['black','gray','red','blue','green','orange','purple','cyan'].includes(p));
      if (color) st.color = color;
    } else {
      st.arrow = line.includes('->') || line.includes('<->');
    }
    return st;
  }

  renderWithJSXGraph(cmds) {
    try {
      this.boardCounter++;
      const boardId = 'tikz-board-' + this.boardCounter;
      this.preview.innerHTML = `<div id="${boardId}" class="tikz-output"></div>`;

      const board = JXG.JSXGraph.initBoard(boardId, {
        boundingbox: [-6, 6, 6, -6],
        axis: this.showAxis,
        showCopyright: false,
        showNavigation: false
      });

      cmds.forEach(cmd => {
        if (cmd.type === 'poly') {
          const pts = cmd.points.map(p => board.create('point', p, { visible: false }));
          const strokeColor = cmd.style.color || '#111827';
          const strokeWidth = cmd.style.thick ? 3 : 2;
          const dash = cmd.style.dashed ? 2 : (cmd.style.dotted ? 1 : 0);

          for (let i = 0; i < pts.length - 1; i++) {
            if (cmd.style.arrow && i === 0) {
              board.create('arrow', [pts[i], pts[i+1]], { strokeColor, strokeWidth, dash });
            } else {
              board.create('segment', [pts[i], pts[i+1]], { strokeColor, strokeWidth, dash });
            }
          }
        } else if (cmd.type === 'circle') {
          board.create('circle', [cmd.center, cmd.radius], { strokeColor:'#2563eb', strokeWidth:2 });
        } else if (cmd.type === 'rect') {
          const [x1,y1] = cmd.c1, [x2,y2] = cmd.c2;
          const p1 = board.create('point', [x1,y1], { visible:false });
          const p2 = board.create('point', [x2,y1], { visible:false });
          const p3 = board.create('point', [x2,y2], { visible:false });
          const p4 = board.create('point', [x1,y2], { visible:false });
          board.create('polygon', [p1,p2,p3,p4], { strokeColor:'#16a34a', strokeWidth:2, fillColor:'none' });
        }
      });

      this.setStatus(`✅ レンダリング完了（要素: ${cmds.length}）`);
      this.log(`JSXGraph レンダリング完了: ${cmds.length} 要素`, 'success');
    } catch (e) {
      this.setStatus('❌ レンダリング例外: ' + e.message, true);
      this.log('レンダリング例外: ' + e.message, 'error');
    }
  }

  exportImage(format) {
    try {
      const boardId = 'tikz-board-' + this.boardCounter;
      const boardEl = document.getElementById(boardId);
      if (!boardEl) { alert('図形をレンダリングしてから出力してください'); return; }
      const svg = boardEl.querySelector('svg');
      if (!svg) { alert('SVG要素が見つかりません'); return; }

      if (format === 'svg') this.downloadSVG(svg);
      if (format === 'png') this.downloadPNG(svg);
    } catch (e) {
      this.setStatus('❌ 出力例外: ' + e.message, true);
      this.log('画像出力エラー: ' + e.message, 'error');
    }
  }

  downloadSVG(svg) {
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink','http://www.w3.org/1999/xlink');
    const str = new XMLSerializer().serializeToString(clone);
    const ts = new Date().toISOString().slice(0,19).replace(/[:-]/g,'');
    const blob = new Blob([str], { type:'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `physics_tikz_${ts}.svg`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.log(`SVG出力完了: physics_tikz_${ts}.svg`, 'success');
  }

  downloadPNG(svg) {
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
    const str = new XMLSerializer().serializeToString(clone);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
    img.onload = () => {
      const scale = 2;
      const w = img.width || 800;
      const h = img.height || 600;
      const canvas = document.createElement('canvas');
      canvas.width = w * scale; canvas.height = h * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.fillStyle = 'white';
      ctx.fillRect(0,0,w,h);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        const ts = new Date().toISOString().slice(0,19).replace(/[:-]/g,'');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `physics_tikz_${ts}.png`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.log(`PNG出力完了: physics_tikz_${ts}.png`, 'success');
      }, 'image/png');
    };
    img.onerror = () => alert('PNG変換でエラーが発生しました');
    img.src = svgUrl;
  }
}

new PhysicsTikZCreator();
