import { useState } from 'react';
import {
  Table, Card, Tag, Button, Modal, Descriptions, Space, Progress,
  List, Avatar, Timeline, Alert, Form, Select, Input, message, App, Row, Col
} from 'antd';
import {
  ExperimentOutlined, BellOutlined, PlusOutlined, CalendarOutlined,
  CheckCircleOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { useAppStore } from '../store/appStore';
import type { StabilityStudy } from '../types';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';

const Stability: React.FC = () => {
  const { message: msg } = App.useApp();
  const { stabilityStudies, products, batches, generateStabilitySchedule, updateStabilityStudy } = useAppStore();
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState<StabilityStudy | null>(null);
  const [samplingForm] = Form.useForm();
  const [samplingModalOpen, setSamplingModalOpen] = useState(false);

  const upcoming = stabilityStudies
    .filter((s) => s.status !== 'completed' && s.status !== 'expired')
    .sort((a, b) => dayjs(a.nextSamplingDate).valueOf() - dayjs(b.nextSamplingDate).valueOf());

  const openDetail = (s: StabilityStudy) => {
    setSelectedStudy(s);
    setDetailModalOpen(true);
  };

  const handleGenerate = () => {
    generateStabilitySchedule();
    msg.success('已扫描放行批次，自动生成稳定性考察计划');
  };

  const handleRecordSampling = (study: StabilityStudy) => {
    setSelectedStudy(study);
    samplingForm.resetFields();
    setSamplingModalOpen(true);
  };

  const submitSampling = async () => {
    if (!selectedStudy) return;
    const values = await samplingForm.validateFields();
    const nextPoint = selectedStudy.completedTests < selectedStudy.testPoints.length
      ? selectedStudy.testPoints[selectedStudy.completedTests]
      : null;
    const newCompleted = selectedStudy.completedTests + 1;
    const allDone = newCompleted >= selectedStudy.totalTests;
    const nextIdx = selectedStudy.testPoints.indexOf(nextPoint || 0) + 1;
    const nextSampling = nextIdx < selectedStudy.testPoints.length
      ? dayjs(selectedStudy.startDate).add(selectedStudy.testPoints[nextIdx], 'month').format('YYYY-MM-DD')
      : dayjs(selectedStudy.endDate).format('YYYY-MM-DD');

    updateStabilityStudy(selectedStudy.id, {
      completedTests: newCompleted,
      status: allDone ? 'completed' : 'in_progress',
      nextSamplingDate: nextSampling
    });
    msg.success('取样记录已保存');
    setSamplingModalOpen(false);
  };

  const stabilityColumns = [
    { title: '考察编号', dataIndex: 'studyNo', key: 'studyNo', width: 150 },
    { title: '产品', dataIndex: 'productName', key: 'productName' },
    { title: '批号', dataIndex: 'batchNo', key: 'batchNo' },
    { title: '考察条件', dataIndex: 'conditions', key: 'conditions' },
    { title: '进度', key: 'progress', render: (_: any, rec: StabilityStudy) => (
      <Progress percent={Math.round(rec.completedTests / rec.totalTests * 100)} format={() => `${rec.completedTests}/${rec.totalTests}`} />
    )},
    { title: '下次取样', dataIndex: 'nextSamplingDate', key: 'nextSamplingDate', render: (v: string) => {
      const diff = dayjs(v).diff(dayjs(), 'day');
      if (diff < 0) return <span className="parameter-danger">已逾期 {-diff} 天</span>;
      if (diff <= 7) return <Tag color="red">⚠ {v} ({diff}天后)</Tag>;
      if (diff <= 30) return <Tag color="orange">{v} ({diff}天后)</Tag>;
      return <span>{v}</span>;
    }},
    { title: '开始日期', dataIndex: 'startDate', key: 'startDate' },
    { title: '结束日期', dataIndex: 'endDate', key: 'endDate' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => {
      const map: any = { planned: { color: 'default', text: '计划中' }, in_progress: { color: 'blue', text: '进行中' }, completed: { color: 'green', text: '已完成' }, expired: { color: 'red', text: '已过期' } };
      return <Tag color={map[s]?.color}>{map[s]?.text}</Tag>;
    }},
    { title: '操作', key: 'action', render: (_: any, rec: StabilityStudy) => (
      <Space>
        <Button size="small" onClick={() => openDetail(rec)}>详情</Button>
        {rec.status === 'in_progress' && (
          <Button size="small" type="primary" icon={<ExperimentOutlined />} onClick={() => handleRecordSampling(rec)}>
            记录取样
          </Button>
        )}
      </Space>
    )}
  ];

  const scheduleOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: stabilityStudies.map((s) => `${s.productName.substring(0, 6)}...\n${s.batchNo}`) },
    yAxis: { type: 'value', name: '考察时间(月)' },
    series: [
      {
        type: 'bar',
        data: stabilityStudies.map((s) => {
          const done = s.testPoints.slice(0, s.completedTests);
          const remaining = s.testPoints.slice(s.completedTests);
          return {
            value: s.testPoints[s.testPoints.length - 1] || 0,
            itemStyle: { color: '#d9d9d9' },
            children: [
              ...done.map((p) => ({ value: p, itemStyle: { color: '#52c41a' } })),
              ...remaining.map((p) => ({ value: p, itemStyle: { color: '#1890ff' } }))
            ]
          };
        }),
        label: { show: true, position: 'top' }
      }
    ]
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleGenerate}>
              自动生成考察计划
            </Button>
          </Col>
          <Col flex="auto">
            <Alert
              message={`即将到期取样: ${upcoming.filter((s) => dayjs(s.nextSamplingDate).diff(dayjs(), 'day') <= 7).length} 个`}
              type="warning"
              showIcon
              icon={<BellOutlined />}
            />
          </Col>
        </Row>
      </Card>

      <Card title="考察进度总览" style={{ marginBottom: 16 }}>
        <ReactECharts option={scheduleOption} style={{ height: 280 }} />
      </Card>

      <Card title="稳定性考察计划">
        <Table dataSource={stabilityStudies} columns={stabilityColumns} rowKey="id" />
      </Card>

      {/* Detail */}
      <Modal title={`稳定性考察 - ${selectedStudy?.studyNo || ''}`} open={detailModalOpen} onCancel={() => setDetailModalOpen(false)} footer={null} width={700}>
        {selectedStudy && (
          <div>
            <Alert
              message={`考察状态: ${selectedStudy.status === 'planned' ? '计划中' : selectedStudy.status === 'in_progress' ? '进行中' : selectedStudy.status === 'completed' ? '已完成' : '已过期'}`}
              type={selectedStudy.status === 'completed' ? 'success' : selectedStudy.status === 'expired' ? 'error' : 'info'}
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="考察编号">{selectedStudy.studyNo}</Descriptions.Item>
              <Descriptions.Item label="考察方案">{selectedStudy.protocol}</Descriptions.Item>
              <Descriptions.Item label="产品">{selectedStudy.productName}</Descriptions.Item>
              <Descriptions.Item label="批号">{selectedStudy.batchNo}</Descriptions.Item>
              <Descriptions.Item label="考察条件">{selectedStudy.conditions}</Descriptions.Item>
              <Descriptions.Item label="进度">{selectedStudy.completedTests} / {selectedStudy.totalTests}</Descriptions.Item>
              <Descriptions.Item label="开始日期">{selectedStudy.startDate}</Descriptions.Item>
              <Descriptions.Item label="结束日期">{selectedStudy.endDate}</Descriptions.Item>
              <Descriptions.Item label="下次取样" span={2}>
                {(() => {
                  const diff = dayjs(selectedStudy.nextSamplingDate).diff(dayjs(), 'day');
                  return <span className={diff <= 7 ? 'parameter-danger' : diff <= 30 ? 'parameter-warning' : 'parameter-normal'}>
                    {selectedStudy.nextSamplingDate} ({diff >= 0 ? `${diff}天后` : `已逾期${-diff}天`})
                  </span>;
                })()}
              </Descriptions.Item>
            </Descriptions>

            <Card title="取样时间点" size="small">
              <Timeline
                items={selectedStudy.testPoints.map((point, idx) => {
                  const testDate = dayjs(selectedStudy.startDate).add(point, 'month').format('YYYY-MM-DD');
                  const isDone = idx < selectedStudy.completedTests;
                  const isNext = idx === selectedStudy.completedTests;
                  return {
                    color: isDone ? 'green' : isNext ? 'blue' : 'gray',
                    dot: isDone ? <CheckCircleOutlined /> : isNext ? <ClockCircleOutlined /> : undefined,
                    children: (
                      <div style={{ marginBottom: 8 }}>
                        <strong>第 {point} 个月</strong> - {testDate}
                        <Tag color={isDone ? 'green' : isNext ? 'blue' : 'default'} style={{ marginLeft: 8 }}>
                          {isDone ? '已完成' : isNext ? '下次取样' : '待执行'}
                        </Tag>
                      </div>
                    )
                  };
                })}
              />
            </Card>
          </div>
        )}
      </Modal>

      {/* Sampling Record */}
      <Modal title="记录取样检测" open={samplingModalOpen} onCancel={() => setSamplingModalOpen(false)} onOk={submitSampling}>
        <Form form={samplingForm} layout="vertical">
          <Form.Item name="testMonth" label="考察时间点(月)" rules={[{ required: true }]}>
            <Select
              options={(selectedStudy?.testPoints || []).slice(selectedStudy?.completedTests || 0).map((p) => ({ value: p, label: `第 ${p} 个月` }))}
            />
          </Form.Item>
          <Form.Item name="samplingDate" label="取样日期" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="tests" label="检测项目" rules={[{ required: true }]}>
            <Select mode="multiple" options={[
              { value: 'appearance', label: '性状' },
              { value: 'identification', label: '鉴别' },
              { value: 'assay', label: '含量测定' },
              { value: 'dissolution', label: '溶出度' },
              { value: 'related', label: '有关物质' },
              { value: 'moisture', label: '水分' },
              { value: 'microbial', label: '微生物' }
            ]} />
          </Form.Item>
          <Form.Item name="result" label="检测结果" rules={[{ required: true }]}>
            <Select options={[{ value: 'conform', label: '符合规定' }, { value: 'non_conform', label: '不符合规定' }]} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Stability;
