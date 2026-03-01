// ==========================================================
// 智能体管理中心 — agents-manage.js (v4)
//
// v4 设计原则：
//   1. 唯一弹窗：同一时刻只有一个弹窗，由 closeModal() 统一关闭
//   2. 页面进入即方案列表，不会自动弹窗
//   3. 所有弹窗 ID 统一前缀 modal-*
//   4. 所有表单 ID 统一前缀 inp-*
// ==========================================================

let allProfiles = [];
let selectedProfileId = null;
let currentAgentTab = 'outer';
let editingAgentId = null;
let editingIsNew = false;

const PRIMARY = '#5DC4B3';

// ==========================================================
// 唯一弹窗管理 — 同一时刻只能有一个弹窗
// ==========================================================
const MODAL_IDS = ['modal-create-profile', 'modal-edit-profile', 'modal-edit-agent'];

// 关闭所有弹窗 — 任何时候调用都安全
function closeModal() {
  MODAL_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  document.body.style.overflow = '';
}

// 打开指定弹窗（先关闭所有）
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
    renderProfilesGrid();
    updateStats();
    if (selectedProfileId) {
      const exists = allProfiles.find(p => p.id === selectedProfileId);
      if (exists) showProfileDetail(selectedProfileId);
      else { selectedProfileId = null; document.getElementById('profile-detail-section').classList.add('hidden'); }
    }
  } catch(e) {
    console.error('加载方案失败:', e);
    showToast('加载方案列表失败', 'error');
  }
}

function updateStats() {
  const el = (id) => document.getElementById(id);
  el('stat-profiles').textContent = allProfiles.length;
  const def = allProfiles.find(p => p.is_default);
  el('stat-default').textContent = def ? def.name : '未设置';

  const target = selectedProfileId
    ? allProfiles.find(p => p.id === selectedProfileId)
    : (allProfiles.find(p => p.is_default) || allProfiles[0]);

  if (target) {
    el('stat-outer').textContent = target.agents.filter(a => a.ring_type === 'outer' && a.enabled !== false).length;
    el('stat-inner').textContent = target.agents.filter(a => a.ring_type === 'inner' && a.enabled !== false).length;
  }
}

// ==========================================================
// 渲染方案卡片
// ==========================================================
function renderProfilesGrid() {
  const grid = document.getElementById('profiles-grid');
  if (!allProfiles.length) {
    grid.innerHTML = '<div class="text-center py-12 text-gray-400 col-span-3"><i class="fas fa-inbox text-3xl mb-3"></i><p>暂无评估方案</p><p class="text-xs mt-1">点击右上角"新建方案"开始创建</p></div>';
    return;
  }

  grid.innerHTML = allProfiles.map(p => {
    const outer = p.agents.filter(a => a.ring_type === 'outer').length;
    const inner = p.agents.filter(a => a.ring_type === 'inner').length;
    const enabled = p.agents.filter(a => a.enabled !== false).length;
    const isSelected = selectedProfileId === p.id;
    return '<div class="gs-card profile-card p-5 ' + (isSelected ? 'selected' : '') + '" onclick="showProfileDetail(\'' + p.id + '\')" data-profile-id="' + p.id + '">' +
      (p.is_default ? '<div class="default-badge"><i class="fas fa-star mr-1"></i>默认</div>' : '') +
      '<div class="flex items-center space-x-3 mb-3">' +
      '<div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:' + (p.icon_color || PRIMARY) + '20">' +
      '<i class="' + (p.icon || 'fas fa-robot') + ' text-lg" style="color:' + (p.icon_color || PRIMARY) + '"></i></div>' +
      '<div class="flex-1 min-w-0"><h4 class="font-semibold text-gray-800 truncate">' + p.name + '</h4>' +
      '<p class="text-xs text-gray-400 line-clamp-1">' + (p.description || '暂无描述') + '</p></div></div>' +
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
      '<span class="text-teal-500 font-medium cursor-pointer" onclick="showProfileDetail(\'' + p.id + '\')"><i class="fas fa-chevron-right mr-1"></i>详情</span>' +
      '</div></div></div>';
  }).join('');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

// ==========================================================
// 方案卡片快捷操作
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
    if (resp.data?.id) showProfileDetail(resp.data.id);
  } catch(e) { showToast('克隆失败: ' + e.message, 'error'); }
}

