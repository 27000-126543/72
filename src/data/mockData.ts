import type {
  ProductionLine, Product, Material, Equipment, SalesOrder,
  ProductionSchedule, Batch, Deviation, MaintenanceWorkOrder,
  ChangeControl, StabilityStudy, User
} from '../types';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';

export const mockLines: ProductionLine[] = [
  {
    id: 'line-1',
    code: 'PL-TAB-001',
    name: '片剂1号线',
    dosageForm: 'tablet',
    capacity: 500000,
    status: 'running',
    lastProduct: '阿莫西林胶囊',
    lastBatch: 'AMX-20260601-01',
    location: '制剂车间A区',
    workshop: '制剂车间'
  },
  {
    id: 'line-2',
    code: 'PL-TAB-002',
    name: '片剂2号线',
    dosageForm: 'tablet',
    capacity: 400000,
    status: 'cleaning',
    location: '制剂车间A区',
    workshop: '制剂车间'
  },
  {
    id: 'line-3',
    code: 'PL-CAP-001',
    name: '胶囊1号线',
    dosageForm: 'capsule',
    capacity: 300000,
    status: 'running',
    lastProduct: '布洛芬胶囊',
    location: '制剂车间B区',
    workshop: '制剂车间'
  },
  {
    id: 'line-4',
    code: 'PL-INJ-001',
    name: '注射剂1号线',
    dosageForm: 'injection',
    capacity: 100000,
    status: 'idle',
    location: '注射剂车间',
    workshop: '注射剂车间'
  },
  {
    id: 'line-5',
    code: 'PL-SUS-001',
    name: '混悬液1号线',
    dosageForm: 'suspension',
    capacity: 50000,
    status: 'maintenance',
    location: '液体制剂车间',
    workshop: '液体制剂车间'
  }
];

export const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: '阿莫西林胶囊',
    code: 'AMX-CAP-250',
    dosageForm: 'capsule',
    specification: '250mg',
    standard: 'CP2020',
    shelfLife: 24
  },
  {
    id: 'prod-2',
    name: '布洛芬缓释胶囊',
    code: 'IBP-CAP-300',
    dosageForm: 'capsule',
    specification: '300mg',
    standard: 'CP2020',
    shelfLife: 36
  },
  {
    id: 'prod-3',
    name: '硝苯地平控释片',
    code: 'NFP-TAB-30',
    dosageForm: 'tablet',
    specification: '30mg',
    standard: 'CP2020',
    shelfLife: 24
  },
  {
    id: 'prod-4',
    name: '维生素C注射液',
    code: 'VIT-INJ-500',
    dosageForm: 'injection',
    specification: '5ml:500mg',
    standard: 'CP2020',
    shelfLife: 18
  },
  {
    id: 'prod-5',
    name: '复方甘草口服溶液',
    code: 'GLY-SUS-100',
    dosageForm: 'suspension',
    specification: '100ml',
    standard: 'CP2020',
    shelfLife: 12
  }
];

export const mockMaterials: Material[] = [
  { id: 'mat-1', code: 'RAW-AMX-001', name: '阿莫西林原料药', type: 'raw', specification: '99%', unit: 'kg', quantity: 250, safetyStock: 100, supplier: '华药集团' },
  { id: 'mat-2', code: 'RAW-IBP-001', name: '布洛芬原料药', type: 'raw', specification: '99.5%', unit: 'kg', quantity: 180, safetyStock: 80, supplier: '新华制药' },
  { id: 'mat-3', code: 'RAW-NFP-001', name: '硝苯地平原料药', type: 'raw', specification: '99%', unit: 'kg', quantity: 45, safetyStock: 50, supplier: '石药集团' },
  { id: 'mat-4', code: 'AUX-STA-001', name: '药用淀粉', type: 'auxiliary', specification: '口服级', unit: 'kg', quantity: 800, safetyStock: 300, supplier: '菱湖新望' },
  { id: 'mat-5', code: 'AUX-LAC-001', name: '乳糖', type: 'auxiliary', specification: '口服级', unit: 'kg', quantity: 500, safetyStock: 200, supplier: 'Meggle' },
  { id: 'mat-6', code: 'AUX-MCC-001', name: '微晶纤维素', type: 'auxiliary', specification: 'PH102', unit: 'kg', quantity: 350, safetyStock: 150, supplier: 'FMC' },
  { id: 'mat-7', code: 'PKG-CAP-001', name: '明胶空心胶囊', type: 'packaging', specification: '0号', unit: '万粒', quantity: 2000, safetyStock: 500, supplier: '山西广生' },
  { id: 'mat-8', code: 'PKG-ALU-001', name: '药用铝箔', type: 'packaging', specification: '0.02mm', unit: 'kg', quantity: 120, safetyStock: 50, supplier: '明泰铝业' }
];

