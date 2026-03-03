// ==========================================================
// 全局状态
// ==========================================================
let allDeals = [];
let filteredDeals = [];
let selectedDeal = null;
let evaluationAgents = [];
let radarChart = null;
let isRunning = false;
let allExpanded = false;
let evaluationResults = {};
let currentDealIndustry = null;
let filteredOuterAgents = [];
let filteredInnerAgents = [];
let currentFilter = 'all';
let uploadedFiles = [];
let parsedFileContents = [];
let allProfiles = [];
let activeProfileId = null; // 当前选中的评估方案ID

// API 路径前缀（使用本地 API）
const API_BASE = '/api';

// v33 主色
const PRIMARY_COLOR = '#5DC4B3';
const ACCENT_COLOR = '#49A89A';

// ==========================================================
// 登录状态 & 用户显示
// ==========================================================
function checkAssessAuth() {
  const auth = sessionStorage.getItem('assess_auth');
  if (!auth) {
    window.location.href = '/';
    return null;
  }
  try {
    const data = JSON.parse(auth);
    const avatarEl = document.getElementById('user-avatar-el');
    const nameEl = document.getElementById('user-name-el');
    if (avatarEl && data.name) avatarEl.textContent = data.name.charAt(0).toUpperCase();
    if (nameEl && data.name) nameEl.textContent = data.name;
    return data;
  } catch(e) {
    window.location.href = '/';
    return null;
  }
}

function handleLogout() {
  if (confirm('确认退出登录？')) {
    sessionStorage.removeItem('assess_auth');
    window.location.href = '/';
  }
}

// ==========================================================
// Toast
// ==========================================================
function showToast(msg, type = 'info') {
  const container = document.getElementById('assess-toast-container');
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

// 统一 fetch 封装
async function apiCall(url, options = {}) {
  const resp = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || resp.statusText);
  return data;
}

// ==========================================================
// Tab 切换
// ==========================================================
function switchInputTab(tab) {
  const isDb = tab === 'db';
  document.getElementById('panel-db').classList.toggle('hidden', !isDb);
  document.getElementById('panel-upload').classList.toggle('hidden', isDb);
  const primaryBg = 'background: var(--primary-500); color: white;';
  const normalBg  = '';
  document.getElementById('tab-db').setAttribute('style', isDb ? primaryBg : normalBg);
  document.getElementById('tab-db').className = 'px-4 py-2 font-medium transition' + (isDb ? '' : ' bg-white text-gray-500 hover:bg-gray-50');
  document.getElementById('tab-upload').setAttribute('style', !isDb ? primaryBg : normalBg);
  document.getElementById('tab-upload').className = 'px-4 py-2 font-medium transition' + (!isDb ? '' : ' bg-white text-gray-500 hover:bg-gray-50');
}

