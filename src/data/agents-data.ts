/**
 * 评估智能体数据源
 * 
 * 架构说明：
 *   - Agent: 单个智能体定义（姓名、角色、维度、阈值等）
 *   - AgentProfile: 一整套智能体方案（外环 + 内环组合），用户可以配置多套
 * 
 * 每个用户可拥有多个 AgentProfile，在评估时选择使用哪一套。
 */

export interface Agent {
  id: string;
  name: string;
  ring_type: 'outer' | 'inner';   // outer=外环漏斗, inner=中环筛子
  dimension: string;                // 评估维度
  description: string;              // 描述
  icon: string;                     // FontAwesome 图标
  icon_color: string;
  pass_threshold: number;           // 通过阈值（0-100）
  weight: number;                   // 中环权重（%），外环一般 0
  industry: string;                 // 'all' = 通用，否则是赛道专属
  prompt_template: string;          // AI 提示词模板
  enabled: boolean;                 // 是否启用
}

export interface AgentProfile {
  id: string;
  name: string;
  description: string;
  icon: string;
  icon_color: string;
  created_at: string;
  updated_at: string;
  is_default: boolean;
  agents: Agent[];
}

// ========== 默认外环智能体 ==========
export const defaultOuterAgents: Agent[] = [
  {
    id: 'compliance-agent',
    name: '合规审查智能体',
    ring_type: 'outer',
    dimension: '合规审查',
    description: '检查项目是否满足基本合规要求，包括营业执照、经营许可、税务登记等，属于一票否决项。',
    icon: 'fas fa-gavel',
    icon_color: '#EF4444',
    pass_threshold: 60,
    weight: 0,
    industry: 'all',
    prompt_template: '',
    enabled: true
  },
  {
    id: 'risk-control-agent',
    name: '风险控制智能体',
    ring_type: 'outer',
    dimension: '风险控制',
    description: '评估项目系统性风险，包括政策风险、市场风险、运营风险、信用风险等关键风控指标。',
    icon: 'fas fa-shield-alt',
    icon_color: '#F59E0B',
    pass_threshold: 55,
    weight: 0,
    industry: 'all',
    prompt_template: '',
    enabled: true
  },
  {
    id: 'financial-health-agent',
    name: '财务健康智能体',
    ring_type: 'outer',
    dimension: '财务健康',
    description: '审查项目财务基本面是否健康，包括营收真实性、现金流稳定性、负债水平等。',
    icon: 'fas fa-heartbeat',
    icon_color: '#10B981',
    pass_threshold: 60,
    weight: 0,
    industry: 'all',
    prompt_template: '',
    enabled: true
  },
  {
    id: 'legal-review-agent',
    name: '法律审查智能体',
    ring_type: 'outer',
    dimension: '法律审查',
    description: '审查合同条款、知识产权、诉讼风险等法律层面的问题。',
    icon: 'fas fa-balance-scale',
    icon_color: '#8B5CF6',
    pass_threshold: 55,
    weight: 0,
    industry: 'all',
    prompt_template: '',
    enabled: true
  }
];

// ========== 默认内环智能体（通用） ==========
export const defaultInnerAgentsGeneral: Agent[] = [
  {
    id: 'market-analysis-agent',
    name: '市场分析智能体',
    ring_type: 'inner',
    dimension: '市场分析',
    description: '评估目标市场规模、增长趋势、竞争格局，判断项目的市场前景。',
    icon: 'fas fa-chart-line',
    icon_color: '#3B82F6',
    pass_threshold: 50,
    weight: 15,
    industry: 'all',
    prompt_template: '',
    enabled: true
  },
  {
    id: 'operation-efficiency-agent',
    name: '运营效率智能体',
    ring_type: 'inner',
    dimension: '运营效率',
    description: '评估门店/项目的运营管理水平，包括人效、坪效、库存周转等。',
    icon: 'fas fa-cogs',
    icon_color: '#06B6D4',
    pass_threshold: 50,
    weight: 15,
    industry: 'all',
    prompt_template: '',
    enabled: true
  },
  {
    id: 'brand-moat-agent',
    name: '品牌护城河智能体',
    ring_type: 'inner',
    dimension: '品牌护城河',
    description: '评估品牌影响力、用户忠诚度、供应链优势等竞争护城河的深度。',
    icon: 'fas fa-chess-rook',
    icon_color: '#8B5CF6',
    pass_threshold: 50,
    weight: 15,
    industry: 'all',
    prompt_template: '',
    enabled: true
  },
  {
    id: 'revenue-model-agent',
    name: '盈利模型智能体',
    ring_type: 'inner',
    dimension: '盈利模型',
    description: '深度分析收入结构、利润驱动因素、投资回报模型的可靠性。',
    icon: 'fas fa-money-bill-trend-up',
    icon_color: '#10B981',
    pass_threshold: 50,
    weight: 20,
    industry: 'all',
    prompt_template: '',
    enabled: true
  },
  {
    id: 'team-capability-agent',
    name: '团队能力智能体',
    ring_type: 'inner',
    dimension: '团队能力',
    description: '评估管理团队的经验、执行力、行业背景等软实力。',
    icon: 'fas fa-users',
    icon_color: '#F59E0B',
    pass_threshold: 50,
    weight: 10,
    industry: 'all',
    prompt_template: '',
    enabled: true
  }
];

