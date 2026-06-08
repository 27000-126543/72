import { useState, useEffect } from 'react';
import { Card, Row, Col, Tag, Statistic, Progress, Space, List, Avatar, Badge, Tooltip, Divider, Button } from 'antd';
import {
  CheckCircleOutlined, PauseCircleOutlined, WarningOutlined,
  ThunderboltOutlined, CloseCircleOutlined, ToolOutlined,
  ClockCircleOutlined, EnvironmentOutlined, DashboardOutlined,
  FireOutlined, PlayCircleOutlined
} from '@ant-design/icons';
import { useAppStore } from '../store/appStore';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';

const Visualization: React.FC = () => {
  const { lines, equipments, batches, schedules, deviations } = useAppStore();
  const [currentTime, setCurrentTime] = useState(dayjs().format('YYYY-MM-DD HH:mm:ss'));
  const [selectedLine, setSelectedLine] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs().format('YYYY-MM-DD HH:mm:ss'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const statusColor: any = {
    running: { bg: '#52c41a', text: '#fff', label: '运行中', icon: <PlayCircleOutlined /> },
    idle: { bg: '#8c8c8c', text: '#fff', label: '空闲', icon: <PauseCircleOutlined /> },
    maintenance: { bg: '#faad14', text: '#fff', label: '维护中', icon: <ToolOutlined /> },
    cleaning: { bg: '#1890ff', text: '#fff', label: '清洗中', icon: <ClockCircleOutlined /> },
    offline: { bg: '#ff4d4f', text: '#fff', label: '离线', icon: <CloseCircleOutlined /> }
  };

  const runningCount = lines.filter((l) => l.status === 'running').length;
  const activeBatches = batches.filter((b) => ['preparing', 'granulating', 'compressing', 'packaging'].includes(b.status));

  const workshopLayout = [
    {
      name: '制剂车间',
      lines: lines.filter((l) => l.workshop === '制剂车间'),
      position: { left: 30, top: 80 }
    },
    {
      name: '注射剂车间',
      lines: lines.filter((l) => l.workshop === '注射剂车间'),
      position: { left: 420, top: 80 }
    },
    {
      name: '液体制剂车间',
      lines: lines.filter((l) => l.workshop === '液体制剂车间'),
      position: { left: 720, top: 80 }
    }
  ];

  const heatmapOption = {
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const eq = equipments[params.data[1]];
        if (!eq) return '';
        const load = params.data[2];
        return `<b>${eq.name}</b><br/>型号: ${eq.model}<br/>运行时长: ${eq.runningHours}h<br/>负载: ${load}%`;
      }
    },
    grid: { height: '60%', top: '10%' },
    xAxis: {
      type: 'category',
      data: lines.map((l) => l.code),
      splitArea: { show: true },
      axisLabel: { color: '#4fc3f7' }
    },
    yAxis: {
      type: 'category',
      data: Array.from(new Set(equipments.map((e) => e.name.substring(0, 4)))).slice(0, 6),
      splitArea: { show: true },
      axisLabel: { color: '#4fc3f7' }
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: {
        color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
      },
      textStyle: { color: '#fff' }
    },
    series: [{
      name: '设备负载热力',
      type: 'heatmap',
      data: equipments.map((eq, i) => {
        const lineIdx = lines.findIndex((l) => l.id === eq.lineId);
        const load = eq.status === 'normal' ? Math.round(60 + Math.random() * 35) : eq.status === 'warning' ? Math.round(85 + Math.random() * 10) : eq.status === 'maintenance' ? 0 : Math.round(90 + Math.random() * 10);
        return [lineIdx >= 0 ? lineIdx : 0, i % 6, load];
      }),
      label: {
        show: true,
        color: '#000',
        fontSize: 10,
        formatter: (p: any) => `${p.data[2]}%`
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  };

  const realtimeOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: lines.filter((l) => l.status === 'running').map((l) => l.code), textStyle: { color: '#fff' } },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: Array.from({ length: 20 }, (_, i) => dayjs().subtract(19 - i, 'minute').format('HH:mm')),
      axisLabel: { color: '#b0bec5' }
    },
    yAxis: {
      type: 'value',
      name: '产量(件)',
      axisLabel: { color: '#b0bec5' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
    },
    series: lines.filter((l) => l.status === 'running').map((l, i) => ({
      name: l.code,
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: Array.from({ length: 20 }, () => Math.floor(500 + Math.random() * 800)),
      lineStyle: { width: 2 },
      areaStyle: { opacity: 0.1 }
    }))
  };

  const selectedLineData = selectedLine ? lines.find((l) => l.id === selectedLine) : null;
  const selectedLineEquipments = selectedLine ? equipments.filter((e) => e.lineId === selectedLine) : [];
  const selectedLineBatches = selectedLine ? activeBatches.filter((b) => b.lineId === selectedLine) : [];

  return (
    <div>
      <div className="shop-floor-container" style={{ marginBottom: 16 }}>
        <div className="shop-floor-title">
          <DashboardOutlined /> 智能车间可视化监控大屏
        </div>
        <div className="shop-floor-subtitle">
          实时数据更新 · 当前时间: {currentTime}
        </div>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <div style={{ background: 'rgba(82,196,26,0.15)', border: '1px solid rgba(82,196,26,0.3)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 36, color: '#52c41a', fontWeight: 700 }}>{runningCount}/{lines.length}</div>
              <div style={{ color: '#b0bec5', marginTop: 4 }}>运行中生产线</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ background: 'rgba(24,144,255,0.15)', border: '1px solid rgba(24,144,255,0.3)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 36, color: '#4fc3f7', fontWeight: 700 }}>{activeBatches.length}</div>
              <div style={{ color: '#b0bec5', marginTop: 4 }}>进行中批次</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ background: 'rgba(250,173,20,0.15)', border: '1px solid rgba(250,173,20,0.3)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 36, color: '#faad14', fontWeight: 700 }}>{deviations.filter((d) => d.status !== 'closed').length}</div>
              <div style={{ color: '#b0bec5', marginTop: 4 }}>待处理偏差</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ background: 'rgba(114,46,209,0.15)', border: '1px solid rgba(114,46,209,0.3)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 36, color: '#b37feb', fontWeight: 700 }}>{Math.round((runningCount / lines.length) * 100)}%</div>
              <div style={{ color: '#b0bec5', marginTop: 4 }}>产线综合利用率</div>
            </div>
          </Col>
        </Row>

        {/* Workshop Layout */}
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 20, marginBottom: 16, minHeight: 340, position: 'relative' }}>
          <div style={{ color: '#4fc3f7', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            <EnvironmentOutlined /> 车间布局图 - 实时生产线状态
          </div>
          <Row gutter={[16, 16]}>
            {workshopLayout.map((ws) => (
              <Col key={ws.name} span={8}>
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: 16,
                  minHeight: 260
                }}>
                  <div style={{ color: '#4fc3f7', fontSize: 14, fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>
                    🏭 {ws.name}
                  </div>
                  {ws.lines.length > 0 ? (
                    <Space direction="vertical" style={{ width: '100%' }} size={8}>
                      {ws.lines.map((line) => {
                        const sc = statusColor[line.status];
                        return (
                          <div
                            key={line.id}
                            onClick={() => setSelectedLine(line.id)}
                            style={{
                              background: selectedLine === line.id ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                              borderLeft: `4px solid ${sc.bg}`,
                              borderRadius: 6,
                              padding: 12,
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: '#fff', fontWeight: 600 }}>{line.code}</span>
                              <Tag color={sc.bg} icon={sc.icon}>{sc.label}</Tag>
                            </div>
                            <div style={{ color: '#b0bec5', fontSize: 12, marginTop: 4 }}>
                              {line.name}
                            </div>
                            {line.lastProduct && (
                              <div style={{ color: '#80deea', fontSize: 11, marginTop: 2 }}>
                                当前: {line.lastProduct}
                              </div>
                            )}
                            <Progress
                              percent={line.status === 'running' ? 60 + Math.floor(Math.random() * 35) : line.status === 'idle' ? 0 : line.status === 'maintenance' ? 50 : 30}
                              size="small"
                              showInfo={false}
                              strokeColor={sc.bg}
                              style={{ marginTop: 8 }}
                            />
                          </div>
                        );
                      })}
                    </Space>
                  ) : (
                    <div style={{ color: '#666', textAlign: 'center', padding: 40 }}>暂无产线</div>
                  )}
                </div>
              </Col>
            ))}
          </Row>
        </div>

        {/* Heatmap + Realtime */}
        <Row gutter={16}>
          <Col span={14}>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 16 }}>
              <div style={{ color: '#4fc3f7', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                <FireOutlined /> 设备热力分布图
              </div>
              <ReactECharts
                option={heatmapOption}
                style={{ height: 280, background: 'transparent' }}
                theme="dark"
              />
            </div>
          </Col>
          <Col span={10}>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 16 }}>
              <div style={{ color: '#4fc3f7', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                <ThunderboltOutlined /> 实时产量趋势
              </div>
              <ReactECharts
                option={realtimeOption}
                style={{ height: 280, background: 'transparent' }}
                theme="dark"
              />
            </div>
          </Col>
        </Row>
      </div>

      {/* Line Detail Panel */}
      {selectedLineData && (
        <Card
          title={`产线详情 - ${selectedLineData.code} ${selectedLineData.name}`}
          extra={<Button onClick={() => setSelectedLine(null)}>关闭</Button>}
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Card size="small" title="基本信息">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>状态: <Tag color={statusColor[selectedLineData.status].bg}>{statusColor[selectedLineData.status].label}</Tag></div>
                  <div>位置: {selectedLineData.location}</div>
                  <div>车间: {selectedLineData.workshop}</div>
                  <div>日产能: {selectedLineData.capacity.toLocaleString()}</div>
                  {selectedLineData.lastProduct && <div>最近产品: {selectedLineData.lastProduct}</div>}
                  {selectedLineData.lastBatch && <div>最近批号: {selectedLineData.lastBatch}</div>}
                </Space>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" title={`关联设备 (${selectedLineEquipments.length})`}>
                <List
                  size="small"
                  dataSource={selectedLineEquipments}
                  renderItem={(eq) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar icon={<ToolOutlined />} style={{ backgroundColor: eq.status === 'normal' ? '#52c41a' : '#faad14' }} />}
                        title={eq.name}
                        description={`${eq.model} | 运行 ${eq.runningHours}h`}
                      />
                      <Tag color={eq.status === 'normal' ? 'green' : 'orange'}>
                        {eq.status === 'normal' ? '正常' : eq.status === 'warning' ? '预警' : eq.status === 'critical' ? '严重' : '维保中'}
                      </Tag>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" title={`当前批次 (${selectedLineBatches.length})`}>
                <List
                  size="small"
                  dataSource={selectedLineBatches}
                  locale={{ emptyText: '暂无进行中批次' }}
                  renderItem={(b) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar icon={<PlayCircleOutlined />} style={{ backgroundColor: '#1890ff' }} />}
                        title={b.batchNo}
                        description={`${b.productName} | 计划 ${b.plannedQuantity.toLocaleString()}`}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <Space size={32} wrap>
          <span><Tag color="#52c41a"><PlayCircleOutlined /> 运行中</Tag> 生产线正常生产</span>
          <span><Tag color="#8c8c8c"><PauseCircleOutlined /> 空闲</Tag> 等待排程</span>
          <span><Tag color="#1890ff"><ClockCircleOutlined /> 清洗中</Tag> 产品切换清洗(≥4h)</span>
          <span><Tag color="#faad14"><ToolOutlined /> 维护中</Tag> 设备维保</span>
          <span><Tag color="#ff4d4f"><CloseCircleOutlined /> 离线</Tag> 故障/停机</span>
          <Divider type="vertical" />
          <span>热力图颜色从蓝(低负载)到红(高负载)渐变，直观展示各设备运行强度</span>
        </Space>
      </Card>
    </div>
  );
};

export default Visualization;