// ==========================================================
// 文件上传逻辑
// ==========================================================
function handleFileDrop(event) {
  event.preventDefault();
  event.currentTarget.style.borderColor = '';
  event.currentTarget.style.background = '';
  processFiles(Array.from(event.dataTransfer.files));
}
function handleFileSelect(event) {
  processFiles(Array.from(event.target.files));
}
function processFiles(files) {
  const allowed = ['pdf','xlsx','xls','txt','doc','docx','csv'];
  const valid = files.filter(f => {
    const ext = f.name.split('.').pop().toLowerCase();
    return allowed.includes(ext) && f.size <= 10*1024*1024;
  });
  if (!valid.length) { showToast('不支持的文件类型或超出10MB限制','error'); return; }
  uploadedFiles = [...uploadedFiles, ...valid];
  renderFileList();
  parseFiles(valid);
}
function renderFileList() {
  const el = document.getElementById('file-list');
  el.classList.remove('hidden');
  const iconMap = { pdf:'fa-file-pdf text-red-500', xlsx:'fa-file-excel text-green-600', xls:'fa-file-excel text-green-600',
    txt:'fa-file-alt text-gray-500', doc:'fa-file-word text-blue-500', docx:'fa-file-word text-blue-500', csv:'fa-file-csv text-orange-500' };
  el.innerHTML = uploadedFiles.map((f, i) => {
    const ext = f.name.split('.').pop().toLowerCase();
    const icon = iconMap[ext] || 'fa-file text-gray-400';
    const size = f.size > 1024*1024 ? (f.size/1024/1024).toFixed(1)+'MB' : Math.round(f.size/1024)+'KB';
    return '<div class="flex items-center justify-between p-2.5 rounded-lg border" style="background:#F5F2EA; border-color:#D0CAC0">' +
      '<div class="flex items-center gap-2.5"><i class="fas ' + icon + ' text-lg"></i>' +
      '<div><p class="text-sm font-medium text-gray-700 line-clamp-1">' + f.name + '</p>' +
      '<p class="text-xs text-gray-400">' + size + '</p></div></div>' +
      '<button onclick="removeFile(' + i + ')" class="text-gray-300 hover:text-red-400 transition"><i class="fas fa-times"></i></button></div>';
  }).join('');
}
function removeFile(idx) {
  uploadedFiles.splice(idx, 1);
  parsedFileContents.splice(idx, 1);
  if (!uploadedFiles.length) {
    document.getElementById('file-list').classList.add('hidden');
    document.getElementById('upload-meta-form').classList.add('hidden');
    document.getElementById('btn-create-from-upload').classList.add('hidden');
  } else { renderFileList(); }
}
async function parseFiles(files) {
  const statusEl = document.getElementById('upload-parse-status');
  statusEl.className = 'mt-3 p-3 rounded-lg text-sm flex items-center gap-2 bg-blue-50 text-blue-700';
  statusEl.classList.remove('hidden');
  statusEl.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i><span>正在解析文件内容...</span>';
  for (const file of files) {
    try {
      const text = await readFileAsText(file);
      parsedFileContents.push({ name: file.name, content: text });
      autoFillFromContent(text, file.name);
    } catch(e) {
      parsedFileContents.push({ name: file.name, content: '[无法解析: '+e.message+'] 文件名: '+file.name });
    }
  }
  statusEl.className = 'mt-3 p-3 rounded-lg text-sm flex items-center gap-2 bg-emerald-50 text-emerald-700';
  statusEl.innerHTML = '<i class="fas fa-check-circle"></i><span>文件解析完成，请补充或确认基本信息后提交</span>';
  document.getElementById('upload-meta-form').classList.remove('hidden');
  document.getElementById('btn-create-from-upload').classList.remove('hidden');
}
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (['xlsx','xls'].includes(ext)) {
      resolve('[Excel文件: ' + file.name + '] 请在业务简介中补充关键财务数据');
    } else if (['doc','docx'].includes(ext)) {
      resolve('[Word文件: ' + file.name + '] Word内容解析需服务端支持，已记录文件信息');
    } else {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file, 'utf-8');
    }
  });
}
function autoFillFromContent(text, filename) {
  const companyPatterns = [
    /(?:企业名称|公司名称|甲方|申请主体)[：:]\s*([^\n\r，,]{2,20})/,
    /【(.{2,20})】.*?项目/,
    /^(.{4,20}(?:有限公司|股份公司|集团|门店))/m
  ];
  for (const pat of companyPatterns) {
    const m = text.match(pat);
    if (m && m[1]) {
      const el = document.getElementById('upload-company-name');
      if (!el.value) el.value = m[1].trim();
      break;
    }
  }
  const amountM = text.match(/(?:融资金额|投资金额|申请金额)[：:]\s*(\d+(?:\.\d+)?)\s*万/);
  if (amountM) { const el = document.getElementById('upload-funding'); if (!el.value) el.value = amountM[1]; }
  const bizEl = document.getElementById('upload-business');
  if (!bizEl.value && text.length > 50) {
    bizEl.value = text.replace(/[\r\n]+/g,' ').replace(/\s+/g,' ').trim().substring(0, 300);
  }
}
async function createDealFromUpload() {
  const companyName = document.getElementById('upload-company-name').value.trim();
  if (!companyName) { showToast('请输入企业名称','error'); document.getElementById('upload-company-name').focus(); return; }
  const btn = document.getElementById('btn-create-from-upload');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>创建中...';
  const fileContents = parsedFileContents.map(f => '\n\n【上传文件: ' + f.name + '】\n' + f.content).join('\n');
  const projectDocs = (document.getElementById('upload-business').value.trim() || '') + fileContents;
  const payload = {
    company_name: companyName,
    industry: document.getElementById('upload-industry').value,
    main_business: document.getElementById('upload-business').value.trim() || '用户上传材料 - ' + companyName,
    funding_amount: parseFloat(document.getElementById('upload-funding').value) || 0,
    contact_name: document.getElementById('upload-contact').value.trim() || '用户上传',
    contact_phone: '',
    website: '',
    project_documents: projectDocs,
    financial_data: '{}',
    uploaded_files: uploadedFiles.map(f => ({ name: f.name, type: f.type, size: f.size }))
  };
  try {
    const data = await apiCall(API_BASE + '/deals', { method: 'POST', body: JSON.stringify(payload) });
    if (!data.success) throw new Error(data.error || '创建失败');
    const newDeal = data.data;
    showToast('标的 ' + newDeal.id + ' 创建成功，即将开始评估', 'success');
    allDeals.unshift(newDeal);
    filteredDeals = [...allDeals];
    selectedDeal = newDeal;
    currentDealIndustry = newDeal.industry;
    switchInputTab('db');
    renderDealsList();
    updateDealInfo();
    loadEvaluationAgents();
    setTimeout(() => startEvaluation(), 800);
  } catch(e) {
    showToast('创建标的失败：' + e.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-plus-circle mr-2"></i>创建标的并开始评估';
  }
}

// ==========================================================
// 赛道映射
// ==========================================================
const trackNameMap = { all:'通用', catering:'餐饮', retail:'零售', ecommerce:'电商',
  'douyin-ecommerce':'抖音投流', education:'教育培训', service:'生活服务', 'light-asset':'文娱轻资产' };
const trackIconMap = { catering:'fas fa-utensils', retail:'fas fa-shopping-cart', ecommerce:'fas fa-shopping-bag',
  'douyin-ecommerce':'fas fa-video', education:'fas fa-graduation-cap', service:'fas fa-concierge-bell', 'light-asset':'fas fa-star' };
const trackColorMap = { catering:'#F59E0B', retail:'#10B981', ecommerce:'#49A89A',
  'douyin-ecommerce':'#EC4899', education:'#3B82F6', service:'#06B6D4', 'light-asset':'#F97316' };

// ==========================================================
// 标的管理
// ==========================================================
async function loadAllDeals() {
  try {
    const data = await apiCall(API_BASE + '/deals');
    allDeals = (data.data || data) || [];
    filteredDeals = [...allDeals];
    renderDealsList();
    updateDealsCount();
    // 统计待评估数量
    const pendingEl = document.getElementById('stat-pending-deals');
    if (pendingEl) pendingEl.textContent = allDeals.filter(d => d.status === 'pending').length;
    // 如果成功加载，隐藏 login-notice
    if (allDeals.length > 0) {
      document.getElementById('login-notice')?.classList.add('hidden');
    } else {
      document.getElementById('login-notice')?.classList.remove('hidden');
    }
  } catch(e) {
    console.error('加载标的失败:', e);
    document.getElementById('deals-list').innerHTML =
      '<div class="text-center py-8 text-red-400 col-span-3"><i class="fas fa-exclamation-circle text-2xl mb-2"></i><p>加载失败，请刷新重试</p></div>';
    // 加载失败时显示登录提示
    document.getElementById('login-notice')?.classList.remove('hidden');
  }
}
function filterDeals(track) {
  currentFilter = track;
  document.querySelectorAll('.track-filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.track === track) btn.classList.add('active');
  });
  filteredDeals = track === 'all' ? [...allDeals] : allDeals.filter(d => d.industry === track);
  renderDealsList();
  updateDealsCount();
}
function updateDealsCount() {
  const el = document.getElementById('deals-count');
  if (el) el.textContent = currentFilter === 'all' ? '共 ' + allDeals.length + ' 个标的' : '显示 ' + filteredDeals.length + ' / ' + allDeals.length + ' 个标的';
}
function renderDealsList() {
  const listEl = document.getElementById('deals-list');
  if (!listEl) return;
  if (!filteredDeals.length) {
    listEl.innerHTML = '<div class="text-center py-8 text-gray-400 col-span-3"><i class="fas fa-inbox text-2xl mb-2"></i><p>暂无符合条件的标的</p></div>';
    return;
  }
  listEl.innerHTML = filteredDeals.map(deal => {
    const trackColor = trackColorMap[deal.industry] || '#6B7280';
    const trackIcon  = trackIconMap[deal.industry] || 'fas fa-building';
    const trackName  = trackNameMap[deal.industry] || deal.industry;
    const isSelected = selectedDeal?.id === deal.id;
    let financialHighlights = {};
    try {
      const fd = typeof deal.financial_data === 'string' ? JSON.parse(deal.financial_data) : deal.financial_data;
      if (fd) financialHighlights = {
        roi: fd.profit_distribution?.investor_return?.roi || fd.investor_return?.roi,
        irr: fd.profit_distribution?.investor_return?.irr_estimate || fd.investor_return?.irr_estimate,
        payback: fd.profit_distribution?.investor_return?.payback_months || fd.investor_return?.payback_months
      };
    } catch(e) {}
    return '<div class="deal-card p-3 border rounded-lg hover:shadow-md transition-all cursor-pointer ' + (isSelected ? 'selected border-2' : 'border-gray-200') + '" ' +
      'data-deal-id="' + deal.id + '" onclick="selectDeal(\'' + deal.id + '\')">' +
      '<div class="flex items-start justify-between mb-2">' +
      '<div class="flex items-center space-x-2">' +
      '<div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:' + trackColor + '20">' +
      '<i class="' + trackIcon + ' text-sm" style="color:' + trackColor + '"></i></div>' +
      '<div><h4 class="font-medium text-sm text-gray-800 line-clamp-1">' + deal.company_name + '</h4>' +
      '<p class="text-xs text-gray-500">' + deal.id + '</p></div></div>' +
      '<div class="deal-check hidden w-5 h-5 rounded-full items-center justify-center flex-shrink-0" style="background:var(--primary-500)">' +
      '<i class="fas fa-check text-white text-xs"></i></div></div>' +
      '<div class="flex items-center justify-between text-xs">' +
      '<span class="px-2 py-0.5 rounded-full" style="background:' + trackColor + '20; color:' + trackColor + '">' + trackName + '</span>' +
      '<span class="text-gray-500">' + deal.funding_amount + '万</span></div>' +
      (financialHighlights.roi ? '<div class="mt-2 pt-2 border-t border-gray-100 flex justify-between text-xs text-gray-500">' +
        '<span>ROI: ' + (financialHighlights.roi*100).toFixed(0) + '%</span>' +
        (financialHighlights.payback ? '<span>回收期: ' + financialHighlights.payback + '月</span>' : '') + '</div>' : '') +
      '</div>';
  }).join('');
}
function selectDeal(dealId) {
  selectedDeal = allDeals.find(d => d.id === dealId);
  if (!selectedDeal) return;
  currentDealIndustry = selectedDeal.industry;
  renderDealsList();
  updateDealInfo();
  // 重新加载智能体（按新赛道过滤内环）
  loadEvaluationAgents();
  if (!isRunning) resetEvaluationState();
  showToast('已选择: ' + selectedDeal.company_name, 'success');
}
function updateDealInfo() {
  if (!selectedDeal) return;
  const trackColor = trackColorMap[selectedDeal.industry] || '#6B7280';
  const trackIcon  = trackIconMap[selectedDeal.industry] || 'fas fa-building';
  const trackName  = trackNameMap[selectedDeal.industry] || selectedDeal.industry;
  document.getElementById('deal-name').textContent = selectedDeal.company_name;
  document.getElementById('deal-sub').textContent  = trackName + ' · ' + selectedDeal.id;
  document.getElementById('deal-avatar').innerHTML = '<i class="' + trackIcon + ' text-white"></i>';
  let fd = {};
  try { fd = typeof selectedDeal.financial_data === 'string' ? JSON.parse(selectedDeal.financial_data) : selectedDeal.financial_data || {}; } catch(e){}
  const investorReturn = fd.profit_distribution?.investor_return || fd.investor_return || {};
  const revenue = fd.revenue_forecast?.total || fd.revenue_forecast || 0;
  const infoEl = document.getElementById('deal-info');
  infoEl.innerHTML = '<div class="space-y-3 text-sm">' +
    '<div class="flex justify-between"><span class="text-gray-500">公司名称</span><span class="font-medium text-xs text-right max-w-28 line-clamp-2">' + selectedDeal.company_name + '</span></div>' +
    '<div class="flex justify-between"><span class="text-gray-500">行业赛道</span><span class="font-medium">' + trackName + '</span></div>' +
    '<div class="flex justify-between"><span class="text-gray-500">投资金额</span><span class="font-medium" style="color:var(--primary-500)">' + selectedDeal.funding_amount + '万</span></div>' +
    (investorReturn.irr_estimate ? '<div class="flex justify-between"><span class="text-gray-500">预期IRR</span><span class="font-medium text-green-600">' + (investorReturn.irr_estimate*100).toFixed(0) + '%</span></div>' : '') +
    (revenue ? '<div class="flex justify-between"><span class="text-gray-500">预计收入</span><span>' + revenue + '万</span></div>' : '') +
    (investorReturn.roi ? '<div class="flex justify-between"><span class="text-gray-500">预期ROI</span><span>' + (investorReturn.roi*100).toFixed(0) + '%</span></div>' : '') +
    (investorReturn.payback_months ? '<div class="flex justify-between"><span class="text-gray-500">回收期</span><span>' + investorReturn.payback_months + '个月</span></div>' : '') +
    '</div>';
  const trackBadge = document.getElementById('inner-track-badge');
  if (trackBadge) { trackBadge.textContent = trackName; trackBadge.style.background = trackColor+'20'; trackBadge.style.color = trackColor; }
}

// ==========================================================
// 智能体管理
// ==========================================================
async function loadProfiles() {
  try {
    const data = await apiCall('/api/agents/profiles');
    allProfiles = data.data || [];
    // 如果有之前选中的方案，保持；否则用默认方案
    if (!activeProfileId) {
      const def = allProfiles.find(p => p.is_default);
      activeProfileId = def ? def.id : (allProfiles[0]?.id || null);
    }
    renderProfileSelector();
    loadEvaluationAgents();
    updateAgentsLinks();
  } catch(e) { console.error('加载方案列表失败:', e); loadEvaluationAgents(); }
}