export const mockEquipments: Equipment[] = [
  {
    id: 'eq-1',
    code: 'EQ-FGD-001',
    name: '高速压片机',
    model: 'GZPTS-45',
    lineId: 'line-1',
    runningHours: 4520,
    lastMaintenanceDate: dayjs().subtract(25, 'day').format('YYYY-MM-DD'),
    nextMaintenanceDate: dayjs().add(5, 'day').format('YYYY-MM-DD'),
    maintenanceIntervalHours: 500,
    validationExpiryDate: dayjs().add(60, 'day').format('YYYY-MM-DD'),
    status: 'normal'
  },
  {
    id: 'eq-2',
    code: 'EQ-GHL-001',
    name: '湿法混合制粒机',
    model: 'GHL-200',
    lineId: 'line-1',
    runningHours: 3800,
    lastMaintenanceDate: dayjs().subtract(10, 'day').format('YYYY-MM-DD'),
    nextMaintenanceDate: dayjs().add(20, 'day').format('YYYY-MM-DD'),
    maintenanceIntervalHours: 500,
    validationExpiryDate: dayjs().add(45, 'day').format('YYYY-MM-DD'),
    status: 'normal'
  },
  {
    id: 'eq-3',
    code: 'EQ-FGD-002',
    name: '旋转式压片机',
    model: 'ZP-35A',
    lineId: 'line-2',
    runningHours: 5100,
    lastMaintenanceDate: dayjs().subtract(40, 'day').format('YYYY-MM-DD'),
    nextMaintenanceDate: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
    maintenanceIntervalHours: 500,
    validationExpiryDate: dayjs().add(10, 'day').format('YYYY-MM-DD'),
    status: 'warning'
  },
  {
    id: 'eq-4',
    code: 'EQ-KLJ-001',
    name: '全自动胶囊充填机',
    model: 'NJP-2000',
    lineId: 'line-3',
    runningHours: 3200,
    lastMaintenanceDate: dayjs().subtract(15, 'day').format('YYYY-MM-DD'),
    nextMaintenanceDate: dayjs().add(15, 'day').format('YYYY-MM-DD'),
    maintenanceIntervalHours: 500,
    validationExpiryDate: dayjs().add(90, 'day').format('YYYY-MM-DD'),
    status: 'normal'
  },
  {
    id: 'eq-5',
    code: 'EQ-ZSY-001',
    name: '安瓿灌封机',
    model: 'AGF-12',
    lineId: 'line-4',
    runningHours: 2100,
    lastMaintenanceDate: dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
    nextMaintenanceDate: dayjs().add(30, 'day').format('YYYY-MM-DD'),
    maintenanceIntervalHours: 400,
    validationExpiryDate: dayjs().add(30, 'day').format('YYYY-MM-DD'),
    status: 'normal'
  }
];

