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

    // ... (log, initJSXGraph, setupCodeEditor methods remain the same) ...

    setupEventListeners() {
        // Mode selection
        document.querySelectorAll('[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentMode = btn.dataset.mode;
                this.updateToolbar();
                this.renderTemplateButtons(); // Re-render templates for the new mode
                this.log(`物理分野変更: ${this.currentMode}`);
            });
        });

        // Editor controls
        document.getElementById('clearCode').addEventListener('click', () => this.clearEditor());
        document.getElementById('exportPNG').addEventListener('click', () => this.exportImage('png'));
        document.getElementById('exportSVG').addEventListener('click', () => this.exportImage('svg'));
        document.getElementById('saveTemplateBtn').addEventListener('click', () => this.showSaveTemplateModal());
    }
    
    clearEditor() {
        if (confirm('物理図のコードをクリアしますか？')) {
            if (this.editor) {
                this.editor.setValue('');
            }
            this.preview.innerHTML = '<p style="color: #92400e; margin-top: 150px;">物理図のTikZコードを入力してください</p>';
            this.log('物理図コードクリア実行', 'success');
        }
    }

    async loadTemplatesFromDB() {
        this.log('データベースからテンプレートを読み込み中...');
        try {
            const response = await fetch('/api/templates/tikz');
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            const data = await response.json();
            if (data.success) {
                this.templates = data.templates || [];
                this.renderTemplateButtons();
                this.log(`テンプレート ${this.templates.length} 件の読み込み完了`, 'success');
            } else {
                throw new Error(data.error || 'Failed to load templates');
            }
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
        if (this.editor) {
            this.editor.setValue(code);
        } else {
            this.input.value = code;
        }
        setTimeout(() => this.renderPhysicsTikZ(), 100);
    }

    showSaveTemplateModal() {
        const code = this.editor ? this.editor.getValue().trim() : '';
        if (!code) {
            alert('保存するコードがエディタにありません。');
            return;
        }
        // Reset form
        document.getElementById('templateName').value = '';
        document.getElementById('templateDescription').value = '';
        document.getElementById('templateCategory').value = this.currentMode;

        const modal = new bootstrap.Modal(document.getElementById('saveTemplateModal'));
        
        // Handle save button click inside the modal
        const confirmBtn = document.getElementById('confirmSaveTemplate');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener('click', async () => {
            const name = document.getElementById('templateName').value.trim();
            if (!name) {
                alert('テンプレート名を入力してください。');
                return;
            }

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
            const response = await fetch('/api/templates/tikz', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Assuming a session token is stored and retrieved for auth
                    'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
                },
                body: JSON.stringify(templateData)
            });

            const result = await response.json();
            if (response.ok && result.success) {
                this.log('テンプレートの保存に成功しました', 'success');
                await this.loadTemplatesFromDB(); // Refresh the template list
            } else {
                throw new Error(result.error || 'Save failed');
            }
        } catch (error) {
            this.log(`テンプレートの保存に失敗: ${error.message}`, 'error');
            alert(`テンプレートの保存に失敗しました: ${error.message}`);
        }
    }

    // ... (The rest of the methods: setupPhysicsModes, updateToolbar, insertCode, parsePhysicsTikZCode, renderWithJSXGraph, etc. remain largely the same as before)
}