// ==========================================================
// 智能体管理中心 — agents-manage.js
// ==========================================================

let allProfiles = [];
let selectedProfileId = null;
let currentAgentTab = 'outer'; // 'outer' | 'inner'
let editingAgentId = null;     // null=新建, string=编辑
let editingIsNew = false;

const PRIMARY = '#5DC4B3';

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
    // 如果有选中的，保持展开
    if (selectedProfileId) {
      const exists = allProfiles.find(p => p.id === selectedProfileId);
      if (exists) selectProfile(selectedProfileId);
      else { selectedProfileId = null; document.getElementById('profile-detail-section').classList.add('hidden'); }
    }
  } catch(e) {
    console.error('加载方案失败:', e);
    showToast('加载方案列表失败', 'error');
  }
}

function updateStats() {
  document.getElementById('stat-profiles').textContent = allProfiles.length;
  const def = allProfiles.find(p => p.is_default);
  document.getElementById('stat-default').textContent = def ? def.name : '未设置';
  // 当前选中方案的统计
  if (selectedProfileId) {
    const profile = allProfiles.find(p => p.id === selectedProfileId);
    if (profile) {
      const outer = profile.agents.filter(a => a.ring_type === 'outer' && a.enabled !== false).length;
      const inner = profile.agents.filter(a => a.ring_type === 'inner' && a.enabled !== false).length;
      document.getElementById('stat-outer').textContent = outer;
      document.getElementById('stat-inner').textContent = inner;
    }
  } else {
    const def = allProfiles.find(p => p.is_default) || allProfiles[0];
    if (def) {
      document.getElementById('stat-outer').textContent = def.agents.filter(a => a.ring_type === 'outer').length;
      document.getElementById('stat-inner').textContent = def.agents.filter(a => a.ring_type === 'inner').length;
    }
  }
}

