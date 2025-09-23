// ローカルフォールバック用（D1が利用できない場合に使用）
// 既存の機能はD1優先。これは404/MIMEエラー回避と簡易テンプレート提供のため。
window.PHYSICS_TIKZ_EXAMPLES = [
  {
    id: "ex_mech_axes",
    name: "力学: 座標軸",
    description: "x,y軸の基本セット",
    category: "mechanics",
    code: "\\draw[->] (-3,0) -- (3,0) node[right] {x};\n\\draw[->] (0,-2) -- (0,2) node[above] {y};"
  },
  {
    id: "ex_wave_sine",
    name: "波動: 正弦波概形",
    description: "正弦波の概形",
    category: "waves",
    code: "\\draw[->] (-6,0) -- (6,0) node[right] {x};\n\\draw[->] (0,-2) -- (0,2) node[above] {y};\n\\draw[blue] (-6,0) -- (-4,1) -- (-2,0) -- (0,-1) -- (2,0) -- (4,1) -- (6,0);"
  },
  {
    id: "ex_em_rect_loop",
    name: "電磁: 矩形回路概形",
    description: "回路の矩形ループ（概形）",
    category: "electromagnetism",
    code: "\\draw (0,0) -- (3,0) -- (3,2) -- (0,2) -- (0,0);\n\\draw[->] (0.2,1) -- (1.3,1) node[midway,above] {I};"
  },
  {
    id: "ex_general_parabola",
    name: "放物運動（概形）",
    description: "メカニクスの放物運動を概形で",
    category: "mechanics",
    code: "\\draw[->] (-1,0) -- (6,0) node[right] {x};\n\\draw[->] (0,-1) -- (0,4) node[above] {y};\n\\draw[thick] (0,0) .. controls (2,3) .. (5,0);"
  },
  {
    id: "ex_general_axes",
    name: "general: 座標系",
    description: "一般座標系",
    category: "general",
    code: "\\draw[->] (-2,0) -- (2,0) node[right] {x};\n\\draw[->] (0,-2) -- (0,2) node[above] {y};"
  }
];
