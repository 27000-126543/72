import { Row, Col, Card, Statistic, Table, Tag, Progress, List, Avatar } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  RiseOutlined,
  FallOutlined,
  ToolOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import { useAppStore } from '../store/appStore';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';

const Dashboard: React.FC = () => {
  const { lines, batches, deviations, maintenanceOrders, materials, salesOrders, stabilityStudies } = useAppStore();

  const runningLines = lines.filter((l) => l.status === 'running').length;
  const activeBatches = batches.filter((b) => ['preparing', 'granulating', 'compressing', 'packaging'].includes(b.status)).length;
  const lowStockMaterials = materials.filter((m) => m.quantity < m.safetyStock).length;
  const pendingDeviations = deviations.filter((d) => d.status !== 'closed').length;

  const batchStatusOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        label: { show: false },
        data: [
          { value: batches.filter((b) => b.status === 'scheduled').length, name: '已排程', itemStyle: { color: '#8c8c8c' } },
          { value: batches.filter((b) => b.status === 'preparing').length, name: '备料中', itemStyle: { color: '#faad14' } },
          { value: batches.filter((b) => b.status === 'granulating').length, name: '制粒中', itemStyle: { color: '#1890ff' } },
          { value: batches.filter((b) => b.status === 'compressing').length, name: '压片中', itemStyle: { color: '#2f54eb' } },
          { value: batches.filter((b) => b.status === 'packaging').length, name: '包装中', itemStyle: { color: '#722ed1' } },
          { value: batches.filter((b) => b.status === 'qc_pending').length, name: '待检', itemStyle: { color: '#eb2f96' } },
          { value: batches.filter((b) => b.status === 'released').length, name: '已放行', itemStyle: { color: '#52c41a' } }
        ]
      }
    ]
  };

  const yieldOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['1月', '2月', '3月', '4月', '5月', '6月'] },
    yAxis: { type: 'value', min: 80, max: 100, axisLabel: { formatter: '{value}%' } },
    series: [
      {
        name: '平均收率',
        type: 'line',
        smooth: true,
        data: [94.5, 95.2, 93.8, 96.1, 95.7, 96.3],
        itemStyle: { color: '#1890ff' },
        areaStyle: { color: 'rgba(24,144,255,0.2)' }
      },
      {
        name: '一次合格率',
        type: 'line',
        smooth: true,
        data: [91.2, 92.5, 90.8, 93.5, 94.1, 94.8],
        itemStyle: { color: '#52c41a' },
        areaStyle: { color: 'rgba(82,196,26,0.2)' }
      }
    ]
  };

  const lineColumns = [
    { title: '生产线', dataIndex: 'code', key: 'code' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => {
      const map: any = { running: { color: 'green', text: '运行中' }, idle: { color: 'default', text: '空闲' }, maintenance: { color: 'orange', text: '维护中' }, cleaning: { color: 'blue', text: '清洗中' }, offline: { color: 'red', text: '离线' } };
      return <Tag color={map[s]?.color}>{map[s]?.text}</Tag>;
    }},
    { title: '当前产品', dataIndex: 'lastProduct', key: 'lastProduct' },
    { title: '利用率', key: 'util', render: () => <Progress percent={Math.floor(60 + Math.random() * 35)} size="small" /> }
  ];

  const recentDeviations = deviations.slice(0, 5);
  const upcomingMaintenance = maintenanceOrders.filter((m) => m.status === 'pending').slice(0, 5);
  const upcomingSampling = stabilityStudies
    .filter((s) => dayjs(s.nextSamplingDate).isBefore(dayjs().add(14, 'day')))
    .sort((a, b) => dayjs(a.nextSamplingDate).valueOf() - dayjs(b.nextSamplingDate).valueOf())
    .slice(0, 5);

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="运行中生产线"
              value={runningLines}
              suffix={`/ ${lines.length}`}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="进行中批次"
              value={activeBatches}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理偏差"
              value={pendingDeviations}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="库存预警物料"
              value={lowStockMaterials}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={16}>
          <Card title="生产线状态">
            <Table dataSource={lines} columns={lineColumns} pagination={false} size="small" rowKey="id" />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="批次状态分布">
            <ReactECharts option={batchStatusOption} style={{ height: 260 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={16}>
          <Card title="质量趋势">
            <ReactECharts option={yieldOption} style={{ height: 280 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="待办事项">
            <List
              size="small"
              dataSource={[
                ...upcomingMaintenance.map((m) => ({ key: m.id, type: 'maintenance', title: m.workOrderNo + ' ' + m.equipmentName, time: m.dueDate, icon: <ToolOutlined style={{ color: '#faad14' }} /> })),
                ...upcomingSampling.map((s) => ({ key: s.id, type: 'sampling', title: s.productName + ' ' + s.batchNo, time: s.nextSamplingDate, icon: <ExperimentOutlined style={{ color: '#722ed1' }} /> }))
              ].slice(0, 8)}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={item.icon} />}
                    title={item.title}
                    description={`截止日期: ${item.time}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Card title="最近偏差记录">
        <List
          dataSource={recentDeviations}
          renderItem={(d) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<WarningOutlined />} style={{ backgroundColor: d.type === 'critical' ? '#ff4d4f' : d.type === 'major' ? '#faad14' : '#1890ff' }} />}
                title={<span>{d.deviationNo} - {d.title}</span>}
                description={`批次: ${d.batchNo || '-'} | 报告人: ${d.reporter} | ${d.reportTime}`}
              />
              <Tag color={d.status === 'closed' ? 'green' : d.status === 'qa_review' ? 'purple' : 'orange'}>
                {d.status === 'reported' ? '已报告' : d.status === 'investigating' ? '调查中' : d.status === 'corrective_action' ? '纠正措施' : d.status === 'qa_review' ? 'QA审核' : d.status === 'approved' ? '已批准' : '已关闭'}
              </Tag>
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