function renderProfileSelector() {
  const container = document.getElementById('profile-selector');
  if (!container || !allProfiles.length) return;

  container.innerHTML = allProfiles.map(p => {
    const isActive = p.id === activeProfileId;
    const outer = p.agents.filter(a => a.ring_type === 'outer').length;
    const inner = p.agents.filter(a => a.ring_type === 'inner').length;
    const enabled = p.agents.filter(a => a.enabled !== false).length;

    return '<div onclick="switchProfile(\'' + p.id + '\')" ' +
      'class="relative flex-shrink-0 w-56 rounded-xl p-4 border-2 cursor-pointer transition-all duration-200 ' +
      (isActive
        ? 'border-teal-500 bg-teal-50 shadow-md shadow-teal-100 ring-2 ring-teal-200'
        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm') + '">' +
      // 默认角标
      (p.is_default ? '<div class="absolute -top-1 -right-1 bg-teal-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-bl-lg rounded-tr-lg"><i class="fas fa-star mr-0.5"></i>默认</div>' : '') +
      // 选中勾
      (isActive ? '<div class="absolute top-2 right-2 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center"><i class="fas fa-check text-white text-xs"></i></div>' : '') +
      // 图标和名称
      '<div class="flex items-center space-x-2.5 mb-3">' +
      '<div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background:' + (p.icon_color || '#5DC4B3') + '20">' +
      '<i class="' + (p.icon || 'fas fa-robot') + ' text-lg" style="color:' + (p.icon_color || '#5DC4B3') + '"></i></div>' +
      '<div class="min-w-0">' +
      '<h4 class="font-semibold text-sm text-gray-800 truncate">' + p.name + '</h4>' +
      '<p class="text-[10px] text-gray-400 line-clamp-1">' + (p.description || '暂无描述') + '</p>' +
      '</div></div>' +
      // 统计数据
      '<div class="grid grid-cols-3 gap-1.5 text-center">' +
      '<div class="rounded-lg py-1.5" style="background:#FEF2F2"><p class="text-sm font-bold text-red-600">' + outer + '</p><p class="text-[9px] text-gray-500">外环</p></div>' +
      '<div class="rounded-lg py-1.5" style="background:#EFF6FF"><p class="text-sm font-bold text-blue-600">' + inner + '</p><p class="text-[9px] text-gray-500">中环</p></div>' +
      '<div class="rounded-lg py-1.5" style="background:#F0FDF4"><p class="text-sm font-bold text-emerald-600">' + enabled + '</p><p class="text-[9px] text-gray-500">启用</p></div>' +
      '</div></div>';
  }).join('');
}

function switchProfile(profileId) {
  activeProfileId = profileId;
  renderProfileSelector();
  loadEvaluationAgents();
  updateAgentsLinks();
  showToast('已切换方案', 'success');
}

async function loadEvaluationAgents() {
  try {
    // 如果有选中的方案，从该方案加载；否则用默认 /api/agents
    const url = activeProfileId ? '/api/agents/by-profile/' + activeProfileId : '/api/agents';
    const data = await apiCall(url);
    evaluationAgents = data.data || data || [];
    filteredOuterAgents = evaluationAgents.filter(a => a.ring_type === 'outer' && a.enabled !== false);
    // 内环：如果已选标的则按赛道过滤，否则显示所有
    const industry = currentDealIndustry || 'all';
    filteredInnerAgents = evaluationAgents.filter(a =>
      a.ring_type === 'inner' &&
      a.enabled !== false &&
      a.id !== 'comprehensive-scoring-agent' &&
      (industry === 'all' || a.industry === industry || a.industry === 'all')
    );
    // 统计
    const agentCountEl = document.getElementById('stat-agent-count');
    if (agentCountEl) agentCountEl.textContent = evaluationAgents.filter(a => a.enabled !== false).length;
    renderAgentCards();
    updateInnerAgentCount();
    // 激活外环和中环区域的基础外观
    const outerSection = document.getElementById('outer-section');
    const innerSection = document.getElementById('inner-section');
    if (outerSection && filteredOuterAgents.length > 0) {
      outerSection.classList.remove('opacity-40', 'border-dashed');
      outerSection.classList.add('border-solid');
    }
    if (innerSection && filteredInnerAgents.length > 0) {
      innerSection.classList.remove('opacity-40', 'border-dashed');
      innerSection.classList.add('border-solid');
    }
    // 综合评分区域保持等待状态直到评估完成
    const finalSection = document.getElementById('final-section');
    if (finalSection && !isRunning) {
      // 保持半透明，等评估时再激活
    }
  } catch(e) { console.error('加载智能体失败:', e); }
}
function updateInnerAgentCount() {
  const el = document.getElementById('inner-agent-count');
  if (el && filteredInnerAgents.length > 0) {
    const g = filteredInnerAgents.filter(a => a.industry === 'all').length;
    const t = filteredInnerAgents.filter(a => a.industry !== 'all').length;
    el.innerHTML = '<i class="fas fa-robot mr-1"></i> 通用 ' + g + ' + 专属 ' + t;
  }
}
function renderAgentCards() {
  document.getElementById('outer-agents').innerHTML = filteredOuterAgents.map(agent =>
    '<div id="agent-' + agent.id + '" class="border rounded-lg overflow-hidden transition-all duration-300">' +
    '<div class="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100" onclick="toggleAgentDetail(\'' + agent.id + '\')">' +
    '<div class="flex items-center space-x-3">' +
    '<div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background:' + agent.icon_color + '20">' +
    '<i class="' + agent.icon + '" style="color:' + agent.icon_color + '"></i></div>' +
    '<div><h4 class="font-medium">' + agent.name + '</h4>' +
    '<p class="text-xs text-gray-500">' + agent.dimension + ' · 阈值 ' + agent.pass_threshold + '分</p></div></div>' +
    '<div class="flex items-center space-x-3">' +
    '<div id="progress-' + agent.id + '" class="w-24 h-2 bg-gray-200 rounded-full overflow-hidden hidden"><div class="h-full transition-all duration-1000" style="width:0%; background:var(--primary-500)"></div></div>' +
    '<span id="score-' + agent.id + '" class="font-mono text-lg font-bold text-gray-400">--</span>' +
    '<span id="status-' + agent.id + '" class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"><i class="fas fa-minus text-gray-400 text-xs"></i></span>' +
    '<i id="expand-icon-' + agent.id + '" class="fas fa-chevron-down text-gray-400 text-sm transition-transform"></i>' +
    '</div></div>' +
    '<div id="detail-' + agent.id + '" class="hidden border-t bg-white"><div class="p-4"><div id="steps-' + agent.id + '" class="space-y-2">' +
    '<div class="flex items-center space-x-2 text-gray-400 text-sm"><i class="fas fa-hourglass-start"></i><span>等待执行...</span></div>' +
    '</div></div></div></div>'
  ).join('');

  document.getElementById('inner-agents').innerHTML = filteredInnerAgents.map(agent => {
    const isGeneral = agent.industry === 'all';
    const tagClass = isGeneral ? 'bg-blue-100 text-blue-600' : 'bg-teal-100 text-teal-600';
    const tagText  = isGeneral ? '通用' : '专属';
    return '<div id="agent-' + agent.id + '" class="border rounded-lg overflow-hidden transition-all duration-300">' +
      '<div class="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100" onclick="toggleAgentDetail(\'' + agent.id + '\')">' +
      '<div class="flex items-center space-x-2">' +
      '<div class="w-8 h-8 rounded flex items-center justify-center" style="background:' + agent.icon_color + '20">' +
      '<i class="' + agent.icon + ' text-sm" style="color:' + agent.icon_color + '"></i></div>' +
      '<div><div class="flex items-center space-x-2"><h4 class="font-medium text-sm">' + agent.name.replace('智能体','') + '</h4>' +
      '<span class="text-xs px-1.5 py-0.5 rounded ' + tagClass + '">' + tagText + '</span></div>' +
      '<p class="text-xs text-gray-500">权重 ' + agent.weight + '%</p></div></div>' +
      '<div class="flex items-center space-x-2">' +
      '<span id="score-' + agent.id + '" class="font-mono font-bold text-gray-400">--</span>' +
      '<span id="status-' + agent.id + '" class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center"><i class="fas fa-minus text-gray-400 text-xs"></i></span>' +
      '<i id="expand-icon-' + agent.id + '" class="fas fa-chevron-down text-gray-400 text-xs transition-transform"></i>' +
      '</div></div>' +
      '<div id="detail-' + agent.id + '" class="hidden border-t bg-white"><div class="p-3"><div id="steps-' + agent.id + '" class="space-y-2">' +
      '<div class="flex items-center space-x-2 text-gray-400 text-sm"><i class="fas fa-hourglass-start"></i><span>等待执行...</span></div>' +
      '</div></div></div></div>';
  }).join('');
}

// ==========================================================
// 评估流程
// ==========================================================
async function startEvaluation() {
  if (!selectedDeal) { showToast('请先选择要评估的标的项目','error'); return; }
  if (isRunning) return;
  isRunning = true;
  evaluationResults = {};
  const currentDealId = selectedDeal.id;
  document.getElementById('btn-start').disabled = true;
  document.getElementById('btn-start').innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>评估中...';
  document.getElementById('overall-status').textContent = '正在评估 ' + selectedDeal.company_name + '...';
  document.getElementById('recommendation-section').classList.add('hidden');
  document.getElementById('improvement-section').classList.add('hidden');
  try {
    // 步骤2：外环
    updateStep(2, 'active');
    const outerSection = document.getElementById('outer-section');
    outerSection.classList.remove('opacity-40','border-dashed','border-gray-200');
    outerSection.classList.add('border-solid','border-red-300','ring-2','ring-red-100');
    document.getElementById('outer-step-badge').className = 'ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded animate-pulse';
    document.getElementById('outer-step-badge').textContent = '执行中';
    document.getElementById('outer-status').innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>串行执行中...';
    document.getElementById('outer-status').className = 'text-sm text-red-600 font-medium';

    for (const agentId of filteredOuterAgents.map(a => a.id)) {
      updateAgentStatus(agentId, 'running');
      const response = await apiCall(API_BASE + '/ai/evaluate', {
        method: 'POST', body: JSON.stringify({ agentId, dealId: currentDealId })
      });
      await sleep(500);
      const pass  = response.data.pass;
      const score = response.data.result?.score || 0;
      evaluationResults[agentId] = response.data;
      updateAgentStatus(agentId, pass ? 'pass' : 'fail', score, response.data.result);
      if (!pass) {
        document.getElementById('outer-status').innerHTML = '<i class="fas fa-times-circle mr-1"></i>未通过';
        document.getElementById('outer-status').className = 'text-sm text-red-600 font-medium';
        document.getElementById('outer-step-badge').className = 'ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded';
        document.getElementById('outer-step-badge').textContent = '已否决';
        outerSection.classList.remove('ring-2','ring-red-100');
        outerSection.classList.add('border-red-500');
        updateStep(2, 'error');
        document.getElementById('overall-status').textContent = '外环漏斗体系未通过 - 一票否决';
        showToast('外环漏斗体系未通过，项目被否决','error');
        generateImprovementSuggestions();
        return;
      }
    }
    document.getElementById('outer-status').innerHTML = '<i class="fas fa-check-circle mr-1"></i>全部通过';
    document.getElementById('outer-status').className = 'text-sm text-green-600 font-medium';
    document.getElementById('outer-step-badge').className = 'ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded';
    document.getElementById('outer-step-badge').textContent = '已完成';
    outerSection.classList.remove('ring-2','ring-red-100','border-red-300');
    outerSection.classList.add('border-green-300');
    updateStep(2, 'complete');

    // 步骤3：中环
    updateStep(3, 'active');
    const innerSection = document.getElementById('inner-section');
    innerSection.classList.remove('opacity-40','border-dashed','border-gray-200');
    innerSection.classList.add('border-solid','ring-2','ring-green-100');
    innerSection.style.borderColor = '#3D8F83';
    document.getElementById('inner-step-badge').className = 'ml-2 text-xs bg-teal-500 text-white px-2 py-0.5 rounded animate-pulse';
    document.getElementById('inner-step-badge').textContent = '执行中';
    document.getElementById('inner-status').innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>并行评估中...';
    document.getElementById('inner-status').className = 'text-sm text-teal-600 font-medium';

    const innerAgentIds = filteredInnerAgents.map(a => a.id);
    innerAgentIds.forEach(id => updateAgentStatus(id, 'running'));
    const innerResults = await Promise.all(innerAgentIds.map(async agentId => {
      const response = await apiCall(API_BASE + '/ai/evaluate', {
        method: 'POST', body: JSON.stringify({ agentId, dealId: currentDealId })
      });
      return { agentId, ...response.data };
    }));
    const scores = {};
    innerResults.forEach(r => {
      const score = r.result?.score || 0;
      scores[r.agentId] = score;
      evaluationResults[r.agentId] = r;
      updateAgentStatus(r.agentId, r.pass ? 'pass' : 'fail', score, r.result);
    });
    document.getElementById('inner-status').innerHTML = '<i class="fas fa-check-circle mr-1"></i>评估完成';
    document.getElementById('inner-status').className = 'text-sm text-green-600 font-medium';
    document.getElementById('inner-step-badge').className = 'ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded';
    document.getElementById('inner-step-badge').textContent = '已完成';
    innerSection.classList.remove('ring-2','ring-green-100');
    innerSection.style.borderColor = '';
    innerSection.classList.add('border-green-300');
    updateStep(3, 'complete');

    // 步骤4：综合评分
    updateStep(4, 'active');
    const finalSection = document.getElementById('final-section');
    finalSection.classList.remove('opacity-40','border-dashed','border-gray-200');
    finalSection.classList.add('border-solid','ring-2','ring-emerald-100');
    finalSection.style.borderColor = 'var(--primary-500)';
    document.getElementById('final-step-badge').className = 'ml-2 text-xs text-white px-2 py-0.5 rounded animate-pulse';
    document.getElementById('final-step-badge').style.background = 'var(--primary-500)';
    document.getElementById('final-step-badge').textContent = '计算中';
    document.getElementById('final-status').innerHTML = '<i class="fas fa-calculator fa-spin mr-1"></i>计算综合评分...';
    document.getElementById('final-status').className = 'text-sm font-medium';
    document.getElementById('final-status').style.color = 'var(--primary-500)';

    const weights = {};
    filteredInnerAgents.forEach(a => { weights[a.id] = a.weight || 10; });
    let weightedSum = 0, totalWeight = 0;
    Object.keys(weights).forEach(id => { weightedSum += (scores[id] || 0) * weights[id]; totalWeight += weights[id]; });
    const finalScore = Math.round(weightedSum / totalWeight * 10) / 10;

    let grade = 'D', gradeColor = 'red';
    if (finalScore >= 85) { grade = 'A'; gradeColor = 'green'; }
    else if (finalScore >= 75) { grade = 'B+'; gradeColor = 'emerald'; }
    else if (finalScore >= 65) { grade = 'B'; gradeColor = 'blue'; }
    else if (finalScore >= 60) { grade = 'C'; gradeColor = 'yellow'; }

    updateRadarChart(scores);

    document.getElementById('final-details').innerHTML =
      '<div class="text-center">' +
      '<div class="text-5xl font-bold text-' + gradeColor + '-600 mb-2">' + finalScore + '</div>' +
      '<div class="text-2xl font-bold text-' + gradeColor + '-500">' + grade + '级</div>' +
      '<p class="text-gray-500 mt-2">' + (grade==='A'?'强烈推荐投资':grade==='B+'?'推荐投资':grade==='B'?'可以投资':'谨慎投资') + '</p></div>' +
      '<div class="space-y-2 mt-4">' +
      Object.entries(scores).map(([id,score]) => {
        const agent = evaluationAgents.find(a => a.id === id);
        return '<div class="flex justify-between text-sm"><span class="text-gray-600">' + (agent?.dimension||id) + '</span><span class="font-mono font-medium">' + score + '</span></div>';
      }).join('') + '</div>' +
      '<div class="mt-4 pt-4 border-t"><p class="text-xs text-gray-500 mb-2"><i class="fas fa-calculator mr-1"></i>加权计算</p>' +
      '<div class="text-xs text-gray-400 space-y-1">' +
      Object.entries(weights).map(([id,weight]) => {
        const agent = evaluationAgents.find(a => a.id === id);
        return '<div>' + (agent?.dimension||id) + ': ' + (scores[id]||0) + ' × ' + weight + '%</div>';
      }).join('') +
      '<div class="font-medium text-gray-600 mt-2">= ' + finalScore + ' 分</div></div></div>';

    document.getElementById('final-status').innerHTML = '<i class="fas fa-check-circle mr-1"></i>评分完成';
    document.getElementById('final-status').className = 'text-sm text-green-600 font-medium';
    document.getElementById('final-status').style.color = '';
    document.getElementById('final-step-badge').className = 'ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded';
    document.getElementById('final-step-badge').style.background = '';
    document.getElementById('final-step-badge').textContent = '已完成';
    finalSection.classList.remove('ring-2','ring-emerald-100');
    finalSection.style.borderColor = '';
    finalSection.classList.add('border-green-300');
    updateStep(4, 'complete');

    // 投资建议
    const recSection = document.getElementById('recommendation-section');
    recSection.classList.remove('hidden');
    document.getElementById('rec-title').textContent = grade==='A'||grade==='B+' ? '✅ 建议投资' : grade==='B' ? '⚠️ 可考虑投资' : '❌ 建议谨慎';
    document.getElementById('rec-detail').textContent = selectedDeal.company_name + ' 整体评估' + (finalScore >= 65 ? '良好' : '存在风险') + '。';
    document.getElementById('rec-score').textContent = finalScore;
    document.getElementById('rec-grade').textContent = grade + '级';

    const strengths = [], risks = [];
    Object.values(evaluationResults).forEach(r => {
      if (r.result?.findings) r.result.findings.forEach(f => {
        const t = formatFinding(f);
        if (t.includes('优')||t.includes('强')||t.includes('好')||t.includes('完善')||t.includes('齐全')) { if (strengths.length<4) strengths.push(t); }
        else if (t.includes('风险')||t.includes('缺')||t.includes('不足')||t.includes('需要')) { if (risks.length<4) risks.push(t); }
      });
    });
    document.getElementById('rec-strengths').innerHTML = (strengths.length>0?strengths:['数据完整','团队经验丰富','模式清晰']).slice(0,3).map(s=>'<li>• '+(s.length>40?s.substring(0,40)+'...':s)+'</li>').join('');
    document.getElementById('rec-risks').innerHTML = (risks.length>0?risks:['需持续关注运营数据','市场竞争风险','政策变动风险']).slice(0,3).map(r=>'<li>• '+(r.length>40?r.substring(0,40)+'...':r)+'</li>').join('');

    generateImprovementSuggestions();
    document.getElementById('overall-status').textContent = '评估完成';
    showToast('评估完成！综合评分：' + finalScore + '分', 'success');
  } catch(error) {
    showToast('评估出错：' + error.message, 'error');
    document.getElementById('overall-status').textContent = '评估出错';
  } finally {
    isRunning = false;
    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-start').innerHTML = '<i class="fas fa-play mr-2"></i>重新评估';
  }
}

function resetEvaluationState() {
  evaluationResults = {};
  for (let i=2; i<=4; i++) {
    const el = document.getElementById('step-'+i);
    if (el) {
      el.classList.add('opacity-50');
      const d = el.querySelector('div');
      if (d) { d.className='w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold'; d.textContent=i; d.style.background=''; }
    }
  }
  // 重置评估相关样式（去除边框高亮等）
  ['outer-section','inner-section','final-section'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('border-solid','border-red-300','border-green-300','ring-2','ring-red-100','ring-green-100','ring-emerald-100','border-red-500');
      el.style.borderColor = '';
    }
  });
  // 外环/中环如果有智能体加载过，保持可见但显示等待状态；综合评分区域保持灰化
  const outerSection = document.getElementById('outer-section');
  const innerSection = document.getElementById('inner-section');
  const finalSection = document.getElementById('final-section');
  if (outerSection && filteredOuterAgents.length > 0) {
    outerSection.classList.remove('opacity-40','border-dashed');
    outerSection.classList.add('border-solid','border-gray-200');
  } else if (outerSection) {
    outerSection.classList.add('opacity-40','border-dashed','border-gray-200');
  }
  if (innerSection && filteredInnerAgents.length > 0) {
    innerSection.classList.remove('opacity-40','border-dashed');
    innerSection.classList.add('border-solid','border-gray-200');
  } else if (innerSection) {
    innerSection.classList.add('opacity-40','border-dashed','border-gray-200');
  }
  if (finalSection) {
    finalSection.classList.add('opacity-40','border-dashed','border-gray-200');
  }
  document.getElementById('outer-status').innerHTML = '<i class="fas fa-clock mr-1"></i>等待开始';
  document.getElementById('outer-status').className = 'text-sm text-gray-500 flex items-center';
  document.getElementById('inner-status').innerHTML = '<i class="fas fa-lock mr-1"></i>等待外环漏斗体系完成';
  document.getElementById('inner-status').className = 'text-sm text-gray-400 flex items-center';
  document.getElementById('final-status').innerHTML = '<i class="fas fa-lock mr-1"></i>等待评估完成';
  document.getElementById('final-status').className = 'text-sm text-gray-400 flex items-center';
  document.getElementById('final-status').style.color = '';
  ['outer-step-badge','inner-step-badge','final-step-badge'].forEach((id,i) => {
    const el = document.getElementById(id);
    if (el) { el.className='ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded'; el.style.background=''; el.textContent='第'+(i+1)+'步'; }
  });
  document.getElementById('recommendation-section').classList.add('hidden');
  document.getElementById('improvement-section').classList.add('hidden');
  document.getElementById('final-details').innerHTML = '<div class="text-center py-8 text-gray-400"><i class="fas fa-chart-pie text-4xl mb-2"></i><p>评估完成后显示结果</p></div>';
  if (radarChart) { radarChart.destroy(); radarChart=null; }
  document.getElementById('overall-status').textContent = '准备就绪';
}

