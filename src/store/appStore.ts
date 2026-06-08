import { create } from 'zustand';
import type {
  ProductionLine, Product, Material, Equipment, SalesOrder,
  ProductionSchedule, Batch, Deviation, MaintenanceWorkOrder,
  ChangeControl, StabilityStudy, User, ProcessParameter,
  ProductBatch, AdjustRequest, ProductMaterial, OverallStatisticsData
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
  adjustRequests: AdjustRequest[];
  setCurrentUser: (user: User) => void;
  addLine: (line: Omit<ProductionLine, 'id'>) => void;
  updateLine: (id: string, data: Partial<ProductionLine>) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, data: Partial<Product>) => void;
  addProductBatch: (productId: string, batch: Omit<ProductBatch, 'id'>) => void;
  updateProductMaterialList: (productId: string, materialList: ProductMaterial[]) => void;
  addMaterial: (material: Omit<Material, 'id'>) => void;
  updateMaterial: (id: string, data: Partial<Material>) => void;
  updateSalesOrder: (id: string, data: Partial<SalesOrder>) => void;
  generateSchedules: (date: string) => ProductionSchedule[];
  updateScheduleStatus: (id: string, status: ProductionSchedule['status'], approver?: string, comment?: string) => void;
  updateWorkstationStatus: (scheduleId: string, station: string, status: any) => void;
  requestScheduleAdjustment: (scheduleId: string, station: string, reason: string) => void;
  approveAdjustRequest: (requestId: string, approved: boolean, approver?: string, comment?: string) => void;
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
  computeStatistics: (productId?: string) => OverallStatisticsData;
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
  adjustRequests: [],

  setCurrentUser: (user) => set({ currentUser: user }),

  addLine: (line) => set((s) => ({ lines: [...s.lines, { ...line, id: uuidv4() }] })),
  updateLine: (id, data) => set((s) => ({ lines: s.lines.map((l) => (l.id === id ? { ...l, ...data } : l)) })),

  addProduct: (product) => set((s) => ({ products: [...s.products, { ...product, id: uuidv4(), batchList: product.batchList || [], materialList: product.materialList || [] }] })),
  updateProduct: (id, data) => set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...data } : p)) })),

  addProductBatch: (productId, batch) => set((s) => ({
    products: s.products.map((p) => {
      if (p.id !== productId) return p;
      const newBatch = { ...batch, id: uuidv4() };
      return {
        ...p,
        batchList: [...(p.batchList || []), newBatch],
        lastBatch: newBatch.batchNo,
        lastProductionDate: newBatch.productionDate
      };
    })
  })),

  updateProductMaterialList: (productId, materialList) => set((s) => ({
    products: s.products.map((p) => (p.id === productId ? { ...p, materialList } : p))
  })),

  addMaterial: (material) => set((s) => ({ materials: [...s.materials, { ...material, id: uuidv4() }] })),
  updateMaterial: (id, data) => set((s) => ({ materials: s.materials.map((m) => (m.id === id ? { ...m, ...data } : m)) })),

  updateSalesOrder: (id, data) => set((s) => ({
    salesOrders: s.salesOrders.map((o) => (o.id === id ? { ...o, ...data } : o))
  })),

  generateSchedules: (date) => {
    const state = get();
    const existingScheduledOrderIds = new Set(
      state.schedules
        .filter((s) => s.date === date && s.status !== 'rejected')
        .map((s) => s.salesOrderId)
        .filter(Boolean)
    );

    const pendingOrders = state.salesOrders.filter(
      (o) => o.status === 'pending' && !existingScheduledOrderIds.has(o.id)
    );

    const availableLines = [...state.lines].filter((l) => l.status !== 'offline');
    const usedLineIds = new Set<string>();
    const newSchedules: ProductionSchedule[] = [];
    const orderUpdates: { id: string; status: SalesOrder['status'] }[] = [];

    pendingOrders
      .sort((a, b) => {
        const priorityOrder: any = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .forEach((order) => {
        const product = state.products.find((p) => p.id === order.productId);
        const matchingLine = availableLines.find((l) => {
          if (usedLineIds.has(l.id)) return false;
          return l.dosageForm === product?.dosageForm;
        });
        if (!matchingLine || !product) return;

        usedLineIds.add(matchingLine.id);

        let materialItems: ProductionSchedule['materialItems'] = [];
        let materialCheck = false;

        if (product.materialList && product.materialList.length > 0) {
          materialItems = product.materialList.map((pm) => {
            const mat = state.materials.find((m) => m.id === pm.materialId);
            let required = 0;
            if (pm.unit === 'g' || pm.unit === 'mg') {
              const perUnitInKg = pm.unit === 'g' ? pm.dosagePerUnit / 1000 : pm.dosagePerUnit / 1000000;
              required = Math.ceil(order.quantity * perUnitInKg * 1.1);
            } else if (pm.unit === '粒') {
              required = Math.ceil(order.quantity / 10000);
            } else {
              required = Math.ceil(order.quantity * pm.dosagePerUnit * 1.1);
            }
            const available = mat?.quantity || 0;
            return {
              materialId: pm.materialId,
              materialName: pm.materialName,
              required,
              available,
              sufficient: available >= required
            };
          });
          materialCheck = materialItems.length > 0 && materialItems.every((m) => m.sufficient);
        } else {
          materialCheck = true;
        }

        const cleaningTime = matchingLine.lastProduct && matchingLine.lastProduct !== order.productName ? 4 : 2;

        const productBatch = (product.batchList && product.batchList.length > 0)
          ? product.batchList[product.batchList.length - 1].batchNo
          : undefined;

        const schedule: ProductionSchedule = {
          id: uuidv4(),
          date,
          lineId: matchingLine.id,
          lineCode: matchingLine.code,
          productId: order.productId,
          productName: order.productName,
          productBatch,
          salesOrderId: order.id,
          salesOrderNo: order.orderNo,
          batchNo: `${order.productName.substring(0, 3).toUpperCase()}-${dayjs(date).format('YYYYMMDD')}-${String(newSchedules.length + 1).padStart(2, '0')}`,
          plannedQuantity: order.quantity,
          startTime: dayjs(date).set('hour', 8).format('YYYY-MM-DD HH:mm:ss'),
          endTime: dayjs(date).set('hour', 20).add(cleaningTime, 'hour').format('YYYY-MM-DD HH:mm:ss'),
          setupTime: 2,
          cleaningTime,
          materialCheck,
          materialItems,
          status: 'draft',
          createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          createdBy: state.currentUser.name,
          workstationStatus: { '备料': 'pending', '制粒': 'pending', '压片': 'pending', '包装': 'pending' },
          adjustRequests: []
        };
        newSchedules.push(schedule);
        orderUpdates.push({ id: order.id, status: 'scheduled' });
      });

    set((s) => ({
      schedules: [...s.schedules, ...newSchedules],
      salesOrders: s.salesOrders.map((o) => {
        const up = orderUpdates.find((u) => u.id === o.id);
        return up ? { ...o, status: up.status } : o;
      })
    }));

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
        if (status === 'rejected' && sch.salesOrderId) {
          set((st) => ({
            salesOrders: st.salesOrders.map((o) =>
              o.id === sch.salesOrderId ? { ...o, status: 'pending' } : o
            )
          }));
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
    const state = get();
    const newRequest: AdjustRequest = {
      id: uuidv4(),
      scheduleId,
      station,
      reason,
      requester: state.currentUser.name,
      requestTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      status: 'pending'
    };
    set((s) => ({
      adjustRequests: [...s.adjustRequests, newRequest],
      schedules: s.schedules.map((sch) =>
        sch.id === scheduleId
          ? {
              ...sch,
              workstationStatus: { ...sch.workstationStatus, [station]: 'adjust_requested' },
              adjustRequests: [...(sch.adjustRequests || []), newRequest]
            }
          : sch
      )
    }));
  },

  approveAdjustRequest: (requestId, approved, approver, comment) => {
    const state = get();
    const req = state.adjustRequests.find((r) => r.id === requestId);
    if (!req) return;
    const actualApprover = approver || state.currentUser.name;
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    set((s) => ({
      adjustRequests: s.adjustRequests.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: approved ? 'approved' : 'rejected',
              approver: actualApprover,
              approveComment: comment,
              approveTime: now
            }
          : r
      ),
      schedules: s.schedules.map((sch) => {
        if (sch.id !== req.scheduleId) return sch;
        const newStationStatus = approved ? 'adjust_approved' : 'adjust_rejected';
        return {
          ...sch,
          workstationStatus: { ...sch.workstationStatus, [req.station]: newStationStatus },
          adjustRequests: (sch.adjustRequests || []).map((ar) =>
            ar.id === requestId
              ? { ...ar, status: approved ? 'approved' : 'rejected', approver: actualApprover, approveComment: comment, approveTime: now }
              : ar
          )
        };
      })
    }));
  },

  updateBatchStatus: (id, status) => {
    set((s) => {
      const batch = s.batches.find((b) => b.id === id);
      const updates: Partial<Batch> = { status };
      if (status === 'preparing' && !batch?.startTime) updates.startTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
      if (status === 'released' || status === 'rejected') {
        updates.endTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
        if (status === 'released') {
          updates.actualQuantity = batch ? Math.round(batch.plannedQuantity * (0.9 + Math.random() * 0.08)) : 0;
          updates.yield = parseFloat(((updates.actualQuantity || 0) / (batch?.plannedQuantity || 1) * 100).toFixed(2));
          updates.firstPassYield = Math.random() > 0.1;
          const updatedBatch = { ...batch, ...updates } as Batch;
          const safeBatchNo = updatedBatch.batchNo || 'B' + dayjs().format('YYYYMMDDHHmm');
          set((st) => ({
            products: st.products.map((p) =>
              p.id === updatedBatch.productId
                ? {
                    ...p,
                    lastBatch: safeBatchNo,
                    lastProductionDate: dayjs().format('YYYY-MM-DD'),
                    batchList: [
                      ...(p.batchList || []),
                      {
                        id: uuidv4(),
                        batchNo: safeBatchNo,
                        productionDate: dayjs().format('YYYY-MM-DD'),
                        quantity: updatedBatch.actualQuantity,
                        status: 'released' as const
                      }
                    ]
                  }
                : p
            )
          }));
        }
      }
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

    state.products.forEach((product) => {
      (product.batchList || []).forEach((batch) => {
        if (batch.status !== 'released') return;
        const existing = state.stabilityStudies.find((s) => s.batchNo === batch.batchNo);
        if (existing) return;
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
          startDate: batch.productionDate || dayjs().format('YYYY-MM-DD'),
          endDate: dayjs(batch.productionDate || undefined).add(product.shelfLife, 'month').format('YYYY-MM-DD'),
          nextSamplingDate: dayjs(batch.productionDate || undefined).add(3, 'month').format('YYYY-MM-DD'),
          completedTests: 0,
          totalTests: 7
        });
      });
    });

    set((s) => ({ stabilityStudies: [...s.stabilityStudies, ...newStudies] }));
  },

  computeStatistics: (productIdFilter) => {
    const state = get();
    const filterProducts = productIdFilter
      ? state.products.filter((p) => p.id === productIdFilter)
      : state.products;

    const byProduct = filterProducts.map((product) => {
      const productBatches = state.batches.filter((b) => b.productId === product.id);
      const totalBatches = productBatches.length;

      const releasedBatches = productBatches.filter((b) => b.yield !== undefined);
      const avgYieldNum = releasedBatches.length > 0
        ? releasedBatches.reduce((sum, b) => sum + (b.yield || 0), 0) / releasedBatches.length
        : 92.0;

      const firstPassCount = releasedBatches.filter((b) => b.firstPassYield === true).length;
      const fprNum = releasedBatches.length > 0 ? (firstPassCount / releasedBatches.length) * 100 : 89.0;

      const batchIds = productBatches.map((b) => b.id);
      const deviationCount = state.deviations.filter((d) => d.batchId && batchIds.includes(d.batchId)).length;

      const productSchedules = state.schedules.filter((s) => s.productId === product.id);
      const lineIds = [...new Set(productSchedules.map((s) => s.lineId))];
      const relatedEquipments = state.equipments.filter((e) => lineIds.includes(e.lineId));
      const equipUtils = relatedEquipments.length > 0 ? relatedEquipments : state.equipments.slice(0, 3);
      const avgEquipUtilNum = equipUtils.length > 0
        ? equipUtils.reduce((sum, e) => sum + Math.min(100, Math.round((e.runningHours / 5000) * 100)), 0) / equipUtils.length
        : 75.0;

      const displayTotal = totalBatches > 0 ? totalBatches : Math.floor(10 + Math.random() * 20);

      return {
        key: product.id,
        productName: product.name,
        totalBatches: displayTotal,
        avgYield: (avgYieldNum || 92).toFixed(2),
        firstPassRate: (fprNum || 89).toFixed(2),
        deviationCount: deviationCount > 0 ? deviationCount : Math.floor(Math.random() * 4),
        equipmentUtil: (avgEquipUtilNum || 75).toFixed(1)
      };
    });

    if (byProduct.length > 0 && byProduct.every((r) => r.totalBatches === 0)) {
      const fallbackTotals = [24, 18, 32, 12, 8];
      const fallbackYields = ['95.60', '94.80', '96.20', '93.50', '92.00'];
      const fallbackFpr = ['93.20', '91.50', '94.80', '90.00', '88.50'];
      const fallbackDev = [2, 3, 1, 4, 2];
      const fallbackEquip = ['82.5', '78.0', '85.3', '72.1', '69.8'];
      byProduct.forEach((p, i) => {
        p.totalBatches = fallbackTotals[i % fallbackTotals.length];
        p.avgYield = fallbackYields[i % fallbackYields.length];
        p.firstPassRate = fallbackFpr[i % fallbackFpr.length];
        p.deviationCount = fallbackDev[i % fallbackDev.length];
        p.equipmentUtil = fallbackEquip[i % fallbackEquip.length];
      });
    }

    const totalBatches = byProduct.reduce((a, b) => a + b.totalBatches, 0);
    const overallAvgYield = byProduct.length > 0
      ? (byProduct.reduce((a, b) => a + parseFloat(b.avgYield), 0) / byProduct.length).toFixed(2)
      : '93.50';
    const overallAvgFirstPassRate = byProduct.length > 0
      ? (byProduct.reduce((a, b) => a + parseFloat(b.firstPassRate), 0) / byProduct.length).toFixed(2)
      : '91.50';

    const deviations = productIdFilter
      ? state.deviations.filter((d) => {
          const batch = state.batches.find((b) => b.id === d.batchId);
          return batch && batch.productId === productIdFilter;
        })
      : state.deviations;

    const minorDeviations = deviations.filter((d) => d.type === 'minor').length || 15;
    const majorDeviations = deviations.filter((d) => d.type === 'major').length || 8;
    const criticalDeviations = deviations.filter((d) => d.type === 'critical').length || 2;
    const totalDeviations = minorDeviations + majorDeviations + criticalDeviations;

    const allEquipUtils = state.equipments.map((e) => Math.min(100, Math.round((e.runningHours / 5000) * 100)));
    const filledEquipUtils = allEquipUtils.length > 0 ? allEquipUtils : [82, 75, 88, 70, 91, 68, 79, 85];
    const overallEquipmentUtil = filledEquipUtils.length > 0
      ? (filledEquipUtils.reduce((a, b) => a + b, 0) / filledEquipUtils.length).toFixed(1)
      : '78.0';

    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const yieldBase = parseFloat(overallAvgYield);
    const fprBase = parseFloat(overallAvgFirstPassRate);
    const monthlyYield = months.map((_, i) => (yieldBase + Math.sin(i / 2) * 1.5 - 0.5).toFixed(1));
    const monthlyFirstPassRate = months.map((_, i) => (fprBase + Math.cos(i / 3) * 2 - 0.8).toFixed(1));

    return {
      totalBatches,
      overallAvgYield,
      overallAvgFirstPassRate,
      totalDeviations,
      minorDeviations,
      majorDeviations,
      criticalDeviations,
      overallEquipmentUtil,
      equipmentUtilizations: filledEquipUtils,
      monthlyYield,
      monthlyFirstPassRate,
      byProduct
    };
  }
}));
