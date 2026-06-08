import { create } from 'zustand';
import type {
  ProductionLine, Product, Material, Equipment, SalesOrder,
  ProductionSchedule, Batch, Deviation, MaintenanceWorkOrder,
  ChangeControl, StabilityStudy, User, ProcessParameter
} from '../types';
import {
  mockLines, mockProducts, mockMaterials, mockEquipments, mockSalesOrders,
  mockSchedules, mockBatches, mockDeviations, mockMaintenanceOrders,
  mockChanges, mockStabilityStudies, mockUsers
} from '../data/mockData';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
  lines: ProductionLine[];
  products: Product[];
  materials: Material[];
  equipments: Equipment[];
  salesOrders: SalesOrder[];
  schedules: ProductionSchedule[];
  batches: Batch[];
  deviations: Deviation[];
  maintenanceOrders: MaintenanceWorkOrder[];
  changes: ChangeControl[];
  stabilityStudies: StabilityStudy[];
  users: User[];
  currentUser: User;
  addLine: (line: Omit<ProductionLine, 'id'>) => void;
  updateLine: (id: string, data: Partial<ProductionLine>) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, data: Partial<Product>) => void;
  addMaterial: (material: Omit<Material, 'id'>) => void;
  updateMaterial: (id: string, data: Partial<Material>) => void;
  generateSchedules: (date: string) => ProductionSchedule[];
  updateScheduleStatus: (id: string, status: ProductionSchedule['status'], approver?: string, comment?: string) => void;
  updateWorkstationStatus: (scheduleId: string, station: string, status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'adjust_requested') => void;
  requestScheduleAdjustment: (scheduleId: string, station: string, reason: string) => void;
  updateBatchStatus: (id: string, status: Batch['status']) => void;
  addBatchParameter: (batchId: string, param: Omit<ProcessParameter, 'id' | 'batchId' | 'isDeviation'>) => void;
  addDeviation: (deviation: Omit<Deviation, 'id' | 'deviationNo' | 'status' | 'reportTime'>) => void;
  updateDeviation: (id: string, data: Partial<Deviation>) => void;
  generateMaintenanceOrders: () => void;
  updateMaintenanceStatus: (id: string, status: MaintenanceWorkOrder['status'], verification?: string) => void;
  addChange: (change: Omit<ChangeControl, 'id' | 'changeNo' | 'status' | 'createdAt'>) => void;
  updateChange: (id: string, data: Partial<ChangeControl>) => void;
  updateStabilityStudy: (id: string, data: Partial<StabilityStudy>) => void;
  generateStabilitySchedule: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  lines: mockLines,
  products: mockProducts,
  materials: mockMaterials,
  equipments: mockEquipments,
  salesOrders: mockSalesOrders,
  schedules: mockSchedules,
  batches: mockBatches,
  deviations: mockDeviations,
  maintenanceOrders: mockMaintenanceOrders,
  changes: mockChanges,
  stabilityStudies: mockStabilityStudies,
  users: mockUsers,
  currentUser: mockUsers[1],

  addLine: (line) => set((s) => ({ lines: [...s.lines, { ...line, id: uuidv4() }] })),
  updateLine: (id, data) => set((s) => ({ lines: s.lines.map((l) => (l.id === id ? { ...l, ...data } : l)) })),

  addProduct: (product) => set((s) => ({ products: [...s.products, { ...product, id: uuidv4() }] })),
  updateProduct: (id, data) => set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...data } : p)) })),

  addMaterial: (material) => set((s) => ({ materials: [...s.materials, { ...material, id: uuidv4() }] })),
  updateMaterial: (id, data) => set((s) => ({ materials: s.materials.map((m) => (m.id === id ? { ...m, ...data } : m)) })),

  generateSchedules: (date) => {
    const state = get();
    const pendingOrders = state.salesOrders.filter((o) => o.status === 'pending');
    const availableLines = state.lines.filter((l) => l.status === 'idle' || l.status === 'running');
    const newSchedules: ProductionSchedule[] = [];

    pendingOrders
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .forEach((order) => {
        const matchingLine = availableLines.find((l) => {
          const product = state.products.find((p) => p.id === order.productId);
          return l.dosageForm === product?.dosageForm;
        });
        if (!matchingLine) return;

        const requiredMaterials = state.materials.slice(0, 3).map((m) => ({
          materialId: m.id,
          materialName: m.name,
          required: Math.ceil(order.quantity / 10000),
          available: m.quantity,
          sufficient: m.quantity >= Math.ceil(order.quantity / 10000)
        }));
        const materialCheck = requiredMaterials.every((m) => m.sufficient);

        const cleaningTime = matchingLine.lastProduct && matchingLine.lastProduct !== order.productName ? 4 : 2;

        const schedule: ProductionSchedule = {
          id: uuidv4(),
          date,
          lineId: matchingLine.id,
          lineCode: matchingLine.code,
          productId: order.productId,
          productName: order.productName,
          batchNo: `${order.productName.substring(0, 3).toUpperCase()}-${dayjs(date).format('YYYYMMDD')}-${String(newSchedules.length + 1).padStart(2, '0')}`,
          plannedQuantity: order.quantity,
          startTime: dayjs(date).set('hour', 8).format('YYYY-MM-DD HH:mm:ss'),
          endTime: dayjs(date).set('hour', 20).add(cleaningTime, 'hour').format('YYYY-MM-DD HH:mm:ss'),
          setupTime: 2,
          cleaningTime,
          materialCheck,
          materialItems: requiredMaterials,
          status: 'draft',
          createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          createdBy: state.currentUser.name,
          workstationStatus: { '备料': 'pending', '制粒': 'pending', '压片': 'pending', '包装': 'pending' }
        };
        newSchedules.push(schedule);
      });

    set((s) => ({ schedules: [...s.schedules, ...newSchedules] }));
    return newSchedules;
  },

  updateScheduleStatus: (id, status, approver, comment) => {
    set((s) => ({
      schedules: s.schedules.map((sch) => {
        const updated = { ...sch, status };
        if (approver) updated.approver = approver;
        if (comment) updated.approvalComment = comment;
        if (status === 'published') {
          const existingBatch = s.batches.find((b) => b.scheduleId === id);
          if (!existingBatch) {
            const newBatch: Batch = {
              id: uuidv4(),
              batchNo: sch.batchNo,
              productId: sch.productId,
              productName: sch.productName,
              scheduleId: id,
              lineId: sch.lineId,
              plannedQuantity: sch.plannedQuantity,
              status: 'scheduled',
              parameters: [],
              deviationIds: [],
              createdBy: approver || '系统'
            };
            set((st) => ({ batches: [...st.batches, newBatch] }));
          }
        }
        return updated;
      })
    }));
  },

  updateWorkstationStatus: (scheduleId, station, status) => {
    set((s) => ({
      schedules: s.schedules.map((sch) =>
        sch.id === scheduleId
          ? { ...sch, workstationStatus: { ...sch.workstationStatus, [station]: status } }
          : sch
      )
    }));
  },

  requestScheduleAdjustment: (scheduleId, station, reason) => {
    set((s) => ({
      schedules: s.schedules.map((sch) =>
        sch.id === scheduleId
          ? { ...sch, workstationStatus: { ...sch.workstationStatus, [station]: 'adjust_requested' }, approvalComment: reason }
          : sch
      )
    }));
  },

  updateBatchStatus: (id, status) => {
    set((s) => {
      const batch = s.batches.find((b) => b.id === id);
      const updates: Partial<Batch> = { status };
      if (status === 'preparing' && !batch?.startTime) updates.startTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
      if (status === 'released' || status === 'rejected') updates.endTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
      return { batches: s.batches.map((b) => (b.id === id ? { ...b, ...updates } : b)) };
    });
  },

  addBatchParameter: (batchId, param) => {
    const isDeviation = param.value < param.minLimit || param.value > param.maxLimit;
    const newParam: ProcessParameter = {
      ...param,
      id: uuidv4(),
      batchId,
      isDeviation
    };
    set((s) => {
      const updates: { batches: Batch[]; deviations?: Deviation[] } = {
        batches: s.batches.map((b) =>
          b.id === batchId ? { ...b, parameters: [...b.parameters, newParam] } : b
        )
      };
      if (isDeviation) {
        const newDeviation: Deviation = {
          id: uuidv4(),
          deviationNo: `DEV-${dayjs().format('YYYY')}-${String(s.deviations.length + 1).padStart(3, '0')}`,
          batchId,
          batchNo: s.batches.find((b) => b.id === batchId)?.batchNo,
          title: `工艺参数偏差：${param.name}`,
          description: `${param.name}实测值${param.value}${param.unit}，超出范围${param.minLimit}-${param.maxLimit}${param.unit}`,
          type: 'minor',
          status: 'reported',
          reporter: s.currentUser.name,
          reportTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
        };
        updates.deviations = [...s.deviations, newDeviation];
        updates.batches = updates.batches.map((b) =>
          b.id === batchId ? { ...b, deviationIds: [...b.deviationIds, newDeviation.id] } : b
        );
      }
      return updates;
    });
  },

  addDeviation: (deviation) => {
    const state = get();
    const newDev: Deviation = {
      ...deviation,
      id: uuidv4(),
      deviationNo: `DEV-${dayjs().format('YYYY')}-${String(state.deviations.length + 1).padStart(3, '0')}`,
      status: 'reported',
      reportTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
    };
    set((s) => ({ deviations: [...s.deviations, newDev] }));
  },

  updateDeviation: (id, data) => set((s) => ({ deviations: s.deviations.map((d) => (d.id === id ? { ...d, ...data } : d)) })),

  generateMaintenanceOrders: () => {
    const state = get();
    const newOrders: MaintenanceWorkOrder[] = [];
    state.equipments.forEach((eq) => {
      if (dayjs(eq.nextMaintenanceDate).isBefore(dayjs().add(7, 'day'))) {
        const existing = state.maintenanceOrders.find(
          (m) => m.equipmentId === eq.id && (m.status === 'pending' || m.status === 'in_progress')
        );
        if (!existing) {
          newOrders.push({
            id: uuidv4(),
            workOrderNo: `WO-${dayjs().format('YYYYMM')}-${String(state.maintenanceOrders.length + newOrders.length + 1).padStart(3, '0')}`,
            equipmentId: eq.id,
            equipmentName: eq.name,
            type: 'preventive',
            description: `${eq.name}运行${eq.runningHours}小时，按计划进行预防性维护保养`,
            status: 'pending',
            team: '设备维修一班',
            assignee: '赵师傅',
            dueDate: eq.nextMaintenanceDate,
            relatedValidation: dayjs(eq.validationExpiryDate).isBefore(dayjs().add(30, 'day')) ? '需进行设备验证' : undefined
          });
        }
      }
    });
    set((s) => ({ maintenanceOrders: [...s.maintenanceOrders, ...newOrders] }));
  },

  updateMaintenanceStatus: (id, status, verification) => {
    set((s) => ({
      maintenanceOrders: s.maintenanceOrders.map((wo) => {
        const updated = { ...wo, status };
        if (status === 'completed') updated.completedDate = dayjs().format('YYYY-MM-DD');
        if (verification) updated.verificationResult = verification;
        return updated;
      })
    }));
  },

  addChange: (change) => {
    const state = get();
    const newChg: ChangeControl = {
      ...change,
      id: uuidv4(),
      changeNo: `CHG-${dayjs().format('YYYY')}-${String(state.changes.length + 1).padStart(3, '0')}`,
      status: 'draft',
      createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
    };
    set((s) => ({ changes: [...s.changes, newChg] }));
  },

  updateChange: (id, data) => set((s) => ({ changes: s.changes.map((c) => (c.id === id ? { ...c, ...data } : c)) })),

  updateStabilityStudy: (id, data) => set((s) => ({ stabilityStudies: s.stabilityStudies.map((st) => (st.id === id ? { ...st, ...data } : st)) })),

  generateStabilitySchedule: () => {
    const state = get();
    const newStudies: StabilityStudy[] = [];
    state.batches
      .filter((b) => b.status === 'released')
      .forEach((batch) => {
        const product = state.products.find((p) => p.id === batch.productId);
        if (!product) return;
        const existing = state.stabilityStudies.find((s) => s.batchNo === batch.batchNo);
        if (!existing) {
          newStudies.push({
            id: uuidv4(),
            studyNo: `STB-${dayjs().format('YYYY')}-${String(state.stabilityStudies.length + newStudies.length + 1).padStart(3, '0')}`,
            productId: product.id,
            productName: product.name,
            batchNo: batch.batchNo,
            protocol: '长期稳定性试验方案',
            conditions: '25℃±2℃/60%RH±5%RH',
            testPoints: [0, 3, 6, 9, 12, 18, 24],
            status: 'planned',
            startDate: dayjs(batch.endTime || undefined).format('YYYY-MM-DD'),
            endDate: dayjs(batch.endTime || undefined).add(product.shelfLife, 'month').format('YYYY-MM-DD'),
            nextSamplingDate: dayjs(batch.endTime || undefined).add(3, 'month').format('YYYY-MM-DD'),
            completedTests: 0,
            totalTests: 7
          });
        }
      });
    set((s) => ({ stabilityStudies: [...s.stabilityStudies, ...newStudies] }));
  }
}));
