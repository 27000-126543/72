import { useState } from 'react';
import {
  Tabs, Table, Card, Tag, Button, Modal, Descriptions, Space, Progress,
  Alert, Row, Col, Form, Input, Select, InputNumber, DatePicker, List, Avatar,
  message, App, Statistic
} from 'antd';
import {
  ToolOutlined, PlusOutlined, CheckCircleOutlined, WarningOutlined,
  SafetyOutlined, StockOutlined, ThunderboltOutlined, ReloadOutlined
} from '@ant-design/icons';
import { useAppStore } from '../store/appStore';
import type { Equipment, MaintenanceWorkOrder, Material } from '../types';
import dayjs from 'dayjs';

const { TabPane } = Tabs;

const EquipmentManagement: React.FC = () => {
  const { message: msg } = App.useApp();
  const { equipments, maintenanceOrders, materials, lines, generateMaintenanceOrders, updateMaintenanceStatus } = useAppStore();
  const [activeTab, setActiveTab] = useState('equipment');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [woModalOpen, setWoModalOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState<MaintenanceWorkOrder | null>(null);
  const [woForm] = Form.useForm();

  const openEquipmentDetail = (eq: Equipment) => {
    setSelectedEquipment(eq);
    setDetailModalOpen(true);
  };

  const openWODetail = (wo: MaintenanceWorkOrder) => {
    setSelectedWO(wo);
    woForm.resetFields();
    setWoModalOpen(true);
  };

  const handleGenerateWOs = () => {
    generateMaintenanceOrders();
    msg.success('已扫描设备运行时长，生成维保工单');
  };

  const handleWOAction = (wo: MaintenanceWorkOrder, nextStatus: MaintenanceWorkOrder['status']) => {
    if (nextStatus === 'completed') {
      Modal.confirm({
        title: '完成维保并验证',
        content: (
          <Form form={woForm} layout="vertical">
            <Form.Item name="verification" label="验证结果" rules={[{ required: true }]}>
              <Input.TextArea rows={3} placeholder="请描述维保验证结果..." />
            </Form.Item>
          </Form>
        ),
        onOk: async () => {
          const values = await woForm.validateFields();
          updateMaintenanceStatus(wo.id, 'completed', values.verification);
          msg.success('维保工单已完成');
        }
      });
    } else {
      updateMaintenanceStatus(wo.id, nextStatus);
      msg.success('状态已更新');
    }
  };

  const lowStockMaterials = materials.filter((m) => m.quantity < m.safetyStock);

  const equipmentColumns = [
    { title: '设备编号', dataIndex: 'code', key: 'code' },
    { title: '设备名称', dataIndex: 'name', key: 'name' },
    { title: '型号', dataIndex: 'model', key: 'model' },
    { title: '所属生产线', key: 'line', render: (_: any, rec: Equipment) => lines.find((l) => l.id === rec.lineId)?.code || '-' },
    { title: '运行时长(h)', dataIndex: 'runningHours', key: 'runningHours' },
    { title: '下次维保', dataIndex: 'nextMaintenanceDate', key: 'nextMaintenanceDate', render: (v: string) => {
      const diff = dayjs(v).diff(dayjs(), 'day');
      return <span className={diff < 3 ? 'parameter-danger' : diff < 7 ? 'parameter-warning' : 'parameter-normal'}>{v} ({diff >= 0 ? `${diff}天后` : `已逾期${-diff}天`})</span>;
    }},
    { title: '验证有效期', dataIndex: 'validationExpiryDate', key: 'validationExpiryDate', render: (v: string) => {
      const diff = dayjs(v).diff(dayjs(), 'day');
      return <span className={diff < 15 ? 'parameter-danger' : diff < 30 ? 'parameter-warning' : 'parameter-normal'}>{v}</span>;
    }},
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => {
      const map: any = { normal: { color: 'green', text: '正常' }, warning: { color: 'orange', text: '预警' }, critical: { color: 'red', text: '严重' }, maintenance: { color: 'blue', text: '维保中' } };
      return <Tag color={map[s]?.color} icon={map[s]?.color === 'green' ? <CheckCircleOutlined /> : <WarningOutlined />}>{map[s]?.text}</Tag>;
    }},
    { title: '操作', key: 'action', render: (_: any, rec: Equipment) => (
      <Button size="small" onClick={() => openEquipmentDetail(rec)}>详情</Button>
    )}
  ];

  const woColumns = [
    { title: '工单编号', dataIndex: 'workOrderNo', key: 'workOrderNo' },
    { title: '设备', dataIndex: 'equipmentName', key: 'equipmentName' },
    { title: '类型', dataIndex: 'type', key: 'type', render: (v: string) => <Tag color={v === 'preventive' ? 'blue' : v === 'corrective' ? 'orange' : 'purple'}>{v === 'preventive' ? '预防性' : v === 'corrective' ? '故障维修' : '校准'}</Tag> },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => {
      const map: any = { pending: { color: 'orange', text: '待处理' }, in_progress: { color: 'blue', text: '处理中' }, completed: { color: 'green', text: '已完成' }, verified: { color: 'cyan', text: '已验证' } };
      return <Tag color={map[s]?.color}>{map[s]?.text}</Tag>;
    }},
    { title: '维修班组', dataIndex: 'team', key: 'team' },
    { title: '负责人', dataIndex: 'assignee', key: 'assignee' },
    { title: '截止日期', dataIndex: 'dueDate', key: 'dueDate' },
    { title: '关联验证', dataIndex: 'relatedValidation', key: 'relatedValidation', render: (v?: string) => v ? <Tag color="purple">{v}</Tag> : '-' },
    { title: '操作', key: 'action', render: (_: any, rec: MaintenanceWorkOrder) => (
      <Space>
        <Button size="small" onClick={() => openWODetail(rec)}>查看</Button>
        {rec.status === 'pending' && <Button size="small" type="primary" onClick={() => handleWOAction(rec, 'in_progress')}>开始</Button>}
        {rec.status === 'in_progress' && <Button size="small" type="primary" onClick={() => handleWOAction(rec, 'completed')}>完成</Button>}
      </Space>
    )}
  ];

  const materialColumns = [
    { title: '物料编码', dataIndex: 'code', key: 'code' },
    { title: '物料名称', dataIndex: 'name', key: 'name' },
    { title: '类型', dataIndex: 'type', key: 'type', render: (v: string) => v === 'raw' ? '原料' : v === 'auxiliary' ? '辅料' : '包装材料' },
    { title: '当前库存', key: 'qty', render: (_: any, rec: Material) => <span className="parameter-danger">{rec.quantity} {rec.unit}</span> },
    { title: '安全库存', key: 'safety', render: (_: any, rec: Material) => `${rec.safetyStock} ${rec.unit}` },
    { title: '缺口', key: 'gap', render: (_: any, rec: Material) => <span className="parameter-danger" style={{ fontWeight: 600 }}>{rec.safetyStock - rec.quantity} {rec.unit}</span> },
    { title: '供应商', dataIndex: 'supplier', key: 'supplier' },
    { title: '有效期', dataIndex: 'expiryDate', key: 'expiryDate', render: (v?: string) => v || '-' }
  ];

  return (
    <div>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="设备台账" key="equipment">
          <Card>
            <div style={{ marginBottom: 16 }}>
              <Button type="primary" icon={<ReloadOutlined />} onClick={handleGenerateWOs}>自动扫描生成维保工单</Button>
            </div>
            <Table dataSource={equipments} columns={equipmentColumns} rowKey="id" />
          </Card>
        </TabPane>
        <TabPane tab="维保工单" key="maintenance">
          <Card>
            <Table dataSource={maintenanceOrders} columns={woColumns} rowKey="id" />
          </Card>
        </TabPane>
        <TabPane tab={<span><StockOutlined /> 库存预警 {lowStockMaterials.length > 0 && <Tag color="red">{lowStockMaterials.length}</Tag>}</span>} key="inventory">
          {lowStockMaterials.length > 0 ? (
            <Alert
              message={`有 ${lowStockMaterials.length} 种物料库存低于安全库存，请及时补充！`}
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          ) : (
            <Alert message="所有物料库存充足" type="success" showIcon style={{ marginBottom: 16 }} />
          )}
          <Card title="低库存物料">
            <Table dataSource={lowStockMaterials} columns={materialColumns} rowKey="id" />
          </Card>
        </TabPane>
      </Tabs>

      {/* Equipment Detail */}
      <Modal title={`设备详情 - ${selectedEquipment?.code || ''}`} open={detailModalOpen} onCancel={() => setDetailModalOpen(false)} footer={null} width={700}>
        {selectedEquipment && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card size="small">
                  <Statistic
                    title="运行时长"
                    value={selectedEquipment.runningHours}
                    suffix="小时"
                    prefix={<ThunderboltOutlined />}
                  />
                  <Progress
                    percent={Math.min(100, Math.round((selectedEquipment.runningHours % selectedEquipment.maintenanceIntervalHours) / selectedEquipment.maintenanceIntervalHours * 100))}
                    status="active"
                    showInfo
                  />
                  <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 4 }}>距离下次维保</div>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <Statistic
                    title="验证状态"
                    value={dayjs(selectedEquipment.validationExpiryDate).diff(dayjs(), 'day')}
                    suffix="天后到期"
                    valueStyle={{ color: dayjs(selectedEquipment.validationExpiryDate).diff(dayjs(), 'day') < 30 ? '#ff4d4f' : '#52c41a' }}
                    prefix={<SafetyOutlined />}
                  />
                  <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 16 }}>有效期至: {selectedEquipment.validationExpiryDate}</div>
                </Card>
              </Col>
            </Row>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="设备编号">{selectedEquipment.code}</Descriptions.Item>
              <Descriptions.Item label="设备名称">{selectedEquipment.name}</Descriptions.Item>
              <Descriptions.Item label="型号">{selectedEquipment.model}</Descriptions.Item>
              <Descriptions.Item label="所属生产线">{lines.find((l) => l.id === selectedEquipment.lineId)?.code || '-'}</Descriptions.Item>
              <Descriptions.Item label="上次维保日期">{selectedEquipment.lastMaintenanceDate}</Descriptions.Item>
              <Descriptions.Item label="下次维保日期">
                <span className={dayjs(selectedEquipment.nextMaintenanceDate).diff(dayjs(), 'day') < 7 ? 'parameter-danger' : ''}>
                  {selectedEquipment.nextMaintenanceDate}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="维保周期">{selectedEquipment.maintenanceIntervalHours} 小时</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={selectedEquipment.status === 'normal' ? 'green' : 'orange'}>{selectedEquipment.status === 'normal' ? '正常' : selectedEquipment.status === 'warning' ? '预警' : selectedEquipment.status === 'critical' ? '严重' : '维保中'}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <Card title="相关维保工单" size="small" style={{ marginTop: 16 }}>
              <List
                size="small"
                dataSource={maintenanceOrders.filter((m) => m.equipmentId === selectedEquipment.id)}
                locale={{ emptyText: '暂无工单' }}
                renderItem={(wo) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<ToolOutlined />} />}
                      title={`${wo.workOrderNo} - ${wo.type === 'preventive' ? '预防性维保' : wo.type === 'corrective' ? '故障维修' : '校准'}`}
                      description={`截止日期: ${wo.dueDate} | 负责人: ${wo.assignee}`}
                    />
                    <Tag color={wo.status === 'completed' ? 'green' : wo.status === 'in_progress' ? 'blue' : 'orange'}>
                      {wo.status === 'pending' ? '待处理' : wo.status === 'in_progress' ? '处理中' : '已完成'}
                    </Tag>
                  </List.Item>
                )}
              />
            </Card>
          </div>
        )}
      </Modal>

      {/* WO Detail */}
      <Modal title={`维保工单 - ${selectedWO?.workOrderNo || ''}`} open={woModalOpen} onCancel={() => setWoModalOpen(false)} footer={null} width={600}>
        {selectedWO && (
          <div>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="工单编号">{selectedWO.workOrderNo}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag>{selectedWO.status === 'pending' ? '待处理' : selectedWO.status === 'in_progress' ? '处理中' : selectedWO.status === 'completed' ? '已完成' : '已验证'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="设备" span={2}>{selectedWO.equipmentName}</Descriptions.Item>
              <Descriptions.Item label="类型" span={2}>{selectedWO.type === 'preventive' ? '预防性维保' : selectedWO.type === 'corrective' ? '故障维修' : '校准'}</Descriptions.Item>
              <Descriptions.Item label="维修班组" span={2}>{selectedWO.team}</Descriptions.Item>
              <Descriptions.Item label="负责人" span={2}>{selectedWO.assignee}</Descriptions.Item>
              <Descriptions.Item label="截止日期" span={2}>{selectedWO.dueDate}</Descriptions.Item>
              <Descriptions.Item label="关联验证" span={2}>{selectedWO.relatedValidation || '-'}</Descriptions.Item>
              <Descriptions.Item label="工单描述" span={2}>{selectedWO.description}</Descriptions.Item>
              {selectedWO.completedDate && <Descriptions.Item label="完成日期" span={2}>{selectedWO.completedDate}</Descriptions.Item>}
              {selectedWO.verificationResult && <Descriptions.Item label="验证结果" span={2}>{selectedWO.verificationResult}</Descriptions.Item>}
            </Descriptions>
            <Space>
              {selectedWO.status === 'pending' && <Button type="primary" onClick={() => handleWOAction(selectedWO, 'in_progress')}>开始处理</Button>}
              {selectedWO.status === 'in_progress' && <Button type="primary" onClick={() => handleWOAction(selectedWO, 'completed')}>完成维保</Button>}
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EquipmentManagement;