export const mockSalesOrders: SalesOrder[] = [
  {
    id: 'so-1',
    orderNo: 'SO-20260601-001',
    productId: 'prod-1',
    productName: '阿莫西林胶囊',
    quantity: 500000,
    unit: '粒',
    deliveryDate: dayjs().add(10, 'day').format('YYYY-MM-DD'),
    customer: '国药控股',
    status: 'pending',
    priority: 'high',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: 'so-2',
    orderNo: 'SO-20260601-002',
    productId: 'prod-2',
    productName: '布洛芬缓释胶囊',
    quantity: 300000,
    unit: '粒',
    deliveryDate: dayjs().add(15, 'day').format('YYYY-MM-DD'),
    customer: '华润医药',
    status: 'pending',
    priority: 'medium',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: 'so-3',
    orderNo: 'SO-20260601-003',
    productId: 'prod-3',
    productName: '硝苯地平控释片',
    quantity: 200000,
    unit: '片',
    deliveryDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
    customer: '上药控股',
    status: 'scheduled',
    priority: 'urgent',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: 'so-4',
    orderNo: 'SO-20260601-004',
    productId: 'prod-4',
    productName: '维生素C注射液',
    quantity: 80000,
    unit: '支',
    deliveryDate: dayjs().add(20, 'day').format('YYYY-MM-DD'),
    customer: '九州通医药',
    status: 'pending',
    priority: 'low',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
  }
];

export const mockSchedules: ProductionSchedule[] = [
  {
    id: 'sch-1',
    date: dayjs().format('YYYY-MM-DD'),
    lineId: 'line-1',
    lineCode: 'PL-TAB-001',
    productId: 'prod-3',
    productName: '硝苯地平控释片',
    batchNo: 'NFP-20260608-01',
    plannedQuantity: 200000,
    startTime: dayjs().set('hour', 8).set('minute', 0).format('YYYY-MM-DD HH:mm:ss'),
    endTime: dayjs().set('hour', 20).set('minute', 0).format('YYYY-MM-DD HH:mm:ss'),
    setupTime: 2,
    cleaningTime: 4,
    materialCheck: true,
    materialItems: [
      { materialId: 'mat-3', materialName: '硝苯地平原料药', required: 12, available: 45, sufficient: true },
      { materialId: 'mat-4', materialName: '药用淀粉', required: 80, available: 800, sufficient: true },
      { materialId: 'mat-6', materialName: '微晶纤维素', required: 40, available: 350, sufficient: true }
    ],
    status: 'approved',
    approver: '张总监',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    createdBy: '系统',
    workstationStatus: { '备料': 'completed', '制粒': 'completed', '压片': 'in_progress', '包装': 'pending' }
  }
];

export const mockBatches: Batch[] = [
  {
    id: 'batch-1',
    batchNo: 'NFP-20260608-01',
    productId: 'prod-3',
    productName: '硝苯地平控释片',
    scheduleId: 'sch-1',
    lineId: 'line-1',
    plannedQuantity: 200000,
    actualQuantity: 0,
    status: 'compressing',
    startTime: dayjs().set('hour', 8).set('minute', 0).format('YYYY-MM-DD HH:mm:ss'),
    parameters: [
      { id: 'p-1', batchId: 'batch-1', name: '制粒温度', unit: '℃', value: 62, minLimit: 55, maxLimit: 65, timestamp: dayjs().set('hour', 10).format('YYYY-MM-DD HH:mm:ss'), isDeviation: false },
      { id: 'p-2', batchId: 'batch-1', name: '压片压力', unit: 'kN', value: 18, minLimit: 15, maxLimit: 22, timestamp: dayjs().set('hour', 13).format('YYYY-MM-DD HH:mm:ss'), isDeviation: false },
      { id: 'p-3', batchId: 'batch-1', name: '颗粒水分', unit: '%', value: 3.2, minLimit: 2.5, maxLimit: 4.0, timestamp: dayjs().set('hour', 14).format('YYYY-MM-DD HH:mm:ss'), isDeviation: false }
    ],
    deviationIds: [],
    createdBy: '系统'
  }
];

export const mockDeviations: Deviation[] = [
  {
    id: 'dev-1',
    deviationNo: 'DEV-2026-001',
    batchId: 'batch-1',
    batchNo: 'NFP-20260608-01',
    title: '压片硬度超出上限',
    description: '第2小时检测时，压片硬度达到220N，超过标准上限200N',
    type: 'minor',
    status: 'investigating',
    reporter: '李操作员',
    reportTime: dayjs().subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    investigation: '正在调查压片压力设置及颗粒含水量情况'
  },
  {
    id: 'dev-2',
    deviationNo: 'DEV-2026-002',
    title: '原料含量检测偏低',
    description: '阿莫西林原料药含量检测为98.2%，低于标准98.5%',
    type: 'major',
    status: 'qa_review',
    reporter: '王QC',
    reportTime: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
    investigation: '已联系供应商进行复检，确认是否为检测误差',
    correctiveAction: '暂停使用该批次原料，等待复检结果',
    preventiveAction: '加强进厂检验环节，增加取样量'
  }
];

