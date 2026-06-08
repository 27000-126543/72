import { useState } from 'react';
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
  const { products, batches, deviations, lines, equipments } = useAppStore();
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [period, setPeriod] = useState('year');

  // Mock stat data
  const statData = products.map((p) => {
    const relevantBatches = batches.filter((b) => b.productId === p.id || true);
    return {
      key: p.id,
      productName: p.name,
      totalBatches: Math.floor(Math.random() * 30) + 10,
      avgYield: (90 + Math.random() * 9).toFixed(2),
      firstPassRate: (85 + Math.random() * 14).toFixed(2),
      deviationCount: Math.floor(Math.random() * 5),
      equipmentUtil: (70 + Math.random() * 25).toFixed(1)
    };
  });

  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  const yieldOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['平均收率', '一次合格率'] },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value', min: 80, max: 100, axisLabel: { formatter: '{value}%' } },
    series: [
      {
        name: '平均收率',
        type: 'line',
        smooth: true,
        data: months.map(() => (93 + Math.random() * 5).toFixed(1)),
        itemStyle: { color: '#1890ff' },
        areaStyle: { color: 'rgba(24,144,255,0.2)' }
      },
      {
        name: '一次合格率',
        type: 'line',
        smooth: true,
        data: months.map(() => (90 + Math.random() * 8).toFixed(1)),
        itemStyle: { color: '#52c41a' },
        areaStyle: { color: 'rgba(82,196,26,0.2)' }
      }
    ]
  };

  const deviationOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: [
        { value: 15, name: '轻微偏差', itemStyle: { color: '#1890ff' } },
        { value: 8, name: '主要偏差', itemStyle: { color: '#faad14' } },
        { value: 2, name: '严重偏差', itemStyle: { color: '#ff4d4f' } }
      ],
      label: { formatter: '{b}: {c} ({d}%)' }
    }]
  };

  const equipmentOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: equipments.map((e) => e.name.substring(0, 6)) },
    yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    series: [{
      type: 'bar',
      data: equipments.map(() => Math.round(60 + Math.random() * 35)),
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
  };

  const productBarOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['批次数量', '偏差数'] },
    xAxis: { type: 'category', data: products.map((p) => p.name.substring(0, 8)) },
    yAxis: [{ type: 'value', name: '批次' }, { type: 'value', name: '偏差' }],
    series: [
      {
        name: '批次数量',
        type: 'bar',
        data: products.map(() => Math.floor(20 + Math.random() * 40)),
        itemStyle: { color: '#1890ff' }
      },
      {
        name: '偏差数',
        type: 'bar',
        yAxisIndex: 1,
        data: products.map(() => Math.floor(Math.random() * 6)),
        itemStyle: { color: '#ff4d4f' }
      }
    ]
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Annual Quality Review Report', 105, 22, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`年度质量回顾报告 - ${dayjs().format('YYYY')}`, 105, 32, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`生成日期: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`, 14, 42);
    doc.text('报告范围: 2026年度全年', 14, 48);

    let y = 60;
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
    const avgYieldAll = (statData.reduce((a, b) => a + parseFloat(b.avgYield), 0) / statData.length).toFixed(2);
    const avgFPR = (statData.reduce((a, b) => a + parseFloat(b.firstPassRate), 0) / statData.length).toFixed(2);
    const totalDev = statData.reduce((a, b) => a + b.deviationCount, 0);
    doc.text(`Overall Average Yield: ${avgYieldAll}%`, 14, y + 10);
    doc.text(`Overall First Pass Rate: ${avgFPR}%`, 14, y + 18);
    doc.text(`Total Deviations: ${totalDev}`, 14, y + 26);
    doc.text(`Production Lines: ${lines.length}`, 14, y + 34);
    doc.text(`Active Equipments: ${equipments.length}`, 14, y + 42);

    doc.save(`QualityReview_${dayjs().format('YYYYMMDD')}.pdf`);
    msg.success('PDF报告已生成');
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
            <Button type="primary" icon={<FilePdfOutlined />} onClick={exportPDF}>
              导出PDF年度质量回顾报告
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总生产批次"
              value={statData.reduce((a, b) => a + b.totalBatches, 0)}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均收率"
              value={(statData.reduce((a, b) => a + parseFloat(b.avgYield), 0) / statData.length).toFixed(2)}
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
              value={(statData.reduce((a, b) => a + parseFloat(b.firstPassRate), 0) / statData.length).toFixed(2)}
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
              value={statData.reduce((a, b) => a + b.deviationCount, 0)}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
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
          <Card>
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
