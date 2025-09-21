// Physics TikZ Creator v1.0 - 物理図制作専用システム
        class PhysicsTikZCreator {
            constructor() {
                this.input = document.getElementById('tikzInput');
                this.preview = document.getElementById('preview');
                this.status = document.getElementById('status');
                this.toolbar = document.getElementById('toolbar');
                this.debugOutput = document.getElementById('debugOutput');
                this.currentMode = 'mechanics';
                this.editor = null;
                this.boardCounter = 0;

                this.init();
            }

            init() {
                this.log('Physics TikZ Creator v1.0 システム初期化開始');
                this.log('物理教育専用JSXGraph描画システム');
                this.setupCodeEditor();
                this.setupEventListeners();
                this.setupPhysicsModes();
                this.updateToolbar();
                this.initJSXGraph();
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

                // 100行を超えたら古いログを削除
                if (this.debugOutput.children.length > 100) {
                    this.debugOutput.removeChild(this.debugOutput.firstChild);
                }
            }

            initJSXGraph() {
                this.log('JSXGraph物理描画エンジン初期化開始');
                try {
                    if (typeof JXG !== 'undefined') {
                        // テスト用ボード作成
                        const testBoard = JXG.JSXGraph.initBoard('test-board', {
                            boundingbox: [-4, 4, 4, -4],
                            axis: false,
                            showCopyright: false,
                            showNavigation: false
                        });

                        // 物理テスト用図形 - 力のベクトル
                        const forceVector = testBoard.create('arrow', [[0, 0], [2, 1]], {
                            strokeColor: 'blue',
                            strokeWidth: 3
                        });

                        testBoard.create('text', [1, 0.7, 'F'], {
                            fontSize: 16,
                            color: 'blue'
                        });

                        testBoard.create('text', [0, -3, 'Physics TikZ Test'], {
                            fontSize: 14,
                            color: '#f59e0b'
                        });

                        this.log('JSXGraph物理描画エンジン初期化完了', 'success');
                        this.status.textContent = '✅ Physics TikZ システム準備完了';
                        this.status.className = 'status';
                        this.loadPhysicsSample();
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
                // サンプル選択
                document.querySelectorAll('.sample-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        this.loadPhysicsTemplate(btn.dataset.sample);
                        this.log(`物理テンプレート読み込み: ${btn.dataset.sample}`);
                    });
                });

                // モード選択
                document.querySelectorAll('[data-mode]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        this.currentMode = btn.dataset.mode;
                        this.updateToolbar();
                        this.log(`物理分野変更: ${btn.dataset.mode}`);
                    });
                });


                // エディタ制御
                document.getElementById('clearCode').addEventListener('click', () => {
                    if (confirm('物理図のコードをクリアしますか？')) {
                        if (this.editor) {
                            this.editor.setValue('');
                        } else {
                            this.input.value = '';
                        }
                        this.preview.innerHTML = '<p style="color: #92400e; margin-top: 150px;">物理図のTikZコードを入力してください</p>';
                        this.log('物理図コードクリア実行', 'success');
                    }
                });

                document.getElementById('exportPNG').addEventListener('click', () => {
                    this.exportImage('png');
                });

                document.getElementById('exportSVG').addEventListener('click', () => {
                    this.exportImage('svg');
                });
            }

            setupPhysicsModes() {
                this.physicsToolsets = {
                    mechanics: [
                        { code: 'draw[thick,->,blue] (0,0) -- (2,1) node[above] {$\vec{F}$};', label: '力ベクトル' },
                        { code: 'draw[thick] (0,0) -- (3,0); \draw[thick] (0,0) -- (2.12, 2.12);', label: '斜面' },
                        { code: 'draw (0,2) -- (0,0) -- (0,-2); \draw (0,0) circle (0.1);', label: '振り子' },
                        { code: 'draw[->] (0,0) -- (2,0) node[right] {$v$}; \draw[->] (0,0) -- (0,1.5) node[above] {$a$};', label: '速度・加速度' },
                        { code: 'draw (0,0) rectangle (1,0.5); \draw[->] (1.5,0.25) -- (2.5,0.25) node[above] {$F$};', label: '物体と力' },
                        { code: 'draw[domain=-2:2] plot (\x, \x*\x/2);', label: '軌道' },
                    ],
                    electromagnetism: [
                        { code: 'draw[blue] (0,0) circle (0.2); \draw[->] (0,0) -- (1.5,0) node[right] {$\vec{E}$};', label: '電場' },
                        { code: 'draw[red,thick] (0,-1) -- (0,1); \foreach \i in {-1,-0.5,0,0.5,1} \draw[->] (\i,-0.5) -- (\i,0.5);', label: '磁場' },
                        { code: 'draw (0,0) -- (2,0) -- (2,1) -- (0,1) -- cycle; \draw (0.5,0) -- (0.5,1);', label: '回路' },
                        { code: 'draw[red] (+1,0) circle (0.2) node {+}; \draw[blue] (-1,0) circle (0.2) node {-};', label: '電荷' },
                        { code: 'draw[thick] (0,0) -- (1,0); \draw (1,0) circle (0.3);', label: 'コンデンサ' },
                        { code: 'draw[thick] (0,0) -- (1,0); \draw[thick,red] (1,0) -- (1,1) -- (2,1) -- (2,0) -- (3,0);', label: 'コイル' },
                    ],
                    thermodynamics: [
                        { code: 'draw[->] (0,0) -- (3,0) node[right] {$V$}; \draw[->] (0,0) -- (0,3) node[above] {$P$};', label: 'PV図' },
                        { code: 'draw[thick] (0.5,2.5) -- (2.5,0.5); \draw (1.5,1.5) node {等温線};', label: '等温過程' },
                        { code: 'draw[thick] (1,0.5) -- (1,2.5); \draw (1.2,1.5) node {等積};', label: '等積過程' },
                        { code: 'draw[thick] (0.5,1.5) -- (2.5,1.5); \draw (1.5,1.7) node {等圧};', label: '等圧過程' },
                        { code: 'draw (0,0) rectangle (2,1); \draw[->] (2.5,0.5) -- (3.5,0.5); \draw (4,0) rectangle (5,0.8);', label: '熱機関' },
                        { code: 'draw[red] (1,1.5) circle (0.3); \draw[->] (1,1.2) -- (1,0.8) node[below] {熱};', label: '熱伝導' },
                    ],
                    waves: [
                        { code: 'draw[domain=0:4*pi,smooth] plot (\x/2, sin(\x r));', label: '正弦波' },
                        { code: 'draw[blue,domain=0:4*pi] plot (\x/2, sin(\x r)); \draw[red,domain=0:4*pi] plot (\x/2+1, sin(\x r));', label: '波の重ね合わせ' },
                        { code: 'draw[thick] (0,0) -- (2,0); \draw[thick] (0,0) -- (1.41,1.41); \draw[dashed] (1.41,1.41) -- (2,0);', label: '反射' },
                        { code: 'draw (0,0) -- (3,0); \draw (1,0) -- (1,2); \draw[red] (0.5,0) arc (0:45:0.5);', label: '屈折' },
                        { code: 'draw[thick] (0,-1) -- (0,1); \draw[red] (0.5,-0.5) arc (-90:90:0.5);', label: '回折' },
                        { code: 'draw[blue] (0,1) -- (2,1); \draw[red] (0,-1) -- (2,-1); \draw[purple] (1,0) circle (0.1);', label: '干渉' },
                    ],
                    modern: [
                        { code: 'draw[thick] (0,0) -- (2,0); \draw[->] (0.5,0) -- (0.5,0.5) node[above] {$h\nu$};', label: '光電効果' },
                        { code: 'draw (1,0) circle (0.5); \draw[red] (1,0) circle (0.8);', label: '原子模型' },
                        { code: 'draw[->] (0,0) -- (1,0) node[below] {$e^-$}; \draw[dashed] (1,0) -- (2,0);', label: '電子線' },
                        { code: 'draw[thick,red] (0,1) -- (2,1); \draw[thick,blue] (0,-1) -- (2,-1);', label: 'エネルギー準位' },
                        { code: 'draw[domain=-2:2] plot (\x, exp(-\x*\x)); \draw (0,-0.5) node {$\psi$};', label: '波動関数' },
                        { code: 'draw[->] (0,0) -- (2,0) node[right] {$t$}; \draw (1,0) -- (1,1) node[above] {崩壊};', label: '放射性崩壊' },
                    ]
                };
            }

            updateToolbar() {
                const tools = this.physicsToolsets[this.currentMode] || [];
                this.toolbar.innerHTML = tools.map(tool =>
                    `<button class="tool-btn" data-code="${tool.code}">${tool.label}</button>`
                ).join('');

                this.toolbar.querySelectorAll('.tool-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        this.insertCode('\' + btn.dataset.code);
                    });
                });
            }

            insertCode(code) {
                if (this.editor) {
                    const cursor = this.editor.getCursor();
                    this.editor.replaceRange(code + '\n', cursor);
                    this.editor.focus();
                }
            }

            loadPhysicsTemplate(templateName) {
                const templates = {
                    '力の合成': '% 力の合成\n\draw[thick,->,blue] (0,0) -- (2,1) node[above] {$\vec{F}_1$};
\draw[thick,->,green] (0,0) -- (1,2) node[left] {$\vec{F}_2$};
\draw[thick,->,red] (0,0) -- (3,3) node[above right] {$\vec{F}_{合}$};
\draw[dashed] (2,1) -- (3,3);
\draw[dashed] (1,2) -- (3,3);',
                    '斜面': '% 斜面運動\n\draw[thick] (0,0) -- (4,0) -- (3,2) -- cycle;
\draw (2.5,0.5) rectangle (3,1);
\draw[->] (2.75,0.75) -- (2.25,0.25) node[below left] {$mg\sin\theta$};
\draw[->] (2.75,0.75) -- (2.75,0.25) node[below] {$mg\cos\theta$};
\draw[->] (2.75,0.75) -- (2.75,1.75) node[above] {$N$};',
                    '振り子': '% 振り子\n\draw[thick] (0,3) -- (0,0);
\draw[thick] (0,3) -- (2,1);
\draw (2,1) circle (0.2);
\draw[->] (2,1) -- (2,0) node[below] {$mg$};
\draw[->] (2,1) -- (1,2) node[above left] {$T$};
\draw (0,2.5) arc (270:315:0.5) node[midway,right] {$\theta$};',
                    '電場': '% 電場\n\draw[red] (0,0) circle (0.2) node {+};
\foreach \a in {0,30,60,90,120,150,180,210,240,270,300,330}
  \draw[->] (0,0) -- (\a:1.5);
\draw (0,-2.5) node {点電荷の電場};',
                    '磁場': '% 磁場\n\draw[thick,blue] (0,-2) -- (0,2) node[above] {導線};
\foreach \r in {0.5,1,1.5} {
  \draw[red] (0,0) circle (\r);
}
\draw (2,0) node {磁場};
\draw[->] (0.5,0) arc (0:45:0.5);
\draw (0.7,0.2) node {$B$};',
                    '回路': `% 電気回路 - コンデンサー回路例\r
\begin{tikzpicture}[\r
    font=\sffamily,\r
    C/.style={capacitor, l^=\text{#1}},
    S/.style={spst, l^=\text{#1}},
    node font=\Large
  ]\r

  \coordinate (P) at (0,4);
  \coordinate (S_gnd) at (0,0);
  \coordinate (A) at (5,4);
  \coordinate (B) at (5,0);
  \coordinate (R) at (9,4);
  \coordinate (T) at (9,0);

  \draw (S_gnd) to[battery1, l_=$E$] (P);
  \draw (A) to[C=$C_2$] (B);
  \draw (R) to[C=$C_3$] (T);

  \draw (P) to[short, -o] ++(1.5,0) coordinate (S1_in);
  \draw (S1_in) to[S=$S_1$] ++(2,0) coordinate (S1_out);
  \draw (S1_out) to[C=$C_1$] (A);

  \draw (A) to[short, o-o] ++(1.5,0) coordinate (S2_in);
  \draw (S2_in) to[S=$S_2$] ++(2,0) coordinate (S2_out);
  \draw (S2_out) to[short, -o] (R);

  \draw (S_gnd) -- (B) -- (T);

  \node[above=2pt of A] {A};
  \node[below=2pt of B] {B};

  \node[below=0.8cm of B] {図 1};
\end{tikzpicture}`,
                    '波動': `% 波動
\draw[->] (0,0) -- (6,0) node[right] {$x$};
\draw[->] (0,-2) -- (0,2) node[above] {$y$};
\draw[blue,thick,domain=0:5.5,smooth] plot (\x, sin(\x*180/3.14159*2));
\draw (3,-1.5) node {$y = A\sin(kx - \omega t)$};',
                    '干渉': `% 干渉
\draw[blue] (0,1) -- (4,1);
\draw[red] (0,-1) -- (4,-1);
\draw[purple,thick] (2,0) -- (4,0);
\draw (0,1.2) node {波1};
\draw (0,-1.2) node {波2};
\draw (3,0.2) node {合成波};',
                    '回折': `% 回折
\draw[thick] (0,-2) -- (0,-0.5);
\draw[thick] (0,0.5) -- (0,2);
\draw[blue] (-2,0) -- (0,0);
\draw[red] (0,0) -- (2,1);
\draw[red] (0,0) -- (2,0);
\draw[red] (0,0) -- (2,-1);
\draw (-1,0.2) node {入射波};
\draw (1.5,0.2) node {回折波};',
                    '熱機関': `% 熱機関
\draw (0,2) rectangle (2,3) node[midway] {高温熱源};
\draw (0,0) rectangle (2,1) node[midway] {低温熱源};
\draw (0.5,1.2) rectangle (1.5,1.8) node[midway] {熱機関};
\draw[->] (1,2) -- (1,1.8) node[midway,left] {$Q_H$};
\draw[->] (1,1.2) -- (1,1) node[midway,left] {$Q_L$};
\draw[->] (1.5,1.5) -- (2.5,1.5) node[above] {$W$};',
                    'PVグラフ': `% PVグラフ
\draw[->] (0,0) -- (4,0) node[right] {$V$};
\draw[->] (0,0) -- (0,3) node[above] {$P$};
\draw[thick,blue] (0.5,2.5) to[out=-30,in=150] (3.5,0.5);
\draw (2,1.5) node {等温線};
\draw[thick,red] (1,0.5) -- (1,2.5);
\draw (1.2,1.5) node {等積};',
                    'エネルギー': `% エネルギー図
\draw[->] (0,0) -- (5,0) node[right] {位置};
\draw[->] (0,0) -- (0,4) node[above] {エネルギー};
\draw[blue,thick] (0.5,3) .. controls (2,1) and (3,1) .. (4.5,3) node[right] {$U(x)$};
\draw[red,thick] (0.5,2.5) -- (4.5,2.5) node[right] {$E$};
\draw[green,thick] (0.5,0) -- (4.5,1.5) node[right] {$K(x)$};'
                };

                const template = templates[templateName] || `% ${templateName}`;

                if (this.editor) {
                    this.editor.setValue(template);
                } else {
                    this.input.value = template;
                }

                setTimeout(() => this.renderPhysicsTikZ(), 100);
            }

            parsePhysicsTikZCode(tikzCode) {
                const commands = [];
                const lines = tikzCode.split('\n');

                // 座標定義を最初に処理
                const coordinateMap = {};

                for (let line of lines) {
                    line = line.trim();
                    if (line.startsWith('\coordinate')) {
                        const match = line.match(/\\coordinate\s*\(([^)]+)\)\s*at\s*\(([^)]+)\)/);
                        if (match) {
                            const name = match[1];
                            const coords = match[2].split(',').map(s => parseFloat(s.trim()));
                            if (coords.length >= 2) {
                                coordinateMap[name] = coords;
                                commands.push({
                                    type: 'coordinate',
                                    name: name,
                                    position: coords,
                                    color: 'transparent'
                                });
                            }
                        }
                    }
                }

                // 描画コマンドを処理（座標参照を解決）
                for (let line of lines) {
                    line = line.trim();
                    if (line.startsWith('\draw')) {
                        const cmd = this.parsePhysicsDrawCommand(line, coordinateMap);
                        if (cmd) commands.push(cmd);
                    } else if (line.startsWith('\node')) {
                        const cmd = this.parsePhysicsDrawCommand(line, coordinateMap);
                        if (cmd) commands.push(cmd);
                    }
                }

                return commands;
            }

            parsePhysicsDrawCommand(line, coordinateMap = {}) {
                // circuitikz コマンド（電気回路専用）
                if (line.includes('to[') && (line.includes('battery') || line.includes('C=') || line.includes('S=') || line.includes('short'))) {
                    const coords = this.extractAdvancedCoordinates(line, coordinateMap);
                    if (coords.length >= 2) {
                        let componentType = 'wire';
                        let label = '';

                        if (line.includes('battery')) {
                            componentType = 'battery';
                            const labelMatch = line.match(/l_?=\$([^$]*)\$/);
                            if (labelMatch) label = labelMatch[1];
                        } else if (line.includes('C=')) {
                            componentType = 'capacitor';
                            const labelMatch = line.match(/C=\$([^$]*)\$/);
                            if (labelMatch) label = labelMatch[1];
                        } else if (line.includes('S=')) {
                            componentType = 'switch';
                            const labelMatch = line.match(/S=\$([^$]*)\$/);
                            if (labelMatch) label = labelMatch[1];
                        } else if (line.includes('R=')) {
                            componentType = 'resistor';
                            const labelMatch = line.match(/R=\\$([^$]*)\\$);
                            if (labelMatch) label = labelMatch[1];
                        } else if (line.includes('gnd')) {
                            componentType = 'gnd';
                        } else if (line.includes('short')) {
                            componentType = 'wire';
                        }

                        const returnCmd = {
                            type: 'circuit_component',
                            componentType: componentType,
                            start: coords[0],
                            end: coords[1],
                            label: label,
                            color: this.extractColor(line) || 'black'
                        };

                        if (componentType === 'wire') {
                            if (line.includes(', -o')) { returnCmd.endTerminal = 'o'; }
                            if (line.includes(', o-o')) {
                                returnCmd.startTerminal = 'o';
                                returnCmd.endTerminal = 'o';
                            }
                        }
                        return returnCmd;
                    }
                }

                // coordinate コマンド（座標定義）
                if (line.includes('\coordinate')) {
                    const match = line.match(/\\coordinate\s*\(([^)]+)\)\s*at\s*\(([^)]+)\)/);
                    if (match) {
                        const name = match[1];
                        const coords = match[2].split(',').map(s => parseFloat(s.trim()));
                        if (coords.length >= 2) {
                            return {
                                type: 'coordinate',
                                name: name,
                                position: coords,
                                color: 'transparent'
                            };
                        }
                    }
                }

                // node コマンド（テキストラベル）
                if (line.includes('\node')) {
                    const positionMatch = line.match(/\\\[([^\]]*)\]\s*at\s*\(([^)]+)\)\s*\{([^}]*)\}/);
                    if (positionMatch) {
                        const position = positionMatch[2].split(',').map(s => parseFloat(s.trim()));
                        const text = positionMatch[3];
                        if (position.length >= 2) {
                            return {
                                type: 'text',
                                position: position,
                                text: text,
                                color: this.extractColor(line) || 'black'
                            };
                        }
                    }

                    // 相対位置のnode
                    const relativeMatch = line.match(/\\\[([^\]]*)\]\s*\{([^}]*)\}/);
                    if (relativeMatch) {
                        const text = relativeMatch[2];
                        return {
                            type: 'text',
                            position: [0, 0], // デフォルト位置
                            text: text,
                            color: this.extractColor(line) || 'black'
                        };
                    }
                }

                // 物理ベクトル（矢印）
                if (line.includes('->') && !line.includes('domain') && !line.includes('to[')) {
                    const coords = this.extractAdvancedCoordinates(line, coordinateMap);
                    if (coords.length >= 2) {
                        const color = this.extractColor(line) || 'blue';
                        return {
                            type: 'arrow',
                            start: coords[0],
                            end: coords[1],
                            color: color,
                            thick: line.includes('thick')
                        };
                    }
                }

                // 円・点電荷など
                if (line.includes('circle')) {
                    const match = line.match(/\\draw.*\((.*?),(.*?)\).*circle.*\((.*?)\)/);
                    if (match) {
                        const color = this.extractColor(line) || 'black';
                        return {
                            type: 'circle',
                            center: [parseFloat(match[1]), parseFloat(match[2])],
                            radius: parseFloat(match[3]),
                            color: color
                        };
                    }
                }

                // 長方形・物体
                if (line.includes('rectangle')) {
                    const match = line.match(/\\draw.*\((.*?),(.*?)\).*rectangle.*\((.*?),(.*?)\)/);
                    if (match) {
                        return {
                            type: 'rectangle',
                            corner1: [parseFloat(match[1]), parseFloat(match[2])],
                            corner2: [parseFloat(match[3]), parseFloat(match[4])],
                            color: this.extractColor(line) || 'black'
                        };
                    }
                }

                // 関数グラフ（波動など）
                if (line.includes('domain') && line.includes('plot')) {
                    return {
                        type: 'function',
                        domain: this.extractDomain(line),
                        color: this.extractColor(line) || 'blue',
                        func: this.extractFunction(line)
                    };
                }

                // 通常の線分
                if (line.includes('--')) {
                    const coords = this.extractAdvancedCoordinates(line, coordinateMap);
                    if (coords.length >= 2) {
                        return {
                            type: 'line',
                            points: coords,
                            color: this.extractColor(line) || 'black',
                            thick: line.includes('thick'),
                            dashed: line.includes('dashed')
                        };
                    }
                }

                return null;
            }

            extractColor(line) {
                const colors = ['red', 'blue', 'green', 'purple', 'orange', 'yellow', 'black'];
                for (let color of colors) {
                    if (line.includes(color)) return color;
                }
                return null;
            }

            extractDomain(line) {
                const match = line.match(/domain=(.*?):(.*?)[,]]/);
                if (match) {
                    return [parseFloat(match[1]), parseFloat(match[2])];
                }
                return [-2, 2];
            }

            extractFunction(line) {
                if (line.includes('sin')) return 'sin';
                if (line.includes('cos')) return 'cos';
                if (line.includes('exp')) return 'exp';
                return 'linear';
            }

            extractAdvancedCoordinates(line, coordinateMap = {}) {
                const coords = [];
                let currentPosition = [0, 0];

                // 座標パターンを順次解析（相対座標、絶対座標、名前付き座標）
                const coordPatterns = [
                    /\(([^)]+)\)/g,          // 通常の座標 (x,y)
                    /\+\+\(([^)]+)\)/g,     // 相対座標 ++(x,y)
                    /coordinate\s*\(([^)]+)\)/g  // coordinate 命令内
                ];

                // 複数のマッチパターンを統合して処理
                const allMatches = [];

                // (x,y) 形式の座標を抽出
                let match;
                const coordRegex = /\(([^)]+)\)/g;
                while ((match = coordRegex.exec(line)) !== null) {
                    allMatches.push({
                        type: 'absolute',
                        content: match[1],
                        fullMatch: match[0]
                    });
                }

                // ++(x,y) 形式の相対座標を抽出
                const relativeRegex = /\+\+\(([^)]+)\)/g;
                while ((match = relativeRegex.exec(line)) !== null) {
                    allMatches.push({
                        type: 'relative',
                        content: match[1],
                        fullMatch: match[0]
                    });
                }

                for (let coordMatch of allMatches) {
                    if (coordMatch.type === 'absolute') {
                        // 名前付き座標の確認
                        const coordStr = coordMatch.content.trim();
                        if (coordinateMap[coordStr]) {
                            coords.push(coordinateMap[coordStr]);
                            currentPosition = coordinateMap[coordStr];
                        } else {
                            // 数値座標の解析
                            const coordParts = coordStr.split(',').map(s => parseFloat(s.trim()));
                            if (coordParts.length >= 2 && !isNaN(coordParts[0]) && !isNaN(coordParts[1])) {
                                coords.push(coordParts);
                                currentPosition = coordParts;
                            }
                        }
                    } else if (coordMatch.type === 'relative') {
                        // 相対座標の計算
                        const coordParts = coordMatch.content.split(',').map(s => parseFloat(s.trim()));
                        if (coordParts.length >= 2 && !isNaN(coordParts[0]) && !isNaN(coordParts[1])) {
                            const newPos = [
                                currentPosition[0] + coordParts[0],
                                currentPosition[1] + coordParts[1]
                            ];
                            coords.push(newPos);
                            currentPosition = newPos;
                        }
                    }
                }

                return coords;
            }

            renderWithJSXGraph(commands) {
                try {
                    this.boardCounter++;
                    const boardId = 'physics-board-' + this.boardCounter;

                    this.preview.innerHTML = `<div id="${boardId}" class="tikz-output"></div>`;

                    const board = JXG.JSXGraph.initBoard(boardId, {
                        boundingbox: [-2, 6, 12, -2],
                        axis: false,
                        showCopyright: false,
                        showNavigation: false
                    });

                    // 座標参照システム - 定義された座標を保存
                    const coordinateMap = {};

                    // 第1パス: 座標定義を処理
                    commands.filter(cmd => cmd.type === 'coordinate').forEach(cmd => {
                        coordinateMap[cmd.name] = cmd.position;
                        // デバッグ用に座標点を表示（小さな点）
                        board.create('point', cmd.position, {
                            size: 2,
                            color: '#888',
                            name: cmd.name,
                            showInfobox: true
                        });
                    });

                    this.log(`座標定義: ${Object.keys(coordinateMap).length}個`);
                    Object.keys(coordinateMap).forEach(name => {
                        this.log(`- ${name}: [${coordinateMap[name]}]`);
                    });

                    // 第2パス: 回路コンポーネントを描画
                    const circuitComponents = commands.filter(cmd => cmd.type === 'circuit_component');

                    circuitComponents.forEach(cmd => {
                        this.log(`描画中: ${cmd.componentType} "${cmd.label}" from [${cmd.start}] to [${cmd.end}]`);

                        const [x1, y1] = cmd.start;
                        const [x2, y2] = cmd.end;

                        if (cmd.componentType === 'wire' || cmd.componentType === 'short') {
                            // 単純な導線
                            board.create('segment', [
                                [x1, y1], [x2, y2]
                            ], {
                                strokeColor: 'black',
                                strokeWidth: 2
                            });

                        } else if (cmd.componentType === 'battery') {
                            // バッテリーシンボル - より視覚的に正確
                            const midX = (x1 + x2) / 2;
                            const midY = (y1 + y2) / 2;

                            // 接続線（両端）
                            const quarterX1 = x1 + (x2 - x1) * 0.3;
                            const quarterY1 = y1 + (y2 - y1) * 0.3;
                            const quarterX2 = x1 + (x2 - x1) * 0.7;
                            const quarterY2 = y1 + (y2 - y1) * 0.7;

                            board.create('segment', [[x1, y1], [quarterX1, quarterY1]], {
                                strokeColor: 'black', strokeWidth: 2
                            });
                            board.create('segment', [[quarterX2, quarterY2], [x2, y2]], {
                                strokeColor: 'black', strokeWidth: 2
                            });

                            // バッテリーシンボル（長い線と短い線）
                            const dx = x2 - x1;
                            const dy = y2 - y1;
                            const length = Math.sqrt(dx*dx + dy*dy);
                            const perpX = -dy / length * 0.4;
                            const perpY = dx / length * 0.4;

                            // 正極（長い線）
                            board.create('segment', [
                                [quarterX1 + perpX, quarterY1 + perpY],
                                [quarterX1 - perpX, quarterY1 - perpY]
                            ], {
                                strokeColor: 'red',
                                strokeWidth: 4
                            });

                            // 負極（短い線）
                            board.create('segment', [
                                [quarterX2 + perpX*0.6, quarterY2 + perpY*0.6],
                                [quarterX2 - perpX*0.6, quarterY2 - perpY*0.6]
                            ], {
                                strokeColor: 'black',
                                strokeWidth: 4
                            });

                            // ラベル
                            if (cmd.label) {
                                board.create('text', [midX - perpY*0.8, midY + perpX*0.8, cmd.label], {
                                    fontSize: 14,
                                    color: 'blue'
                                });
                            }

                        } else if (cmd.componentType === 'capacitor') {
                            // コンデンサーシンボル - 平行板
                            const midX = (x1 + x2) / 2;
                            const midY = (y1 + y2) / 2;

                            // 接続線
                            const plate1X = x1 + (x2 - x1) * 0.4;
                            const plate1Y = y1 + (y2 - y1) * 0.4;
                            const plate2X = x1 + (x2 - x1) * 0.6;
                            const plate2Y = y1 + (y2 - y1) * 0.6;

                            board.create('segment', [[x1, y1], [plate1X, plate1Y]], {
                                strokeColor: 'black', strokeWidth: 2
                            });
                            board.create('segment', [[plate2X, plate2Y], [x2, y2]], {
                                strokeColor: 'black', strokeWidth: 2
                            });

                            // 平行板
                            const dx = x2 - x1;
                            const dy = y2 - y1;
                            const length = Math.sqrt(dx*dx + dy*dy);
                            const perpX = -dy / length * 0.3;
                            const perpY = dx / length * 0.3;

                            // 第1板
                            board.create('segment', [
                                [plate1X + perpX, plate1Y + perpY],
                                [plate1X - perpX, plate1Y - perpY]
                            ], {
                                strokeColor: 'blue',
                                strokeWidth: 4
                            });

                            // 第2板
                            board.create('segment', [
                                [plate2X + perpX, plate2Y + perpY],
                                [plate2X - perpX, plate2Y - perpY]
                            ], {
                                strokeColor: 'blue',
                                strokeWidth: 4
                            });

                            // ラベル
                            if (cmd.label) {
                                board.create('text', [midX - perpY*0.6, midY + perpX*0.6, cmd.label], {
                                    fontSize: 14,
                                    color: 'blue'
                                });
                            }

                        } else if (cmd.componentType === 'switch') {
                            // スイッチシンボル
                            const midX = (x1 + x2) / 2;
                            const midY = (y1 + y2) / 2;

                            // 接続線
                            const switch1X = x1 + (x2 - x1) * 0.3;
                            const switch1Y = y1 + (y2 - y1) * 0.3;
                            const switch2X = x1 + (x2 - x1) * 0.7;
                            const switch2Y = y1 + (y2 - y1) * 0.7;

                            board.create('segment', [[x1, y1], [switch1X, switch1Y]], {
                                strokeColor: 'black', strokeWidth: 2
                            });
                            board.create('segment', [[switch2X, switch2Y], [x2, y2]], {
                                strokeColor: 'black', strokeWidth: 2
                            });

                            // スイッチ（開いた状態）
                            const dx = x2 - x1;
                            const dy = y2 - y1;
                            const length = Math.sqrt(dx*dx + dy*dy);
                            const unitX = dx / length;
                            const unitY = dy / length;

                            board.create('segment', [
                                [switch1X, switch1Y],
                                [switch1X + unitX * 0.5, switch1Y + unitY * 0.5 + 0.2]
                            ], {
                                strokeColor: 'green',
                                strokeWidth: 3
                            });

                            // 接点
                            board.create('point', [switch1X, switch1Y], {
                                size: 3, color: 'green', fixed: true
                            });
                            board.create('point', [switch2X, switch2Y], {
                                size: 3, color: 'green', fixed: true
                            });

                            // ラベル
                            if (cmd.label) {
                                board.create('text', [midX, midY + 0.3, cmd.label], {
                                    fontSize: 14,
                                    color: 'green'
                                });
                            }
                        }
                    });

                    // 第3パス: 通常の線分（接続線）
                    commands.filter(cmd => cmd.type === 'line').forEach(cmd => {
                        const points = cmd.points.map(p => board.create('point', p, {visible: false}));
                        for (let i = 0; i < points.length - 1; i++) {
                            board.create('segment', [points[i], points[i + 1]], {
                                strokeColor: cmd.color,
                                strokeWidth: cmd.thick ? 3 : 2,
                                dash: cmd.dashed ? 2 : 0
                            });
                        }
                    });

                    // 第4パス: テキストラベル
                    commands.filter(cmd => cmd.type === 'text').forEach(cmd => {
                        board.create('text', [cmd.position[0], cmd.position[1], cmd.text], {
                            fontSize: 16,
                            color: cmd.color,
                            anchorX: 'middle',
                            anchorY: 'middle'
                        });
                    });

                    // 第5パス: その他の図形要素
                    commands.forEach(cmd => {
                        if (cmd.type === 'arrow') {
                            board.create('arrow', [cmd.start, cmd.end], {
                                strokeColor: cmd.color,
                                strokeWidth: cmd.thick ? 3 : 2
                            });
                        } else if (cmd.type === 'circle') {
                            board.create('circle', [cmd.center, cmd.radius], {
                                strokeColor: cmd.color,
                                strokeWidth: 2
                            });
                        } else if (cmd.type === 'rectangle') {
                            const [x1, y1] = cmd.corner1;
                            const [x2, y2] = cmd.corner2;
                            const p1 = board.create('point', [x1, y1], {visible: false});
                            const p2 = board.create('point', [x2, y1], {visible: false});
                            const p3 = board.create('point', [x2, y2], {visible: false});
                            const p4 = board.create('point', [x1, y2], {visible: false});

                            board.create('polygon', [p1, p2, p3, p4], {
                                strokeColor: cmd.color,
                                strokeWidth: 2,
                                fillColor: 'none'
                            });
                        } else if (cmd.type === 'function') {
                            let func;
                            if (cmd.func === 'sin') {
                                func = function(x) { return Math.sin(x * 2); };
                            } else if (cmd.func === 'cos') {
                                func = function(x) { return Math.cos(x * 2); };
                            } else if (cmd.func === 'exp') {
                                func = function(x) { return Math.exp(-x * x); };
                            } else {
                                func = function(x) { return x; };
                            }

                            board.create('functiongraph', [func, cmd.domain[0], cmd.domain[1]], {
                                strokeColor: cmd.color,
                                strokeWidth: 3
                            });
                        }
                    });

                    this.log(`物理図レンダリング完了: ${commands.length} 要素`, 'success');
                    this.log(`- 座標定義: ${Object.keys(coordinateMap).length}個`);
                    this.log(`- 回路部品: ${circuitComponents.length}個`);
                    this.status.textContent = '✅ 物理図レンダリング完了';

                } catch (error) {
                    this.log('物理図レンダリングエラー: ' + error.message, 'error');
                    this.preview.innerHTML = `<p style="color: #ef4444; margin-top: 150px;">レンダリングエラー: ${error.message}</p>`;
                }
            }

            renderPhysicsTikZ() {
                const tikzInput = this.editor ? this.editor.getValue() : this.input.value.trim();
                if (!tikzInput) {
                    this.preview.innerHTML = '<p style="color: #92400e; margin-top: 150px;">物理図のTikZコードを入力してください</p>';
                    return;
                }

                try {
                    this.log('物理図レンダリング開始');
                    const commands = this.parsePhysicsTikZCode(tikzInput);

                    // 回路コンポーネントの詳細ログ
                    const circuitComponents = commands.filter(cmd => cmd.type === 'circuit_component');
                    if (circuitComponents.length > 0) {
                        this.log(`回路コンポーネント解析: ${circuitComponents.length}個`, 'success');
                        circuitComponents.forEach(comp => {
                            this.log(`- ${comp.componentType}: ${comp.label || '無名'} (${comp.start} → ${comp.end})`);
                        });
                    }

                    this.log(`解析結果: ${commands.length} 物理コマンド (内${circuitComponents.length}個が回路)`);

                    if (commands.length > 0) {
                        this.renderWithJSXGraph(commands);
                    } else {
                        this.preview.innerHTML = '<p style="color: #f59e0b; margin-top: 150px;">解析できる物理コマンドがありません<br><small>circuitikz構文、coordinate、node、drawコマンドに対応</small></p>';
                    }

                } catch (error) {
                    this.preview.innerHTML = `<p style="color: #ef4444; margin-top: 150px;">エラー: ${error.message}</p>`;
                    this.log('物理図レンダリング例外: ' + error.message, 'error');
                }
            }

            loadPhysicsSample() {
                const sample = '% 力の合成\n\draw[thick,->,blue] (0,0) -- (2,1) node[above] {$\vec{F}_1$};
\draw[thick,->,green] (0,0) -- (1,2) node[left] {$\vec{F}_2$};
\draw[thick,->,red] (0,0) -- (3,3) node[above right] {$\vec{F}_{合}$};';

                if (this.editor) {
                    this.editor.setValue(sample);
                } else {
                    this.input.value = sample;
                }

                setTimeout(() => this.renderPhysicsTikZ(), 100);
                this.log('物理サンプル読み込み完了', 'success');
            }

            exportImage(format) {
                try {
                    const boardId = 'physics-board-' + this.boardCounter;
                    const boardElement = document.getElementById(boardId);

                    if (!boardElement) {
                        this.log('エラー: レンダリング済みの物理図が見つかりません', 'error');
                        alert('物理図をレンダリングしてから出力してください');
                        return;
                    }

                    const svgElement = boardElement.querySelector('svg');
                    if (!svgElement) {
                        this.log('エラー: SVG要素が見つかりません', 'error');
                        alert('SVG要素が見つかりません');
                        return;
                    }

                    if (format === 'svg') {
                        this.downloadSVG(svgElement, 'physics');
                    } else if (format === 'png') {
                        this.downloadPNG(svgElement, 'physics');
                    }

                } catch (error) {
                    this.log('物理図出力エラー: ' + error.message, 'error');
                    alert('物理図出力でエラーが発生しました: ' + error.message);
                }
            }

            downloadSVG(svgElement, prefix = 'physics') {
                try {
                    const svgClone = svgElement.cloneNode(true);
                    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                    svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

                    const svgString = new XMLSerializer().serializeToString(svgClone);
                    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
                    const filename = `${prefix}_figure_${timestamp}.svg`;

                    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                    const url = URL.createObjectURL(blob);

                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);

                    this.log(`物理図SVGファイル出力完了: ${filename}`, 'success');

                } catch (error) {
                    this.log('SVG出力エラー: ' + error.message, 'error');
                    throw error;
                }
            }

            downloadPNG(svgElement, prefix = 'physics') {
                try {
                    const svgClone = svgElement.cloneNode(true);
                    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

                    const svgString = new XMLSerializer().serializeToString(svgClone);
                    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
                    const filename = `${prefix}_figure_${timestamp}.png`;

                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const img = new Image();

                    img.crossOrigin = 'anonymous';

                    img.onload = () => {
                        try {
                            const scale = 2;
                            canvas.width = img.width * scale;
                            canvas.height = img.height * scale;
                            ctx.scale(scale, scale);

                            ctx.fillStyle = 'white';
                            ctx.fillRect(0, 0, img.width, img.height);
                            ctx.drawImage(img, 0, 0);

                            canvas.toBlob((blob) => {
                                if (blob) {
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = filename;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    URL.revokeObjectURL(url);

                                    this.log(`物理図PNGファイル出力完了: ${filename}`, 'success');
                                } else {
                                    throw new Error('Blobの生成に失敗しました');
                                }
                            }, 'image/png', 1.0);
                        } catch (canvasError) {
                            this.log('Canvas描画エラー: ' + canvasError.message, 'error');
                            this.downloadSVG(svgElement, prefix);
                            alert('PNG出力でエラーが発生したため、SVG形式でダウンロードしました。');
                        }
                    };

                    img.onerror = () => {
                        this.log('PNG変換エラー: SVG読み込み失敗', 'error');
                        this.downloadSVG(svgElement, prefix);
                        alert('PNG出力でエラーが発生したため、SVG形式でダウンロードしました。');
                    };

                    const encodedSvg = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
                    img.src = encodedSvg;

                } catch (error) {
                    this.log('PNG出力エラー: ' + error.message, 'error');
                    this.downloadSVG(svgElement, prefix);
                    alert('PNG出力でエラーが発生したため、SVG形式でダウンロードしました。');
                }
            }
        }

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            new PhysicsTikZCreator();
        });
