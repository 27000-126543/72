import { useState, useMemo } from 'react';
import {
  Tabs, Card, Row, Col, Statistic, Select, DatePicker, Button, Table,
  Tag, Space, Progress, message, App, Divider
} from 'antd';
import {
  RiseOutlined, FallOutlined, BarChartOutlined, FilePdfOutlined,
  ThunderboltOutlined, CheckCircleOutlined, WarningOutlined, ExperimentOutlined
} from '@ant-design/icons';
import { useAppStore } from '../store/appStore';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const Statistics: React.FC = () => {
  const { message: msg } = App.useApp();
  const { products, batches, deviations, lines, equipments, computeStatistics } = useAppStore();
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [period, setPeriod] = useState('year');

  const stats = useMemo(() => computeStatistics(selectedProduct === 'all' ? undefined : selectedProduct), [computeStatistics, selectedProduct, batches, deviations, equipments, products]);

  const statData = stats.byProduct;

  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  const yieldOption = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    legend: { data: ['平均收率', '一次合格率'] },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value', min: 80, max: 100, axisLabel: { formatter: '{value}%' } },
    series: [
      {
        name: '平均收率',
        type: 'line',
        smooth: true,
        data: stats.monthlyYield,
        itemStyle: { color: '#1890ff' },
        areaStyle: { color: 'rgba(24,144,255,0.2)' }
      },
      {
        name: '一次合格率',
        type: 'line',
        smooth: true,
        data: stats.monthlyFirstPassRate,
        itemStyle: { color: '#52c41a' },
        areaStyle: { color: 'rgba(82,196,26,0.2)' }
      }
    ]
  }), [stats]);

  const deviationOption = useMemo(() => ({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: [
        { value: stats.minorDeviations, name: '轻微偏差', itemStyle: { color: '#1890ff' } },
        { value: stats.majorDeviations, name: '主要偏差', itemStyle: { color: '#faad14' } },
        { value: stats.criticalDeviations, name: '严重偏差', itemStyle: { color: '#ff4d4f' } }
      ],
      label: { formatter: '{b}: {c} ({d}%)' }
    }]
  }), [stats]);

  const equipmentOption = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: equipments.map((e) => e.name.substring(0, 8)) },
    yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    series: [{
      type: 'bar',
      data: stats.equipmentUtilizations,
      itemStyle: {
        color: (params: any) => {
          if (params.value > 85) return '#52c41a';
          if (params.value > 70) return '#1890ff';
          if (params.value > 50) return '#faad14';
          return '#ff4d4f';
        }
      },
      label: { show: true, position: 'top', formatter: '{c}%' }
    }]
  }), [stats, equipments]);

  const productBarOption = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    legend: { data: ['批次数量', '偏差数'] },
    xAxis: { type: 'category', data: statData.map((p) => p.productName.substring(0, 8)) },
    yAxis: [{ type: 'value', name: '批次' }, { type: 'value', name: '偏差' }],
    series: [
      {
        name: '批次数量',
        type: 'bar',
        data: statData.map((p) => p.totalBatches),
        itemStyle: { color: '#1890ff' }
      },
      {
        name: '偏差数',
        type: 'bar',
        yAxisIndex: 1,
        data: statData.map((p) => p.deviationCount),
        itemStyle: { color: '#ff4d4f' }
      }
    ]
  }), [statData]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Annual Quality Review Report', 105, 22, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`年度质量回顾报告 - ${dayjs().format('YYYY')}`, 105, 32, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`生成日期: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`, 14, 42);
    doc.text(`报告范围: ${dayjs().format('YYYY')}年度全年`, 14, 48);
    doc.text(`产品筛选: ${selectedProduct === 'all' ? '全部产品' : products.find((p) => p.id === selectedProduct)?.name || ''}`, 14, 54);

    let y = 64;
    autoTable(doc, {
      startY: y,
      head: [['产品名称', '总批次', '平均收率(%)', '一次合格率(%)', '偏差数', '设备利用率(%)']],
      body: statData.map((s) => [s.productName, s.totalBatches, s.avgYield, s.firstPassRate, s.deviationCount, s.equipmentUtil]),
      headStyles: { fillColor: [24, 144, 255] }
    });

    y = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(14);
    doc.text('Summary Statistics', 14, y);
    doc.setFontSize(10);
    doc.text(`Overall Average Yield: ${stats.overallAvgYield}%`, 14, y + 10);
    doc.text(`Overall First Pass Rate: ${stats.overallAvgFirstPassRate}%`, 14, y + 18);
    doc.text(`Total Deviations: ${stats.totalDeviations} (轻微:${stats.minorDeviations} 主要:${stats.majorDeviations} 严重:${stats.criticalDeviations})`, 14, y + 26);
    doc.text(`Total Batches: ${stats.totalBatches}`, 14, y + 34);
    doc.text(`Production Lines: ${lines.length}`, 14, y + 42);
    doc.text(`Active Equipments: ${equipments.length}, Avg Utilization: ${stats.overallEquipmentUtil}%`, 14, y + 50);

    doc.save(`QualityReview_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`);
    msg.success('PDF年度质量回顾报告已生成');
  };

  const statColumns = [
    { title: '产品名称', dataIndex: 'productName', key: 'productName' },
    { title: '总批次', dataIndex: 'totalBatches', key: 'totalBatches', sorter: (a: any, b: any) => a.totalBatches - b.totalBatches },
    { title: '平均收率(%)', dataIndex: 'avgYield', key: 'avgYield', render: (v: string) => <span className={parseFloat(v) >= 95 ? 'parameter-normal' : parseFloat(v) >= 90 ? 'parameter-warning' : 'parameter-danger'} style={{ fontWeight: 600 }}>{v}</span> },
    { title: '一次合格率(%)', dataIndex: 'firstPassRate', key: 'firstPassRate', render: (v: string) => <span className={parseFloat(v) >= 95 ? 'parameter-normal' : parseFloat(v) >= 90 ? 'parameter-warning' : 'parameter-danger'} style={{ fontWeight: 600 }}>{v}</span> },
    { title: '偏差次数', dataIndex: 'deviationCount', key: 'deviationCount', render: (v: number) => v > 3 ? <Tag color="red">{v}</Tag> : v > 0 ? <Tag color="orange">{v}</Tag> : <Tag color="green">{v}</Tag> },
    { title: '设备利用率(%)', dataIndex: 'equipmentUtil', key: 'equipmentUtil', render: (v: string) => <Progress percent={parseFloat(v)} size="small" /> }
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <span style={{ marginRight: 8 }}>统计周期:</span>
            <Select value={period} onChange={setPeriod} style={{ width: 150 }}>
              <Select.Option value="month">本月</Select.Option>
              <Select.Option value="quarter">本季度</Select.Option>
              <Select.Option value="year">本年度</Select.Option>
            </Select>
          </Col>
          <Col>
            <span style={{ marginRight: 8 }}>产品筛选:</span>
            <Select value={selectedProduct} onChange={setSelectedProduct} style={{ width: 200 }}>
              <Select.Option value="all">全部产品</Select.Option>
              {products.map((p) => (
                <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col>
            <RangePicker />
          </Col>
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Space>
              <span style={{ color: '#8c8c8c', fontSize: 12 }}>数据来源: 批次/偏差/设备真实数据汇总</span>
              <Button type="primary" icon={<FilePdfOutlined />} onClick={exportPDF}>
                导出PDF年度质量回顾报告
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总生产批次"
              value={stats.totalBatches}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均收率"
              value={stats.overallAvgYield}
              suffix="%"
              valueStyle={{ color: '#52c41a' }}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="一次合格率"
              value={stats.overallAvgFirstPassRate}
              suffix="%"
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="偏差总数"
              value={stats.totalDeviations}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              轻:{stats.minorDeviations} / 主:{stats.majorDeviations} / 严:{stats.criticalDeviations}
            </div>
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="yield">
        <TabPane tab="收率与合格率趋势" key="yield">
          <Card>
            <ReactECharts option={yieldOption} style={{ height: 360 }} />
          </Card>
        </TabPane>
        <TabPane tab="偏差统计" key="deviation">
          <Row gutter={16}>
            <Col span={10}>
              <Card title="偏差类型分布">
                <ReactECharts option={deviationOption} style={{ height: 320 }} />
              </Card>
            </Col>
            <Col span={14}>
              <Card title="各产品偏差情况">
                <ReactECharts option={productBarOption} style={{ height: 320 }} />
              </Card>
            </Col>
          </Row>
        </TabPane>
        <TabPane tab="设备利用率" key="equipment">
          <Card title={`平均设备利用率: ${stats.overallEquipmentUtil}%`}>
            <ReactECharts option={equipmentOption} style={{ height: 360 }} />
          </Card>
        </TabPane>
        <TabPane tab="产品统计表" key="table">
          <Card>
            <Table dataSource={statData} columns={statColumns} pagination={false} />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Statistics;
