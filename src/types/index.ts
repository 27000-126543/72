export type LineStatus = 'running' | 'idle' | 'maintenance' | 'cleaning' | 'offline';
export type DosageForm = 'tablet' | 'capsule' | 'injection' | 'suspension' | 'ointment';
export type BatchStatus = 'scheduled' | 'preparing' | 'granulating' | 'compressing' | 'packaging' | 'qc_pending' | 'released' | 'rejected';
export type OrderStatus = 'pending' | 'scheduled' | 'in_production' | 'completed' | 'cancelled';
export type DeviationStatus = 'reported' | 'investigating' | 'corrective_action' | 'qa_review' | 'approved' | 'closed';
export type ScheduleStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'published';
export type MaintenanceStatus = 'pending' | 'in_progress' | 'completed' | 'verified';
export type ChangeStatus = 'draft' | 'submitted' | 'assessing' | 'qa_review' | 'approved' | 'rejected' | 'implemented' | 'closed';
export type StabilityStatus = 'planned' | 'in_progress' | 'completed' | 'expired';
export type WorkStationStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'adjust_requested';

export interface ProductionLine {
  id: string;
  code: string;
  name: string;
  dosageForm: DosageForm;
  capacity: number;
  status: LineStatus;
  lastProduct?: string;
  lastBatch?: string;
  cleaningDeadline?: string;
  location: string;
  workshop: string;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  dosageForm: DosageForm;
  specification: string;
  standard: string;
  shelfLife: number;
  lastBatch?: string;
  lastProductionDate?: string;
}

export interface Material {
  id: string;
  code: string;
  name: string;
  type: 'raw' | 'auxiliary' | 'packaging';
  specification: string;
  unit: string;
  quantity: number;
  safetyStock: number;
  supplier: string;
  batchNumber?: string;
  expiryDate?: string;
}

export interface Equipment {
  id: string;
  code: string;
  name: string;
  model: string;
  lineId: string;
  runningHours: number;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  maintenanceIntervalHours: number;
  validationExpiryDate: string;
  status: 'normal' | 'warning' | 'critical' | 'maintenance';
}

export interface SalesOrder {
  id: string;
  orderNo: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  deliveryDate: string;
  customer: string;
  status: OrderStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
}

export interface ProductionSchedule {
  id: string;
  date: string;
  lineId: string;
  lineCode: string;
  productId: string;
  productName: string;
  batchNo: string;
  plannedQuantity: number;
  startTime: string;
  endTime: string;
  setupTime: number;
  cleaningTime: number;
  materialCheck: boolean;
  materialItems: { materialId: string; materialName: string; required: number; available: number; sufficient: boolean }[];
  status: ScheduleStatus;
  approver?: string;
  approvalComment?: string;
  createdAt: string;
  createdBy: string;
  workstationStatus?: { [key: string]: WorkStationStatus };
}

export interface Batch {
  id: string;
  batchNo: string;
  productId: string;
  productName: string;
  scheduleId: string;
  lineId: string;
  plannedQuantity: number;
  actualQuantity?: number;
  yield?: number;
  firstPassYield?: boolean;
  status: BatchStatus;
  startTime?: string;
  endTime?: string;
  parameters: ProcessParameter[];
  deviationIds: string[];
  createdBy: string;
}

export interface ProcessParameter {
  id: string;
  batchId: string;
  name: string;
  unit: string;
  value: number;
  minLimit: number;
  maxLimit: number;
  timestamp: string;
  isDeviation: boolean;
}

export interface Deviation {
  id: string;
  deviationNo: string;
  batchId?: string;
  batchNo?: string;
  title: string;
  description: string;
  type: 'minor' | 'major' | 'critical';
  status: DeviationStatus;
  reporter: string;
  reportTime: string;
  investigation?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  qaApprover?: string;
  qaDecision?: 'approved' | 'rejected' | 'additional_info';
  qaComment?: string;
  closedTime?: string;
}

export interface MaintenanceWorkOrder {
  id: string;
  workOrderNo: string;
  equipmentId: string;
  equipmentName: string;
  type: 'preventive' | 'corrective' | 'calibration';
  description: string;
  status: MaintenanceStatus;
  team: string;
  assignee: string;
  dueDate: string;
  completedDate?: string;
  verificationResult?: string;
  relatedValidation?: string;
}

export interface ChangeControl {
  id: string;
  changeNo: string;
  title: string;
  description: string;
  type: 'process' | 'equipment' | 'material' | 'documentation' | 'facility';
  reason: string;
  status: ChangeStatus;
  initiator: string;
  createdAt: string;
  impactAssessment: {
    productAffected: string[];
    processAffected: string[];
    documentAffected: string[];
    validationRequired: boolean;
    stabilityRequired: boolean;
  };
  approver?: string;
  implementationDate?: string;
  closedDate?: string;
}

export interface StabilityStudy {
  id: string;
  studyNo: string;
  productId: string;
  productName: string;
  batchNo: string;
  protocol: string;
  conditions: string;
  testPoints: number[];
  status: StabilityStatus;
  startDate: string;
  endDate: string;
  nextSamplingDate: string;
  completedTests: number;
  totalTests: number;
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'production_director' | 'qa' | 'production_supervisor' | 'operator' | 'maintenance';
  department: string;
}

export interface StatisticsData {
  productId: string;
  productName: string;
  totalBatches: number;
  averageYield: number;
  firstPassRate: number;
  deviationCount: number;
  equipmentUtilization: { [key: string]: number };
  period: string;
}
