import type { FC } from 'hono/jsx'

// =====================================================
// 智能体管理中心 — AgentsPage
//
// 用户主页：管理多套智能体评估方案
//   - 查看所有方案（内置 + 自定义）
//   - 新建自定义方案
//   - 编辑方案内的每个智能体（名称、阈值、权重、提示词等）
//   - 克隆/删除方案
//   - 一键设为默认方案
// =====================================================

export const AgentsPage: FC = () => {
  return (
    <div class="min-h-screen" style="background: #f9fafb;">

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap');
        .agents-root { font-family: 'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif; }
        :root {
          --primary-500: #5DC4B3;
          --primary-600: #49A89A;
          --primary-50:  #F0FDFA;
          --primary-100: #CCFBF1;
        }
        .gs-card  { background: #fff; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04); border: 1px solid #E5E7EB; }
        .btn-primary {
          background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
          color: #fff; border-radius: 0.625rem; padding: 0.5rem 1.25rem;
          font-size: 0.875rem; font-weight: 600; transition: all 0.2s;
          display: inline-flex; align-items: center; gap: 0.4rem;
          box-shadow: 0 4px 14px rgba(93,196,179,0.25); cursor: pointer; border: none;
        }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-secondary {
          background: #fff; color: #374151; border: 1px solid #D1D5DB; border-radius: 0.625rem;
          padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s;
          display: inline-flex; align-items: center; gap: 0.4rem;
        }
        .btn-secondary:hover { background: #F9FAFB; border-color: #9CA3AF; }
        .btn-danger { background: #FEE2E2; color: #DC2626; border: 1px solid #FECACA; border-radius: 0.5rem; padding: 0.375rem 0.75rem; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; }
        .btn-danger:hover { background: #FECACA; }

        .assess-topbar {
          background: rgba(255,255,255,0.85); backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid rgba(229,231,235,0.8);
        }
        .user-avatar {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
          display: flex; align-items: center; justify-content: center;
          color: white; font-weight: 700; font-size: 14px;
        }

        .profile-card { transition: all 0.25s ease; cursor: pointer; position: relative; }
        .profile-card:hover { transform: translateY(-4px); box-shadow: 0 8px 25px rgba(0,0,0,.08); }
        .profile-card.selected { border: 2px solid var(--primary-500) !important; background: var(--primary-50) !important; }
        .profile-card .default-badge {
          position: absolute; top: -1px; right: -1px; background: var(--primary-500); color: white;
          font-size: 0.65rem; font-weight: 700; padding: 0.15rem 0.5rem;
          border-radius: 0 0.7rem 0 0.5rem;
        }

        .agent-row { transition: background 0.15s; border-radius: 0.5rem; }
        .agent-row:hover { background: #F9FAFB; }

        .toggle-switch { position: relative; display: inline-block; width: 40px; height: 22px; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-slider {
          position: absolute; cursor: pointer; inset: 0; background: #D1D5DB;
          border-radius: 22px; transition: 0.3s;
        }
        .toggle-slider::before {
          content: ''; position: absolute; height: 16px; width: 16px; left: 3px; bottom: 3px;
          background: white; border-radius: 50%; transition: 0.3s;
        }
        .toggle-switch input:checked + .toggle-slider { background: var(--primary-500); }
        .toggle-switch input:checked + .toggle-slider::before { transform: translateX(18px); }

        /* Modal */
        .modal-overlay { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
        .modal-card { background: white; border-radius: 1rem; box-shadow: 0 25px 60px rgba(0,0,0,0.2); max-height: 85vh; display: flex; flex-direction: column; }

        #agents-toast-container { position: fixed; top: 1rem; right: 1rem; z-index: 9999; display: flex; flex-direction: column; gap: 0.5rem; }
        .toast-item { padding: 0.75rem 1rem; border-radius: 0.625rem; font-size: 0.875rem; box-shadow: 0 4px 6px rgba(0,0,0,.1); min-width: 200px; max-width: 360px; display: flex; align-items: center; gap: 0.5rem; animation: slideIn 0.3s ease-out; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fa-spin { animation: spin 1s linear infinite; }

        .tab-btn { padding: 0.5rem 1rem; font-size: 0.85rem; font-weight: 500; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s; border: none; }
        .tab-btn.active { background: var(--primary-500); color: white; }
        .tab-btn:not(.active) { background: white; color: #6B7280; border: 1px solid #E5E7EB; }
        .tab-btn:not(.active):hover { background: #F3F4F6; }
      `}</style>

      <div id="agents-toast-container"></div>

      {/* ── 顶部导航 ── */}
      <nav class="assess-topbar sticky top-0 z-40 px-6 py-3">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <i class="fas fa-robot text-white text-lg"></i>
              </div>
              <div>
                <h1 class="text-lg font-bold text-gray-900">智能体管理中心</h1>
                <p class="text-[10px] text-gray-400 font-medium -mt-0.5">Agent Configuration · 配置您的评估策略</p>
              </div>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <a href="/assess" class="btn-secondary text-sm">
              <i class="fas fa-clipboard-check mr-1"></i>去评估
            </a>
            <button onclick="openCreateProfileModal()" class="btn-primary">
              <i class="fas fa-plus"></i>新建方案
            </button>
            <div class="w-px h-6 bg-gray-200 mx-1"></div>
            <div id="user-display" class="flex items-center space-x-2 cursor-pointer" onclick="handleAgentsLogout()">
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
      <div class="agents-root min-h-screen pt-6 pb-12">
        <div class="max-w-7xl mx-auto px-4">

          {/* ── 概览统计 ── */}
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="gs-card p-4 flex items-center space-x-4">
              <div class="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                <i class="fas fa-layer-group text-teal-500"></i>
              </div>
              <div>
                <p class="text-xs text-slate-500">评估方案</p>
                <p class="text-xl font-bold text-slate-800" id="stat-profiles">-</p>
              </div>
            </div>
            <div class="gs-card p-4 flex items-center space-x-4">
              <div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <i class="fas fa-funnel-dollar text-red-500"></i>
              </div>
              <div>
                <p class="text-xs text-slate-500">外环智能体</p>
                <p class="text-xl font-bold text-slate-800" id="stat-outer">-</p>
              </div>
            </div>
            <div class="gs-card p-4 flex items-center space-x-4">
              <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <i class="fas fa-filter text-blue-500"></i>
              </div>
              <div>
                <p class="text-xs text-slate-500">中环智能体</p>
                <p class="text-xl font-bold text-slate-800" id="stat-inner">-</p>
              </div>
            </div>
            <div class="gs-card p-4 flex items-center space-x-4">
              <div class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <i class="fas fa-check-circle text-emerald-500"></i>
              </div>
              <div>
                <p class="text-xs text-slate-500">当前默认方案</p>
                <p class="text-sm font-bold text-emerald-600 truncate max-w-32" id="stat-default">-</p>
              </div>
            </div>
          </div>

          {/* ── 方案列表 ── */}
          <div class="mb-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-bold text-gray-800">
                <i class="fas fa-th-large mr-2 text-teal-500"></i>我的评估方案
              </h2>
              <p class="text-xs text-gray-400">点击方案查看详情，可编辑智能体配置</p>
            </div>
            <div id="profiles-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div class="text-center py-12 text-gray-400 col-span-3">
                <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                <p>加载方案列表中...</p>
              </div>
            </div>
          </div>

          {/* ── 方案详情 & 智能体编辑区 ── */}
          <div id="profile-detail-section" class="hidden">
            <div class="gs-card overflow-hidden">
              {/* 方案头部 */}
              <div id="profile-detail-header" class="p-5 border-b bg-gradient-to-r from-teal-50 to-cyan-50">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <div id="detail-icon" class="w-12 h-12 rounded-xl flex items-center justify-center"></div>
                    <div>
                      <h3 id="detail-name" class="text-lg font-bold text-gray-800"></h3>
                      <p id="detail-desc" class="text-sm text-gray-500 mt-0.5"></p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <button onclick="setAsDefault()" id="btn-set-default" class="btn-secondary text-xs">
                      <i class="fas fa-star"></i>设为默认
                    </button>
                    <button onclick="cloneProfile()" class="btn-secondary text-xs">
                      <i class="fas fa-copy"></i>克隆
                    </button>
                    <button onclick="deleteProfile()" id="btn-delete-profile" class="btn-danger text-xs">
                      <i class="fas fa-trash-alt mr-1"></i>删除
                    </button>
                  </div>
                </div>
              </div>

              {/* Tab 切换 */}
              <div class="px-5 pt-4 flex items-center space-x-2">
                <button onclick="switchAgentTab('outer')" class="tab-btn active" data-tab="outer">
                  <i class="fas fa-funnel-dollar mr-1"></i>外环漏斗 (<span id="tab-outer-count">0</span>)
                </button>
                <button onclick="switchAgentTab('inner')" class="tab-btn" data-tab="inner">
                  <i class="fas fa-filter mr-1"></i>中环筛子 (<span id="tab-inner-count">0</span>)
                </button>
                <div class="flex-1"></div>
                <button onclick="openAddAgentModal()" class="btn-secondary text-xs">
                  <i class="fas fa-plus"></i>添加智能体
                </button>
              </div>

              {/* 智能体列表 */}
              <div class="p-5">
                <div id="agents-list" class="space-y-2">
                  <p class="text-center text-gray-400 py-6">选择方案后显示智能体列表</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── 编辑智能体弹窗 ── */}
      <div id="edit-agent-modal" class="hidden modal-overlay" onclick="if(event.target===this)closeEditAgentModal()">
        <div class="modal-card w-full max-w-2xl mx-4">
          <div class="p-5 border-b flex items-center justify-between">
            <h3 id="edit-agent-title" class="font-bold text-gray-800"><i class="fas fa-edit mr-2 text-teal-500"></i>编辑智能体</h3>
            <button onclick="closeEditAgentModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>
          </div>
          <div class="p-5 overflow-y-auto" style="max-height: 65vh;">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-xs font-medium text-gray-500 mb-1 block">智能体名称 <span class="text-red-400">*</span></label>
                <input id="edit-agent-name" type="text" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-300 focus:border-teal-400" />
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 mb-1 block">评估维度</label>
                <input id="edit-agent-dimension" type="text" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-300 focus:border-teal-400" />
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 mb-1 block">环型</label>
                <select id="edit-agent-ring" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-300">
                  <option value="outer">外环漏斗（一票否决）</option>
                  <option value="inner">中环筛子（加权评分）</option>
                </select>
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 mb-1 block">适用行业</label>
                <select id="edit-agent-industry" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-300">
                  <option value="all">全行业通用</option>
                  <option value="catering">餐饮</option>
                  <option value="retail">零售</option>
                  <option value="service">生活服务</option>
                  <option value="ecommerce">电商</option>
                  <option value="education">教育培训</option>
                  <option value="douyin-ecommerce">抖音投流</option>
                  <option value="light-asset">文娱轻资产</option>
                  <option value="entertainment">文娱</option>
                </select>
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 mb-1 block">通过阈值 (0-100)</label>
                <input id="edit-agent-threshold" type="number" min="0" max="100" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-300" />
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 mb-1 block">权重 (%，仅中环有效)</label>
                <input id="edit-agent-weight" type="number" min="0" max="100" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-300" />
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 mb-1 block">图标 (FontAwesome)</label>
                <input id="edit-agent-icon" type="text" placeholder="fas fa-robot" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-300" />
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 mb-1 block">图标颜色</label>
                <input id="edit-agent-iconcolor" type="color" class="w-full h-10 rounded-lg border border-gray-200 cursor-pointer" />
              </div>
              <div class="col-span-2">
                <label class="text-xs font-medium text-gray-500 mb-1 block">描述</label>
                <textarea id="edit-agent-desc" rows={2} class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-300 resize-none"></textarea>
              </div>
              <div class="col-span-2">
                <label class="text-xs font-medium text-gray-500 mb-1 block">AI 提示词模板</label>
                <textarea id="edit-agent-prompt" rows={4} class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-300 resize-none font-mono"></textarea>
              </div>
            </div>
          </div>
          <div class="p-5 border-t flex justify-end space-x-3">
            <button onclick="closeEditAgentModal()" class="btn-secondary">取消</button>
            <button onclick="saveAgent()" class="btn-primary"><i class="fas fa-save"></i>保存</button>
          </div>
        </div>
      </div>

      {/* ── 新建/编辑方案弹窗 ── */}
      <div id="profile-modal" class="hidden modal-overlay" onclick="if(event.target===this)closeProfileModal()">
        <div class="modal-card w-full max-w-md mx-4">
          <div class="p-5 border-b">
            <h3 id="profile-modal-title" class="font-bold text-gray-800"><i class="fas fa-plus-circle mr-2 text-teal-500"></i>新建评估方案</h3>
          </div>
          <div class="p-5 space-y-4">
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">方案名称 <span class="text-red-400">*</span></label>
              <input id="profile-name" type="text" placeholder="例：我的餐饮专项方案" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-300 focus:border-teal-400" />
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">描述</label>
              <textarea id="profile-desc-input" rows={2} placeholder="方案适用场景说明" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-300 resize-none"></textarea>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">基于模板</label>
              <select id="profile-template" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-300">
                <option value="default-profile">标准评估方案</option>
                <option value="conservative-profile">保守型评估方案</option>
                <option value="aggressive-profile">激进型评估方案</option>
                <option value="empty">空白方案（从零开始）</option>
              </select>
            </div>
          </div>
          <div class="p-5 border-t flex justify-end space-x-3">
            <button onclick="closeProfileModal()" class="btn-secondary">取消</button>
            <button onclick="createProfile()" class="btn-primary"><i class="fas fa-check"></i>创建</button>
          </div>
        </div>
      </div>

      <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
      <script src="/static/agents-manage.js"></script>
    </div>
  )
}
