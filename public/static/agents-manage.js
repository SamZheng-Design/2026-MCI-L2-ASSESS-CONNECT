// ==========================================================
// 智能体管理中心 — agents-manage.js (v5)
//
// v5 两级视图设计：
//   视图1 (view-warehouse): 方案仓库列表 — 进入即展示
//   视图2 (view-detail):    方案详情+智能体编辑 — 点击方案后展示
//   弹窗只有三种，均由用户主动触发
// ==========================================================

let allProfiles = [];
let selectedProfileId = null;
let currentAgentTab = 'outer';
let editingAgentId = null;
let editingIsNew = false;

const PRIMARY = '#5DC4B3';

// ==========================================================
// 视图切换 — 仓库列表 ↔ 方案详情
// ==========================================================
function showWarehouseView() {
  document.getElementById('view-warehouse').classList.remove('hidden');
  document.getElementById('view-detail').classList.add('hidden');
  document.getElementById('breadcrumb-nav').classList.add('hidden');
  document.getElementById('topbar-warehouse-actions').classList.remove('hidden');
  document.getElementById('topbar-detail-actions').classList.add('hidden');
  selectedProfileId = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showDetailView(profileId) {
  selectedProfileId = profileId;
  const profile = allProfiles.find(p => p.id === profileId);
  if (!profile) { showToast('方案不存在', 'error'); return; }

  // 更新URL参数（不刷新页面），刷新后仍停留在方案详情
  if (window.history.replaceState) {
    const url = new URL(window.location);
    url.searchParams.set('profile', profileId);
    window.history.replaceState({}, '', url.toString());
  }

  // 切换视图
  document.getElementById('view-warehouse').classList.add('hidden');
  document.getElementById('view-detail').classList.remove('hidden');
  document.getElementById('view-detail').classList.remove('view-fade-in');
  void document.getElementById('view-detail').offsetWidth; // force reflow
  document.getElementById('view-detail').classList.add('view-fade-in');

  // 面包屑
  document.getElementById('breadcrumb-nav').classList.remove('hidden');
  document.getElementById('breadcrumb-profile-name').textContent = profile.name;

  // 顶部按钮
  document.getElementById('topbar-warehouse-actions').classList.add('hidden');
  document.getElementById('topbar-detail-actions').classList.remove('hidden');

  // 填充方案详情头部
  fillDetailHeader(profile);

  // 渲染智能体
  currentAgentTab = 'outer';
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === 'outer');
  });
  renderAgentsList();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function backToWarehouse() {
  showWarehouseView();
  renderProfilesGrid();
  updateWarehouseStats();
  // 清除URL上的 ?profile= 参数，避免刷新后又跳到详情
  if (window.history.replaceState) {
    const url = new URL(window.location);
    url.searchParams.delete('profile');
    window.history.replaceState({}, '', url.pathname);
  }
}

function fillDetailHeader(profile) {
  document.getElementById('detail-name').textContent = profile.name;
  document.getElementById('detail-desc').textContent = profile.description || '暂无描述';
  document.getElementById('detail-icon').style.background = (profile.icon_color || PRIMARY) + '20';
  document.getElementById('detail-icon').innerHTML = '<i class="' + (profile.icon || 'fas fa-robot') + ' text-2xl" style="color:' + (profile.icon_color || PRIMARY) + '"></i>';

  // 默认标记
  const badge = document.getElementById('detail-default-badge');
  if (profile.is_default) {
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }

  // 设为默认按钮
  const btnDefault = document.getElementById('btn-set-default');
  if (profile.is_default) {
    btnDefault.innerHTML = '<i class="fas fa-star text-yellow-500 mr-1"></i>已是默认';
    btnDefault.disabled = true;
    btnDefault.style.opacity = '0.5';
  } else {
    btnDefault.innerHTML = '<i class="fas fa-star mr-1"></i>设为默认';
    btnDefault.disabled = false;
    btnDefault.style.opacity = '1';
  }

  // 方案内统计
  const outerCount = profile.agents.filter(a => a.ring_type === 'outer').length;
  const innerCount = profile.agents.filter(a => a.ring_type === 'inner').length;
  const enabledCount = profile.agents.filter(a => a.enabled !== false).length;
  document.getElementById('detail-stat-outer').textContent = outerCount;
  document.getElementById('detail-stat-inner').textContent = innerCount;
  document.getElementById('detail-stat-enabled').textContent = enabledCount;
  document.getElementById('detail-updated-at').textContent = formatDate(profile.updated_at);

  // Tab 计数
  document.getElementById('tab-outer-count').textContent = outerCount;
  document.getElementById('tab-inner-count').textContent = innerCount;
}

