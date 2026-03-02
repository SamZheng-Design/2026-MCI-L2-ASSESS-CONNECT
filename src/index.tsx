import { Hono } from 'hono'
import { renderer } from './renderer'
import { AssessPage } from './pages/AssessPage'
import { LoginPage } from './pages/LoginPage'
import { AgentsPage } from './pages/AgentsPage'
import { platformDeals, industryLabels, dealStatusLabels, cashflowFrequencyLabels } from './data/deals-data'
import { builtInProfiles, type AgentProfile, type Agent } from './data/agents-data'

const LLM_PROXY = 'http://127.0.0.1:3001'
const DGT_PLATFORM_PORT = 3002 // DGT平台端口（不能是3000，否则自引用）

const app = new Hono()

app.use(renderer)

// ==================== 内存存储（模拟持久化） ====================
// 生产环境应使用 D1 / KV 等 Cloudflare 存储
let userProfiles: AgentProfile[] = JSON.parse(JSON.stringify(builtInProfiles));

// ==================== 页面路由 ====================

app.get('/', (c) => {
  return c.render(<LoginPage />, { title: 'Assess Connect · 评估通 | 登录' })
})

app.get('/assess', (c) => {
  return c.render(<AssessPage />, { title: 'Assess Connect · 评估通' })
})

app.get('/agents', (c) => {
  return c.render(<AgentsPage />, { title: 'Assess Connect · 编辑方案' })
})

// ==================== 本地 Deals API ====================
app.get('/api/deals', (c) => {
  const status = c.req.query('status')
  const industry = c.req.query('industry')
  let deals = platformDeals
  if (status) deals = deals.filter(d => d.status === status)
  if (industry) deals = deals.filter(d => d.industry === industry)
  const list = deals.map(d => ({
    id: d.id,
    company_name: d.company_name,
    industry: d.industry,
    industry_sub: d.industry_sub,
    industry_label: industryLabels[d.industry] || d.industry,
    status: d.status,
    status_label: dealStatusLabels[d.status]?.text || d.status,
    status_color: dealStatusLabels[d.status]?.color || '',
    region: d.region,
    city: d.city,
    main_business: d.main_business,
    funding_amount: d.funding_amount,
    investment_period_months: d.investment_period_months,
    revenue_share_ratio: d.revenue_share_ratio,
    cashflow_frequency: d.cashflow_frequency,
    cashflow_frequency_label: cashflowFrequencyLabels[d.cashflow_frequency] || d.cashflow_frequency,
    submitted_date: d.submitted_date,
    financial_data: d.financial_data,
    project_documents: d.project_documents,
    result: d.result
  }))
  return c.json({ success: true, data: list, total: list.length })
})

app.get('/api/deals/:id', (c) => {
  const id = c.req.param('id')
  const deal = platformDeals.find(d => d.id === id)
  if (!deal) return c.json({ success: false, error: '标的不存在' }, 404)
  return c.json({ success: true, data: deal })
})