// ==========================================================
// UI 辅助函数
// ==========================================================
function toggleAgentDetail(agentId) {
  const d = document.getElementById('detail-'+agentId);
  const i = document.getElementById('expand-icon-'+agentId);
  if (d.classList.contains('hidden')) { d.classList.remove('hidden'); i?.classList.add('rotate-180'); }
  else { d.classList.add('hidden'); i?.classList.remove('rotate-180'); }
}
function toggleAllDetails() {
  allExpanded = !allExpanded;
  document.querySelectorAll('[id^="detail-"]').forEach(el => { if (!el.id.includes('modal')) el.classList.toggle('hidden',!allExpanded); });
  document.querySelectorAll('[id^="expand-icon-"]').forEach(ic => ic.classList.toggle('rotate-180', allExpanded));
  document.getElementById('toggle-all-text').textContent = allExpanded ? '收起全部' : '展开全部';
}
function updateStep(step, status) {
  const el = document.getElementById('step-'+step);
  const lineEl = document.getElementById('line-'+(step-1));
  if (!el) return;
  if (status==='active') {
    el.classList.remove('opacity-50');
    el.querySelector('div').className='w-8 h-8 rounded-full text-white flex items-center justify-center font-bold';
    el.querySelector('div').style.background='var(--primary-500)';
    if (lineEl) { lineEl.style.background='var(--primary-500)'; }
  } else if (status==='complete') {
    el.querySelector('div').className='w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold';
    el.querySelector('div').style.background='';
    el.querySelector('div').innerHTML='<i class="fas fa-check"></i>';
  } else if (status==='error') {
    el.querySelector('div').className='w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center font-bold';
    el.querySelector('div').style.background='';
    el.querySelector('div').innerHTML='<i class="fas fa-times"></i>';
  }
}
function updateAgentStatus(agentId, status, score=null, result=null) {
  const statusEl = document.getElementById('status-'+agentId);
  const scoreEl  = document.getElementById('score-'+agentId);
  const progressEl = document.getElementById('progress-'+agentId);
  const cardEl   = document.getElementById('agent-'+agentId);
  if (!statusEl) return;
  if (status==='running') {
    statusEl.innerHTML='<i class="fas fa-spinner fa-spin text-xs" style="color:var(--primary-500)"></i>';
    statusEl.className='w-6 h-6 rounded-full flex items-center justify-center';
    statusEl.style.background='var(--primary-100, #E0E7FF)';
    cardEl?.classList.add('ring-2');
    cardEl && (cardEl.style.outlineColor='var(--primary-300)');
    if (progressEl) { progressEl.classList.remove('hidden'); progressEl.querySelector('div').style.width='30%'; setTimeout(()=>progressEl.querySelector('div').style.width='70%',500); }
    updateAgentSteps(agentId,'running');
  } else if (status==='pass') {
    statusEl.innerHTML='<i class="fas fa-check text-white text-xs"></i>';
    statusEl.className='w-6 h-6 rounded-full bg-green-500 flex items-center justify-center';
    statusEl.style.background='';
    cardEl?.classList.remove('ring-2'); cardEl?.classList.add('border-green-300');
    if (progressEl) progressEl.querySelector('div').style.width='100%';
    if (score!==null) { scoreEl.textContent=score; scoreEl.className='font-mono text-lg font-bold text-green-600'; }
    updateAgentSteps(agentId,'pass',result);
    const d=document.getElementById('detail-'+agentId), ic=document.getElementById('expand-icon-'+agentId);
    if (d) { d.classList.remove('hidden'); ic?.classList.add('rotate-180'); }
  } else if (status==='fail') {
    statusEl.innerHTML='<i class="fas fa-times text-white text-xs"></i>';
    statusEl.className='w-6 h-6 rounded-full bg-red-500 flex items-center justify-center';
    statusEl.style.background='';
    cardEl?.classList.remove('ring-2'); cardEl?.classList.add('border-red-300');
    if (score!==null) { scoreEl.textContent=score; scoreEl.className='font-mono text-lg font-bold text-red-600'; }
    updateAgentSteps(agentId,'fail',result);
    const d=document.getElementById('detail-'+agentId), ic=document.getElementById('expand-icon-'+agentId);
    if (d) { d.classList.remove('hidden'); ic?.classList.add('rotate-180'); }
  }
}
function updateAgentSteps(agentId, status, result=null) {
  const el = document.getElementById('steps-'+agentId);
  if (!el) return;
  if (status==='running') {
    el.innerHTML='<div class="space-y-3"><div class="flex items-start space-x-3">' +
      '<div class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style="background:var(--primary-100,#E0E7FF)">' +
      '<i class="fas fa-spinner fa-spin text-xs" style="color:var(--primary-500)"></i></div>' +
      '<div><p class="font-medium" style="color:var(--primary-700,#4338CA)">正在执行评估...</p>' +
      '<p class="text-sm text-gray-500 mt-1">AI智能体正在分析项目材料</p></div></div></div>';
  } else {
    const isPassed = status==='pass';
    const reasoning = getFullReasoning(result);
    const recommendation = getFullRecommendation(result);
    const findings = result?.findings || [];
    const riskLevel = result?.risk_level || 'medium';
    const score = result?.score || 0;
    const riskMap = { low:{text:'低风险',color:'green',icon:'shield-alt'}, medium:{text:'中风险',color:'yellow',icon:'exclamation-triangle'}, high:{text:'高风险',color:'red',icon:'exclamation-circle'} };
    const riskInfo = riskMap[riskLevel] || riskMap.medium;
    const reasoningPreview = reasoning.length>200 ? reasoning.substring(0,200)+'...' : reasoning;
    const recPreview = recommendation && recommendation.length>150 ? recommendation.substring(0,150)+'...' : recommendation;
    el.innerHTML='<div class="space-y-4">' +
      '<div class="flex items-start space-x-3">' +
      '<div class="w-6 h-6 rounded-full '+(isPassed?'bg-green-100':'bg-red-100')+' flex items-center justify-center flex-shrink-0 mt-0.5">' +
      '<i class="fas '+(isPassed?'fa-check text-green-500':'fa-times text-red-500')+' text-xs"></i></div>' +
      '<div class="flex-1"><div class="flex items-center justify-between">' +
      '<p class="font-medium '+(isPassed?'text-green-700':'text-red-700')+'">'+(isPassed?'✓ 评估通过':'✗ 评估未通过')+'</p>' +
      '<div class="flex items-center space-x-2">' +
      '<span class="px-2 py-0.5 rounded text-xs bg-'+riskInfo.color+'-100 text-'+riskInfo.color+'-700"><i class="fas fa-'+riskInfo.icon+' mr-1"></i>'+riskInfo.text+'</span>' +
      '<span class="font-mono font-bold '+(isPassed?'text-green-600':'text-red-600')+'">'+score+'分</span></div></div></div></div>' +
      '<div class="ml-9 space-y-3">' +
      '<div class="bg-teal-50 rounded-lg p-3 cursor-pointer hover:bg-teal-100 transition" onclick="showReasoningPopup(\''+agentId+'\',\'reasoning\')">' +
      '<div class="flex items-center justify-between mb-2">' +
      '<span class="font-medium text-sm text-teal-700 flex items-center"><i class="fas fa-brain mr-2"></i>AI推理过程</span>' +
      '<span class="text-xs text-teal-500">点击查看完整内容 <i class="fas fa-external-link-alt ml-1"></i></span></div>' +
      '<div class="text-sm text-gray-600 line-clamp-3">'+reasoningPreview+'</div></div>' +
      (findings.length>0 ? '<div class="bg-amber-50 rounded-lg p-3"><div class="flex items-center space-x-2 mb-2"><i class="fas fa-search text-amber-500"></i><span class="font-medium text-sm text-gray-700">检查发现</span></div>' +
        '<ul class="space-y-1 text-sm">' + findings.slice(0,3).map(f=>'<li class="flex items-start space-x-2"><i class="fas '+getFindingIcon(f)+' mt-0.5 text-xs"></i><span class="text-gray-600">'+formatFinding(f)+'</span></li>').join('') +
        (findings.length>3?'<li class="text-gray-400 text-xs ml-4">...还有 '+(findings.length-3)+' 项</li>':'')+'</ul></div>' : '') +
      (recommendation ? '<div class="bg-blue-50 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition" onclick="showReasoningPopup(\''+agentId+'\',\'recommendation\')">' +
        '<div class="flex items-center justify-between mb-2"><span class="font-medium text-sm text-blue-700 flex items-center"><i class="fas fa-lightbulb mr-2"></i>评估建议</span>' +
        '<span class="text-xs text-blue-500">点击查看完整内容 <i class="fas fa-external-link-alt ml-1"></i></span></div>' +
        '<div class="text-sm text-gray-600 line-clamp-2">'+recPreview+'</div></div>' : '') +
      '</div>' +
      '<div class="ml-9 pt-2 flex space-x-3">' +
      '<button onclick="showFullReport(\''+agentId+'\')" class="text-sm flex items-center space-x-1" style="color:var(--primary-600,#49A89A)"><i class="fas fa-file-alt"></i><span>完整报告</span></button>' +
      '<button onclick="showReasoningPopup(\''+agentId+'\',\'raw\')" class="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1"><i class="fas fa-code"></i><span>原始数据</span></button>' +
      '</div></div>';
  }
}
function updateRadarChart(scores) {
  const ctx = document.getElementById('radar-chart').getContext('2d');
  if (radarChart) radarChart.destroy();
  const labels = filteredInnerAgents.map(a => a.dimension || a.name.replace('智能体',''));
  const data   = filteredInnerAgents.map(a => scores[a.id] || 0);
  radarChart = new Chart(ctx, {
    type: 'radar',
    data: { labels, datasets: [{ label:'评分', data, fill:true, backgroundColor:'rgba(93,196,179,0.15)', borderColor:'#5DC4B3', pointBackgroundColor:'#5DC4B3', pointBorderColor:'#fff' }] },
    options: { scales:{ r:{ beginAtZero:true, max:100, ticks:{ stepSize:20 } } }, plugins:{ legend:{ display:false } } }
  });
}

