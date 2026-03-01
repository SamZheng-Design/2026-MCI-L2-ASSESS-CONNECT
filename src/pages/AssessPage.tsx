import type { FC } from 'hono/jsx'

// =====================================================
// 评估通 — AssessPage（v33配色重构版）
//
// 设计对标 MC-Revolution v33：
//   - 主色：teal-500 (#5DC4B3) + teal-600 (#49A89A)
//   - 背景：gray-50 (#f9fafb)
//   - 卡片：白色 + 精致border + 柔和阴影
//   - 重点色：teal渐变按钮、emerald通过、red否决
//   - 不再包含官网 Navbar
// =====================================================

export const AssessPage: FC = () => {
  return (
    <div class="min-h-screen" style="background: #f9fafb;">

      {/* ── 页面样式 ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap');

        .assess-root { font-family: 'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif; }

        :root {
          --primary-50:  #F0FDFA;
          --primary-100: #CCFBF1;
          --primary-200: #99F6E4;
          --primary-300: #5EEAD4;
          --primary-400: #7DD4C7;
          --primary-500: #5DC4B3;
          --primary-600: #49A89A;
          --primary-700: #0F766E;
          --primary-800: #115E59;
          --primary-900: #134E4A;
          --accent-500: #49A89A;
          --accent-600: #3D8F83;
          --warm-bg:  #f9fafb;
          --card-bg:  #FFFFFF;
          --border:   #E5E7EB;
        }
        .gs-bg    { background: var(--warm-bg); }
        .gs-card  { background: var(--card-bg); border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04); border: 1px solid var(--border); }
        .card-shadow { box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04); }
        .gradient-bg { background: linear-gradient(135deg, var(--primary-500) 0%, var(--accent-500) 100%); }

        .btn-primary {
          background: linear-gradient(135deg, var(--primary-500), var(--accent-500));
          color: #fff;
          border-radius: 0.625rem;
          padding: 0.5rem 1.25rem;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          box-shadow: 0 4px 14px rgba(93,196,179,0.25);
        }
                .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(93,196,179,0.35); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .track-filter-btn.active {
          background: var(--primary-500);
          color: #fff;
          border-color: var(--primary-500);
        }
        .deal-card.selected {
          border-color: var(--primary-500) !important;
          background: var(--primary-50) !important;
        }
        .deal-card.selected .deal-check { display: flex !important; }

        .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .reasoning-text p { margin-bottom: 0.75rem; }
        .reasoning-text strong { font-weight: 600; }

        @keyframes pulse-ring { 0%,100% { opacity:1; } 50% { opacity:.5; } }
        .animate-pulse { animation: pulse-ring 2s infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fa-spin { animation: spin 1s linear infinite; }

        #assess-toast-container { position: fixed; top: 1rem; right: 1rem; z-index: 9999; display: flex; flex-direction: column; gap: 0.5rem; }
        .toast-item { padding: 0.75rem 1rem; border-radius: 0.625rem; font-size: 0.875rem; box-shadow: 0 4px 6px rgba(0,0,0,.1); min-width: 200px; max-width: 360px; display: flex; align-items: center; gap: 0.5rem; animation: slideIn 0.3s ease-out; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

        .rotate-180 { transform: rotate(180deg); }

        /* 顶部导航条 */
        .assess-topbar {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(229,231,235,0.8);
        }

        /* 用户头像 */
        .user-avatar {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--primary-500), var(--accent-500));
          display: flex; align-items: center; justify-content: center;
          color: white; font-weight: 700; font-size: 14px;
        }
      `}</style>

      {/* ── Toast 容器 ── */}
      <div id="assess-toast-container"></div>

      {/* ── 顶部导航（替代 Navbar） ── */}
      <nav class="assess-topbar sticky top-0 z-40 px-6 py-3">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <i class="fas fa-clipboard-check text-white text-lg"></i>
              </div>
              <div>
                <h1 class="text-lg font-bold text-gray-900">Assess Connect</h1>
                <p class="text-[10px] text-gray-400 font-medium -mt-0.5">评估通 · 多智能体协作投资决策</p>
              </div>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <a href="/agents" class="px-3 py-1.5 bg-white text-gray-600 rounded-lg hover:bg-gray-50 transition text-sm border border-gray-200">
              <i class="fas fa-robot mr-1.5"></i>智能体管理
            </a>
            <button onclick="toggleAllDetails()" class="px-3 py-1.5 bg-white text-gray-600 rounded-lg hover:bg-gray-50 transition text-sm border border-gray-200">
              <i class="fas fa-eye mr-1.5"></i><span id="toggle-all-text">展开全部</span>
            </button>
            <button onclick="resetEvaluation()" class="px-3 py-1.5 bg-white text-gray-600 rounded-lg hover:bg-gray-50 transition text-sm border border-gray-200">
              <i class="fas fa-redo mr-1.5"></i>重置
            </button>
            <button onclick="startEvaluation()" id="btn-start" class="btn-primary shadow-md">
              <i class="fas fa-play"></i>开始评估
            </button>
            <div class="w-px h-6 bg-gray-200 mx-1"></div>
            <div id="user-display" class="flex items-center space-x-2 cursor-pointer" onclick="handleLogout()">
              <div class="user-avatar" id="user-avatar-el">S</div>
              <div class="hidden sm:block">
                <p class="text-sm font-medium text-gray-700 leading-tight" id="user-name-el">用户</p>
                <p class="text-[10px] text-gray-400">投资者</p>
              </div>
              <i class="fas fa-sign-out-alt text-gray-400 text-sm ml-1 hover:text-red-400 transition"></i>
            </div>
          </div>
        </div>
      </nav>

      {/* ── 主内容 ── */}
      <div class="assess-root gs-bg min-h-screen pt-6 pb-12">
        <div class="max-w-7xl mx-auto px-4">

          {/* ── 统计概览 ── */}
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="gs-card p-4 flex items-center space-x-4">
              <div class="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                <i class="fas fa-robot text-teal-500"></i>
              </div>
              <div>
                <p class="text-xs text-slate-500">智能体数量</p>
                <p class="text-xl font-bold text-slate-800" id="stat-agent-count">-</p>
              </div>
            </div>
            <div class="gs-card p-4 flex items-center space-x-4">
              <div class="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                <i class="fas fa-layer-group text-teal-600"></i>
              </div>
              <div>
                <p class="text-xs text-slate-500">待评估标的</p>
                <p class="text-xl font-bold text-slate-800" id="stat-pending-deals">-</p>
              </div>
            </div>
            <div class="gs-card p-4 flex items-center space-x-4">
              <div class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <i class="fas fa-check-circle text-emerald-500"></i>
              </div>
              <div>
                <p class="text-xs text-slate-500">今日通过</p>
                <p class="text-xl font-bold text-emerald-600" id="stat-today-passed">-</p>
              </div>
            </div>
            <div class="gs-card p-4 flex items-center space-x-4">
              <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <i class="fas fa-clock text-amber-500"></i>
              </div>
              <div>
                <p class="text-xs text-slate-500">平均耗时</p>
                <p class="text-xl font-bold text-slate-800" id="stat-avg-time">~2.5分</p>
              </div>
            </div>
          </div>

          {/* ── 数据来源选择器 ── */}
          <div class="gs-card p-6 mb-6">
            <div class="flex items-center justify-between mb-5">
              <h3 class="font-semibold text-lg flex items-center text-slate-800">
                <i class="fas fa-database mr-2 text-teal-500"></i>
                选择评估数据来源
              </h3>
              <div class="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                <button id="tab-db" onclick="switchInputTab('db')"
                  class="px-4 py-2 font-medium transition text-white"
                  style="background: var(--primary-500);">
                  <i class="fas fa-layer-group mr-1.5"></i>平台标的库
                </button>
                <button id="tab-upload" onclick="switchInputTab('upload')"
                  class="px-4 py-2 font-medium transition bg-white text-gray-500 hover:bg-gray-50">
                  <i class="fas fa-file-upload mr-1.5"></i>上传文件
                </button>
              </div>
            </div>

            {/* ── 平台标的库 Panel ── */}
            <div id="panel-db">
              <div id="login-notice" class="hidden mb-4 p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-3">
                <i class="fas fa-lock text-teal-500 mt-0.5 flex-shrink-0"></i>
                <div>
                  <p class="text-sm font-semibold text-teal-800">请先登录查看您的项目</p>
                  <p class="text-xs text-teal-600 mt-1">平台标的库展示您名下的融资申请项目，需通过身份通验证后方可访问。</p>
                  <a href="/" class="inline-flex items-center mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style="background: var(--primary-500)">
                    <i class="fas fa-sign-in-alt mr-1.5"></i>前往登录
                  </a>
                </div>
              </div>

              <div class="flex items-center justify-between mb-3">
                <p class="text-xs text-gray-400">从平台数据库选择已申请的融资标的（用户登录后显示对应项目）</p>
                <span id="deals-count" class="text-xs text-gray-400">加载中...</span>
              </div>

              <div class="flex flex-wrap gap-2 mb-4">
                <button onclick="filterDeals('all')" class="track-filter-btn active px-3 py-1 rounded-full text-sm border border-gray-200 hover:border-gray-400 transition" data-track="all">
                  <i class="fas fa-globe mr-1"></i>全部
                </button>
                <button onclick="filterDeals('light-asset')" class="track-filter-btn px-3 py-1 rounded-full text-sm border border-gray-200 hover:border-gray-400 transition" data-track="light-asset">
                  <i class="fas fa-star mr-1"></i>文娱轻资产
                </button>
                <button onclick="filterDeals('douyin-ecommerce')" class="track-filter-btn px-3 py-1 rounded-full text-sm border border-gray-200 hover:border-gray-400 transition" data-track="douyin-ecommerce">
                  <i class="fas fa-video mr-1"></i>抖音投流
                </button>
                <button onclick="filterDeals('catering')" class="track-filter-btn px-3 py-1 rounded-full text-sm border border-gray-200 hover:border-gray-400 transition" data-track="catering">
                  <i class="fas fa-utensils mr-1"></i>餐饮
                </button>
                <button onclick="filterDeals('retail')" class="track-filter-btn px-3 py-1 rounded-full text-sm border border-gray-200 hover:border-gray-400 transition" data-track="retail">
                  <i class="fas fa-shopping-cart mr-1"></i>零售
                </button>
                <button onclick="filterDeals('ecommerce')" class="track-filter-btn px-3 py-1 rounded-full text-sm border border-gray-200 hover:border-gray-400 transition" data-track="ecommerce">
                  <i class="fas fa-shopping-bag mr-1"></i>电商
                </button>
                <button onclick="filterDeals('service')" class="track-filter-btn px-3 py-1 rounded-full text-sm border border-gray-200 hover:border-gray-400 transition" data-track="service">
                  <i class="fas fa-concierge-bell mr-1"></i>生活服务
                </button>
                <button onclick="filterDeals('education')" class="track-filter-btn px-3 py-1 rounded-full text-sm border border-gray-200 hover:border-gray-400 transition" data-track="education">
                  <i class="fas fa-graduation-cap mr-1"></i>教育培训
                </button>
              </div>

              <div id="deals-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                <div class="text-center py-8 text-gray-400">
                  <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                  <p>加载标的列表中...</p>
                </div>
              </div>
            </div>

            {/* ── 上传文件 Panel ── */}
            <div id="panel-upload" class="hidden">
              <p class="text-xs text-gray-400 mb-4">上传项目材料（PDF / Excel / TXT / Word），系统自动解析内容并创建临时标的送入评估流程</p>

              <div id="upload-zone"
                class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer transition-all"
                ondragover="event.preventDefault(); this.style.borderColor='#5DC4B3'; this.style.background='rgba(93,196,179,0.04)'"
                ondragleave="this.style.borderColor=''; this.style.background=''"
                ondrop="handleFileDrop(event)"
                onclick="document.getElementById('file-input').click()">
                <input type="file" id="file-input" class="hidden" accept=".pdf,.xlsx,.xls,.txt,.doc,.docx,.csv"
                  onchange="handleFileSelect(event)" multiple />
                <i class="fas fa-cloud-upload-alt text-3xl text-teal-300 mb-3"></i>
                <p class="text-sm font-medium text-gray-600">拖拽文件到此处，或点击选择文件</p>
                <p class="text-xs text-gray-400 mt-1">支持 PDF · Excel · TXT · Word · CSV，单文件最大 10MB</p>
              </div>

              <div id="file-list" class="mt-4 space-y-2 hidden"></div>

              <div id="upload-meta-form" class="hidden mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs font-medium text-gray-500 block mb-1">企业名称 <span class="text-red-400">*</span></label>
                  <input id="upload-company-name" type="text" placeholder="从文件中识别或手动输入"
                    class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400 bg-teal-50/30" />
                </div>
                <div>
                  <label class="text-xs font-medium text-gray-500 block mb-1">行业分类</label>
                  <select id="upload-industry"
                    class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300 bg-teal-50/30">
                    <option value="catering">餐饮</option>
                    <option value="retail">零售</option>
                    <option value="service">生活服务</option>
                    <option value="entertainment">文娱</option>
                    <option value="light-asset">轻资产</option>
                    <option value="ecommerce">电商</option>
                    <option value="education">教育培训</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div>
                  <label class="text-xs font-medium text-gray-500 block mb-1">融资金额（万元）</label>
                  <input id="upload-funding" type="number" placeholder="例: 50"
                    class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300 bg-teal-50/30" />
                </div>
                <div>
                  <label class="text-xs font-medium text-gray-500 block mb-1">联系人</label>
                  <input id="upload-contact" type="text" placeholder="项目负责人姓名"
                    class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300 bg-teal-50/30" />
                </div>
                <div class="col-span-2">
                  <label class="text-xs font-medium text-gray-500 block mb-1">业务简介（可从文件自动提取）</label>
                  <textarea id="upload-business" rows={3} placeholder="主要业务描述、商业模式、盈利方式..."
                    class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300 bg-teal-50/30 resize-none"></textarea>
                </div>
              </div>

              <div id="upload-parse-status" class="hidden mt-3 p-3 rounded-lg text-sm flex items-center gap-2"></div>

              <button id="btn-create-from-upload" onclick="createDealFromUpload()"
                class="hidden mt-4 w-full py-2.5 btn-primary justify-center shadow-md">
                <i class="fas fa-plus-circle"></i>创建标的并开始评估
              </button>
            </div>
          </div>

          {/* ── 评估方案选择器 ── */}
          <div class="gs-card p-5 mb-6">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-semibold text-sm flex items-center text-slate-800">
                <i class="fas fa-robot mr-2 text-teal-500"></i>
                当前评估方案
                <span class="ml-2 text-xs text-gray-400 font-normal">选择不同方案切换智能体策略</span>
              </h3>
              <a href="/agents" class="text-xs font-medium flex items-center" style="color: var(--primary-500)">
                <i class="fas fa-cog mr-1"></i>管理方案
              </a>
            </div>
            <div id="profile-selector" class="flex flex-wrap gap-2">
              <div class="text-sm text-gray-400 py-2"><i class="fas fa-spinner fa-spin mr-1"></i>加载评估方案...</div>
            </div>
          </div>

          {/* ── 步骤指示器 ── */}
          <div class="gs-card p-5 mb-6">
            <div class="flex items-center justify-between flex-wrap gap-4">
              <div class="flex items-center space-x-3 flex-wrap gap-y-2">
                <div id="step-1" class="flex items-center space-x-2">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white" style="background: var(--primary-500)">1</div>
                  <span class="font-medium" style="color: var(--primary-500)">项目材料</span>
                </div>
                <div class="w-12 h-0.5 bg-gray-200" id="line-1"></div>
                <div id="step-2" class="flex items-center space-x-2 opacity-50">
                  <div class="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold">2</div>
                  <span class="font-medium text-gray-600">外环漏斗</span>
                </div>
                <div class="w-12 h-0.5 bg-gray-200" id="line-2"></div>
                <div id="step-3" class="flex items-center space-x-2 opacity-50">
                  <div class="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold">3</div>
                  <span class="font-medium text-gray-600">中环筛子</span>
                </div>
                <div class="w-12 h-0.5 bg-gray-200" id="line-3"></div>
                <div id="step-4" class="flex items-center space-x-2 opacity-50">
                  <div class="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold">4</div>
                  <span class="font-medium text-gray-600">综合评分</span>
                </div>
              </div>
              <div id="overall-status" class="text-sm text-gray-500 font-medium">准备就绪</div>
            </div>
          </div>

          {/* ── 主内容区 ── */}
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* 左侧：项目信息 */}
            <div class="lg:col-span-1">
              <div class="gs-card overflow-hidden sticky top-20">
                <div id="deal-header" class="gradient-bg p-4 text-white">
                  <div class="flex items-center space-x-3">
                    <div id="deal-avatar" class="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center" style="background: rgba(255,255,255,0.15)">
                      <i class="fas fa-building text-white opacity-80"></i>
                    </div>
                    <div>
                      <h3 id="deal-name" class="font-bold">请选择标的</h3>
                      <p id="deal-sub" class="text-sm opacity-80">从上方列表选择要评估的项目</p>
                    </div>
                  </div>
                </div>
                <div class="p-4">
                  <div id="deal-info" class="space-y-3 text-sm">
                    <div class="text-center py-8 text-gray-400">
                      <i class="fas fa-hand-pointer text-4xl mb-2"></i>
                      <p class="text-sm">请先从上方选择标的</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：评估流程 */}
            <div class="lg:col-span-2 space-y-6">

              {/* 外环漏斗体系 */}
              <div id="outer-section" class="gs-card p-5 opacity-40 border-2 border-dashed border-gray-200 transition-all duration-500">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-semibold text-gray-800 flex items-center">
                    <i class="fas fa-funnel-dollar mr-2 text-red-500"></i>
                    外环漏斗体系
                    <span id="outer-step-badge" class="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">第1步</span>
                  </h3>
                  <div id="outer-status" class="text-sm text-gray-500 flex items-center">
                    <i class="fas fa-clock mr-1"></i>等待开始
                  </div>
                </div>
                <p class="text-xs text-gray-400 mb-4">串行执行 · 一票否决机制 · 确保基础合规</p>
                <div id="outer-agents" class="space-y-3">
                  <div class="text-center py-6 text-gray-400">
                    <i class="fas fa-spinner fa-spin text-xl mb-2"></i>
                    <p class="text-sm">加载智能体中...</p>
                  </div>
                </div>
              </div>

              {/* 中环筛子体系 */}
              <div id="inner-section" class="gs-card p-5 opacity-40 border-2 border-dashed border-gray-200 transition-all duration-500">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-semibold text-gray-800 flex items-center">
                    <i class="fas fa-filter mr-2 text-teal-500"></i>
                    中环筛子体系
                    <span id="inner-step-badge" class="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">第2步</span>
                  </h3>
                  <div id="inner-status" class="text-sm text-gray-400 flex items-center">
                    <i class="fas fa-lock mr-1"></i>等待外环漏斗体系完成
                  </div>
                </div>
                <p class="text-xs text-gray-400 mb-1">并行执行 · 赛道专属智能体 · 深度量化评分</p>
                <p class="text-xs mb-4" id="inner-agent-count" style="color: var(--primary-500)">
                  <i class="fas fa-robot mr-1"></i>等待加载...
                </p>
                <div id="inner-track-badge" class="inline-block text-xs px-2 py-0.5 rounded-full mb-3" style="background: #e5e7eb; color: #6b7280;">通用</div>
                <div id="inner-agents" class="space-y-2">
                  <div class="text-center py-4 text-gray-400 text-sm">选择标的后加载</div>
                </div>
              </div>

              {/* 综合评分 */}
              <div id="final-section" class="gs-card p-5 opacity-40 border-2 border-dashed border-gray-200 transition-all duration-500">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-semibold text-gray-800 flex items-center">
                    <i class="fas fa-chart-pie mr-2 text-teal-500"></i>
                    综合评分
                    <span id="final-step-badge" class="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">第3步</span>
                  </h3>
                  <div id="final-status" class="text-sm text-gray-400 flex items-center">
                    <i class="fas fa-lock mr-1"></i>等待评估完成
                  </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div id="final-details" class="text-center py-8 text-gray-400">
                    <i class="fas fa-chart-pie text-4xl mb-2"></i>
                    <p>评估完成后显示结果</p>
                  </div>
                  <div class="flex items-center justify-center">
                    <canvas id="radar-chart" width="280" height="280"></canvas>
                  </div>
                </div>
              </div>

              {/* 投资建议 */}
              <div id="recommendation-section" class="hidden gs-card p-5 border-2 border-green-200">
                <h3 class="font-semibold text-gray-800 mb-4 flex items-center">
                  <i class="fas fa-thumbs-up mr-2 text-green-500"></i>
                  投资建议
                </h3>
                <div class="flex items-center justify-between p-4 rounded-xl bg-green-50">
                  <div>
                    <p id="rec-title" class="font-bold text-lg text-green-700"></p>
                    <p id="rec-detail" class="text-sm text-gray-600 mt-1"></p>
                  </div>
                  <div class="text-right">
                    <div class="text-4xl font-bold text-green-600" id="rec-score"></div>
                    <div class="text-sm text-gray-500" id="rec-grade"></div>
                  </div>
                </div>
                <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="bg-green-50 rounded-lg p-3">
                    <p class="text-xs font-semibold text-green-700 mb-2"><i class="fas fa-plus-circle mr-1"></i>项目优势</p>
                    <ul id="rec-strengths" class="space-y-1 text-xs text-gray-600"></ul>
                  </div>
                  <div class="bg-red-50 rounded-lg p-3">
                    <p class="text-xs font-semibold text-red-700 mb-2"><i class="fas fa-exclamation-triangle mr-1"></i>主要风险</p>
                    <ul id="rec-risks" class="space-y-1 text-xs text-gray-600"></ul>
                  </div>
                </div>
              </div>

              {/* 改进建议 */}
              <div id="improvement-section" class="hidden gs-card p-5">
                <h3 class="font-semibold text-gray-800 mb-4 flex items-center">
                  <i class="fas fa-lightbulb mr-2 text-amber-500"></i>
                  改进建议与待补充材料
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="bg-amber-50 rounded-xl p-3 cursor-pointer hover:bg-amber-100 transition" onclick="showImprovementPopup('missing')">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs font-semibold text-amber-700"><i class="fas fa-file-circle-plus mr-1"></i>待补充材料</span>
                      <span id="missing-count" class="text-xs bg-amber-200 text-amber-700 px-1.5 rounded-full">0</span>
                    </div>
                    <ul id="missing-materials" class="space-y-1"></ul>
                  </div>
                  <div class="bg-teal-50 rounded-xl p-3 cursor-pointer hover:bg-teal-100 transition" onclick="showImprovementPopup('improvement')">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs font-semibold text-teal-700"><i class="fas fa-arrow-up mr-1"></i>改进建议</span>
                      <span id="improvement-count" class="text-xs bg-teal-200 text-teal-700 px-1.5 rounded-full">0</span>
                    </div>
                    <ul id="improvement-suggestions" class="space-y-1"></ul>
                  </div>
                  <div class="bg-green-50 rounded-xl p-3 cursor-pointer hover:bg-green-100 transition" onclick="showImprovementPopup('actions')">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs font-semibold text-green-700"><i class="fas fa-tasks mr-1"></i>下一步行动</span>
                      <span id="actions-count" class="text-xs bg-green-200 text-green-700 px-1.5 rounded-full">0</span>
                    </div>
                    <div id="next-actions" class="space-y-1"></div>
                  </div>
                </div>
                <div id="risk-recommendation-section" class="hidden mt-4 p-3 bg-red-50 rounded-xl cursor-pointer hover:bg-red-100 transition" onclick="showImprovementPopup('risk-rec')">
                  <p class="text-xs font-semibold text-red-700 mb-1"><i class="fas fa-shield-halved mr-1"></i>风险管理建议（点击查看完整内容）</p>
                  <p id="risk-recommendation-preview" class="text-xs text-gray-600 line-clamp-2"></p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ── 弹窗：推理过程详情 ── */}
      <div id="reasoning-popup" class="hidden fixed inset-0 z-50 flex items-center justify-center" style="background: rgba(0,0,0,0.5)">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
          <div class="p-4 border-b flex items-center justify-between">
            <h3 id="popup-title" class="font-semibold text-gray-800"></h3>
            <button onclick="closeReasoningPopup()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>
          </div>
          <div id="popup-content" class="p-6 overflow-y-auto flex-1"></div>
        </div>
      </div>

      {/* ── 弹窗：完整报告 ── */}
      <div id="detail-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center" style="background: rgba(0,0,0,0.5)">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
          <div class="p-4 border-b flex items-center justify-between">
            <h3 id="modal-title" class="font-semibold text-gray-800"></h3>
            <button onclick="closeDetailModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>
          </div>
          <div id="modal-content" class="p-6 overflow-y-auto flex-1"></div>
        </div>
      </div>

      {/* ── 弹窗：改进建议详情 ── */}
      <div id="improvement-popup" class="hidden fixed inset-0 z-50 flex items-center justify-center" style="background: rgba(0,0,0,0.5)">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
          <div id="improvement-popup-header" class="p-4 border-b flex items-center justify-between">
            <h3 id="improvement-popup-title" class="font-semibold"></h3>
            <button onclick="closeImprovementPopup()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>
          </div>
          <div id="improvement-popup-content" class="p-6 overflow-y-auto flex-1"></div>
        </div>
      </div>

      {/* ── 脚本 ── */}
      <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
      <script src="/static/assess.js"></script>
    </div>
  )
}