// 创建新标的（上传文件创建）
app.post('/api/deals', async (c) => {
  try {
    const body = await c.req.json()
    const newDeal = {
      id: 'DGT-' + new Date().getFullYear() + '-' + String(platformDeals.length + 1).padStart(3, '0'),
      company_name: body.company_name || '未命名企业',
      industry: body.industry || 'other',
      industry_sub: body.industry_sub || '',
      status: 'pending',
      region: body.region || '',
      city: body.city || '',
      main_business: body.main_business || '',
      funding_amount: body.funding_amount || 0,
      funding_purpose: body.funding_purpose || '',
      investment_period_months: body.investment_period_months || 24,
      revenue_share_ratio: body.revenue_share_ratio || 0.05,
      cashflow_frequency: 'monthly' as const,
      contact_name: body.contact_name || '',
      contact_phone: body.contact_phone || '',
      submitted_date: new Date().toISOString().split('T')[0],
      project_documents: body.project_documents || '',
      financial_data: body.financial_data || '{}',
      result: 'pending'
    }
    // 在内存中添加（演示模式）
    ;(platformDeals as any[]).unshift(newDeal)
    return c.json({ success: true, data: newDeal })
  } catch(e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
})

// ==================== 智能体方案 API ====================

// 列出所有方案
app.get('/api/agents/profiles', (c) => {
  return c.json({ success: true, data: userProfiles })
})

// 获取单个方案
app.get('/api/agents/profiles/:id', (c) => {
  const id = c.req.param('id')
  const profile = userProfiles.find(p => p.id === id)
  if (!profile) return c.json({ success: false, error: '方案不存在' }, 404)
  return c.json({ success: true, data: profile })
})

// 新建方案
app.post('/api/agents/profiles', async (c) => {
  const body = await c.req.json()
  const { name, description, template_id } = body
  if (!name) return c.json({ success: false, error: '方案名称必填' }, 400)

  let agents: Agent[] = []
  if (template_id && template_id !== 'empty') {
    const template = userProfiles.find(p => p.id === template_id) || builtInProfiles.find(p => p.id === template_id)
    if (template) agents = JSON.parse(JSON.stringify(template.agents))
  }

  const newProfile: AgentProfile = {
    id: 'profile-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    name,
    description: description || '',
    icon: 'fas fa-robot',
    icon_color: '#5DC4B3',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_default: false,
    agents
  }
  userProfiles.push(newProfile)
  return c.json({ success: true, data: newProfile })
})

// 删除方案
app.delete('/api/agents/profiles/:id', (c) => {
  const id = c.req.param('id')
  const idx = userProfiles.findIndex(p => p.id === id)
  if (idx === -1) return c.json({ success: false, error: '方案不存在' }, 404)
  if (userProfiles[idx].is_default) return c.json({ success: false, error: '默认方案不能删除' }, 400)
  userProfiles.splice(idx, 1)
  return c.json({ success: true })
})

// 设为默认
app.post('/api/agents/profiles/:id/default', (c) => {
  const id = c.req.param('id')
  const profile = userProfiles.find(p => p.id === id)
  if (!profile) return c.json({ success: false, error: '方案不存在' }, 404)
  userProfiles.forEach(p => p.is_default = false)
  profile.is_default = true
  profile.updated_at = new Date().toISOString()
  return c.json({ success: true, data: profile })
})

// 更新方案（名称、描述等）
app.put('/api/agents/profiles/:id', async (c) => {
  const id = c.req.param('id')
  const profile = userProfiles.find(p => p.id === id)
  if (!profile) return c.json({ success: false, error: '方案不存在' }, 404)
  const body = await c.req.json()
  if (body.name !== undefined) profile.name = body.name
  if (body.description !== undefined) profile.description = body.description
  if (body.icon !== undefined) profile.icon = body.icon
  if (body.icon_color !== undefined) profile.icon_color = body.icon_color
  profile.updated_at = new Date().toISOString()
  return c.json({ success: true, data: profile })
})

// 克隆方案
app.post('/api/agents/profiles/:id/clone', (c) => {
  const id = c.req.param('id')
  const original = userProfiles.find(p => p.id === id)
  if (!original) return c.json({ success: false, error: '方案不存在' }, 404)
  const cloned: AgentProfile = {
    ...JSON.parse(JSON.stringify(original)),
    id: 'profile-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    name: original.name + ' (副本)',
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  userProfiles.push(cloned)
  return c.json({ success: true, data: cloned })
})

// ==================== 智能体 CRUD（方案内） ====================

// 获取方案内所有智能体
app.get('/api/agents/profiles/:profileId/agents', (c) => {
  const profileId = c.req.param('profileId')
  const profile = userProfiles.find(p => p.id === profileId)
  if (!profile) return c.json({ success: false, error: '方案不存在' }, 404)
  return c.json({ success: true, data: profile.agents })
})

// 添加智能体到方案
app.post('/api/agents/profiles/:profileId/agents', async (c) => {
  const profileId = c.req.param('profileId')
  const profile = userProfiles.find(p => p.id === profileId)
  if (!profile) return c.json({ success: false, error: '方案不存在' }, 404)
  const agent: Agent = await c.req.json()
  if (!agent.id) agent.id = 'agent-' + Date.now()
  if (!agent.name) return c.json({ success: false, error: '智能体名称必填' }, 400)
  profile.agents.push(agent)
  profile.updated_at = new Date().toISOString()
  return c.json({ success: true, data: agent })
})

// 更新智能体
app.put('/api/agents/profiles/:profileId/agents/:agentId', async (c) => {
  const profileId = c.req.param('profileId')
  const agentId = c.req.param('agentId')
  const profile = userProfiles.find(p => p.id === profileId)
  if (!profile) return c.json({ success: false, error: '方案不存在' }, 404)
  const idx = profile.agents.findIndex(a => a.id === agentId)
  if (idx === -1) return c.json({ success: false, error: '智能体不存在' }, 404)
  const updates = await c.req.json()
  profile.agents[idx] = { ...profile.agents[idx], ...updates, id: agentId }
  profile.updated_at = new Date().toISOString()
  return c.json({ success: true, data: profile.agents[idx] })
})

// 切换启用/禁用
app.patch('/api/agents/profiles/:profileId/agents/:agentId', async (c) => {
  const profileId = c.req.param('profileId')
  const agentId = c.req.param('agentId')
  const profile = userProfiles.find(p => p.id === profileId)
  if (!profile) return c.json({ success: false, error: '方案不存在' }, 404)
  const agent = profile.agents.find(a => a.id === agentId)
  if (!agent) return c.json({ success: false, error: '智能体不存在' }, 404)
  const { enabled } = await c.req.json()
  agent.enabled = enabled
  profile.updated_at = new Date().toISOString()
  return c.json({ success: true, data: agent })
})

// 删除智能体
app.delete('/api/agents/profiles/:profileId/agents/:agentId', (c) => {
  const profileId = c.req.param('profileId')
  const agentId = c.req.param('agentId')
  const profile = userProfiles.find(p => p.id === profileId)
  if (!profile) return c.json({ success: false, error: '方案不存在' }, 404)
  const idx = profile.agents.findIndex(a => a.id === agentId)
  if (idx === -1) return c.json({ success: false, error: '智能体不存在' }, 404)
  profile.agents.splice(idx, 1)
  profile.updated_at = new Date().toISOString()
  return c.json({ success: true })
})

// ==================== 兼容旧的 /api/dgt/agents 路径 ====================
// 返回默认方案的智能体列表，确保评估页直接可用
app.get('/api/agents', (c) => {
  const defaultProfile = userProfiles.find(p => p.is_default) || userProfiles[0]
  if (!defaultProfile) return c.json({ success: true, data: [] })
  return c.json({ success: true, data: defaultProfile.agents.filter(a => a.enabled !== false) })
})

// 根据方案ID获取智能体（评估页选择方案后用）
app.get('/api/agents/by-profile/:profileId', (c) => {
  const profileId = c.req.param('profileId')
  const profile = userProfiles.find(p => p.id === profileId)
  if (!profile) {
    const defaultProfile = userProfiles.find(p => p.is_default) || userProfiles[0]
    return c.json({ success: true, data: defaultProfile?.agents.filter(a => a.enabled !== false) || [] })
  }
  return c.json({ success: true, data: profile.agents.filter(a => a.enabled !== false) })
})

// ==================== AI 评估代理 ====================
// 代理到 LLM 后端或 DGT 平台的评估接口
app.post('/api/ai/evaluate', async (c) => {
  try {
    const body = await c.req.json()
    // 先尝试 LLM Proxy (with 3s timeout)
    try {
      const controller1 = new AbortController()
      const timeout1 = setTimeout(() => controller1.abort(), 3000)
      const resp = await fetch(`${LLM_PROXY}/agent/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller1.signal
      })
      clearTimeout(timeout1)
      if (resp.ok) return c.json(await resp.json())
    } catch(e) { /* LLM proxy not available, try DGT */ }

    // 回退到 DGT 平台 (with 3s timeout)
    try {
      const controller2 = new AbortController()
      const timeout2 = setTimeout(() => controller2.abort(), 3000)
      const resp = await fetch(`http://127.0.0.1:${DGT_PLATFORM_PORT}/api/ai/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller2.signal
      })
      clearTimeout(timeout2)
      if (resp.ok) return c.json(await resp.json())
    } catch(e) { /* DGT not available either */ }

    // 都不可用时返回模拟数据（演示模式）
    const { agentId, dealId } = body
    const agent = (() => {
      for (const p of userProfiles) {
        const a = p.agents.find((ag: Agent) => ag.id === agentId)
        if (a) return a
      }
      return null
    })()

    const score = Math.floor(Math.random() * 30) + 60 // 60-90
    const pass = score >= (agent?.pass_threshold || 50)
    return c.json({
      success: true,
      data: {
        agentId,
        dealId,
        pass,
        executionTime: Math.floor(Math.random() * 3000) + 1000,
        result: {
          score,
          risk_level: score >= 80 ? 'low' : score >= 60 ? 'medium' : 'high',
          reasoning: `[演示模式] 基于${agent?.dimension || '综合'}维度的AI分析：\n\n该项目在${agent?.dimension || '综合'}方面表现${pass ? '良好' : '有待改进'}。综合评分 ${score} 分，${pass ? '达到' : '未达到'}通过阈值 ${agent?.pass_threshold || 50} 分。\n\n关键发现：\n- 整体运营数据${score >= 70 ? '表现健康' : '需要关注'}\n- 行业竞争力${score >= 75 ? '较强' : '一般'}\n- 风险控制${score >= 65 ? '到位' : '有待加强'}`,
          recommendation: pass ? '建议进一步关注运营细节，做好尽职调查后可考虑推进。' : '建议补充相关材料，完善项目信息后重新评估。',
          findings: [
            { item: '基础指标', detail: `${agent?.dimension || '综合'}基础指标${score >= 70 ? '达标' : '部分未达标'}`, status: score >= 70 ? 'pass' : 'warning' },
            { item: '风险评估', detail: `风险等级：${score >= 80 ? '低' : score >= 60 ? '中' : '高'}`, status: score >= 70 ? 'pass' : 'warning' },
            { item: '数据完整性', detail: '项目材料基本完整，部分细节可补充', status: 'pass' }
          ]
        }
      }
    })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// ==================== 评估通 API 代理 ====================
app.post('/api/assess/start', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const resp = await fetch(`${LLM_PROXY}/agent/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    return c.json(await resp.json(), resp.status as 200)
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

app.get('/api/assess/progress/:jobId', async (c) => {
  try {
    const jobId = c.req.param('jobId')
    const cursor = c.req.query('cursor') || '0'
    const resp = await fetch(`${LLM_PROXY}/agent/progress/${jobId}?cursor=${cursor}`)
    return c.json(await resp.json(), resp.status as 200)
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// ==================== DGT 平台代理（保留兼容） ====================
// 注意：DGT平台运行在3002端口，不能指向3000（那是本应用自己）
app.all('/api/dgt/*', async (c) => {
  const subPath = c.req.path.replace('/api/dgt', '/api')
  const qs = c.req.url.includes('?') ? '?' + c.req.url.split('?')[1] : ''
  const url = `http://127.0.0.1:${DGT_PLATFORM_PORT}${subPath}${qs}`
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const init: RequestInit = {
      method: c.req.method,
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    }
    if (['POST', 'PUT', 'PATCH'].includes(c.req.method)) {
      init.body = await c.req.raw.clone().text()
    }
    const resp = await fetch(url, init)
    clearTimeout(timeoutId)
    const body = await resp.text()
    return new Response(body, {
      status: resp.status,
      headers: { 'Content-Type': resp.headers.get('Content-Type') || 'application/json' }
    })
  } catch (e) {
    return c.json({ error: String(e), note: 'dgt平台未运行，请确认dgt-intelligence-platform已在3002端口启动' }, 502)
  }
})

export default app