// ==========================================================
// 渲染方案卡片
// ==========================================================
function renderProfilesGrid() {
  const grid = document.getElementById('profiles-grid');
  if (!allProfiles.length) {
    grid.innerHTML = '<div class="text-center py-12 text-gray-400 col-span-3"><i class="fas fa-inbox text-3xl mb-3"></i><p>暂无评估方案</p><p class="text-xs mt-1">点击"新建方案"开始创建</p></div>';
    return;
  }
  grid.innerHTML = allProfiles.map(p => {
    const outer = p.agents.filter(a => a.ring_type === 'outer').length;
    const inner = p.agents.filter(a => a.ring_type === 'inner').length;
    const enabled = p.agents.filter(a => a.enabled !== false).length;
    const isSelected = selectedProfileId === p.id;
    return '<div class="gs-card profile-card p-5 ' + (isSelected ? 'selected' : '') + '" onclick="selectProfile(\'' + p.id + '\')">' +
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
      '<span class="text-teal-500 font-medium"><i class="fas fa-chevron-right mr-1"></i>查看详情</span></div></div>';
  }).join('');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

// ==========================================================
// 选择方案 & 展示详情
// ==========================================================
function selectProfile(profileId) {
  selectedProfileId = profileId;
  const profile = allProfiles.find(p => p.id === profileId);
  if (!profile) return;

  // 更新卡片高亮
  document.querySelectorAll('.profile-card').forEach(c => c.classList.remove('selected'));
  const cards = document.querySelectorAll('.profile-card');
  const idx = allProfiles.findIndex(p => p.id === profileId);
  if (cards[idx]) cards[idx].classList.add('selected');

  // 展示详情区
  document.getElementById('profile-detail-section').classList.remove('hidden');
  document.getElementById('detail-name').textContent = profile.name;
  document.getElementById('detail-desc').textContent = profile.description || '暂无描述';
  document.getElementById('detail-icon').style.background = (profile.icon_color || PRIMARY) + '20';
  document.getElementById('detail-icon').innerHTML = '<i class="' + (profile.icon || 'fas fa-robot') + ' text-xl" style="color:' + (profile.icon_color || PRIMARY) + '"></i>';

  // 默认按钮状态
  if (profile.is_default) {
    document.getElementById('btn-set-default').innerHTML = '<i class="fas fa-star text-yellow-500 mr-1"></i>已是默认';
    document.getElementById('btn-set-default').disabled = true;
  } else {
    document.getElementById('btn-set-default').innerHTML = '<i class="fas fa-star mr-1"></i>设为默认';
    document.getElementById('btn-set-default').disabled = false;
  }

  // Tab 计数
  const outerCount = profile.agents.filter(a => a.ring_type === 'outer').length;
  const innerCount = profile.agents.filter(a => a.ring_type === 'inner').length;
  document.getElementById('tab-outer-count').textContent = outerCount;
  document.getElementById('tab-inner-count').textContent = innerCount;

  updateStats();
  renderAgentsList();

  // 平滑滚动到详情区
  setTimeout(() => document.getElementById('profile-detail-section').scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
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
      '<button onclick="openEditAgentModal(\'' + agent.id + '\')" class="text-gray-400 hover:text-teal-500 transition"><i class="fas fa-pen text-sm"></i></button>' +
      '<button onclick="removeAgent(\'' + agent.id + '\')" class="text-gray-400 hover:text-red-500 transition"><i class="fas fa-trash text-sm"></i></button>' +
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
    // 本地更新
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
    selectProfile(selectedProfileId);
    showToast('智能体已删除', 'success');
  } catch(e) { showToast('删除失败: ' + e.message, 'error'); }
}

// ==========================================================
// 编辑智能体弹窗
// ==========================================================
function openEditAgentModal(agentId) {
  editingIsNew = !agentId;
  editingAgentId = agentId || null;

  if (agentId) {
    const profile = allProfiles.find(p => p.id === selectedProfileId);
    const agent = profile?.agents.find(a => a.id === agentId);
    if (!agent) return;
    document.getElementById('edit-agent-title').innerHTML = '<i class="fas fa-edit mr-2 text-teal-500"></i>编辑智能体';
    document.getElementById('edit-agent-name').value = agent.name;
    document.getElementById('edit-agent-dimension').value = agent.dimension;
    document.getElementById('edit-agent-ring').value = agent.ring_type;
    document.getElementById('edit-agent-industry').value = agent.industry;
    document.getElementById('edit-agent-threshold').value = agent.pass_threshold;
    document.getElementById('edit-agent-weight').value = agent.weight;
    document.getElementById('edit-agent-icon').value = agent.icon;
    document.getElementById('edit-agent-iconcolor').value = agent.icon_color;
    document.getElementById('edit-agent-desc').value = agent.description || '';
    document.getElementById('edit-agent-prompt').value = agent.prompt_template || '';
  } else {
    document.getElementById('edit-agent-title').innerHTML = '<i class="fas fa-plus-circle mr-2 text-teal-500"></i>新建智能体';
    document.getElementById('edit-agent-name').value = '';
    document.getElementById('edit-agent-dimension').value = '';
    document.getElementById('edit-agent-ring').value = currentAgentTab;
    document.getElementById('edit-agent-industry').value = 'all';
    document.getElementById('edit-agent-threshold').value = currentAgentTab === 'outer' ? 60 : 50;
    document.getElementById('edit-agent-weight').value = currentAgentTab === 'inner' ? 10 : 0;
    document.getElementById('edit-agent-icon').value = 'fas fa-robot';
    document.getElementById('edit-agent-iconcolor').value = '#5DC4B3';
    document.getElementById('edit-agent-desc').value = '';
    document.getElementById('edit-agent-prompt').value = '';
  }
  document.getElementById('edit-agent-modal').classList.remove('hidden');
}

function openAddAgentModal() { openEditAgentModal(null); }

function closeEditAgentModal() { document.getElementById('edit-agent-modal').classList.add('hidden'); }

async function saveAgent() {
  const name = document.getElementById('edit-agent-name').value.trim();
  if (!name) { showToast('请输入智能体名称', 'error'); return; }

  const agentData = {
    name,
    dimension: document.getElementById('edit-agent-dimension').value.trim() || name,
    ring_type: document.getElementById('edit-agent-ring').value,
    industry: document.getElementById('edit-agent-industry').value,
    pass_threshold: parseInt(document.getElementById('edit-agent-threshold').value) || 50,
    weight: parseInt(document.getElementById('edit-agent-weight').value) || 0,
    icon: document.getElementById('edit-agent-icon').value.trim() || 'fas fa-robot',
    icon_color: document.getElementById('edit-agent-iconcolor').value || PRIMARY,
    description: document.getElementById('edit-agent-desc').value.trim(),
    prompt_template: document.getElementById('edit-agent-prompt').value.trim(),
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
    closeEditAgentModal();
    await loadProfiles();
    selectProfile(selectedProfileId);
  } catch(e) { showToast('保存失败: ' + e.message, 'error'); }
}

// ==========================================================
// 方案操作
// ==========================================================
function openCreateProfileModal() {
  document.getElementById('profile-modal-title').innerHTML = '<i class="fas fa-plus-circle mr-2 text-teal-500"></i>新建评估方案';
  document.getElementById('profile-name').value = '';
  document.getElementById('profile-desc-input').value = '';
  document.getElementById('profile-template').value = 'default-profile';
  document.getElementById('profile-modal').classList.remove('hidden');
}
function closeProfileModal() { document.getElementById('profile-modal').classList.add('hidden'); }

async function createProfile() {
  const name = document.getElementById('profile-name').value.trim();
  if (!name) { showToast('请输入方案名称', 'error'); return; }
  const desc = document.getElementById('profile-desc-input').value.trim();
  const template = document.getElementById('profile-template').value;

  try {
    const resp = await apiCall('/api/agents/profiles', {
      method: 'POST',
      body: JSON.stringify({ name, description: desc, template_id: template })
    });
    closeProfileModal();
    showToast('方案创建成功', 'success');
    await loadProfiles();
    if (resp.data?.id) selectProfile(resp.data.id);
  } catch(e) { showToast('创建失败: ' + e.message, 'error'); }
}

async function setAsDefault() {
  if (!selectedProfileId) return;
  try {
    await apiCall('/api/agents/profiles/' + selectedProfileId + '/default', { method: 'POST' });
    showToast('已设为默认方案', 'success');
    await loadProfiles();
    selectProfile(selectedProfileId);
  } catch(e) { showToast('操作失败: ' + e.message, 'error'); }
}

async function cloneProfile() {
  if (!selectedProfileId) return;
  const profile = allProfiles.find(p => p.id === selectedProfileId);
  try {
    const resp = await apiCall('/api/agents/profiles/' + selectedProfileId + '/clone', { method: 'POST' });
    showToast('方案已克隆', 'success');
    await loadProfiles();
    if (resp.data?.id) selectProfile(resp.data.id);
  } catch(e) { showToast('克隆失败: ' + e.message, 'error'); }
}

async function deleteProfile() {
  if (!selectedProfileId) return;
  const profile = allProfiles.find(p => p.id === selectedProfileId);
  if (profile?.is_default) { showToast('默认方案不能删除', 'error'); return; }
  if (!confirm('确认删除方案"' + (profile?.name || '') + '"？此操作不可恢复。')) return;
  try {
    await apiCall('/api/agents/profiles/' + selectedProfileId, { method: 'DELETE' });
    selectedProfileId = null;
    document.getElementById('profile-detail-section').classList.add('hidden');
    showToast('方案已删除', 'success');
    await loadProfiles();
  } catch(e) { showToast('删除失败: ' + e.message, 'error'); }
}

// ==========================================================
// 初始化
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
  const user = checkAgentsAuth();
  if (!user) return;
  loadProfiles();
});

// ESC 关闭弹窗
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeEditAgentModal(); closeProfileModal(); }
});
