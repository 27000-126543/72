import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Space, Badge } from 'antd';
import {
  DashboardOutlined,
  AppstoreOutlined,
  ScheduleOutlined,
  PlayCircleOutlined,
  ToolOutlined,
  FileProtectOutlined,
  ExperimentOutlined,
  BarChartOutlined,
  MonitorOutlined,
  UserOutlined,
  BellOutlined,
  LogoutOutlined,
  SettingOutlined
} from '@ant-design/icons';
import Dashboard from './pages/Dashboard';
import BasicData from './pages/BasicData';
import ProductionScheduling from './pages/ProductionScheduling';
import ProductionProcess from './pages/ProductionProcess';
import EquipmentManagement from './pages/EquipmentManagement';
import ChangeControl from './pages/ChangeControl';
import Stability from './pages/Stability';
import Statistics from './pages/Statistics';
import Visualization from './pages/Visualization';
import { useAppStore } from './store/appStore';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '工作台' },
  { key: '/basic-data', icon: <AppstoreOutlined />, label: '基础数据管理' },
  { key: '/scheduling', icon: <ScheduleOutlined />, label: '生产排程' },
  { key: '/production', icon: <PlayCircleOutlined />, label: '生产过程管理' },
  { key: '/equipment', icon: <ToolOutlined />, label: '设备管理' },
  { key: '/change', icon: <FileProtectOutlined />, label: '变更控制' },
  { key: '/stability', icon: <ExperimentOutlined />, label: '稳定性考察' },
  { key: '/statistics', icon: <BarChartOutlined />, label: '统计分析' },
  { key: '/visualization', icon: <MonitorOutlined />, label: '车间可视化' }
];

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, deviations, maintenanceOrders, stabilityStudies } = useAppStore();

  const pendingDeviations = deviations.filter((d) => d.status !== 'closed').length;
  const pendingMaintenance = maintenanceOrders.filter((m) => m.status === 'pending' || m.status === 'in_progress').length;
  const upcomingSampling = stabilityStudies.filter((s) => {
    const diff = new Date(s.nextSamplingDate).getTime() - new Date().getTime();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const notificationCount = pendingDeviations + pendingMaintenance + upcomingSampling;

  const userDropdownItems = [
    { key: 'profile', icon: <UserOutlined />, label: `${currentUser.name} - ${currentUser.department}` },
    { key: 'settings', icon: <SettingOutlined />, label: '个人设置' },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' }
  ];

  return (
    <Layout className="app-layout">
      <Sider width={220} theme="dark">
        <div style={{ padding: '16px', textAlign: 'center', color: '#fff', fontWeight: 600, fontSize: 16, borderBottom: '1px solid #1f1f1f' }}>
          💊 GMP制药质量管理
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 4px rgba(0,21,41,.08)',
            height: 56,
            lineHeight: '56px'
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 500, color: '#262626' }}>
            {menuItems.find((m) => m.key === location.pathname)?.label || 'GMP制药生产与质量管理系统'}
          </div>
          <Space size={24}>
            <Badge count={notificationCount} size="small">
              <BellOutlined style={{ fontSize: 18, color: '#595959', cursor: 'pointer' }} />
            </Badge>
            <Dropdown menu={{ items: userDropdownItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                <span>{currentUser.name}</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: 0, padding: 24, background: '#f0f2f5', overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/basic-data" element={<BasicData />} />
            <Route path="/scheduling" element={<ProductionScheduling />} />
            <Route path="/production" element={<ProductionProcess />} />
            <Route path="/equipment" element={<EquipmentManagement />} />
            <Route path="/change" element={<ChangeControl />} />
            <Route path="/stability" element={<Stability />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/visualization" element={<Visualization />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
