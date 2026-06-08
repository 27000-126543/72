import { useState } from 'react';
import {
  Row, Col, Card, Table, Button, DatePicker, Tag, Space, Modal, Form,
  Input, Select, Steps, Descriptions, message, App, Popconfirm, InputNumber, List, Avatar, Timeline, Tabs, Alert
} from 'antd';
import {
  ThunderboltOutlined, CheckOutlined, CloseOutlined, ReloadOutlined,
  ClockCircleOutlined, SendOutlined, CalendarOutlined, TeamOutlined,
  WarningOutlined, ExclamationCircleOutlined, FileTextOutlined, SafetyOutlined
} from '@ant-design/icons';
import { useAppStore } from '../store/appStore';
import type { ProductionSchedule, AdjustRequest } from '../types';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Step } = Steps;
const { TabPane } = Tabs;

const roleText: any = {
  admin: '系统管理员',
  production_director: '生产总监',
  qa: 'QA质量保证',
  production_supervisor: '生产主管',
  operator: '操作员',
  maintenance: '设备维修'
};

const ProductionScheduling: React.FC = () => {
  const { message: msg } = App.useApp();
  const { schedules, salesOrders, lines, products, materials, generateSchedules, updateScheduleStatus, updateWorkstationStatus, requestScheduleAdjustment, approveAdjustRequest, currentUser, adjustRequests } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ProductionSchedule | null>(null);
  const [viewMode, setViewMode] = useState<'scheduler' | 'workstation'>('scheduler');
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustStation, setAdjustStation] = useState('');
  const [adjustForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('schedule');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [pendingAdjust, setPendingAdjust] = useState<AdjustRequest | null>(null);
  const [rejectForm] = Form.useForm();
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signaturePassword, setSignaturePassword] = useState('');
  const [signatureAction, setSignatureAction] = useState<(() => void) | null>(null);
  const [signatureTitle, setSignatureTitle] = useState('');
  const [pendingApproveId, setPendingApproveId] = useState<string | null>(null);
  const [pendingApproved, setPendingApproved] = useState<boolean>(true);
  const [pendingPublishId, setPendingPublishId] = useState<string | null>(null);

  const requireSignature = (title: string, action: () => void) => {
    setSignatureTitle(title);
    setSignatureAction(() => action);
    setSignaturePassword('');
    setSignatureModalOpen(true);
  };

  const confirmSignature = () => {
    if (signaturePassword !== 'gmp123') {
      msg.error('签名口令错误，默认口令: gmp123');
      return;
    }
    if (signatureAction) signatureAction();
    setSignatureModalOpen(false);
    setSignaturePassword('');
    setSignatureAction(null);
  };

  const handleGenerate = () => {
    const newSchedules = generateSchedules(selectedDate);
    if (newSchedules.length > 0) {
      msg.success(`成功生成 ${newSchedules.length} 条排程（已跳过已排程订单）`);
    } else {
      msg.info('暂无未排程的销售订单，或物料/设备不满足');
    }
  };

  const handleApprove = (id: string, approved: boolean) => {
    setPendingApproveId(id);
    setPendingApproved(approved);
    requireSignature(approved ? '排程审批通过电子签名' : '排程驳回电子签名', () => {
      updateScheduleStatus(id, approved ? 'approved' : 'rejected', currentUser.name, approved ? '审批通过' : '排程不符合要求');
      msg.success(approved ? '审批通过' : '已驳回');
      setPendingApproveId(null);
    });
  };

  const handlePublish = (id: string) => {
    setPendingPublishId(id);
    requireSignature('排程发布电子签名', () => {
      updateScheduleStatus(id, 'published', currentUser.name);
      msg.success('排程已发布至工段终端');
      setPendingPublishId(null);
    });
  };

  const handleAcceptWork = (station: string) => {
    if (!selectedSchedule) return;
    updateWorkstationStatus(selectedSchedule.id, station, 'in_progress');
    msg.success(`已确认开始${station}`);
  };

  const handleCompleteWork = (station: string) => {
    if (!selectedSchedule) return;
    updateWorkstationStatus(selectedSchedule.id, station, 'completed');
    msg.success(`${station}完成`);
  };

  const handleRequestAdjust = (station: string) => {
    setAdjustStation(station);
    adjustForm.resetFields();
    setAdjustModalOpen(true);
  };

  const submitAdjustRequest = async () => {
    const values = await adjustForm.validateFields();
    if (!selectedSchedule) return;
    requestScheduleAdjustment(selectedSchedule.id, adjustStation, values.reason);
    msg.success('调整申请已提交，等待主管审批');
    setAdjustModalOpen(false);
  };

  const openDetail = (sch: ProductionSchedule) => {
    setSelectedSchedule(sch);
    setDetailModalOpen(true);
  };

  const handleApproveAdjust = (req: AdjustRequest) => {
    approveAdjustRequest(req.id, true, currentUser.name, '同意调整');
    msg.success('已通过调整申请');
  };

  const openRejectModal = (req: AdjustRequest) => {
    setPendingAdjust(req);
    rejectForm.resetFields();
    setRejectModalOpen(true);
  };

  const submitReject = async () => {
    const values = await rejectForm.validateFields();
    if (!pendingAdjust) return;
    approveAdjustRequest(pendingAdjust.id, false, currentUser.name, values.comment);
    msg.success('已驳回调整申请');
    setRejectModalOpen(false);
  };

  const pendingAdjustCount = adjustRequests.filter((r) => r.status === 'pending').length;

  const scheduleColumns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 110 },
    { title: '销售订单', key: 'so', width: 130, render: (_: any, rec: ProductionSchedule) => (
      <Space direction="vertical" size={0}>
        <Tag color="blue">{rec.salesOrderNo || '-'}</Tag>
      </Space>
    )},
    { title: '生产线', dataIndex: 'lineCode', key: 'lineCode', width: 110 },
    { title: '产品', dataIndex: 'productName', key: 'productName' },
    { title: '批号', key: 'batch', width: 150, render: (_: any, rec: ProductionSchedule) => (
      <Space direction="vertical" size={0}>
        <strong>{rec.batchNo}</strong>
        {rec.productBatch && <span style={{ color: '#8c8c8c', fontSize: 11 }}>关联: {rec.productBatch}</span>}
      </Space>
    )},
    { title: '计划产量', dataIndex: 'plannedQuantity', key: 'plannedQuantity', render: (v: number) => v.toLocaleString() },
    { title: '开始时间', dataIndex: 'startTime', key: 'startTime', width: 130, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    { title: '清洗切换', dataIndex: 'cleaningTime', key: 'cleaningTime', width: 90, render: (v: number) => v >= 4 ? <Tag color="green">{v}h ✓</Tag> : <Tag color="orange">{v}h</Tag> },
    { title: '物料齐套', dataIndex: 'materialCheck', key: 'materialCheck', render: (v: boolean) => v ? <Tag color="green"><CheckOutlined /> 已齐套</Tag> : <Tag color="red"><ExclamationCircleOutlined /> 缺料</Tag> },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => {
      const map: any = { draft: { color: 'default', text: '草稿' }, pending_approval: { color: 'orange', text: '待审批' }, approved: { color: 'blue', text: '已批准' }, rejected: { color: 'red', text: '已驳回' }, published: { color: 'green', text: '已发布' } };
      return <Tag color={map[s]?.color}>{map[s]?.text}</Tag>;
    }},
    { title: '操作', key: 'action', fixed: 'right' as const, width: 200, render: (_: any, rec: ProductionSchedule) => (
      <Space>
        <Button size="small" onClick={() => openDetail(rec)}>详情</Button>
        {rec.status === 'draft' && currentUser.role === 'production_director' && (
          <Button size="small" type="primary" onClick={() => updateScheduleStatus(rec.id, 'pending_approval')}>提交审批</Button>
        )}
        {rec.status === 'pending_approval' && currentUser.role === 'production_director' && (
          <>
            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleApprove(rec.id, true)}>通过</Button>
            <Button size="small" danger icon={<CloseOutlined />} onClick={() => handleApprove(rec.id, false)}>驳回</Button>
          </>
        )}
        {rec.status === 'approved' && currentUser.role === 'production_director' && (
          <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => handlePublish(rec.id)}>发布</Button>
        )}
      </Space>
    )}
  ];

  const ganttHours = Array.from({ length: 24 }, (_, i) => i);
  const colorMap: any = { draft: '#bfbfbf', pending_approval: '#faad14', approved: '#1890ff', published: '#52c41a', rejected: '#ff4d4f' };

  const renderGanttRow = (sch: ProductionSchedule) => {
    const startH = dayjs(sch.startTime).hour();
    const endH = dayjs(sch.endTime).hour();
    const setupH = sch.setupTime;
    const cleanH = sch.cleaningTime;
    const productionH = Math.max(1, endH - startH - setupH - cleanH);

    return (
      <div key={sch.id} style={{ display: 'flex', alignItems: 'center', height: 36, borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }} onClick={() => openDetail(sch)}>
        <div style={{ width: 340, paddingLeft: 8, fontSize: 12 }}>
          <strong>{sch.lineCode}</strong> - {sch.productName}<br />
          <span style={{ color: '#8c8c8c' }}>{sch.batchNo} | 订单: {sch.salesOrderNo || '-'}</span>
        </div>
        <div style={{ position: 'relative', flex: 1, height: '100%' }}>
          <div style={{ position: 'absolute', left: `${(startH / 24) * 100}%`, width: `${(setupH / 24) * 100}%`, top: 6, bottom: 6, background: '#d9d9d9', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#595959', fontSize: 11 }}>
            准备
          </div>
          <div style={{ position: 'absolute', left: `${((startH + setupH) / 24) * 100}%`, width: `${(productionH / 24) * 100}%`, top: 6, bottom: 6, background: colorMap[sch.status], borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11 }}>
            生产
          </div>
          <div style={{ position: 'absolute', left: `${((startH + setupH + productionH) / 24) * 100}%`, width: `${(cleanH / 24) * 100}%`, top: 6, bottom: 6, background: '#91d5ff', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0050b3', fontSize: 11 }}>
            清洗{cleanH}h
          </div>
        </div>
      </div>
    );
  };

  const workstationTabs = ['备料', '制粒', '压片', '包装'];

  const stationStatusMap: any = {
    pending: { color: 'default', text: '待执行', icon: <ClockCircleOutlined /> },
    accepted: { color: 'cyan', text: '已接收', icon: <CheckOutlined /> },
    in_progress: { color: 'processing', text: '执行中', icon: <ThunderboltOutlined /> },
    completed: { color: 'success', text: '已完成', icon: <CheckOutlined /> },
    adjust_requested: { color: 'warning', text: '申请调整', icon: <WarningOutlined /> },
    adjust_approved: { color: 'green', text: '调整通过', icon: <CheckOutlined /> },
    adjust_rejected: { color: 'red', text: '调整驳回', icon: <CloseOutlined /> }
  };

  const adjustRequestColumns = [
    { title: '申请时间', dataIndex: 'requestTime', key: 'requestTime', width: 170, render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    { title: '关联排程', key: 'sch', render: (_: any, rec: AdjustRequest) => {
      const sch = schedules.find((s) => s.id === rec.scheduleId);
      return sch ? `${sch.productName} - ${sch.batchNo}` : rec.scheduleId;
    }},
    { title: '工段', dataIndex: 'station', key: 'station', width: 90 },
    { title: '申请人', dataIndex: 'requester', key: 'requester', width: 100 },
    { title: '申请原因', dataIndex: 'reason', key: 'reason' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => {
      const map: any = { pending: { color: 'orange', text: '待审批' }, approved: { color: 'green', text: '已通过' }, rejected: { color: 'red', text: '已驳回' } };
      return <Tag color={map[s]?.color}>{map[s]?.text}</Tag>;
    }},
    { title: '审批人', dataIndex: 'approver', key: 'approver', render: (v?: string) => v || '-' },
    { title: '审批意见', dataIndex: 'approveComment', key: 'approveComment', render: (v?: string) => v || '-' },
    { title: '操作', key: 'action', render: (_: any, rec: AdjustRequest) => {
      if (rec.status !== 'pending') return <span style={{ color: '#bfbfbf' }}>已处理</span>;
      const canApprove = currentUser.role === 'production_supervisor' || currentUser.role === 'production_director' || currentUser.role === 'admin';
      if (!canApprove) return <Tag color="default">需主管/总监处理</Tag>;
      return (
        <Space>
          <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleApproveAdjust(rec)}>通过</Button>
          <Button size="small" danger icon={<CloseOutlined />} onClick={() => openRejectModal(rec)}>驳回</Button>
        </Space>
      );
    }}
  ];

  const renderMaterialItems = () => {
    if (!selectedSchedule) return null;
    const product = products.find((p) => p.name === selectedSchedule.productName || p.id === selectedSchedule.productId);
    const materialItems = selectedSchedule.materialItems || [];
    const isMissing = materialItems.some((m) => !m.sufficient);
    return (
      <>
        {product && product.materialList && product.materialList.length > 0 && (
          <div style={{ marginBottom: 8, padding: '8px 12px', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 4 }}>
            <FileTextOutlined /> 按 <strong>{product.name}</strong> 的产品配方(BOM)计算物料需求
          </div>
        )}
        {isMissing ? (
          <div style={{ marginBottom: 8, padding: '8px 12px', background: '#fff2e8', border: '1px solid #ffbb96', borderRadius: 4 }}>
            <ExclamationCircleOutlined style={{ color: '#fa541c' }} /> <strong style={{ color: '#cf1322' }}>物料存在缺料，此排程当天无法齐套生产</strong>
          </div>
        ) : (
          <div style={{ marginBottom: 8, padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
            <CheckOutlined style={{ color: '#389e0d' }} /> 所有物料库存充足，可齐套生产
          </div>
        )}
        <Table dataSource={materialItems} pagination={false} size="small" rowKey="materialId">
          <Table.Column title="物料类型" key="type" width={80} render={(_: any, rec: any) => {
            const mat = materials.find((m) => m.id === rec.materialId);
            return <Tag>{mat?.type === 'raw' ? '原料' : mat?.type === 'auxiliary' ? '辅料' : '包材'}</Tag>;
          }} />
          <Table.Column title="物料名称" dataIndex="materialName" />
          <Table.Column title="需求数量" key="req" render={(_: any, rec: any) => `${rec.required} ${rec.unit || ''}`} />
          <Table.Column title="可用库存" key="avail" render={(_: any, rec: any) => `${rec.available} ${rec.unit || ''}`} />
          <Table.Column title="状态" dataIndex="sufficient" width={100} render={(v: boolean) => v ? <Tag color="green">充足</Tag> : <Tag color="red">缺料</Tag>} />
        </Table>
      </>
    );
  };

  return (
    <div>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="生产排程" key="schedule">
          <Card style={{ marginBottom: 16 }}>
            <Row gutter={16} align="middle">
              <Col>
                <span style={{ marginRight: 8 }}>排程日期:</span>
                <DatePicker value={dayjs(selectedDate)} onChange={(d) => d && setSelectedDate(d.format('YYYY-MM-DD'))} />
              </Col>
              <Col>
                <Button type="primary" icon={<ThunderboltOutlined />} onClick={handleGenerate}>自动生成排程</Button>
              </Col>
              <Col>
                <Button icon={<ReloadOutlined />}>刷新</Button>
              </Col>
              <Col flex="auto" style={{ textAlign: 'right' }}>
                <Space>
                  <Button type={viewMode === 'scheduler' ? 'primary' : 'default'} icon={<CalendarOutlined />} onClick={() => setViewMode('scheduler')}>排程视图</Button>
                  <Button type={viewMode === 'workstation' ? 'primary' : 'default'} icon={<TeamOutlined />} onClick={() => setViewMode('workstation')}>工段终端</Button>
                </Space>
              </Col>
            </Row>
            <div style={{ marginTop: 12, padding: '8px 12px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 4, fontSize: 12 }}>
              <ExclamationCircleOutlined /> 系统自动生成排程时，会跳过已排程的销售订单（状态为已排程），避免重复生成。如需要重新排程，请先删除对应排程。
            </div>
          </Card>

          {viewMode === 'scheduler' ? (
            <>
              <Card title="甘特图" style={{ marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', borderBottom: '2px solid #e8e8e8', height: 32, alignItems: 'center', background: '#fafafa' }}>
                    <div style={{ width: 340, paddingLeft: 8, fontWeight: 600 }}>生产线 / 产品 / 订单</div>
                    <div style={{ flex: 1, display: 'flex', fontSize: 11, color: '#8c8c8c' }}>
                      {ganttHours.map((h) => (
                        <div key={h} style={{ width: `${100 / 24}%`, textAlign: 'center', borderLeft: h % 6 === 0 ? '1px solid #d9d9d9' : 'none' }}>
                          {String(h).padStart(2, '0')}
                        </div>
                      ))}
                    </div>
                  </div>
                  {schedules.filter((s) => s.date === selectedDate).length > 0 ? (
                    schedules.filter((s) => s.date === selectedDate).map(renderGanttRow)
                  ) : (
                    <div style={{ padding: 40, textAlign: 'center', color: '#8c8c8c' }}>暂无排程数据，点击"自动生成排程"按钮生成</div>
                  )}
                </div>
              </Card>

              <Card title="排程列表">
                <Table dataSource={schedules} columns={scheduleColumns} rowKey="id" scroll={{ x: 1200 }} />
              </Card>
            </>
          ) : (
            <Row gutter={16}>
              {workstationTabs.map((station) => (
                <Col key={station} span={6}>
                  <Card title={`${station}工段`} size="small" style={{ height: 500, overflow: 'auto' }}>
                    <List
                      dataSource={schedules.filter((s) => s.status === 'published' && s.workstationStatus)}
                      renderItem={(sch) => {
                        const st = sch.workstationStatus?.[station] || 'pending';
                        const stInfo = stationStatusMap[st];
                        const relatedAdjust = adjustRequests.find((r) => r.scheduleId === sch.id && r.station === station && r.status !== 'rejected');
                        const rejectedAdjust = adjustRequests.find((r) => r.scheduleId === sch.id && r.station === station && r.status === 'rejected');
                        return (
                          <List.Item
                            style={{
                              border: '1px solid #e8e8e8',
                              borderRadius: 6,
                              marginBottom: 8,
                              padding: 12,
                              background: st === 'in_progress' ? '#e6f7ff' : st === 'completed' ? '#f6ffed' : st === 'adjust_rejected' ? '#fff1f0' : '#fff'
                            }}
                          >
                            <List.Item.Meta
                              title={
                                <Space>
                                  <span style={{ fontWeight: 600 }}>{sch.productName}</span>
                                  <Tag color={stInfo.color} icon={stInfo.icon}>{stInfo.text}</Tag>
                                </Space>
                              }
                              description={
                                <>
                                  <div>批号: {sch.batchNo}</div>
                                  <div>订单: {sch.salesOrderNo || '-'}</div>
                                  <div>计划量: {sch.plannedQuantity.toLocaleString()}</div>
                                  {rejectedAdjust && (
                                    <div style={{ marginTop: 4, color: '#cf1322', fontSize: 12 }}>
                                      <WarningOutlined /> 驳回意见: {rejectedAdjust.approveComment}
                                    </div>
                                  )}
                                  {relatedAdjust && relatedAdjust.status === 'pending' && (
                                    <div style={{ marginTop: 4, color: '#d46b08', fontSize: 12 }}>
                                      <ClockCircleOutlined /> 调整审批中: {relatedAdjust.reason}
                                    </div>
                                  )}
                                </>
                              }
                            />
                            {(st === 'pending' || st === 'adjust_rejected') && (
                              <Space direction="vertical" size={4}>
                                <Button type="primary" size="small" block onClick={() => { setSelectedSchedule(sch); handleAcceptWork(station); }}>
                                  确认接收
                                </Button>
                                <Button size="small" block onClick={() => { setSelectedSchedule(sch); handleRequestAdjust(station); }}>
                                  申请调整
                                </Button>
                              </Space>
                            )}
                            {st === 'in_progress' && (
                              <Button type="primary" size="small" block onClick={() => { setSelectedSchedule(sch); handleCompleteWork(station); }}>
                                完成本工序
                              </Button>
                            )}
                            {st === 'adjust_requested' && (
                              <Tag color="orange">调整申请审批中...</Tag>
                            )}
                            {st === 'adjust_approved' && (
                              <Button type="primary" size="small" block onClick={() => { setSelectedSchedule(sch); handleAcceptWork(station); }}>
                                主管已批准，继续执行
                              </Button>
                            )}
                          </List.Item>
                        );
                      }}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </TabPane>

        <TabPane tab={`调整申请审批${pendingAdjustCount > 0 ? ` (${pendingAdjustCount})` : ''}`} key="adjust">
          <Card>
            <Table dataSource={adjustRequests} columns={adjustRequestColumns} rowKey="id" />
          </Card>
        </TabPane>
      </Tabs>

      <Modal title="排程详情" open={detailModalOpen} onCancel={() => setDetailModalOpen(false)} footer={null} width={900}>
        {selectedSchedule && (
          <div>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="排程日期">{selectedSchedule.date}</Descriptions.Item>
              <Descriptions.Item label="状态"><Tag>{selectedSchedule.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="销售订单">{selectedSchedule.salesOrderNo || '-'}</Descriptions.Item>
              <Descriptions.Item label="生产线">{selectedSchedule.lineCode}</Descriptions.Item>
              <Descriptions.Item label="产品">{selectedSchedule.productName}</Descriptions.Item>
              <Descriptions.Item label="批号">{selectedSchedule.batchNo}</Descriptions.Item>
              <Descriptions.Item label="关联产品批号">{selectedSchedule.productBatch || '-'}</Descriptions.Item>
              <Descriptions.Item label="计划产量">{selectedSchedule.plannedQuantity.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="开始时间">{selectedSchedule.startTime}</Descriptions.Item>
              <Descriptions.Item label="结束时间">{selectedSchedule.endTime}</Descriptions.Item>
              <Descriptions.Item label="准备时间">{selectedSchedule.setupTime} 小时</Descriptions.Item>
              <Descriptions.Item label="清洗切换时间">{selectedSchedule.cleaningTime} 小时 {selectedSchedule.cleaningTime >= 4 ? <Tag color="green">✓ 合规</Tag> : <Tag color="orange">需确认</Tag>}</Descriptions.Item>
              <Descriptions.Item label="审批人">{selectedSchedule.approver || '-'}</Descriptions.Item>
              <Descriptions.Item label="审批备注">{selectedSchedule.approvalComment || '-'}</Descriptions.Item>
            </Descriptions>

            <Card title="物料齐套检查（按产品配方）" size="small" style={{ marginBottom: 16 }}>
              {renderMaterialItems()}
            </Card>

            {selectedSchedule.workstationStatus && (
              <Card title="工段执行状态" size="small">
                <Steps direction="vertical" size="small">
                  {Object.entries(selectedSchedule.workstationStatus).map(([st, status]) => {
                    const adj = adjustRequests.find((r) => r.scheduleId === selectedSchedule.id && r.station === st);
                    return (
                      <Step
                        key={st}
                        title={st}
                        status={status === 'completed' ? 'finish' : status === 'in_progress' ? 'process' : (status === 'adjust_requested' || status === 'adjust_rejected') ? 'error' : status === 'adjust_approved' ? 'finish' : 'wait'}
                        description={
                          <Space direction="vertical" size={0}>
                            <span>{stationStatusMap[status]?.text}</span>
                            {adj && (
                              <span style={{ fontSize: 11, color: '#8c8c8c' }}>
                                {adj.requester}: {adj.reason}
                                {adj.approveComment && ` → ${adj.approver}: ${adj.approveComment}`}
                              </span>
                            )}
                          </Space>
                        }
                      />
                    );
                  })}
                </Steps>
              </Card>
            )}
          </div>
        )}
      </Modal>

      <Modal title={`申请调整 - ${adjustStation}`} open={adjustModalOpen} onCancel={() => setAdjustModalOpen(false)} onOk={submitAdjustRequest}>
        <Form form={adjustForm} layout="vertical">
          <Form.Item name="reason" label="调整原因" rules={[{ required: true, message: '请输入调整原因' }]}>
            <Input.TextArea rows={4} placeholder="请详细说明需要调整的原因（如设备故障、物料异常等）..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="驳回调整申请" open={rejectModalOpen} onCancel={() => setRejectModalOpen(false)} onOk={submitReject}>
        <Form form={rejectForm} layout="vertical">
          <Form.Item name="comment" label="驳回原因" rules={[{ required: true, message: '请输入驳回原因' }]}>
            <Input.TextArea rows={4} placeholder="请输入驳回意见，操作员将看到此信息..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Electronic Signature Modal */}
      <Modal
        title={`电子签名 - ${signatureTitle}`}
        open={signatureModalOpen}
        onCancel={() => setSignatureModalOpen(false)}
        onOk={confirmSignature}
        okText="确认签名"
        okButtonProps={{ icon: <SafetyOutlined />, type: 'primary' }}
      >
        <Alert
          type="warning"
          showIcon
          message="GMP电子签名要求"
          description="此操作将生成具有法律效应的电子签名，请确认您是当前登录用户并对操作内容负责。默认签名口令: gmp123"
          style={{ marginBottom: 16 }}
        />
        <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="签名人">{currentUser.name}</Descriptions.Item>
          <Descriptions.Item label="角色">{roleText[currentUser.role] || currentUser.role}</Descriptions.Item>
          <Descriptions.Item label="签名时间">{dayjs().format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
        </Descriptions>
        <Form layout="vertical">
          <Form.Item label="签名口令" required>
            <Input.Password
              value={signaturePassword}
              onChange={(e) => setSignaturePassword(e.target.value)}
              placeholder="请输入签名口令"
              onPressEnter={confirmSignature}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductionScheduling;