// ==========================================================
// 弹窗管理 — 同一时刻只能有一个
// ==========================================================
const MODAL_IDS = ['modal-create-profile', 'modal-edit-profile', 'modal-edit-agent'];

function closeModal() {
  MODAL_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  document.body.style.overflow = '';
}

function openModal(id) {
  closeModal();
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

// ==========================================================
// 登录 & 用户
// ==========================================================
function checkAgentsAuth() {
  const auth = sessionStorage.getItem('assess_auth');
  if (!auth) { window.location.href = '/'; return null; }
  try {
    const data = JSON.parse(auth);
    const avatarEl = document.getElementById('user-avatar-el');
    const nameEl = document.getElementById('user-name-el');
    if (avatarEl && data.name) avatarEl.textContent = data.name.charAt(0).toUpperCase();
    if (nameEl && data.name) nameEl.textContent = data.name;
    return data;
  } catch(e) { window.location.href = '/'; return null; }
}
function handleAgentsLogout() {
  if (confirm('确认退出登录？')) { sessionStorage.removeItem('assess_auth'); window.location.href = '/'; }
}

// ==========================================================
// Toast
// ==========================================================
function showToast(msg, type = 'info') {
  const container = document.getElementById('agents-toast-container');
  if (!container) return;
  const colors = {
    success: 'background:#d1fae5; color:#065f46; border:1px solid #6ee7b7',
    error:   'background:#fee2e2; color:#991b1b; border:1px solid #fca5a5',
    warning: 'background:#fffbeb; color:#92400e; border:1px solid #fcd34d',
    info:    'background:#eff6ff; color:#1e40af; border:1px solid #93c5fd'
  };
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  const div = document.createElement('div');
  div.className = 'toast-item';
  div.style.cssText = colors[type] || colors.info;
  div.innerHTML = '<i class="fas ' + (icons[type] || icons.info) + '"></i><span>' + msg + '</span>';
  container.appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

// ==========================================================
// API
// ==========================================================
async function apiCall(url, options = {}) {
  const resp = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || resp.statusText);
  return data;
}

// ==========================================================
// 加载方案
// ==========================================================
async function loadProfiles() {
  try {
    const data = await apiCall('/api/agents/profiles');
    allProfiles = data.data || [];
    // 如果当前在仓库视图，渲染仓库
    if (!selectedProfileId) {
      renderProfilesGrid();
      updateWarehouseStats();
    } else {
      // 如果在详情视图，刷新详情
      const exists = allProfiles.find(p => p.id === selectedProfileId);
      if (exists) {
        fillDetailHeader(exists);
        renderAgentsList();
      } else {
        // 方案被删除了，回到仓库
        backToWarehouse();
      }
    }
  } catch(e) {
    console.error('加载方案失败:', e);
    showToast('加载方案列表失败', 'error');
  }
}

function updateWarehouseStats() {
  const el = (id) => document.getElementById(id);
  el('stat-profiles').textContent = allProfiles.length;
  const def = allProfiles.find(p => p.is_default);
  el('stat-default').textContent = def ? def.name : '未设置';

  let totalOuter = 0, totalInner = 0;
  allProfiles.forEach(p => {
    totalOuter += p.agents.filter(a => a.ring_type === 'outer').length;
    totalInner += p.agents.filter(a => a.ring_type === 'inner').length;
  });
  el('stat-outer').textContent = totalOuter;
  el('stat-inner').textContent = totalInner;
}

// ==========================================================
// 渲染方案仓库卡片
// ==========================================================
function renderProfilesGrid() {
  const grid = document.getElementById('profiles-grid');
  if (!allProfiles.length) {
    grid.innerHTML = '<div class="text-center py-16 text-gray-400 col-span-3"><i class="fas fa-inbox text-4xl mb-3"></i><p class="text-base">暂无评估方案</p><p class="text-xs mt-1">点击右上角"新建方案"开始创建</p></div>';
    return;
  }

  grid.innerHTML = allProfiles.map(p => {
    const outer = p.agents.filter(a => a.ring_type === 'outer').length;
    const inner = p.agents.filter(a => a.ring_type === 'inner').length;
    const enabled = p.agents.filter(a => a.enabled !== false).length;
    return '<div class="gs-card profile-card p-5" onclick="showDetailView(\'' + p.id + '\')" data-profile-id="' + p.id + '">' +
      (p.is_default ? '<div class="default-badge"><i class="fas fa-star mr-1"></i>默认</div>' : '') +
      '<div class="flex items-center space-x-3 mb-3">' +
      '<div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:' + (p.icon_color || PRIMARY) + '20">' +
      '<i class="' + (p.icon || 'fas fa-robot') + ' text-lg" style="color:' + (p.icon_color || PRIMARY) + '"></i></div>' +
      '<div class="flex-1 min-w-0"><h4 class="font-semibold text-gray-800 truncate">' + p.name + '</h4>' +
      '<p class="text-xs text-gray-400 line-clamp-1">' + (p.description || '暂无描述') + '</p></div>' +
      '<i class="fas fa-chevron-right text-gray-300 text-sm flex-shrink-0"></i></div>' +
      '<div class="grid grid-cols-3 gap-2 text-center">' +
      '<div class="bg-red-50 rounded-lg py-2"><p class="text-lg font-bold text-red-600">' + outer + '</p><p class="text-[10px] text-gray-500">外环</p></div>' +
      '<div class="bg-blue-50 rounded-lg py-2"><p class="text-lg font-bold text-blue-600">' + inner + '</p><p class="text-[10px] text-gray-500">中环</p></div>' +
      '<div class="bg-emerald-50 rounded-lg py-2"><p class="text-lg font-bold text-emerald-600">' + enabled + '</p><p class="text-[10px] text-gray-500">启用</p></div></div>' +
      '<div class="mt-3 pt-3 border-t flex items-center justify-between text-xs text-gray-400">' +
      '<span>更新: ' + formatDate(p.updated_at) + '</span>' +
      '<div class="flex items-center space-x-2" onclick="event.stopPropagation()">' +
      (!p.is_default ? '<button onclick="quickSetDefault(\'' + p.id + '\')" class="text-yellow-500 hover:text-yellow-600 transition" title="设为默认"><i class="fas fa-star text-xs"></i></button>' : '') +
      '<button onclick="quickClone(\'' + p.id + '\')" class="text-blue-400 hover:text-blue-500 transition" title="克隆"><i class="fas fa-copy text-xs"></i></button>' +
      (!p.is_default ? '<button onclick="quickDelete(\'' + p.id + '\')" class="text-red-300 hover:text-red-500 transition" title="删除"><i class="fas fa-trash text-xs"></i></button>' : '') +
      '</div></div></div>';
  }).join('');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

// ==========================================================
// 方案卡片快捷操作（仓库视图内）
// ==========================================================
async function quickSetDefault(profileId) {
  try {
    await apiCall('/api/agents/profiles/' + profileId + '/default', { method: 'POST' });
    showToast('已设为默认方案', 'success');
    await loadProfiles();
  } catch(e) { showToast('操作失败: ' + e.message, 'error'); }
}

async function quickClone(profileId) {
  try {
    const resp = await apiCall('/api/agents/profiles/' + profileId + '/clone', { method: 'POST' });
    showToast('方案已克隆', 'success');
    await loadProfiles();
  } catch(e) { showToast('克隆失败: ' + e.message, 'error'); }
}

async function quickDelete(profileId) {
  const profile = allProfiles.find(p => p.id === profileId);
  if (profile?.is_default) { showToast('默认方案不能删除', 'error'); return; }
  if (!confirm('确认删除方案"' + (profile?.name || '') + '"？此操作不可恢复。')) return;
  try {
    await apiCall('/api/agents/profiles/' + profileId, { method: 'DELETE' });
    showToast('方案已删除', 'success');
    await loadProfiles();
  } catch(e) { showToast('删除失败: ' + e.message, 'error'); }
}

// ==========================================================
// 渲染智能体列表（详情视图内）
// ==========================================================
function renderAgentsList() {
  const profile = allProfiles.find(p => p.id === selectedProfileId);
  if (!profile) return;

  const agents = profile.agents.filter(a => a.ring_type === currentAgentTab);
  const listEl = document.getElementById('agents-list');

  if (!agents.length) {
    listEl.innerHTML = '<div class="text-center py-10 text-gray-400"><i class="fas fa-inbox text-3xl mb-2"></i><p>暂无' + (currentAgentTab === 'outer' ? '外环漏斗' : '中环筛子') + '智能体</p><p class="text-xs mt-1">点击上方"添加智能体"开始配置</p></div>';
    return;
  }

  const industryMap = { all:'全行业', catering:'餐饮', retail:'零售', service:'服务', ecommerce:'电商', education:'教育', 'douyin-ecommerce':'抖音投流', 'light-asset':'轻资产', entertainment:'文娱' };

  listEl.innerHTML = agents.map(agent => {
    const isEnabled = agent.enabled !== false;
    const industryLabel = industryMap[agent.industry] || agent.industry;
    const isTrack = agent.industry !== 'all';
    return '<div class="agent-row flex items-center justify-between p-3 border border-gray-100 rounded-lg">' +
      '<div class="flex items-center space-x-3 flex-1 min-w-0">' +
      '<div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style="background:' + agent.icon_color + '20">' +
      '<i class="' + agent.icon + '" style="color:' + agent.icon_color + '"></i></div>' +
      '<div class="flex-1 min-w-0">' +
      '<div class="flex items-center space-x-2">' +
      '<h4 class="font-medium text-sm text-gray-800 truncate">' + agent.name + '</h4>' +
      (isTrack ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 flex-shrink-0">' + industryLabel + '</span>' : '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 flex-shrink-0">通用</span>') +
      '</div>' +
      '<p class="text-xs text-gray-400 truncate">' + agent.dimension + ' · 阈值 ' + agent.pass_threshold +
      (currentAgentTab === 'inner' ? ' · 权重 ' + agent.weight + '%' : '') + '</p></div></div>' +
      '<div class="flex items-center space-x-3 flex-shrink-0">' +
      '<label class="toggle-switch"><input type="checkbox" ' + (isEnabled ? 'checked' : '') + ' onchange="toggleAgent(\'' + agent.id + '\', this.checked)"><span class="toggle-slider"></span></label>' +
      '<button onclick="openEditAgentModal(\'' + agent.id + '\')" class="text-gray-400 hover:text-teal-500 transition" title="编辑"><i class="fas fa-pen text-sm"></i></button>' +
      '<button onclick="removeAgent(\'' + agent.id + '\')" class="text-gray-400 hover:text-red-500 transition" title="删除"><i class="fas fa-trash text-sm"></i></button>' +
      '</div></div>';
  }).join('');
}

function switchAgentTab(tab) {
  currentAgentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  renderAgentsList();
}

// ==========================================================
// 智能体操作（详情视图内）
// ==========================================================
async function toggleAgent(agentId, enabled) {
  try {
    await apiCall('/api/agents/profiles/' + selectedProfileId + '/agents/' + agentId, {
      method: 'PATCH', body: JSON.stringify({ enabled })
    });
    const profile = allProfiles.find(p => p.id === selectedProfileId);
    const agent = profile?.agents.find(a => a.id === agentId);
    if (agent) agent.enabled = enabled;
    fillDetailHeader(profile);
    showToast(enabled ? '已启用' : '已禁用', 'success');
  } catch(e) { showToast('操作失败: ' + e.message, 'error'); }
}

async function removeAgent(agentId) {
  const profile = allProfiles.find(p => p.id === selectedProfileId);
  const agent = profile?.agents.find(a => a.id === agentId);
  if (!confirm('确认删除智能体"' + (agent?.name || agentId) + '"？')) return;
  try {
    await apiCall('/api/agents/profiles/' + selectedProfileId + '/agents/' + agentId, { method: 'DELETE' });
    await loadProfiles();
    showToast('智能体已删除', 'success');
  } catch(e) { showToast('删除失败: ' + e.message, 'error'); }
}

// ==========================================================
// 弹窗1: 新建方案
// ==========================================================
function openCreateProfileModal() {
  document.getElementById('inp-create-profile-name').value = '';
  document.getElementById('inp-create-profile-desc').value = '';
  document.getElementById('inp-create-profile-template').value = 'default-profile';
  openModal('modal-create-profile');
}

async function doCreateProfile() {
  const name = document.getElementById('inp-create-profile-name').value.trim();
  if (!name) { showToast('请输入方案名称', 'error'); return; }
  const desc = document.getElementById('inp-create-profile-desc').value.trim();
  const template = document.getElementById('inp-create-profile-template').value;

  try {
    const resp = await apiCall('/api/agents/profiles', {
      method: 'POST',
      body: JSON.stringify({ name, description: desc, template_id: template })
    });
    closeModal();
    showToast('方案创建成功！', 'success');
    await loadProfiles();
    // 创建后直接进入该方案的详情
    if (resp.data?.id) {
      allProfiles = (await apiCall('/api/agents/profiles')).data || allProfiles;
      showDetailView(resp.data.id);
    }
  } catch(e) { showToast('创建失败: ' + e.message, 'error'); }
}

// ==========================================================
// 弹窗2: 编辑方案信息
// ==========================================================
function openEditProfileModal() {
  if (!selectedProfileId) { showToast('请先选择一个方案', 'warning'); return; }
  const profile = allProfiles.find(p => p.id === selectedProfileId);
  if (!profile) { showToast('方案不存在', 'error'); return; }

  document.getElementById('inp-edit-profile-name').value = profile.name;
  document.getElementById('inp-edit-profile-desc').value = profile.description || '';
  document.getElementById('inp-edit-profile-icon').value = profile.icon || 'fas fa-robot';
  document.getElementById('inp-edit-profile-iconcolor').value = profile.icon_color || '#5DC4B3';
  openModal('modal-edit-profile');
}

async function doSaveProfile() {
  if (!selectedProfileId) return;
  const name = document.getElementById('inp-edit-profile-name').value.trim();
  if (!name) { showToast('方案名称不能为空', 'error'); return; }

  try {
    await apiCall('/api/agents/profiles/' + selectedProfileId, {
      method: 'PUT',
      body: JSON.stringify({
        name,
        description: document.getElementById('inp-edit-profile-desc').value.trim(),
        icon: document.getElementById('inp-edit-profile-icon').value.trim() || 'fas fa-robot',
        icon_color: document.getElementById('inp-edit-profile-iconcolor').value || '#5DC4B3'
      })
    });
    closeModal();
    showToast('方案信息已更新', 'success');
    await loadProfiles();
  } catch(e) { showToast('保存失败: ' + e.message, 'error'); }
}

// ==========================================================
// 弹窗3: 编辑/新建智能体
// ==========================================================
function openEditAgentModal(agentId) {
  editingIsNew = !agentId;
  editingAgentId = agentId || null;

  if (agentId) {
    const profile = allProfiles.find(p => p.id === selectedProfileId);
    const agent = profile?.agents.find(a => a.id === agentId);
    if (!agent) { showToast('找不到该智能体', 'error'); return; }
    document.getElementById('modal-edit-agent-title').innerHTML = '<i class="fas fa-edit mr-2 text-teal-500"></i>编辑智能体';
    document.getElementById('inp-agent-name').value = agent.name;
    document.getElementById('inp-agent-dimension').value = agent.dimension;
    document.getElementById('inp-agent-ring').value = agent.ring_type;
    document.getElementById('inp-agent-industry').value = agent.industry;
    document.getElementById('inp-agent-threshold').value = agent.pass_threshold;
    document.getElementById('inp-agent-weight').value = agent.weight;
    document.getElementById('inp-agent-icon').value = agent.icon;
    document.getElementById('inp-agent-iconcolor').value = agent.icon_color;
    document.getElementById('inp-agent-desc').value = agent.description || '';
    document.getElementById('inp-agent-prompt').value = agent.prompt_template || '';
  } else {
    document.getElementById('modal-edit-agent-title').innerHTML = '<i class="fas fa-plus-circle mr-2 text-teal-500"></i>新建智能体';
    document.getElementById('inp-agent-name').value = '';
    document.getElementById('inp-agent-dimension').value = '';
    document.getElementById('inp-agent-ring').value = currentAgentTab;
    document.getElementById('inp-agent-industry').value = 'all';
    document.getElementById('inp-agent-threshold').value = currentAgentTab === 'outer' ? 60 : 50;
    document.getElementById('inp-agent-weight').value = currentAgentTab === 'inner' ? 10 : 0;
    document.getElementById('inp-agent-icon').value = 'fas fa-robot';
    document.getElementById('inp-agent-iconcolor').value = '#5DC4B3';
    document.getElementById('inp-agent-desc').value = '';
    document.getElementById('inp-agent-prompt').value = '';
  }
  openModal('modal-edit-agent');
}

function openAddAgentModal() { openEditAgentModal(null); }

async function doSaveAgent() {
  const name = document.getElementById('inp-agent-name').value.trim();
  if (!name) { showToast('请输入智能体名称', 'error'); return; }

  const agentData = {
    name,
    dimension: document.getElementById('inp-agent-dimension').value.trim() || name,
    ring_type: document.getElementById('inp-agent-ring').value,
    industry: document.getElementById('inp-agent-industry').value,
    pass_threshold: parseInt(document.getElementById('inp-agent-threshold').value) || 50,
    weight: parseInt(document.getElementById('inp-agent-weight').value) || 0,
    icon: document.getElementById('inp-agent-icon').value.trim() || 'fas fa-robot',
    icon_color: document.getElementById('inp-agent-iconcolor').value || PRIMARY,
    description: document.getElementById('inp-agent-desc').value.trim(),
    prompt_template: document.getElementById('inp-agent-prompt').value.trim(),
    enabled: true
  };

  try {
    if (editingIsNew) {
      agentData.id = 'custom-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
      await apiCall('/api/agents/profiles/' + selectedProfileId + '/agents', {
        method: 'POST', body: JSON.stringify(agentData)
      });
      showToast('智能体已添加', 'success');
    } else {
      await apiCall('/api/agents/profiles/' + selectedProfileId + '/agents/' + editingAgentId, {
        method: 'PUT', body: JSON.stringify(agentData)
      });
      showToast('智能体已更新', 'success');
    }
    closeModal();
    await loadProfiles();
  } catch(e) { showToast('保存失败: ' + e.message, 'error'); }
}

// ==========================================================
// 方案操作（详情视图按钮）
// ==========================================================
async function setAsDefault() {
  if (!selectedProfileId) return;
  try {
    await apiCall('/api/agents/profiles/' + selectedProfileId + '/default', { method: 'POST' });
    showToast('已设为默认方案', 'success');
    await loadProfiles();
  } catch(e) { showToast('操作失败: ' + e.message, 'error'); }
}

async function cloneProfile() {
  if (!selectedProfileId) return;
  try {
    const resp = await apiCall('/api/agents/profiles/' + selectedProfileId + '/clone', { method: 'POST' });
    showToast('方案已克隆', 'success');
    await loadProfiles();
    // 克隆后进入新方案详情
    if (resp.data?.id) {
      allProfiles = (await apiCall('/api/agents/profiles')).data || allProfiles;
      showDetailView(resp.data.id);
    }
  } catch(e) { showToast('克隆失败: ' + e.message, 'error'); }
}

async function deleteProfile() {
  if (!selectedProfileId) return;
  const profile = allProfiles.find(p => p.id === selectedProfileId);
  if (profile?.is_default) { showToast('默认方案不能删除', 'error'); return; }
  if (!confirm('确认删除方案"' + (profile?.name || '') + '"？此操作不可恢复。')) return;
  try {
    await apiCall('/api/agents/profiles/' + selectedProfileId, { method: 'DELETE' });
    showToast('方案已删除', 'success');
    // 删除后回到仓库
    selectedProfileId = null;
    await loadProfiles();
    backToWarehouse();
  } catch(e) { showToast('删除失败: ' + e.message, 'error'); }
}

// ==========================================================
// 初始化 — 检测 ?profile= 参数，有则直接进入方案详情
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
  // 确保所有弹窗关闭
  closeModal();
  // 先显示仓库视图（如果有profile参数后面会切到详情）
  showWarehouseView();

  const user = checkAgentsAuth();
  if (!user) return;

  // 检查URL参数，如果有 ?profile=xxx 则加载后直接进入该方案详情
  const urlParams = new URLSearchParams(window.location.search);
  const targetProfileId = urlParams.get('profile');

  if (targetProfileId) {
    // 有目标方案ID — 加载后直接跳到详情视图
    loadProfilesAndEnter(targetProfileId);
  } else {
    // 无参数 — 正常显示仓库列表
    loadProfiles();
  }
});

// 加载方案列表并直接进入指定方案的详情
async function loadProfilesAndEnter(targetProfileId) {
  try {
    const data = await apiCall('/api/agents/profiles');
    allProfiles = data.data || [];
    // 找到目标方案
    const targetProfile = allProfiles.find(p => p.id === targetProfileId);
    if (targetProfile) {
      // 直接进入方案详情（编辑智能体），不停留在仓库列表
      showDetailView(targetProfileId);
    } else {
      // 方案不存在，回到仓库列表
      showToast('指定方案不存在，显示全部方案', 'warning');
      renderProfilesGrid();
      updateWarehouseStats();
    }
  } catch(e) {
    console.error('加载方案失败:', e);
    showToast('加载方案列表失败', 'error');
  }
}

// ESC 关闭弹窗
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});
