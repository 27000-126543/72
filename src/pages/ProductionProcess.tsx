import { useState } from 'react';
import {
  Tabs, Table, Card, Tag, Button, Modal, Descriptions, Timeline, Form, Input,
  Select, InputNumber, Space, Steps, Row, Col, Progress, List, Avatar, Divider,
  message, App, Alert
} from 'antd';
import {
  PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  WarningOutlined, PlusOutlined, EditOutlined, SafetyOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import { useAppStore } from '../store/appStore';
import type { Batch, Deviation } from '../types';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';

const { TabPane } = Tabs;
const { Step } = Steps;
const { TextArea } = Input;

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
  const { batches, deviations, updateBatchStatus, addBatchParameter, addDeviation, updateDeviation, currentUser } = useAppStore();
  const [activeTab, setActiveTab] = useState('batches');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [paramModalOpen, setParamModalOpen] = useState(false);
  const [paramForm] = Form.useForm();
  const [deviationModalOpen, setDeviationModalOpen] = useState(false);
  const [deviationForm] = Form.useForm();
  const [deviationDetailOpen, setDeviationDetailOpen] = useState(false);
  const [selectedDeviation, setSelectedDeviation] = useState<Deviation | null>(null);

  const openBatchDetail = (batch: Batch) => {
    setSelectedBatch(batch);
    setDetailModalOpen(true);
  };

  const advanceBatchStatus = (batch: Batch) => {
    const idx = batchStatusFlow.indexOf(batch.status);
    if (idx < batchStatusFlow.length - 1) {
      const nextStatus = batchStatusFlow[idx + 1];
      updateBatchStatus(batch.id, nextStatus);
      msg.success(`批次已推进至: ${batchStatusText[nextStatus]}`);
      setSelectedBatch({ ...batch, status: nextStatus });
    }
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
      <Modal title={`批次详情 - ${selectedBatch?.batchNo || ''}`} open={detailModalOpen} onCancel={() => setDetailModalOpen(false)} footer={null} width={900}>
        {selectedBatch && (
          <div>
            <Descriptions bordered size="small" column={3} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="批号">{selectedBatch.batchNo}</Descriptions.Item>
              <Descriptions.Item label="产品">{selectedBatch.productName}</Descriptions.Item>
              <Descriptions.Item label="状态"><Tag color={batchStatusColor[selectedBatch.status]}>{batchStatusText[selectedBatch.status]}</Tag></Descriptions.Item>
              <Descriptions.Item label="计划产量">{selectedBatch.plannedQuantity.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="实际产量">{selectedBatch.actualQuantity?.toLocaleString() || '-'}</Descriptions.Item>
              <Descriptions.Item label="收率">{selectedBatch.yield ? `${selectedBatch.yield}%` : '-'}</Descriptions.Item>
              <Descriptions.Item label="开始时间">{selectedBatch.startTime || '-'}</Descriptions.Item>
              <Descriptions.Item label="结束时间">{selectedBatch.endTime || '-'}</Descriptions.Item>
              <Descriptions.Item label="创建人">{selectedBatch.createdBy}</Descriptions.Item>
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
              <Card title="关联偏差" size="small">
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
                  <Button type="primary" onClick={() => updateDeviationStatus(selectedDeviation, 'corrective_action', { correctiveAction: selectedDeviation.correctiveAction, preventiveAction: selectedDeviation.preventiveAction })}>
                    提交CAPA，送QA审核
                  </Button>
                </Space>
              )}
              {(selectedDeviation.status === 'corrective_action' || selectedDeviation.status === 'qa_review') && currentUser.role === 'qa' && (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Select placeholder="QA审批结论" style={{ width: '100%' }} value={selectedDeviation.qaDecision} onChange={(v) => setSelectedDeviation({ ...selectedDeviation, qaDecision: v })}>
                    <Select.Option value="approved">批准</Select.Option>
                    <Select.Option value="rejected">驳回，重新调查</Select.Option>
                    <Select.Option value="additional_info">需要补充信息</Select.Option>
                  </Select>
                  <TextArea rows={3} placeholder="QA审核意见..." value={selectedDeviation.qaComment} onChange={(e) => setSelectedDeviation({ ...selectedDeviation, qaComment: e.target.value })} />
                  <Button type="primary" icon={<SafetyOutlined />} onClick={() => updateDeviationStatus(selectedDeviation, selectedDeviation.qaDecision === 'approved' ? 'approved' : 'investigating', { qaApprover: currentUser.name, qaDecision: selectedDeviation.qaDecision, qaComment: selectedDeviation.qaComment })}>
                    QA审批
                  </Button>
                </Space>
              )}
              {selectedDeviation.status === 'approved' && currentUser.role === 'qa' && (
                <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => updateDeviationStatus(selectedDeviation, 'closed', { closedTime: dayjs().format('YYYY-MM-DD HH:mm:ss') })}>
                  关闭偏差
                </Button>
              )}
              {selectedDeviation.status === 'closed' && (
                <Alert message="偏差已关闭" type="success" showIcon />
              )}
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProductionProcess;
