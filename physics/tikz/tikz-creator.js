class PhysicsTikZCreator {
    constructor() {
        this.input = document.getElementById('tikzInput');
        this.preview = document.getElementById('preview');
        this.status = document.getElementById('status');
        this.toolbar = document.getElementById('toolbar');
        this.debugOutput = document.getElementById('debugOutput');
        this.sampleGrid = document.getElementById('sampleGrid');
        this.currentMode = 'electromagnetism';
        this.editor = null;
        this.boardCounter = 0;
        this.templates = [];
        this.workerBaseUrl = 'https://data-manager-auth.t88596565.workers.dev';

        this.init();
    }

    async init() {
        this.log('Physics TikZ Creator v1.0 システム初期化開始');
        this.setupCodeEditor();
        this.setupEventListeners();
        this.setupPhysicsModes();
        this.updateToolbar();
        this.initJSXGraph();
        await this.loadTemplatesFromDB();
        this.log('物理図制作システム準備完了');
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const colors = {
            info: '#fbbf24',
            error: '#ef4444',
            warn: '#f59e0b',
            success: '#10b981'
        };
        const logEntry = document.createElement('div');
        logEntry.style.color = colors[type] || colors.info;
        logEntry.innerHTML = `[${timestamp}] [Physics] ${message}`;
        this.debugOutput.appendChild(logEntry);
        this.debugOutput.scrollTop = this.debugOutput.scrollHeight;
        if (this.debugOutput.children.length > 100) {
            this.debugOutput.removeChild(this.debugOutput.firstChild);
        }
    }

    initJSXGraph() {
        this.log('JSXGraph物理描画エンジン初期化開始');
        try {
            if (typeof JXG !== 'undefined') {
                const testBoard = JXG.JSXGraph.initBoard('test-board', { boundingbox: [-4, 4, 4, -4], axis: false, showCopyright: false, showNavigation: false });
                const forceVector = testBoard.create('arrow', [[0, 0], [2, 1]], { strokeColor: 'blue', strokeWidth: 3 });
                testBoard.create('text', [1, 0.7, 'F'], { fontSize: 16, color: 'blue' });
                testBoard.create('text', [0, -3, 'Physics TikZ Test'], { fontSize: 14, color: '#f59e0b' });
                this.log('JSXGraph物理描画エンジン初期化完了', 'success');
                this.status.textContent = '✅ Physics TikZ システム準備完了';
                this.status.className = 'status';
            } else {
                this.log('JSXGraph未読み込み', 'error');
                this.status.textContent = '❌ JSXGraph読み込みエラー';
            }
        } catch (error) {
            this.log('JSXGraph初期化エラー: ' + error.message, 'error');
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
                setTimeout(() => this.renderPhysicsTikZ(), 500);
            });
            this.log('物理専用エディタ初期化完了', 'success');
        } catch (error) {
            this.log('エディタ初期化エラー: ' + error.message, 'error');
            this.input.style.display = 'block';
        }
    }

    setupEventListeners() {
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
        document.getElementById('clearCode').addEventListener('click', () => this.clearEditor());
        document.getElementById('exportPNG').addEventListener('click', () => this.exportImage('png'));
        document.getElementById('exportSVG').addEventListener('click', () => this.exportImage('svg'));
        document.getElementById('saveTemplateBtn').addEventListener('click', () => this.showSaveTemplateModal());
    }
    
    clearEditor() {
        if (confirm('物理図のコードをクリアしますか？')) {
            if (this.editor) { this.editor.setValue(''); }
            this.preview.innerHTML = '<p style="color: #92400e; margin-top: 150px;">物理図のTikZコードを入力してください</p>';
            this.log('物理図コードクリア実行', 'success');
        }
    }

    async loadTemplatesFromDB() {
        this.log('データベースからテンプレートを読み込み中...');
        try {
            const response = await fetch(`${this.workerBaseUrl}/api/templates/tikz`);
            if (!response.ok) { throw new Error(`API Error: ${response.status}`); }
            const data = await response.json();
            if (data.success) {
                this.templates = data.templates || [];
                this.renderTemplateButtons();
                this.log(`テンプレート ${this.templates.length} 件の読み込み完了`, 'success');
            } else { throw new Error(data.error || 'Failed to load templates'); }
        } catch (error) {
            this.log(`テンプレートの読み込みに失敗: ${error.message}`, 'error');
        }
    }

    renderTemplateButtons() {
        this.sampleGrid.innerHTML = '';
        const filteredTemplates = this.templates.filter(t => t.category === this.currentMode || t.category === 'general');
        if(filteredTemplates.length === 0) {
            this.sampleGrid.innerHTML = `<small class="text-muted">この分野のテンプレートはありません。</small>`;
            return;
        }
        filteredTemplates.forEach(template => {
            const btn = document.createElement('button');
            btn.className = 'sample-btn';
            btn.textContent = template.name;
            btn.title = template.description || '';
            btn.onclick = () => {
                this.loadPhysicsTemplate(template.code);
                this.log(`テンプレート読み込み: ${template.name}`);
            };
            this.sampleGrid.appendChild(btn);
        });
    }

    loadPhysicsTemplate(code) {
        if (this.editor) { this.editor.setValue(code); }
        else { this.input.value = code; }
        setTimeout(() => this.renderPhysicsTikZ(), 100);
    }

    showSaveTemplateModal() {
        const code = this.editor ? this.editor.getValue().trim() : '';
        if (!code) {
            alert('保存するコードがエディタにありません。');
            return;
        }
        document.getElementById('templateName').value = '';
        document.getElementById('templateDescription').value = '';
        document.getElementById('templateCategory').value = this.currentMode;
        const modal = new bootstrap.Modal(document.getElementById('saveTemplateModal'));
        const confirmBtn = document.getElementById('confirmSaveTemplate');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.addEventListener('click', async () => {
            const name = document.getElementById('templateName').value.trim();
            if (!name) { alert('テンプレート名を入力してください。'); return; }
            const templateData = {
                name: name,
                description: document.getElementById('templateDescription').value.trim(),
                category: document.getElementById('templateCategory').value,
                code: code
            };
            await this.handleSaveTemplate(templateData);
            modal.hide();
        });
        modal.show();
    }

    async handleSaveTemplate(templateData) {
        this.log(`テンプレート「${templateData.name}」を保存中...`);
        try {
            const response = await fetch(`${this.workerBaseUrl}/api/templates/tikz`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
                },
                body: JSON.stringify(templateData)
            });
            const result = await response.json();
            if (response.ok && result.success) {
                this.log('テンプレートの保存に成功しました', 'success');
                await this.loadTemplatesFromDB();
            } else { throw new Error(result.error || 'Save failed'); }
        } catch (error) {
            this.log(`テンプレートの保存に失敗: ${error.message}`, 'error');
            alert(`テンプレートの保存に失敗しました: ${error.message}`);
        }
    }

    // ... (The rest of the original methods like setupPhysicsModes, updateToolbar, parsePhysicsTikZCode, renderWithJSXGraph etc. go here) ...

}

document.addEventListener('DOMContentLoaded', function() {
    new PhysicsTikZCreator();
});
