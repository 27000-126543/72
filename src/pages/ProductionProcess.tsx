import { useState } from 'react';
import {
  Tabs, Table, Card, Tag, Button, Modal, Descriptions, Timeline as AntdTimeline, Form, Input,
  Select, InputNumber, Space, Steps, Row, Col, Progress, List, Avatar, Divider,
  message, App, Alert, Checkbox
} from 'antd';
import {
  PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  WarningOutlined, PlusOutlined, EditOutlined, SafetyOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import { useAppStore } from '../store/appStore';
import type { Batch, Deviation, AuditRecord } from '../types';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';

const { TabPane } = Tabs;
const { Step } = Steps;
const { TextArea } = Input;
const { Item: TimelineItem } = AntdTimeline;

const deviationDecisionMap: any = {
  approved: { color: 'green', text: '批准' },
  rejected: { color: 'red', text: '驳回，重新调查' },
  additional_info: { color: 'orange', text: '需要补充信息' }
};

const batchStatusFlow: Batch['status'][] = ['scheduled', 'preparing', 'granulating', 'compressing', 'packaging', 'qc_pending', 'released'];

const batchStatusText: any = {
  scheduled: '已排程',
  preparing: '备料中',
  granulating: '制粒中',
  compressing: '压片中',
  packaging: '包装中',
  qc_pending: '待检',
  released: '已放行',
  rejected: '已拒收'
};

const batchStatusColor: any = {
  scheduled: 'default',
  preparing: 'orange',
  granulating: 'blue',
  compressing: 'geekblue',
  packaging: 'purple',
  qc_pending: 'magenta',
  released: 'green',
  rejected: 'red'
};

const ProductionProcess: React.FC = () => {
  const { message: msg } = App.useApp();
  const { batches, deviations, schedules, salesOrders, products, stabilityStudies, lines, updateBatchStatus, addBatchParameter, addDeviation, updateDeviation, currentUser } = useAppStore();
  const [activeTab, setActiveTab] = useState('batches');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('production');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [paramModalOpen, setParamModalOpen] = useState(false);
  const [paramForm] = Form.useForm();
  const [deviationModalOpen, setDeviationModalOpen] = useState(false);
  const [deviationForm] = Form.useForm();
  const [deviationDetailOpen, setDeviationDetailOpen] = useState(false);
  const [selectedDeviation, setSelectedDeviation] = useState<Deviation | null>(null);
  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [releaseForm] = Form.useForm();
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signaturePassword, setSignaturePassword] = useState('');
  const [signatureAction, setSignatureAction] = useState<(() => void) | null>(null);
  const [signatureTitle, setSignatureTitle] = useState('');

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

  const openBatchDetail = (batch: Batch) => {
    setSelectedBatch(batch);
    setDetailTab('production');
    setDetailModalOpen(true);
  };

  const advanceBatchStatus = (batch: Batch) => {
    const idx = batchStatusFlow.indexOf(batch.status);
    if (idx < batchStatusFlow.length - 1) {
      const nextStatus = batchStatusFlow[idx + 1];
      if (nextStatus === 'released') {
        releaseForm.setFieldsValue({
          actualQuantity: batch.actualQuantity || batch.plannedQuantity,
          firstPassYield: batch.firstPassYield !== undefined ? batch.firstPassYield : true,
          releaseComment: batch.releaseComment || ''
        });
        setReleaseModalOpen(true);
        return;
      }
      updateBatchStatus(batch.id, nextStatus);
      msg.success(`批次已推进至: ${batchStatusText[nextStatus]}`);
      setSelectedBatch({ ...batch, status: nextStatus });
    }
  };

  const submitRelease = async () => {
    if (!selectedBatch) return;
    try {
      const values = await releaseForm.validateFields();
      const actualQty = Number(values.actualQuantity);
      const yieldVal = parseFloat(((actualQty / selectedBatch.plannedQuantity) * 100).toFixed(2));
      updateBatchStatus(selectedBatch.id, 'released', {
        actualQuantity: actualQty,
        yield: yieldVal,
        firstPassYield: !!values.firstPassYield,
        releaseComment: values.releaseComment
      });
      msg.success('批次已放行');
      setReleaseModalOpen(false);
      setDetailModalOpen(false);
    } catch (e) {}
  };

  const submitParameter = async () => {
    if (!selectedBatch) return;
    const values = await paramForm.validateFields();
    addBatchParameter(selectedBatch.id, {
      name: values.name,
      unit: values.unit,
      value: values.value,
      minLimit: values.minLimit,
      maxLimit: values.maxLimit,
      timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss')
    });
    msg.success('工艺参数已记录');
    setParamModalOpen(false);
    paramForm.resetFields();
    setSelectedBatch({ ...useAppStore.getState().batches.find((b) => b.id === selectedBatch.id)! });
  };

  const submitDeviation = async () => {
    if (!selectedBatch) return;
    const values = await deviationForm.validateFields();
    addDeviation({
      ...values,
      batchId: selectedBatch.id,
      batchNo: selectedBatch.batchNo,
      reporter: currentUser.name
    });
    msg.success('偏差已上报');
    setDeviationModalOpen(false);
    deviationForm.resetFields();
  };

  const openDeviationDetail = (dev: Deviation) => {
    setSelectedDeviation(dev);
    setDeviationDetailOpen(true);
  };

  const updateDeviationStatus = (dev: Deviation, nextStatus: Deviation['status'], data?: Partial<Deviation>) => {
    updateDeviation(dev.id, { status: nextStatus, ...data });
    setSelectedDeviation({ ...dev, status: nextStatus, ...data });
    msg.success('状态已更新');
  };

  const paramChartOption = selectedBatch && selectedBatch.parameters.length > 0 ? {
    tooltip: { trigger: 'axis' },
    legend: { data: Array.from(new Set(selectedBatch.parameters.map((p) => p.name))) },
    xAxis: { type: 'category', data: selectedBatch.parameters.map((p) => dayjs(p.timestamp).format('HH:mm')) },
    yAxis: { type: 'value' },
    series: Array.from(new Set(selectedBatch.parameters.map((p) => p.name))).map((name) => {
      const params = selectedBatch.parameters.filter((p) => p.name === name);
      const first = params[0];
      return {
        name,
        type: 'line',
        smooth: true,
        data: params.map((p) => p.value),
        markLine: {
          silent: true,
          data: [
            { yAxis: first.minLimit, lineStyle: { color: '#faad14', type: 'dashed' }, label: { formatter: `下限 ${first.minLimit}${first.unit}` } },
            { yAxis: first.maxLimit, lineStyle: { color: '#faad14', type: 'dashed' }, label: { formatter: `上限 ${first.maxLimit}${first.unit}` } }
          ]
        },
        itemStyle: { color: params.some((p) => p.isDeviation) ? '#ff4d4f' : '#1890ff' }
      };
    })
  } : null;

  const batchColumns = [
    { title: '批号', dataIndex: 'batchNo', key: 'batchNo', width: 160 },
    { title: '产品', dataIndex: 'productName', key: 'productName' },
    { title: '计划产量', dataIndex: 'plannedQuantity', key: 'plannedQuantity', render: (v: number) => v.toLocaleString() },
    { title: '当前状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={batchStatusColor[s]}>{batchStatusText[s]}</Tag> },
    { title: '开始时间', dataIndex: 'startTime', key: 'startTime', render: (v?: string) => v || '-' },
    { title: '工艺参数', key: 'params', render: (_: any, rec: Batch) => `${rec.parameters.length} 个` },
    { title: '偏差数', key: 'dev', render: (_: any, rec: Batch) => rec.deviationIds.length > 0 ? <Tag color="red">{rec.deviationIds.length} 个</Tag> : '-' },
    { title: '操作', key: 'action', render: (_: any, rec: Batch) => (
      <Space>
        <Button size="small" onClick={() => openBatchDetail(rec)}>详情</Button>
      </Space>
    )}
  ];

  const deviationColumns = [
    { title: '偏差编号', dataIndex: 'deviationNo', key: 'deviationNo', width: 150 },
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '批次', dataIndex: 'batchNo', key: 'batchNo' },
    { title: '类型', dataIndex: 'type', key: 'type', render: (v: string) => <Tag color={v === 'critical' ? 'red' : v === 'major' ? 'orange' : 'blue'}>{v === 'critical' ? '严重' : v === 'major' ? '主要' : '轻微'}</Tag> },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => {
      const map: any = { reported: 'default', investigating: 'blue', corrective_action: 'orange', qa_review: 'purple', approved: 'cyan', closed: 'green' };
      const text: any = { reported: '已报告', investigating: '调查中', corrective_action: 'CAPA中', qa_review: 'QA审核', approved: '已批准', closed: '已关闭' };
      return <Tag color={map[s]}>{text[s]}</Tag>;
    }},
    { title: '最新QA意见', key: 'qaComment', render: (_: any, rec: Deviation) => {
      if (rec.qaComment && rec.qaDecision) {
        const dec = deviationDecisionMap[rec.qaDecision];
        return (
          <Space direction="vertical" size={0}>
            <Tag color={dec.color}>{dec.text}</Tag>
            <span style={{ fontSize: 12, color: '#595959' }}>{rec.qaComment}</span>
          </Space>
        );
      }
      const history = rec.qaReviewHistory && rec.qaReviewHistory.length > 0;
      if (history) {
        const last = rec.qaReviewHistory[rec.qaReviewHistory.length - 1];
        const dec = deviationDecisionMap[last.decision];
        return (
          <Space direction="vertical" size={0}>
            <Tag color={dec?.color || 'default'}>{dec?.text || last.decision}</Tag>
            <span style={{ fontSize: 12, color: '#595959' }}>{last.comment}</span>
          </Space>
        );
      }
      return <span style={{ color: '#bfbfbf' }}>暂无</span>;
    }},
    { title: '报告人', dataIndex: 'reporter', key: 'reporter' },
    { title: '报告时间', dataIndex: 'reportTime', key: 'reportTime', width: 160 },
    { title: '操作', key: 'action', render: (_: any, rec: Deviation) => (
      <Button size="small" onClick={() => openDeviationDetail(rec)}>处理</Button>
    )}
  ];

  return (
    <div>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="批次管理" key="batches">
          <Card>
            <Table dataSource={batches} columns={batchColumns} rowKey="id" />
          </Card>
        </TabPane>
        <TabPane tab="偏差管理" key="deviations">
          <Card>
            <Table dataSource={deviations} columns={deviationColumns} rowKey="id" />
          </Card>
        </TabPane>
      </Tabs>

      {/* Batch Detail */}
      <Modal title={`批次详情 - ${selectedBatch?.batchNo || ''}`} open={detailModalOpen} onCancel={() => setDetailModalOpen(false)} footer={null} width={950}>
        {selectedBatch && (
          <Tabs activeKey={detailTab} onChange={setDetailTab} style={{ marginBottom: -16 }}>
            <TabPane tab="生产详情" key="production">
              <div>
                <Descriptions bordered size="small" column={3} style={{ marginBottom: 16 }}>
                  <Descriptions.Item label="批号">{selectedBatch.batchNo}</Descriptions.Item>
                  <Descriptions.Item label="产品">{selectedBatch.productName}</Descriptions.Item>
                  <Descriptions.Item label="状态"><Tag color={batchStatusColor[selectedBatch.status]}>{batchStatusText[selectedBatch.status]}</Tag></Descriptions.Item>
                  <Descriptions.Item label="计划产量">{selectedBatch.plannedQuantity.toLocaleString()}</Descriptions.Item>
                  <Descriptions.Item label="实际产量">{selectedBatch.actualQuantity?.toLocaleString() || '-'}</Descriptions.Item>
                  <Descriptions.Item label="收率">{selectedBatch.yield ? `${selectedBatch.yield}%` : '-'}</Descriptions.Item>
                  <Descriptions.Item label="一次合格">{selectedBatch.firstPassYield === true ? '是' : selectedBatch.firstPassYield === false ? '否' : '-'}</Descriptions.Item>
                  <Descriptions.Item label="开始时间">{selectedBatch.startTime || '-'}</Descriptions.Item>
                  <Descriptions.Item label="结束时间">{selectedBatch.endTime || '-'}</Descriptions.Item>
                  <Descriptions.Item label="创建人" span={3}>{selectedBatch.createdBy}</Descriptions.Item>
                  {selectedBatch.releaseComment && (
                    <Descriptions.Item label="放行意见" span={3}>{selectedBatch.releaseComment}</Descriptions.Item>
                  )}
                </Descriptions>

            <Card
              title="生产进度"
              size="small"
              style={{ marginBottom: 16 }}
              extra={
                <Space>
                  {selectedBatch.status !== 'released' && selectedBatch.status !== 'rejected' && batchStatusFlow.indexOf(selectedBatch.status) < batchStatusFlow.length - 1 && (
                    <Button type="primary" icon={<ArrowRightOutlined />} onClick={() => advanceBatchStatus(selectedBatch)}>
                      推进至: {batchStatusText[batchStatusFlow[batchStatusFlow.indexOf(selectedBatch.status) + 1]]}
                    </Button>
                  )}
                </Space>
              }
            >
              <Steps current={batchStatusFlow.indexOf(selectedBatch.status)} size="small">
                {batchStatusFlow.map((s) => (
                  <Step key={s} title={batchStatusText[s]} />
                ))}
              </Steps>
            </Card>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={14}>
                <Card
                  title="关键工艺参数监控"
                  size="small"
                  extra={
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setParamModalOpen(true)}>
                      记录参数
                    </Button>
                  }
                >
                  {paramChartOption ? (
                    <ReactECharts option={paramChartOption} style={{ height: 240 }} />
                  ) : (
                    <div style={{ padding: 32, textAlign: 'center', color: '#8c8c8c' }}>暂无参数记录</div>
                  )}
                </Card>
              </Col>
              <Col span={10}>
                <Card
                  title="工艺参数记录"
                  size="small"
                  extra={<Button type="primary" size="small" danger icon={<WarningOutlined />} onClick={() => setDeviationModalOpen(true)}>上报偏差</Button>}
                >
                  <List
                    size="small"
                    dataSource={selectedBatch.parameters.slice().reverse()}
                    locale={{ emptyText: '暂无参数记录' }}
                    renderItem={(p) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Space>
                              <span>{p.name}</span>
                              {p.isDeviation ? <Tag color="red">偏差</Tag> : <Tag color="green">正常</Tag>}
                            </Space>
                          }
                          description={`${p.timestamp} | 范围: ${p.minLimit} ~ ${p.maxLimit}${p.unit}`}
                        />
                        <span className={p.isDeviation ? 'parameter-danger' : 'parameter-normal'} style={{ fontWeight: 600 }}>
                          {p.value}{p.unit}
                        </span>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>

            {selectedBatch.deviationIds.length > 0 && (
              <Card title="关联偏差" size="small" style={{ marginBottom: 16 }}>
                <List
                  size="small"
                  dataSource={deviations.filter((d) => selectedBatch.deviationIds.includes(d.id))}
                  renderItem={(d) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar icon={<WarningOutlined />} style={{ backgroundColor: d.type === 'critical' ? '#ff4d4f' : '#faad14' }} />}
                        title={`${d.deviationNo} - ${d.title}`}
                        description={`报告人: ${d.reporter} | ${d.reportTime}`}
                      />
                      <Button size="small" onClick={() => openDeviationDetail(d)}>查看</Button>
                    </List.Item>
                  )}
                />
              </Card>
            )}
              </div>
            </TabPane>
            <TabPane tab="全生命周期追溯" key="traceability">
              {(() => {
                const schedule = schedules.find((s) => s.id === selectedBatch.scheduleId);
                const order = schedule ? salesOrders.find((o) => o.id === schedule.salesOrderId) : undefined;
                const product = products.find((p) => p.id === selectedBatch.productId);
                const line = lines.find((l) => l.id === selectedBatch.lineId);
                const productBatch = (product?.batchList || []).find((b) => b.batchNo === selectedBatch.batchNo);
                const relatedDeviations = deviations.filter((d) => selectedBatch.deviationIds.includes(d.id));
                const relatedStability = stabilityStudies.filter((s) => s.batchNo === selectedBatch.batchNo);

                const traceEvents: Array<{ time: string; title: string; desc: React.ReactNode; color?: string }> = [];

                if (order) {
                  traceEvents.push({
                    time: order.createdAt || dayjs().format('YYYY-MM-DD'),
                    title: `销售订单 ${order.orderNo}`,
                    desc: (
                      <div>
                        <div>客户: {order.customer}</div>
                        <div>产品: {product?.name} | 数量: {order.quantity.toLocaleString()} 盒</div>
                        <div>交期: {order.deliveryDate}</div>
                      </div>
                    ),
                    color: 'blue'
                  });
                }
                if (schedule) {
                  traceEvents.push({
                    time: schedule.createdAt || dayjs().format('YYYY-MM-DD'),
                    title: `生产排程 ${schedule.batchNo}`,
                    desc: (
                      <div>
                        <div>产线: {line?.name || selectedBatch.lineId}</div>
                        <div>工段: {Object.keys(schedule.workstationStatus || {}).length} 个</div>
                        <div>状态: {schedule.status}</div>
                      </div>
                    ),
                    color: 'cyan'
                  });
                }
                if (selectedBatch.startTime) {
                  traceEvents.push({
                    time: selectedBatch.startTime,
                    title: '批次开始生产',
                    desc: (
                      <div>
                        <div>批号: {selectedBatch.batchNo}</div>
                        <div>计划产量: {selectedBatch.plannedQuantity.toLocaleString()}</div>
                        <div>操作人: {selectedBatch.createdBy}</div>
                      </div>
                    ),
                    color: 'geekblue'
                  });
                }
                if (selectedBatch.parameters && selectedBatch.parameters.length > 0) {
                  selectedBatch.parameters.forEach((p, i) => {
                    traceEvents.push({
                      time: p.timestamp || dayjs().format('YYYY-MM-DD HH:mm'),
                      title: `工艺参数记录 #${i + 1}`,
                      desc: (
                        <div>
                          <div>参数: {p.name} = {p.value}{p.unit}</div>
                          <div>范围: {p.minLimit} ~ {p.maxLimit}{p.unit}</div>
                          {p.isDeviation && <Tag color="red">参数超限</Tag>}
                        </div>
                      ),
                      color: p.isDeviation ? 'red' : 'purple'
                    });
                  });
                }
                relatedDeviations.forEach((d) => {
                  traceEvents.push({
                    time: d.reportTime,
                    title: `偏差 ${d.deviationNo}`,
                    desc: (
                      <div>
                        <div>{d.title}</div>
                        <div>类型: <Tag color={d.type === 'critical' ? 'red' : d.type === 'major' ? 'orange' : 'blue'}>{d.type === 'critical' ? '严重' : d.type === 'major' ? '主要' : '次要'}</Tag> | 状态: {d.status}</div>
                        <Button type="link" size="small" onClick={() => openDeviationDetail(d)}>查看偏差详情</Button>
                      </div>
                    ),
                    color: 'red'
                  });
                });
                if (productBatch) {
                  traceEvents.push({
                    time: productBatch.productionDate || dayjs().format('YYYY-MM-DD'),
                    title: `产品批号 ${productBatch.batchNo}`,
                    desc: (
                      <div>
                        <div>产量: {productBatch.quantity?.toLocaleString() || 0}</div>
                        <div>有效期: {productBatch.expiryDate || '-'}</div>
                        <div>状态: <Tag color="green">{productBatch.status}</Tag></div>
                      </div>
                    ),
                    color: 'green'
                  });
                }
                relatedStability.forEach((st) => {
                  traceEvents.push({
                    time: st.startDate,
                    title: `稳定性考察 ${st.studyNo}`,
                    desc: (
                      <div>
                        <div>方案: {st.protocol}</div>
                        <div>条件: {st.conditions}</div>
                        <div>进度: {st.completedTests}/{st.totalTests} 个检测点</div>
                        <div>下次取样: {st.nextSamplingDate}</div>
                      </div>
                    ),
                    color: 'gold'
                  });
                });
                if (selectedBatch.endTime) {
                  traceEvents.push({
                    time: selectedBatch.endTime,
                    title: '批次放行/结束',
                    desc: (
                      <div>
                        <div>状态: <Tag color={selectedBatch.status === 'released' ? 'green' : 'red'}>{batchStatusText[selectedBatch.status]}</Tag></div>
                        {selectedBatch.actualQuantity !== undefined && <div>实际产量: {selectedBatch.actualQuantity.toLocaleString()}</div>}
                        {selectedBatch.yield !== undefined && <div>收率: {selectedBatch.yield}%</div>}
                        {selectedBatch.firstPassYield !== undefined && <div>一次合格: {selectedBatch.firstPassYield ? '是' : '否'}</div>}
                        {selectedBatch.releaseComment && <div>放行意见: {selectedBatch.releaseComment}</div>}
                      </div>
                    ),
                    color: selectedBatch.status === 'released' ? 'green' : 'red'
                  });
                }

                traceEvents.sort((a, b) => dayjs(a.time).valueOf() - dayjs(b.time).valueOf());

                return (
                  <Card size="small" title="追溯时间线（按时间排序）">
                    {traceEvents.length > 0 ? (
                      <AntdTimeline mode="left">
                        {traceEvents.map((ev, idx) => (
                          <TimelineItem key={idx} color={ev.color} label={<span style={{ color: '#595959', whiteSpace: 'nowrap' }}>{ev.time}</span>}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{ev.title}</div>
                            {ev.desc}
                          </TimelineItem>
                        ))}
                      </AntdTimeline>
                    ) : (
                      <div style={{ padding: 24, textAlign: 'center', color: '#8c8c8c' }}>暂无追溯事件</div>
                    )}
                    {product && (product.materialList || []).length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <Divider orientation="left">物料配方 BOM</Divider>
                        <List
                          size="small"
                          bordered
                          dataSource={product.materialList}
                          renderItem={(m) => (
                            <List.Item>
                              <List.Item.Meta
                                title={m.materialName}
                                description={`单耗: ${m.dosagePerUnit}${m.unit || ''} | 总需求: ${(m.dosagePerUnit * selectedBatch.plannedQuantity).toFixed(2)}${m.unit || ''}`}
                              />
                            </List.Item>
                          )}
                        />
                      </div>
                    )}
                  </Card>
                );
              })()}
            </TabPane>
          </Tabs>
        )}
      </Modal>

      {/* Parameter Record Modal */}
      <Modal title="记录工艺参数" open={paramModalOpen} onCancel={() => setParamModalOpen(false)} onOk={submitParameter}>
        <Form form={paramForm} layout="vertical">
          <Form.Item name="name" label="参数名称" rules={[{ required: true }]}>
            <Select options={[
              { value: '制粒温度', label: '制粒温度' },
              { value: '压片压力', label: '压片压力' },
              { value: '颗粒水分', label: '颗粒水分' },
              { value: '混合时间', label: '混合时间' },
              { value: '干燥温度', label: '干燥温度' },
              { value: '充填重量', label: '充填重量' }
            ]} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="value" label="实测值" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="minLimit" label="下限" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maxLimit" label="上限" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="unit" label="单位" rules={[{ required: true }]}>
            <Select options={[{ value: '℃', label: '℃' }, { value: 'kN', label: 'kN' }, { value: '%', label: '%' }, { value: 'min', label: 'min' }, { value: 'mg', label: 'mg' }]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Deviation Report Modal */}
      <Modal title="上报偏差" open={deviationModalOpen} onCancel={() => setDeviationModalOpen(false)} onOk={submitDeviation}>
        <Form form={deviationForm} layout="vertical">
          <Form.Item name="title" label="偏差标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="偏差描述" rules={[{ required: true }]}>
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item name="type" label="偏差类型" rules={[{ required: true }]}>
            <Select options={[
              { value: 'minor', label: '轻微' },
              { value: 'major', label: '主要' },
              { value: 'critical', label: '严重' }
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Deviation Detail */}
      <Modal title={`偏差处理 - ${selectedDeviation?.deviationNo || ''}`} open={deviationDetailOpen} onCancel={() => setDeviationDetailOpen(false)} footer={null} width={750}>
        {selectedDeviation && (
          <div>
            <Alert
              message={selectedDeviation.type === 'critical' ? '严重偏差' : selectedDeviation.type === 'major' ? '主要偏差' : '轻微偏差'}
              type={selectedDeviation.type === 'critical' ? 'error' : selectedDeviation.type === 'major' ? 'warning' : 'info'}
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="批次">{selectedDeviation.batchNo || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={selectedDeviation.status === 'closed' ? 'green' : 'orange'}>
                  {selectedDeviation.status === 'reported' ? '已报告' : selectedDeviation.status === 'investigating' ? '调查中' : selectedDeviation.status === 'corrective_action' ? 'CAPA中' : selectedDeviation.status === 'qa_review' ? 'QA审核' : selectedDeviation.status === 'approved' ? '已批准' : '已关闭'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="报告人" span={2}>{selectedDeviation.reporter}</Descriptions.Item>
              <Descriptions.Item label="标题" span={2}>{selectedDeviation.title}</Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>{selectedDeviation.description}</Descriptions.Item>
            </Descriptions>

            <Card title="处理流程" size="small" style={{ marginBottom: 16 }}>
              <Steps direction="vertical" size="small" current={['reported', 'investigating', 'corrective_action', 'qa_review', 'approved', 'closed'].indexOf(selectedDeviation.status)}>
                <Step title="偏差报告" description={selectedDeviation.reportTime} />
                <Step title="调查分析" description={selectedDeviation.investigation || '待填写调查报告'} />
                <Step title="纠正与预防措施(CAPA)" description={selectedDeviation.correctiveAction || '待制定纠正预防措施'} />
                <Step title="QA审核" description={selectedDeviation.qaApprover ? `审核人: ${selectedDeviation.qaApprover}` : '待QA审核'} />
                <Step title="批准关闭" description={selectedDeviation.closedTime || '待关闭'} />
              </Steps>
            </Card>

            <Card title="QA审核历史记录" size="small" style={{ marginBottom: 16 }}>
              {selectedDeviation.qaReviewHistory && selectedDeviation.qaReviewHistory.length > 0 ? (
                <AntdTimeline>
                  {selectedDeviation.qaReviewHistory.map((rec: AuditRecord) => {
                    const dec = deviationDecisionMap[rec.decision] || (rec.decision === 'closed' ? { color: 'green', text: '关闭' } : null);
                    return (
                      <TimelineItem
                        key={rec.id}
                        color={dec?.color || 'blue'}
                      >
                        <Space wrap>
                          <strong>{rec.time}</strong>
                          <Tag color={dec?.color || 'blue'}>{dec?.text || rec.decision}</Tag>
                          <span>审核人: {rec.reviewer}</span>
                          {rec.role && <Tag color="purple">{roleText[rec.role] || rec.role}</Tag>}
                          {rec.signatureVerified && <Tag color="green" icon={<SafetyOutlined />}>电子签名已验证</Tag>}
                        </Space>
                        <div style={{ marginTop: 4, color: '#595959' }}>
                          {rec.comment || '无审核意见'}
                        </div>
                      </TimelineItem>
                    );
                  })}
                </AntdTimeline>
              ) : (
                <span style={{ color: '#bfbfbf' }}>暂无QA审核记录</span>
              )}
              {selectedDeviation.status === 'investigating' && selectedDeviation.qaDecision === 'additional_info' && selectedDeviation.qaComment && (
                <Alert
                  type="warning"
                  showIcon
                  message="QA要求补充信息"
                  description={selectedDeviation.qaComment}
                  style={{ marginTop: 12 }}
                />
              )}
            </Card>

            <Card size="small" title="处理操作">
              {selectedDeviation.status === 'reported' && currentUser.role !== 'operator' && (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Input.TextArea
                    rows={3}
                    placeholder="填写调查结论..."
                    value={selectedDeviation.investigation}
                    onChange={(e) => setSelectedDeviation({ ...selectedDeviation, investigation: e.target.value })}
                  />
                  <Button type="primary" icon={<EditOutlined />} onClick={() => updateDeviationStatus(selectedDeviation, 'investigating', { investigation: selectedDeviation.investigation })}>
                    开始调查
                  </Button>
                </Space>
              )}
              {selectedDeviation.status === 'investigating' && currentUser.role !== 'operator' && (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {selectedDeviation.qaDecision === 'additional_info' && selectedDeviation.qaComment && (
                    <Alert
                      type="warning"
                      showIcon
                      message="QA要求补充以下信息"
                      description={selectedDeviation.qaComment}
                      style={{ marginBottom: 12 }}
                    />
                  )}
                  <TextArea
                    rows={3}
                    placeholder="纠正措施..."
                    value={selectedDeviation.correctiveAction}
                    onChange={(e) => setSelectedDeviation({ ...selectedDeviation, correctiveAction: e.target.value })}
                  />
                  <TextArea
                    rows={3}
                    placeholder="预防措施..."
                    value={selectedDeviation.preventiveAction}
                    onChange={(e) => setSelectedDeviation({ ...selectedDeviation, preventiveAction: e.target.value })}
                  />
                  <Button type="primary" onClick={() => updateDeviationStatus(selectedDeviation, 'qa_review', { correctiveAction: selectedDeviation.correctiveAction, preventiveAction: selectedDeviation.preventiveAction })}>
                    提交CAPA，送QA审核
                  </Button>
                </Space>
              )}
              {selectedDeviation.status === 'corrective_action' && currentUser.role !== 'operator' && (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {selectedDeviation.qaDecision === 'additional_info' && selectedDeviation.qaComment && (
                    <Alert
                      type="warning"
                      showIcon
                      message="QA要求补充以下信息"
                      description={selectedDeviation.qaComment}
                      style={{ marginBottom: 12 }}
                    />
                  )}
                  <TextArea
                    rows={3}
                    placeholder="补充纠正措施..."
                    value={selectedDeviation.correctiveAction}
                    onChange={(e) => setSelectedDeviation({ ...selectedDeviation, correctiveAction: e.target.value })}
                  />
                  <TextArea
                    rows={3}
                    placeholder="补充预防措施..."
                    value={selectedDeviation.preventiveAction}
                    onChange={(e) => setSelectedDeviation({ ...selectedDeviation, preventiveAction: e.target.value })}
                  />
                  <Button type="primary" onClick={() => updateDeviationStatus(selectedDeviation, 'qa_review', { correctiveAction: selectedDeviation.correctiveAction, preventiveAction: selectedDeviation.preventiveAction })}>
                    补充完成，送QA审核
                  </Button>
                </Space>
              )}
              {selectedDeviation.status === 'qa_review' && (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {currentUser.role !== 'qa' && (
                    <Alert
                      type="warning"
                      showIcon
                      message="当前用户不是QA角色"
                      description={<Space>请点击右上角「角色切换」选择「QA质量保证」角色进行审批，或以当前角色模拟审批。<Button size="small" type="link">当前角色: {currentUser.name}</Button></Space>}
                      style={{ marginBottom: 12 }}
                    />
                  )}
                  {currentUser.role === 'qa' && (
                    <Alert
                      type="success"
                      showIcon
                      message="您当前为QA质量保证角色，可执行审批"
                      style={{ marginBottom: 12 }}
                    />
                  )}
                  <Select placeholder="QA审批结论" style={{ width: '100%' }} value={selectedDeviation.qaDecision} onChange={(v) => setSelectedDeviation({ ...selectedDeviation, qaDecision: v })}>
                    <Select.Option value="approved">批准</Select.Option>
                    <Select.Option value="rejected">驳回，重新调查</Select.Option>
                    <Select.Option value="additional_info">需要补充信息</Select.Option>
                  </Select>
                  <TextArea rows={3} placeholder="QA审核意见（必填）..." value={selectedDeviation.qaComment} onChange={(e) => setSelectedDeviation({ ...selectedDeviation, qaComment: e.target.value })} />
                  <Space wrap>
                    <Button type="primary" icon={<SafetyOutlined />} onClick={() => {
                      if (!selectedDeviation.qaComment) { msg.warning('请填写QA审核意见'); return; }
                      if (!selectedDeviation.qaDecision) { msg.warning('请选择QA审批结论'); return; }
                      requireSignature('偏差QA审批电子签名', () => {
                        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
                        const record: AuditRecord = {
                          id: 'qa_' + Date.now(),
                          time: now,
                          reviewer: currentUser.name,
                          role: currentUser.role,
                          decision: selectedDeviation.qaDecision,
                          comment: selectedDeviation.qaComment,
                          signatureVerified: true
                        };
                        const nextStatus = selectedDeviation.qaDecision === 'approved' ? 'approved' : 'investigating';
                        const newHistory = [...(selectedDeviation.qaReviewHistory || []), record];
                        updateDeviationStatus(selectedDeviation, nextStatus, {
                          qaApprover: currentUser.name,
                          qaDecision: selectedDeviation.qaDecision,
                          qaComment: selectedDeviation.qaComment,
                          qaReviewHistory: newHistory
                        });
                        if (selectedDeviation.qaDecision === 'approved') msg.success('QA已批准，可关闭偏差');
                        else if (selectedDeviation.qaDecision === 'rejected') msg.success('已驳回，返回调查');
                        else msg.success('已要求补充信息');
                      });
                    }}>
                      QA审批{currentUser.role !== 'qa' ? '（模拟）' : ''}
                    </Button>
                  </Space>
                </Space>
              )}
              {selectedDeviation.status === 'approved' && (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {currentUser.role !== 'qa' && (
                    <Alert type="warning" showIcon message="建议切换QA角色执行关闭操作" style={{ marginBottom: 12 }} />
                  )}
                  <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => {
                    requireSignature('偏差关闭电子签名', () => {
                      const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
                      const closeRecord: AuditRecord = {
                        id: 'close_' + Date.now(),
                        time: now,
                        reviewer: currentUser.name,
                        role: currentUser.role,
                        decision: 'closed',
                        comment: '偏差关闭签审',
                        signatureVerified: true
                      };
                      updateDeviationStatus(selectedDeviation, 'closed', {
                        closedTime: now,
                        qaReviewHistory: [...(selectedDeviation.qaReviewHistory || []), closeRecord]
                      });
                      msg.success('偏差已关闭');
                    });
                  }}>
                    关闭偏差
                  </Button>
                </Space>
              )}
              {selectedDeviation.status === 'closed' && (
                <Alert message="偏差已关闭" type="success" showIcon />
              )}
            </Card>
          </div>
        )}
      </Modal>

      {/* Release Modal */}
      <Modal title="批次放行审批" open={releaseModalOpen} onCancel={() => setReleaseModalOpen(false)} onOk={submitRelease} okText="确认放行" okButtonProps={{ icon: <SafetyOutlined /> }}>
        {selectedBatch && (
          <Form form={releaseForm} layout="vertical">
            <Alert type="info" showIcon message="放行信息" description={`批号: ${selectedBatch.batchNo} | 产品: ${selectedBatch.productName} | 计划产量: ${selectedBatch.plannedQuantity.toLocaleString()}`} style={{ marginBottom: 16 }} />
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="actualQuantity" label="实际产量" rules={[{ required: true, message: '请输入实际产量' }]}>
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="firstPassYield" label="一次合格" valuePropName="checked">
                  <Checkbox>本次生产为一次合格（无返工/重新加工）</Checkbox>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="releaseComment" label="放行意见" rules={[{ required: true, message: '请填写放行意见' }]}>
              <TextArea rows={3} placeholder="QA或生产主管放行审批意见..." />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default ProductionProcess;