export const mockMaintenanceOrders: MaintenanceWorkOrder[] = [
  {
    id: 'wo-1',
    workOrderNo: 'WO-2026-001',
    equipmentId: 'eq-3',
    equipmentName: '旋转式压片机',
    type: 'preventive',
    description: '定期保养：润滑传动系统、更换磨损冲头、清洁模具',
    status: 'pending',
    team: '设备维修一班',
    assignee: '赵师傅',
    dueDate: dayjs().add(2, 'day').format('YYYY-MM-DD'),
    relatedValidation: '需进行设备再验证'
  },
  {
    id: 'wo-2',
    workOrderNo: 'WO-2026-002',
    equipmentId: 'eq-1',
    equipmentName: '高速压片机',
    type: 'preventive',
    description: '运行500小时例行保养',
    status: 'in_progress',
    team: '设备维修二班',
    assignee: '钱师傅',
    dueDate: dayjs().add(5, 'day').format('YYYY-MM-DD')
  }
];

export const mockChanges: ChangeControl[] = [
  {
    id: 'chg-1',
    changeNo: 'CHG-2026-001',
    title: '变更片剂粘合剂供应商',
    description: '将微晶纤维素供应商从FMC变更为安徽山河药用辅料',
    type: 'material',
    reason: '降低采购成本，同时保证质量标准不降低',
    status: 'qa_review',
    initiator: '孙采购',
    createdAt: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'),
    impactAssessment: {
      productAffected: ['prod-3', 'prod-1'],
      processAffected: ['混合工艺', '制粒工艺'],
      documentAffected: ['物料质量标准', '批生产记录'],
      validationRequired: true,
      stabilityRequired: true
    }
  }
];

export const mockStabilityStudies: StabilityStudy[] = [
  {
    id: 'stab-1',
    studyNo: 'STB-2026-001',
    productId: 'prod-1',
    productName: '阿莫西林胶囊',
    batchNo: 'AMX-20260501-01',
    protocol: '长期稳定性试验方案',
    conditions: '25℃±2℃/60%RH±5%RH',
    testPoints: [0, 3, 6, 9, 12, 18, 24],
    status: 'in_progress',
    startDate: dayjs().subtract(40, 'day').format('YYYY-MM-DD'),
    endDate: dayjs().add(700, 'day').format('YYYY-MM-DD'),
    nextSamplingDate: dayjs().add(50, 'day').format('YYYY-MM-DD'),
    completedTests: 1,
    totalTests: 7
  },
  {
    id: 'stab-2',
    studyNo: 'STB-2026-002',
    productId: 'prod-2',
    productName: '布洛芬缓释胶囊',
    batchNo: 'IBP-20260415-02',
    protocol: '加速稳定性试验方案',
    conditions: '40℃±2℃/75%RH±5%RH',
    testPoints: [0, 1, 2, 3, 6],
    status: 'in_progress',
    startDate: dayjs().subtract(55, 'day').format('YYYY-MM-DD'),
    endDate: dayjs().add(125, 'day').format('YYYY-MM-DD'),
    nextSamplingDate: dayjs().add(5, 'day').format('YYYY-MM-DD'),
    completedTests: 2,
    totalTests: 5
  }
];

export const mockUsers: User[] = [
  { id: 'u-1', name: '管理员', role: 'admin', department: '信息部' },
  { id: 'u-2', name: '张总监', role: 'production_director', department: '生产部' },
  { id: 'u-3', name: '陈QA经理', role: 'qa', department: '质量部' },
  { id: 'u-4', name: '刘主管', role: 'production_supervisor', department: '生产部' },
  { id: 'u-5', name: '李操作员', role: 'operator', department: '生产部' }
];