async function quickDelete(profileId) {
  const profile = allProfiles.find(p => p.id === profileId);
  if (profile?.is_default) { showToast('默认方案不能删除', 'error'); return; }
  if (!confirm('确认删除方案"' + (profile?.name || '') + '"？此操作不可恢复。')) return;
  try {
    await apiCall('/api/agents/profiles/' + profileId, { method: 'DELETE' });
    if (selectedProfileId === profileId) deselectProfile();
    showToast('方案已删除', 'success');
    await loadProfiles();
  } catch(e) { showToast('删除失败: ' + e.message, 'error'); }
}

// ==========================================================
// 展开方案详情（页面内联，不是弹窗）
// ==========================================================
function showProfileDetail(profileId) {
  selectedProfileId = profileId;
  const profile = allProfiles.find(p => p.id === profileId);
  if (!profile) return;

  // 高亮卡片
  document.querySelectorAll('.profile-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.profileId === profileId);
  });

  // 展示详情
  document.getElementById('profile-detail-section').classList.remove('hidden');
  document.getElementById('detail-name').textContent = profile.name;
  document.getElementById('detail-desc').textContent = profile.description || '暂无描述';
  document.getElementById('detail-icon').style.background = (profile.icon_color || PRIMARY) + '20';
  document.getElementById('detail-icon').innerHTML = '<i class="' + (profile.icon || 'fas fa-robot') + ' text-xl" style="color:' + (profile.icon_color || PRIMARY) + '"></i>';

  const btnDefault = document.getElementById('btn-set-default');
  if (profile.is_default) {
    btnDefault.innerHTML = '<i class="fas fa-star text-yellow-500 mr-1"></i>已是默认';
    btnDefault.disabled = true;
  } else {
    btnDefault.innerHTML = '<i class="fas fa-star mr-1"></i>设为默认';
    btnDefault.disabled = false;
  }

  document.getElementById('tab-outer-count').textContent = profile.agents.filter(a => a.ring_type === 'outer').length;
  document.getElementById('tab-inner-count').textContent = profile.agents.filter(a => a.ring_type === 'inner').length;

  updateStats();
  renderAgentsList();

  setTimeout(() => document.getElementById('profile-detail-section').scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

function deselectProfile() {
  selectedProfileId = null;
  document.querySelectorAll('.profile-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('profile-detail-section').classList.add('hidden');
  updateStats();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================================
// 渲染智能体列表
// ==========================================================
function renderAgentsList() {
  const profile = allProfiles.find(p => p.id === selectedProfileId);
  if (!profile) return;

  const agents = profile.agents.filter(a => a.ring_type === currentAgentTab);
  const listEl = document.getElementById('agents-list');

  if (!agents.length) {
    listEl.innerHTML = '<div class="text-center py-8 text-gray-400"><i class="fas fa-inbox text-3xl mb-2"></i><p>暂无' + (currentAgentTab === 'outer' ? '外环漏斗' : '中环筛子') + '智能体</p><p class="text-xs mt-1">点击"添加智能体"开始配置</p></div>';
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
// 智能体操作
// ==========================================================
async function toggleAgent(agentId, enabled) {
  try {
    await apiCall('/api/agents/profiles/' + selectedProfileId + '/agents/' + agentId, {
      method: 'PATCH', body: JSON.stringify({ enabled })
    });
    const profile = allProfiles.find(p => p.id === selectedProfileId);
    const agent = profile?.agents.find(a => a.id === agentId);
    if (agent) agent.enabled = enabled;
    updateStats();
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
    if (resp.data?.id) showProfileDetail(resp.data.id);
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
// 方案操作（详情区按钮）
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
    if (resp.data?.id) showProfileDetail(resp.data.id);
  } catch(e) { showToast('克隆失败: ' + e.message, 'error'); }
}

async function deleteProfile() {
  if (!selectedProfileId) return;
  const profile = allProfiles.find(p => p.id === selectedProfileId);
  if (profile?.is_default) { showToast('默认方案不能删除', 'error'); return; }
  if (!confirm('确认删除方案"' + (profile?.name || '') + '"？此操作不可恢复。')) return;
  try {
    await apiCall('/api/agents/profiles/' + selectedProfileId, { method: 'DELETE' });
    deselectProfile();
    showToast('方案已删除', 'success');
    await loadProfiles();
  } catch(e) { showToast('删除失败: ' + e.message, 'error'); }
}

// ==========================================================
// 初始化 — 只加载方案列表，不弹任何弹窗
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
  // 确保所有弹窗关闭（防止缓存残留状态）
  closeModal();

  const user = checkAgentsAuth();
  if (!user) return;
  loadProfiles();
});

// ESC 关闭弹窗
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});