cale, scale);

                            ctx.fillStyle = 'white';
                            ctx.fillRect(0, 0, img.width, img.height);
                            ctx.drawImage(img, 0, 0);

                            canvas.toBlob((blob) => {
                                if (blob) {
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = filename;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    URL.revokeObjectURL(url);

                                    this.log(`物理図PNGファイル出力完了: ${filename}`, 'success');
                                } else {
                                    throw new Error('Blobの生成に失敗しました');
                                }
                            }, 'image/png', 1.0);
                        } catch (canvasError) {
                            this.log('Canvas描画エラー: ' + canvasError.message, 'error');
                            this.downloadSVG(svgElement, prefix);
                            alert('PNG出力でエラーが発生したため、SVG形式でダウンロードしました。');
                        }
                    };

                    img.onerror = () => {
                        this.log('PNG変換エラー: SVG読み込み失敗', 'error');
                        this.downloadSVG(svgElement, prefix);
                        alert('PNG出力でエラーが発生したため、SVG形式でダウンロードしました。');
                    };

                    const encodedSvg = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
                    img.src = encodedSvg;

                } catch (error) {
                    this.log('PNG出力エラー: ' + error.message, 'error');
                    this.downloadSVG(svgElement, prefix);
                    alert('PNG出力でエラーが発生したため、SVG形式でダウンロードしました。');
                }
            }
        }

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            new PhysicsTikZCreator();
        });
