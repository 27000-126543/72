import { useState } from 'react';
import {
  Row, Col, Card, Table, Button, DatePicker, Tag, Space, Modal, Form,
  Input, Select, Steps, Descriptions, message, App, Popconfirm, InputNumber, List, Avatar, Timeline
} from 'antd';
import {
  ThunderboltOutlined, CheckOutlined, CloseOutlined, ReloadOutlined,
  ClockCircleOutlined, SendOutlined, CalendarOutlined, TeamOutlined,
  WarningOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import { useAppStore } from '../store/appStore';
import type { ProductionSchedule } from '../types';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Step } = Steps;

const ProductionScheduling: React.FC = () => {
  const { message: msg } = App.useApp();
  const { schedules, salesOrders, lines, generateSchedules, updateScheduleStatus, updateWorkstationStatus, requestScheduleAdjustment, currentUser } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ProductionSchedule | null>(null);
  const [viewMode, setViewMode] = useState<'scheduler' | 'workstation'>('scheduler');
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustStation, setAdjustStation] = useState('');
  const [adjustForm] = Form.useForm();

  const handleGenerate = () => {
    const newSchedules = generateSchedules(selectedDate);
    if (newSchedules.length > 0) {
      msg.success(`成功生成 ${newSchedules.length} 条排程`);
    } else {
      msg.info('没有可排程的销售订单');
    }
  };

  const handleApprove = (id: string, approved: boolean) => {
    Modal.confirm({
      title: approved ? '确认审批通过？' : '确认驳回排程？',
      content: approved ? '审批通过后排程将待发布' : '请输入驳回原因（在审批备注中）',
      okText: approved ? '通过' : '驳回',
      cancelText: '取消',
      okButtonProps: approved ? { type: 'primary' } : { danger: true },
      onOk: () => {
        updateScheduleStatus(id, approved ? 'approved' : 'rejected', currentUser.name, approved ? '审批通过' : '排程不符合要求');
        msg.success(approved ? '审批通过' : '已驳回');
      }
    });
  };

  const handlePublish = (id: string) => {
    Modal.confirm({
      title: '确认发布排程？',
      content: '发布后将推送至各工段终端，操作员可开始执行',
      okText: '发布',
      onOk: () => {
        updateScheduleStatus(id, 'published', currentUser.name);
        msg.success('排程已发布至工段终端');
      }
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

  const scheduleColumns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 110 },
    { title: '生产线', dataIndex: 'lineCode', key: 'lineCode', width: 120 },
    { title: '产品', dataIndex: 'productName', key: 'productName' },
    { title: '批号', dataIndex: 'batchNo', key: 'batchNo', width: 160 },
    { title: '计划产量', dataIndex: 'plannedQuantity', key: 'plannedQuantity', render: (v: number) => v.toLocaleString() },
    { title: '开始时间', dataIndex: 'startTime', key: 'startTime', width: 160, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    { title: '清洗切换(小时)', dataIndex: 'cleaningTime', key: 'cleaningTime', width: 110, render: (v: number) => v >= 4 ? <Tag color="green">{v}h ✓</Tag> : <Tag color="orange">{v}h</Tag> },
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
        <div style={{ width: 300, paddingLeft: 8, fontSize: 12 }}>
          <strong>{sch.lineCode}</strong> - {sch.productName}<br />
          <span style={{ color: '#8c8c8c' }}>{sch.batchNo}</span>
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
    adjust_requested: { color: 'warning', text: '申请调整', icon: <WarningOutlined /> }
  };

  return (
    <div>
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
      </Card>

      {viewMode === 'scheduler' ? (
        <>
          <Card title="甘特图" style={{ marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', borderBottom: '2px solid #e8e8e8', height: 32, alignItems: 'center', background: '#fafafa' }}>
                <div style={{ width: 300, paddingLeft: 8, fontWeight: 600 }}>生产线 / 产品</div>
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
            <Table dataSource={schedules} columns={scheduleColumns} rowKey="id" />
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
                    return (
                      <List.Item
                        style={{
                          border: '1px solid #e8e8e8',
                          borderRadius: 6,
                          marginBottom: 8,
                          padding: 12,
                          background: st === 'in_progress' ? '#e6f7ff' : st === 'completed' ? '#f6ffed' : '#fff'
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
                              <div>生产线: {sch.lineCode}</div>
                              <div>计划量: {sch.plannedQuantity.toLocaleString()}</div>
                            </>
                          }
                        />
                        {st === 'pending' && (
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
                      </List.Item>
                    );
                  }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Detail Modal */}
      <Modal title="排程详情" open={detailModalOpen} onCancel={() => setDetailModalOpen(false)} footer={null} width={800}>
        {selectedSchedule && (
          <div>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="排程日期">{selectedSchedule.date}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag>{selectedSchedule.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="生产线">{selectedSchedule.lineCode}</Descriptions.Item>
              <Descriptions.Item label="批号">{selectedSchedule.batchNo}</Descriptions.Item>
              <Descriptions.Item label="产品">{selectedSchedule.productName}</Descriptions.Item>
              <Descriptions.Item label="计划产量">{selectedSchedule.plannedQuantity.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="开始时间">{selectedSchedule.startTime}</Descriptions.Item>
              <Descriptions.Item label="结束时间">{selectedSchedule.endTime}</Descriptions.Item>
              <Descriptions.Item label="准备时间">{selectedSchedule.setupTime} 小时</Descriptions.Item>
              <Descriptions.Item label="清洗切换时间">{selectedSchedule.cleaningTime} 小时 {selectedSchedule.cleaningTime >= 4 ? <Tag color="green">✓ 合规</Tag> : <Tag color="orange">需确认</Tag>}</Descriptions.Item>
              <Descriptions.Item label="审批人">{selectedSchedule.approver || '-'}</Descriptions.Item>
              <Descriptions.Item label="审批备注">{selectedSchedule.approvalComment || '-'}</Descriptions.Item>
            </Descriptions>

            <Card title="物料齐套检查" size="small" style={{ marginBottom: 16 }}>
              <Table dataSource={selectedSchedule.materialItems} pagination={false} size="small" rowKey="materialId">
                <Table.Column title="物料名称" dataIndex="materialName" />
                <Table.Column title="需求量" dataIndex="required" />
                <Table.Column title="可用量" dataIndex="available" />
                <Table.Column title="是否充足" dataIndex="sufficient" render={(v: boolean) => v ? <Tag color="green">充足</Tag> : <Tag color="red">不足</Tag>} />
              </Table>
            </Card>

            {selectedSchedule.workstationStatus && (
              <Card title="工段执行状态" size="small">
                <Steps direction="vertical" size="small">
                  {Object.entries(selectedSchedule.workstationStatus).map(([st, status]) => (
                    <Step
                      key={st}
                      title={st}
                      status={status === 'completed' ? 'finish' : status === 'in_progress' ? 'process' : status === 'adjust_requested' ? 'error' : 'wait'}
                      description={stationStatusMap[status]?.text}
                    />
                  ))}
                </Steps>
              </Card>
            )}
          </div>
        )}
      </Modal>

      {/* Adjust Modal */}
      <Modal title={`申请调整 - ${adjustStation}`} open={adjustModalOpen} onCancel={() => setAdjustModalOpen(false)} onOk={submitAdjustRequest}>
        <Form form={adjustForm} layout="vertical">
          <Form.Item name="reason" label="调整原因" rules={[{ required: true, message: '请输入调整原因' }]}>
            <Input.TextArea rows={4} placeholder="请详细说明需要调整的原因..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductionScheduling;