// ========== 默认内环智能体（赛道专属） ==========
export const defaultInnerAgentsTrack: Agent[] = [
  // -- 餐饮赛道 --
  {
    id: 'catering-food-safety-agent',
    name: '食品安全智能体',
    ring_type: 'inner',
    dimension: '食品安全',
    description: '专项评估餐饮项目的食品安全管理体系、供应链溯源能力。',
    icon: 'fas fa-utensils',
    icon_color: '#F59E0B',
    pass_threshold: 60,
    weight: 15,
    industry: 'catering',
    prompt_template: '',
    enabled: true
  },
  {
    id: 'catering-location-agent',
    name: '选址流量智能体',
    ring_type: 'inner',
    dimension: '选址流量',
    description: '评估餐饮门店选址的客流量、周边竞品、租售比等核心指标。',
    icon: 'fas fa-map-marker-alt',
    icon_color: '#EF4444',
    pass_threshold: 50,
    weight: 10,
    industry: 'catering',
    prompt_template: '',
    enabled: true
  },
  // -- 零售赛道 --
  {
    id: 'retail-supply-chain-agent',
    name: '供应链智能体',
    ring_type: 'inner',
    dimension: '供应链',
    description: '评估零售项目的供应链效率、库存周转、采购成本等。',
    icon: 'fas fa-truck',
    icon_color: '#06B6D4',
    pass_threshold: 55,
    weight: 15,
    industry: 'retail',
    prompt_template: '',
    enabled: true
  },
  // -- 服务赛道 --
  {
    id: 'service-customer-retention-agent',
    name: '客户留存智能体',
    ring_type: 'inner',
    dimension: '客户留存',
    description: '评估服务业项目的客户留存率、复购率、会员体系效果。',
    icon: 'fas fa-user-check',
    icon_color: '#10B981',
    pass_threshold: 50,
    weight: 15,
    industry: 'service',
    prompt_template: '',
    enabled: true
  },
  // -- 电商赛道 --
  {
    id: 'ecommerce-traffic-agent',
    name: '流量运营智能体',
    ring_type: 'inner',
    dimension: '流量运营',
    description: '评估电商项目的获客成本、转化率、复购率等流量运营指标。',
    icon: 'fas fa-bullhorn',
    icon_color: '#EC4899',
    pass_threshold: 50,
    weight: 15,
    industry: 'ecommerce',
    prompt_template: '',
    enabled: true
  },
  // -- 教育培训赛道 --
  {
    id: 'education-quality-agent',
    name: '教学质量智能体',
    ring_type: 'inner',
    dimension: '教学质量',
    description: '评估教育培训项目的课程体系、师资力量、学员满意度。',
    icon: 'fas fa-graduation-cap',
    icon_color: '#3B82F6',
    pass_threshold: 50,
    weight: 15,
    industry: 'education',
    prompt_template: '',
    enabled: true
  }
];

// ========== 组装默认 Profile ==========
export const defaultAgentProfile: AgentProfile = {
  id: 'default-profile',
  name: '标准评估方案',
  description: '适用于大多数投资标的的通用评估方案，涵盖合规、风控、财务健康、法律审查4大外环漏斗 + 5个通用中环筛子 + 赛道专属智能体。',
  icon: 'fas fa-star',
  icon_color: '#5DC4B3',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z',
  is_default: true,
  agents: [
    ...defaultOuterAgents,
    ...defaultInnerAgentsGeneral,
    ...defaultInnerAgentsTrack
  ]
};

// ========== 预设的额外方案 ==========
export const conservativeProfile: AgentProfile = {
  id: 'conservative-profile',
  name: '保守型评估方案',
  description: '更严格的阈值、更多风控维度。适用于高风险赛道或大额投资项目，注重资金安全。',
  icon: 'fas fa-shield-alt',
  icon_color: '#EF4444',
  created_at: '2026-01-15T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z',
  is_default: false,
  agents: [
    ...defaultOuterAgents.map(a => ({ ...a, pass_threshold: a.pass_threshold + 10 })),
    ...defaultInnerAgentsGeneral.map(a => ({ ...a, pass_threshold: a.pass_threshold + 10 })),
    ...defaultInnerAgentsTrack.map(a => ({ ...a, pass_threshold: a.pass_threshold + 10 }))
  ]
};

export const aggressiveProfile: AgentProfile = {
  id: 'aggressive-profile',
  name: '激进型评估方案',
  description: '更宽松的阈值、注重增长潜力而非绝对安全。适用于高成长性早期项目。',
  icon: 'fas fa-rocket',
  icon_color: '#F59E0B',
  created_at: '2026-02-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z',
  is_default: false,
  agents: [
    ...defaultOuterAgents.map(a => ({ ...a, pass_threshold: Math.max(40, a.pass_threshold - 10) })),
    ...defaultInnerAgentsGeneral.map(a => ({
      ...a,
      pass_threshold: Math.max(35, a.pass_threshold - 10),
      weight: a.id === 'revenue-model-agent' ? 25 : a.id === 'market-analysis-agent' ? 20 : a.weight
    })),
    ...defaultInnerAgentsTrack.map(a => ({ ...a, pass_threshold: Math.max(40, a.pass_threshold - 10) }))
  ]
};

// 所有预设方案
export const builtInProfiles: AgentProfile[] = [
  defaultAgentProfile,
  conservativeProfile,
  aggressiveProfile
];

// ========== 获取当前用户的方案列表（含预设+自定义）==========
export function getAllProfiles(): AgentProfile[] {
  return [...builtInProfiles];
}

// ========== 根据赛道过滤内环智能体 ==========
export function filterInnerAgents(agents: Agent[], industry: string): Agent[] {
  return agents.filter(a =>
    a.ring_type === 'inner' &&
    a.enabled !== false &&
    (a.industry === 'all' || a.industry === industry)
  );
}

// ========== 获取外环智能体 ==========
export function getOuterAgents(agents: Agent[]): Agent[] {
  return agents.filter(a => a.ring_type === 'outer' && a.enabled !== false);
}