// ==========================================================
// 辅助函数
// ==========================================================
function getFullReasoning(result) {
  if (result?._raw_response) {
    const m = result._raw_response.match(/"reasoning"\\s*:\\s*"([\\s\\S]*?)(?:"\\s*[,}]|"$)/);
    if (m && m[1] && m[1].length>50) return m[1].replace(/\\\\n/g,'\\n').replace(/\\\\"/g,'"');
  }
  return result?.reasoning || result?.rationale || result?.assessment || '暂无详细推理内容';
}
function getFullRecommendation(result) {
  if (result?._raw_response) {
    const m = result._raw_response.match(/"recommendation"\\s*:\\s*"([\\s\\S]*?)(?:"\\s*[,}]|"$)/);
    if (m && m[1] && m[1].length>10) return m[1].replace(/\\\\n/g,'\\n').replace(/\\\\"/g,'"');
  }
  return result?.recommendation || '';
}
function formatFinding(f) {
  if (typeof f==='string') return f;
  if (f?.item && f?.detail) return '【'+f.item+'】'+f.detail;
  if (f?.detail) return f.detail; if (f?.item) return f.item;
  if (f?.message) return f.message; if (f?.content) return f.content;
  return Object.values(f||{}).filter(v=>typeof v==='string').join(' - ') || JSON.stringify(f);
}
function getFindingIcon(f) {
  if (typeof f==='object' && f?.status) {
    if (['pass','ok','success'].includes(f.status)) return 'fa-check-circle text-green-500';
    if (['fail','error'].includes(f.status)) return 'fa-times-circle text-red-500';
    if (['warning','warn'].includes(f.status)) return 'fa-exclamation-circle text-yellow-500';
  }
  return 'fa-check-circle text-amber-500';
}
function formatReasoningText(text) {
  if (!text) return '';
  return text.replace(/\\n\\n/g,'</p><p class="mt-3">').replace(/\\n/g,'<br>').replace(/^/,'<p>').replace(/$/,'</p>').replace(/\\*\\*([^*]+)\\*\\*/g,'<strong>$1</strong>').replace(/- /g,'• ');
}
function escapeHtml(text) { const d=document.createElement('div'); d.textContent=text; return d.innerHTML; }

// ==========================================================
// 弹窗
// ==========================================================
function showReasoningPopup(agentId, type='reasoning') {
  const result=evaluationResults[agentId], agent=evaluationAgents.find(a=>a.id===agentId);
  if (!result||!agent) return;
  const popup=document.getElementById('reasoning-popup');
  let content='', title='';
  if (type==='reasoning') {
    title='AI推理过程 - '+agent.name;
    const reasoning=getFullReasoning(result.result);
    content='<div class="space-y-4"><div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">' +
      '<div class="flex items-center space-x-2"><span class="font-medium">评估得分:</span>' +
      '<span class="text-2xl font-bold '+(result.pass?'text-green-600':'text-red-600')+'">'+( result.result?.score||0)+'</span></div>' +
      '<span class="px-3 py-1 rounded-full text-sm '+(result.pass?'bg-green-100 text-green-700':'bg-red-100 text-red-700')+'">'+(result.pass?'✓ 通过':'✗ 未通过')+'</span></div>' +
      '<div class="prose max-w-none"><h4 class="text-gray-700 font-medium mb-2">详细推理分析</h4>' +
      '<div class="bg-teal-50 rounded-lg p-4 reasoning-text text-gray-700">'+formatReasoningText(reasoning)+'</div></div></div>';
  } else if (type==='recommendation') {
    title='评估建议 - '+agent.name;
    const rec=getFullRecommendation(result.result);
    content='<div class="bg-blue-50 rounded-lg p-4 reasoning-text text-gray-700">'+formatReasoningText(rec||'暂无具体建议')+'</div>';
  } else {
    title='原始响应数据 - '+agent.name;
    const raw=result.result?._raw_response||JSON.stringify(result.result,null,2);
    content='<p class="text-sm text-gray-500 mb-4">以下是AI返回的原始数据：</p><pre class="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto">'+escapeHtml(raw)+'</pre>';
  }
  document.getElementById('popup-title').textContent=title;
  document.getElementById('popup-content').innerHTML=content;
  popup.classList.remove('hidden');
}
function closeReasoningPopup() { document.getElementById('reasoning-popup').classList.add('hidden'); }
function showFullReport(agentId) {
  const result=evaluationResults[agentId], agent=evaluationAgents.find(a=>a.id===agentId);
  if (!result||!agent) { showToast('暂无评估结果','error'); return; }
  const isPassed=result.pass, score=result.result?.score||0;
  const reasoning=getFullReasoning(result.result), recommendation=getFullRecommendation(result.result);
  const findings=result.result?.findings||[], execTime=result.executionTime||0;
  document.getElementById('modal-title').innerHTML='<div class="flex items-center space-x-2"><i class="'+agent.icon+'" style="color:'+agent.icon_color+'"></i><span>'+agent.name+' - 完整评估报告</span></div>';
  document.getElementById('modal-content').innerHTML='<div class="space-y-6">' +
    '<div class="flex items-center justify-between p-4 rounded-xl '+(isPassed?'bg-green-50 border border-green-200':'bg-red-50 border border-red-200')+'">' +
    '<div class="flex items-center space-x-4"><div class="w-14 h-14 rounded-full '+(isPassed?'bg-green-100':'bg-red-100')+' flex items-center justify-center">' +
    '<i class="fas '+(isPassed?'fa-check':'fa-times')+' text-2xl '+(isPassed?'text-green-500':'text-red-500')+'"></i></div>' +
    '<div><p class="font-bold text-xl '+(isPassed?'text-green-700':'text-red-700')+'">'+(isPassed?'评估通过':'评估未通过')+'</p>' +
    '<p class="text-sm text-gray-500">执行耗时: '+(execTime/1000).toFixed(1)+'秒</p></div></div>' +
    '<div class="text-right"><div class="text-4xl font-bold '+(isPassed?'text-green-600':'text-red-600')+'">'+score+'</div>' +
    '<div class="text-sm text-gray-500">阈值: '+agent.pass_threshold+'分</div></div></div>' +
    '<div class="bg-teal-50 rounded-xl p-4"><h4 class="font-semibold mb-3 flex items-center text-teal-700"><i class="fas fa-brain mr-2"></i>AI推理过程</h4>' +
    '<div class="bg-white rounded-lg p-4 text-sm text-gray-700 reasoning-text max-h-64 overflow-y-auto">'+formatReasoningText(reasoning)+'</div></div>' +
    (findings.length>0?'<div class="bg-amber-50 rounded-xl p-4"><h4 class="font-semibold mb-3 flex items-center text-amber-700"><i class="fas fa-search mr-2"></i>检查发现</h4>' +
      '<div class="grid gap-2">'+findings.map((f,i)=>'<div class="flex items-start space-x-3 bg-white p-3 rounded-lg">' +
        '<span class="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold flex-shrink-0">'+(i+1)+'</span>' +
        '<span class="text-sm text-gray-700">'+formatFinding(f)+'</span></div>').join('')+'</div></div>':'') +
    (recommendation?'<div class="bg-blue-50 rounded-xl p-4"><h4 class="font-semibold mb-3 flex items-center text-blue-700"><i class="fas fa-lightbulb mr-2"></i>评估建议</h4>' +
      '<div class="bg-white rounded-lg p-4 text-sm text-gray-700 reasoning-text">'+formatReasoningText(recommendation)+'</div></div>':'') +
    '</div>';
  document.getElementById('detail-modal').classList.remove('hidden');
}
function closeDetailModal() { document.getElementById('detail-modal').classList.add('hidden'); }

// ==========================================================
// 改进建议
// ==========================================================
let improvementData = { missing:[], improvement:[], actions:[], riskRecommendation:'' };
function generateImprovementSuggestions() {
  const missingSet=new Set(), improvSet=new Set();
  let riskRec='';
  Object.values(evaluationResults).forEach(r => {
    r.result?.missing_materials?.forEach(m => missingSet.add(m));
    r.result?.improvements?.forEach(i => improvSet.add(i));
    r.result?.findings?.forEach(f => { const t=formatFinding(f); if (t.includes('缺')||t.includes('不足')||t.includes('需要')||t.includes('建议')) improvSet.add(t); });
    if (r.agentId==='risk-control-agent' && r.result?.recommendation) riskRec=r.result.recommendation;
  });
  if (!missingSet.size) { missingSet.add('详细的合同条款'); missingSet.add('财务审计报告'); missingSet.add('运营数据明细'); }
  if (!improvSet.size) { improvSet.add('完善财务预测模型'); improvSet.add('补充运营团队资料'); improvSet.add('明确风险应对措施'); }
  const actions = [{ priority:'紧急', action:'提交缺失材料', deadline:'本周内' },{ priority:'重要', action:'确认运营进度', deadline:'3日内' },{ priority:'常规', action:'更新项目计划', deadline:'2周内' }];
  improvementData = { missing:Array.from(missingSet), improvement:Array.from(improvSet), actions, riskRecommendation: riskRec };
  document.getElementById('missing-materials').innerHTML = improvementData.missing.slice(0,3).map(m=>'<li class="flex items-start space-x-2 p-1.5 rounded-lg" style="background:rgba(255,255,255,0.5)"><i class="fas fa-file-circle-exclamation text-amber-500 mt-0.5 text-xs"></i><span class="text-xs line-clamp-1">'+(m.length>30?m.substring(0,30)+'...':m)+'</span></li>').join('');
  document.getElementById('missing-count').textContent = improvementData.missing.length;
  document.getElementById('improvement-suggestions').innerHTML = improvementData.improvement.slice(0,3).map(i=>'<li class="flex items-start space-x-2 p-1.5 rounded-lg" style="background:rgba(255,255,255,0.5)"><i class="fas fa-arrow-up-right-dots text-blue-500 mt-0.5 text-xs"></i><span class="text-xs line-clamp-1">'+(i.length>30?i.substring(0,30)+'...':i)+'</span></li>').join('');
  document.getElementById('improvement-count').textContent = improvementData.improvement.length;
  document.getElementById('next-actions').innerHTML = actions.slice(0,3).map((a,i)=>'<div class="flex items-center space-x-2 p-1.5 rounded-lg" style="background:rgba(255,255,255,0.5)"><span class="w-5 h-5 rounded-full bg-green-200 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0">'+(i+1)+'</span><span class="text-xs text-gray-700 line-clamp-1">'+a.action+'</span></div>').join('');
  document.getElementById('actions-count').textContent = actions.length;
  if (riskRec) {
    document.getElementById('risk-recommendation-section').classList.remove('hidden');
    document.getElementById('risk-recommendation-preview').textContent = riskRec.replace(/\n/g,' ').substring(0,150)+'...';
  }
  document.getElementById('improvement-section').classList.remove('hidden');
}
function showImprovementPopup(type) {
  const popup=document.getElementById('improvement-popup');
  const header=document.getElementById('improvement-popup-header');
  const title=document.getElementById('improvement-popup-title');
  const content=document.getElementById('improvement-popup-content');
  let headerBg='p-4 border-b flex items-center justify-between ', titleHtml='', contentHtml='';
  if (type==='missing') {
    headerBg+='bg-amber-50'; titleHtml='<i class="fas fa-file-circle-plus mr-2 text-amber-500"></i><span class="text-amber-800">待补充材料清单</span>';
    contentHtml='<p class="text-sm text-gray-500 mb-4">以下材料需要补充完善：</p><div class="space-y-3">'+
      improvementData.missing.map((m,i)=>'<div class="flex items-start space-x-3 p-3 bg-amber-50 rounded-lg border border-amber-100">' +
        '<span class="w-6 h-6 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center text-xs font-bold flex-shrink-0">'+(i+1)+'</span>' +
        '<p class="text-sm text-gray-800">'+m+'</p></div>').join('')+'</div>';
  } else if (type==='improvement') {
    headerBg+='bg-blue-50'; titleHtml='<i class="fas fa-lightbulb mr-2 text-blue-500"></i><span class="text-blue-800">项目改进建议</span>';
    contentHtml='<p class="text-sm text-gray-500 mb-4">基于AI评估结果，建议改进以下方面：</p><div class="space-y-3">'+
      improvementData.improvement.map((item,i)=>'<div class="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-100">' +
        '<div class="w-6 h-6 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center flex-shrink-0"><i class="fas fa-arrow-up text-xs"></i></div>' +
        '<p class="text-sm text-gray-800">'+item+'</p></div>').join('')+'</div>';
  } else if (type==='actions') {
    headerBg+='bg-green-50'; titleHtml='<i class="fas fa-tasks mr-2 text-green-500"></i><span class="text-green-800">建议下一步行动</span>';
    contentHtml='<p class="text-sm text-gray-500 mb-4">按优先级排序的行动计划：</p><div class="space-y-3">'+
      improvementData.actions.map((a,i)=>'<div class="flex items-center space-x-3 p-3 bg-white rounded-lg border shadow-sm">' +
        '<span class="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold">'+(i+1)+'</span>' +
        '<div class="flex-1"><p class="text-sm font-medium text-gray-800">'+a.action+'</p><p class="text-xs text-gray-500 mt-0.5">建议完成时间：'+a.deadline+'</p></div>' +
        '<span class="text-xs px-2 py-1 rounded border '+(a.priority==='紧急'?'bg-red-100 text-red-700':a.priority==='重要'?'bg-orange-100 text-orange-700':'bg-green-100 text-green-700')+'">'+a.priority+'</span></div>').join('')+'</div>';
  } else if (type==='risk-rec') {
    headerBg+='bg-red-50'; titleHtml='<i class="fas fa-shield-halved mr-2 text-red-500"></i><span class="text-red-800">风险管理建议</span>';
    contentHtml='<p class="text-sm text-gray-500 mb-4">来自风险控制智能体的专业建议：</p><div class="bg-red-50 rounded-lg p-4 border border-red-100"><div class="prose prose-sm max-w-none text-gray-700">'+formatReasoningText(improvementData.riskRecommendation)+'</div></div>';
  }
  header.className=headerBg; title.innerHTML=titleHtml; content.innerHTML=contentHtml;
  popup.classList.remove('hidden');
}
function closeImprovementPopup() { document.getElementById('improvement-popup').classList.add('hidden'); }

// ==========================================================
// 其他辅助
// ==========================================================
function resetEvaluation() { location.reload(); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

document.addEventListener('keydown', e => {
  if (e.key==='Escape') { closeDetailModal(); closeReasoningPopup(); closeImprovementPopup(); closeProfileManager(); }
});

// URL ?deal= 参数预选
function checkUrlParams() {
  const dealId = new URLSearchParams(window.location.search).get('deal');
  if (!dealId) return;
  const interval = setInterval(() => {
    const card = document.querySelector('[data-deal-id="'+dealId+'"]');
    if (card) {
      clearInterval(interval);
      selectDeal(dealId);
      showToast('已预选标的 '+dealId+'，可以直接开始评估', 'success');
      card.scrollIntoView({ behavior:'smooth', block:'center' });
      card.style.outline='2px solid #5DC4B3';
      setTimeout(() => card.style.outline='', 3000);
    }
  }, 500);
  setTimeout(() => clearInterval(interval), 10000);
}

// ==========================================================
// 编辑方案 — 弹窗式方案管理中心（三级导航）
// 第一级：方案列表 → 第二级：方案详情（智能体列表）→ 第三级：编辑智能体
// ==========================================================
let pmCurrentProfileId = null; // 当前在弹窗中查看的方案ID
let pmCurrentTab = 'outer';    // 当前智能体Tab
let pmEditingAgentId = null;   // 当前编辑的智能体ID

const PM_INDUSTRY_MAP = { all:'全行业', catering:'餐饮', retail:'零售', service:'服务', ecommerce:'电商', education:'教育', 'douyin-ecommerce':'抖音投流', 'light-asset':'轻资产' };

function openProfileManagerModal() {
  pmCurrentProfileId = null;
  pmCurrentTab = 'outer';
  pmEditingAgentId = null;
  // 显示弹窗
  document.getElementById('profile-manager-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  // 确保显示的是方案列表视图
  pmShowProfilesView();
  pmRenderProfilesGrid();
}

function closeProfileManager() {
  const modal = document.getElementById('profile-manager-modal');
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
  // 关闭后刷新评估页的方案选择器
  loadProfiles();
}

// --- 视图切换 ---
function pmShowProfilesView() {
  document.getElementById('pm-view-profiles').classList.remove('hidden');
  document.getElementById('pm-view-detail').classList.add('hidden');
  document.getElementById('pm-view-edit-agent').classList.add('hidden');
  document.getElementById('pm-breadcrumb').classList.add('hidden');
  document.getElementById('pm-title').textContent = '我的评估方案';
  document.getElementById('pm-subtitle').textContent = '选择方案 · 管理智能体配置';
}

function pmShowDetailView(profileId) {
  pmCurrentProfileId = profileId;
  const profile = allProfiles.find(p => p.id === profileId);
  if (!profile) { showToast('方案不存在', 'error'); return; }

  document.getElementById('pm-view-profiles').classList.add('hidden');
  document.getElementById('pm-view-detail').classList.remove('hidden');
  document.getElementById('pm-view-edit-agent').classList.add('hidden');

  // 面包屑
  document.getElementById('pm-breadcrumb').classList.remove('hidden');
  document.getElementById('pm-breadcrumb-name').textContent = profile.name;
  document.getElementById('pm-title').textContent = '方案详情';
  document.getElementById('pm-subtitle').textContent = profile.name + ' · 智能体配置';

  // 填充头部
  document.getElementById('pm-detail-icon').style.background = (profile.icon_color || '#5DC4B3') + '20';
  document.getElementById('pm-detail-icon').innerHTML = '<i class="' + (profile.icon || 'fas fa-robot') + ' text-xl" style="color:' + (profile.icon_color || '#5DC4B3') + '"></i>';
  document.getElementById('pm-detail-name').textContent = profile.name;
  document.getElementById('pm-detail-desc').textContent = profile.description || '暂无描述';
  const badge = document.getElementById('pm-detail-badge');
  if (profile.is_default) badge.classList.remove('hidden');
  else badge.classList.add('hidden');

  // 统计
  const outerCount = profile.agents.filter(a => a.ring_type === 'outer').length;
  const innerCount = profile.agents.filter(a => a.ring_type === 'inner').length;
  const enabledCount = profile.agents.filter(a => a.enabled !== false).length;
  document.getElementById('pm-stat-outer').textContent = outerCount;
  document.getElementById('pm-stat-inner').textContent = innerCount;
  document.getElementById('pm-stat-enabled').textContent = enabledCount;
  document.getElementById('pm-tab-outer-count').textContent = outerCount;
  document.getElementById('pm-tab-inner-count').textContent = innerCount;

  // Tab 初始化
  pmCurrentTab = 'outer';
  document.querySelectorAll('.pm-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === 'outer');
  });
  pmRenderAgentsList();
}

function pmShowEditAgentView(agentId) {
  const profile = allProfiles.find(p => p.id === pmCurrentProfileId);
  if (!profile) return;
  const agent = profile.agents.find(a => a.id === agentId);
  if (!agent) { showToast('找不到该智能体', 'error'); return; }

  pmEditingAgentId = agentId;
  document.getElementById('pm-view-profiles').classList.add('hidden');
  document.getElementById('pm-view-detail').classList.add('hidden');
  document.getElementById('pm-view-edit-agent').classList.remove('hidden');

  // 面包屑更新
  document.getElementById('pm-title').textContent = '编辑智能体';
  document.getElementById('pm-subtitle').textContent = agent.name;
  document.getElementById('pm-edit-agent-title').innerHTML = '<i class="fas fa-edit mr-1.5 text-teal-500"></i>编辑智能体 — ' + agent.name;

  // 填充表单
  document.getElementById('pm-agent-name').value = agent.name || '';
  document.getElementById('pm-agent-dimension').value = agent.dimension || '';
  document.getElementById('pm-agent-ring').value = agent.ring_type || 'outer';
  document.getElementById('pm-agent-industry').value = agent.industry || 'all';
  document.getElementById('pm-agent-threshold').value = agent.pass_threshold || 50;
  document.getElementById('pm-agent-weight').value = agent.weight || 0;
  document.getElementById('pm-agent-icon').value = agent.icon || 'fas fa-robot';
  document.getElementById('pm-agent-iconcolor').value = agent.icon_color || '#5DC4B3';
}

function pmBackToProfiles() {
  pmCurrentProfileId = null;
  pmShowProfilesView();
  pmRenderProfilesGrid();
}

function pmBackToDetail() {
  if (pmCurrentProfileId) {
    pmShowDetailView(pmCurrentProfileId);
  } else {
    pmBackToProfiles();
  }
}

function pmSwitchTab(tab) {
  pmCurrentTab = tab;
  document.querySelectorAll('.pm-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  pmRenderAgentsList();
}

// --- 渲染方案列表 ---
function pmRenderProfilesGrid() {
  const grid = document.getElementById('pm-profiles-grid');
  if (!allProfiles.length) {
    grid.innerHTML = '<div class="text-center py-10 text-gray-400 col-span-3"><i class="fas fa-inbox text-3xl mb-2"></i><p class="text-sm">暂无评估方案</p></div>';
    return;
  }

  grid.innerHTML = allProfiles.map(p => {
    const outer = p.agents.filter(a => a.ring_type === 'outer').length;
    const inner = p.agents.filter(a => a.ring_type === 'inner').length;
    const enabled = p.agents.filter(a => a.enabled !== false).length;
    const isActive = p.id === activeProfileId;
    return '<div class="pm-profile-card' + (isActive ? ' ring-2 ring-teal-300 border-teal-400' : '') + '" onclick="pmShowDetailView(\'' + p.id + '\')">' +
      (p.is_default ? '<div class="pm-default-badge"><i class="fas fa-star mr-0.5"></i>默认</div>' : '') +
      '<div class="flex items-center space-x-3 mb-3">' +
      '<div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background:' + (p.icon_color || '#5DC4B3') + '20">' +
      '<i class="' + (p.icon || 'fas fa-robot') + ' text-lg" style="color:' + (p.icon_color || '#5DC4B3') + '"></i></div>' +
      '<div class="flex-1 min-w-0">' +
      '<h4 class="font-semibold text-sm text-gray-800 truncate">' + p.name + '</h4>' +
      '<p class="text-[10px] text-gray-400 line-clamp-1">' + (p.description || '暂无描述') + '</p></div>' +
      '<i class="fas fa-chevron-right text-gray-300 text-sm flex-shrink-0"></i></div>' +
      '<div class="grid grid-cols-3 gap-2 text-center">' +
      '<div class="bg-red-50 rounded-lg py-1.5"><p class="text-sm font-bold text-red-600">' + outer + '</p><p class="text-[9px] text-gray-500">外环</p></div>' +
      '<div class="bg-blue-50 rounded-lg py-1.5"><p class="text-sm font-bold text-blue-600">' + inner + '</p><p class="text-[9px] text-gray-500">中环</p></div>' +
      '<div class="bg-emerald-50 rounded-lg py-1.5"><p class="text-sm font-bold text-emerald-600">' + enabled + '</p><p class="text-[9px] text-gray-500">启用</p></div>' +
      '</div></div>';
  }).join('');
}

// --- 渲染智能体列表 ---
function pmRenderAgentsList() {
  const profile = allProfiles.find(p => p.id === pmCurrentProfileId);
  if (!profile) return;

  const agents = profile.agents.filter(a => a.ring_type === pmCurrentTab);
  const listEl = document.getElementById('pm-agents-list');

  if (!agents.length) {
    listEl.innerHTML = '<div class="text-center py-8 text-gray-400"><i class="fas fa-inbox text-2xl mb-2"></i><p class="text-sm">暂无' + (pmCurrentTab === 'outer' ? '外环漏斗' : '中环筛子') + '智能体</p></div>';
    return;
  }

  listEl.innerHTML = agents.map(agent => {
    const isEnabled = agent.enabled !== false;
    const industryLabel = PM_INDUSTRY_MAP[agent.industry] || agent.industry;
    const isTrack = agent.industry !== 'all';

    return '<div class="border border-gray-100 rounded-lg overflow-hidden hover:border-gray-200 transition">' +
      '<div class="flex items-center justify-between p-3">' +
      // 左侧：智能体信息
      '<div class="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer" onclick="pmShowEditAgentView(\'' + agent.id + '\')">' +
      '<div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style="background:' + agent.icon_color + '20">' +
      '<i class="' + agent.icon + ' text-sm" style="color:' + agent.icon_color + '"></i></div>' +
      '<div class="flex-1 min-w-0">' +
      '<div class="flex items-center space-x-2">' +
      '<h4 class="font-medium text-sm text-gray-800 truncate">' + agent.name + '</h4>' +
      (isTrack ? '<span class="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 flex-shrink-0">' + industryLabel + '</span>' : '<span class="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 flex-shrink-0">通用</span>') +
      '</div>' +
      '<p class="text-[11px] text-gray-400 truncate">' + agent.dimension + ' · 阈值 ' + agent.pass_threshold +
      (pmCurrentTab === 'inner' ? ' · 权重 ' + agent.weight + '%' : '') + '</p></div></div>' +
      // 右侧：操作
      '<div class="flex items-center space-x-3 flex-shrink-0">' +
      '<label class="pm-toggle" onclick="event.stopPropagation()"><input type="checkbox" ' + (isEnabled ? 'checked' : '') + ' onchange="pmToggleAgent(\'' + agent.id + '\', this.checked)"><span class="pm-toggle-slider"></span></label>' +
      '<button onclick="pmShowEditAgentView(\'' + agent.id + '\')" class="text-gray-400 hover:text-teal-500 transition" title="编辑"><i class="fas fa-pen text-xs"></i></button>' +
      '<i class="fas fa-chevron-right text-gray-300 text-xs"></i>' +
      '</div></div></div>';
  }).join('');
}

// --- 智能体操作 ---
async function pmToggleAgent(agentId, enabled) {
  try {
    await apiCall('/api/agents/profiles/' + pmCurrentProfileId + '/agents/' + agentId, {
      method: 'PATCH', body: JSON.stringify({ enabled })
    });
    // 更新本地数据
    const profile = allProfiles.find(p => p.id === pmCurrentProfileId);
    const agent = profile?.agents.find(a => a.id === agentId);
    if (agent) agent.enabled = enabled;
    // 刷新统计
    const outerCount = profile.agents.filter(a => a.ring_type === 'outer').length;
    const innerCount = profile.agents.filter(a => a.ring_type === 'inner').length;
    const enabledCount = profile.agents.filter(a => a.enabled !== false).length;
    document.getElementById('pm-stat-outer').textContent = outerCount;
    document.getElementById('pm-stat-inner').textContent = innerCount;
    document.getElementById('pm-stat-enabled').textContent = enabledCount;
    showToast(enabled ? '已启用' : '已禁用', 'success');
  } catch(e) { showToast('操作失败: ' + e.message, 'error'); }
}

async function pmSaveAgent() {
  if (!pmEditingAgentId || !pmCurrentProfileId) return;
  const name = document.getElementById('pm-agent-name').value.trim();
  if (!name) { showToast('智能体名称不能为空', 'error'); return; }

  const agentData = {
    name,
    dimension: document.getElementById('pm-agent-dimension').value.trim() || name,
    ring_type: document.getElementById('pm-agent-ring').value,
    industry: document.getElementById('pm-agent-industry').value,
    pass_threshold: parseInt(document.getElementById('pm-agent-threshold').value) || 50,
    weight: parseInt(document.getElementById('pm-agent-weight').value) || 0,
    icon: document.getElementById('pm-agent-icon').value.trim() || 'fas fa-robot',
    icon_color: document.getElementById('pm-agent-iconcolor').value || '#5DC4B3',
    enabled: true
  };

  try {
    await apiCall('/api/agents/profiles/' + pmCurrentProfileId + '/agents/' + pmEditingAgentId, {
      method: 'PUT', body: JSON.stringify(agentData)
    });
    showToast('智能体已保存', 'success');
    // 刷新方案数据
    const data = await apiCall('/api/agents/profiles');
    allProfiles = data.data || [];
    // 回到方案详情
    pmShowDetailView(pmCurrentProfileId);
  } catch(e) { showToast('保存失败: ' + e.message, 'error'); }
}

// 链接始终指向弹窗模式，不再需要
function updateAgentsLinks() {
  // 不再需要更新链接，因为按钮已改为 onclick
}

// 兼容旧函数
function goAgentsManage(event) {
  if (event) event.preventDefault();
  openProfileManagerModal();
  return false;
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 先检查登录状态
  const user = checkAssessAuth();
  if (!user) return;
  
  setTimeout(loadAllDeals, 300);
  setTimeout(loadProfiles, 500);  // 加载方案列表（含智能体），不再依赖选标的
  setTimeout(checkUrlParams, 1000);
});
