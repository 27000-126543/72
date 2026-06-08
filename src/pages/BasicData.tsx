import { useState } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, Select, InputNumber, message, Space, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAppStore } from '../store/appStore';
import type { ProductionLine, Product, Material } from '../types';

const { TabPane } = Tabs;

const dosageFormOptions = [
  { value: 'tablet', label: '片剂' },
  { value: 'capsule', label: '胶囊剂' },
  { value: 'injection', label: '注射剂' },
  { value: 'suspension', label: '混悬液' },
  { value: 'ointment', label: '软膏剂' }
];

const lineStatusOptions = [
  { value: 'running', label: '运行中' },
  { value: 'idle', label: '空闲' },
  { value: 'maintenance', label: '维护中' },
  { value: 'cleaning', label: '清洗中' },
  { value: 'offline', label: '离线' }
];

const BasicData: React.FC = () => {
  const { lines, products, materials, addLine, updateLine, addProduct, updateProduct, addMaterial, updateMaterial } = useAppStore();
  const [activeTab, setActiveTab] = useState('lines');

  // Line
  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<ProductionLine | null>(null);
  const [lineForm] = Form.useForm();

  // Product
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm] = Form.useForm();

  // Material
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [materialForm] = Form.useForm();

  const openLineModal = (line?: ProductionLine) => {
    setEditingLine(line || null);
    if (line) lineForm.setFieldsValue(line);
    else lineForm.resetFields();
    setLineModalOpen(true);
  };

  const submitLine = async () => {
    const values = await lineForm.validateFields();
    if (editingLine) {
      updateLine(editingLine.id, values);
      message.success('生产线更新成功');
    } else {
      addLine(values);
      message.success('生产线添加成功');
    }
    setLineModalOpen(false);
  };

  const openProductModal = (product?: Product) => {
    setEditingProduct(product || null);
    if (product) productForm.setFieldsValue(product);
    else productForm.resetFields();
    setProductModalOpen(true);
  };

  const submitProduct = async () => {
    const values = await productForm.validateFields();
    if (editingProduct) {
      updateProduct(editingProduct.id, values);
      message.success('产品更新成功');
    } else {
      addProduct(values);
      message.success('产品添加成功');
    }
    setProductModalOpen(false);
  };

  const openMaterialModal = (material?: Material) => {
    setEditingMaterial(material || null);
    if (material) materialForm.setFieldsValue(material);
    else materialForm.resetFields();
    setMaterialModalOpen(true);
  };

  const submitMaterial = async () => {
    const values = await materialForm.validateFields();
    if (editingMaterial) {
      updateMaterial(editingMaterial.id, values);
      message.success('物料更新成功');
    } else {
      addMaterial(values);
      message.success('物料添加成功');
    }
    setMaterialModalOpen(false);
  };

  const lineColumns = [
    { title: '生产线编号', dataIndex: 'code', key: 'code' },
    { title: '生产线名称', dataIndex: 'name', key: 'name' },
    { title: '剂型', dataIndex: 'dosageForm', key: 'dosageForm', render: (v: string) => dosageFormOptions.find((o) => o.value === v)?.label },
    { title: '日产能', dataIndex: 'capacity', key: 'capacity', render: (v: number) => v.toLocaleString() + ' 单位/日' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => {
      const map: any = { running: 'green', idle: 'default', maintenance: 'orange', cleaning: 'blue', offline: 'red' };
      const text: any = { running: '运行中', idle: '空闲', maintenance: '维护中', cleaning: '清洗中', offline: '离线' };
      return <Tag color={map[s]}>{text[s]}</Tag>;
    }},
    { title: '所属车间', dataIndex: 'workshop', key: 'workshop' },
    { title: '位置', dataIndex: 'location', key: 'location' },
    { title: '操作', key: 'action', render: (_: any, rec: ProductionLine) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => openLineModal(rec)}>编辑</Button>
      </Space>
    )}
  ];

  const productColumns = [
    { title: '产品编码', dataIndex: 'code', key: 'code' },
    { title: '药品名称', dataIndex: 'name', key: 'name' },
    { title: '剂型', dataIndex: 'dosageForm', key: 'dosageForm', render: (v: string) => dosageFormOptions.find((o) => o.value === v)?.label },
    { title: '规格', dataIndex: 'specification', key: 'specification' },
    { title: '质量标准', dataIndex: 'standard', key: 'standard' },
    { title: '有效期(月)', dataIndex: 'shelfLife', key: 'shelfLife' },
    { title: '最近批号', dataIndex: 'lastBatch', key: 'lastBatch' },
    { title: '操作', key: 'action', render: (_: any, rec: Product) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => openProductModal(rec)}>编辑</Button>
      </Space>
    )}
  ];

  const materialColumns = [
    { title: '物料编码', dataIndex: 'code', key: 'code' },
    { title: '物料名称', dataIndex: 'name', key: 'name' },
    { title: '类型', dataIndex: 'type', key: 'type', render: (v: string) => v === 'raw' ? '原料' : v === 'auxiliary' ? '辅料' : '包装材料' },
    { title: '规格', dataIndex: 'specification', key: 'specification' },
    { title: '库存', dataIndex: 'quantity', key: 'quantity', render: (v: number, rec: Material) => (
      <span className={v < rec.safetyStock ? 'parameter-danger' : 'parameter-normal'}>
        {v} {rec.unit} {v < rec.safetyStock && <Tag color="red">低库存</Tag>}
      </span>
    )},
    { title: '安全库存', dataIndex: 'safetyStock', key: 'safetyStock', render: (v: number, rec: Material) => `${v} ${rec.unit}` },
    { title: '供应商', dataIndex: 'supplier', key: 'supplier' },
    { title: '操作', key: 'action', render: (_: any, rec: Material) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => openMaterialModal(rec)}>编辑</Button>
      </Space>
    )}
  ];

  return (
    <div>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="生产线管理" key="lines">
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openLineModal()}>新增生产线</Button>
          </div>
          <Table dataSource={lines} columns={lineColumns} rowKey="id" />
        </TabPane>
        <TabPane tab="产品管理" key="products">
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openProductModal()}>新增产品</Button>
          </div>
          <Table dataSource={products} columns={productColumns} rowKey="id" />
        </TabPane>
        <TabPane tab="物料管理" key="materials">
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openMaterialModal()}>新增物料</Button>
          </div>
          <Table dataSource={materials} columns={materialColumns} rowKey="id" />
        </TabPane>
      </Tabs>

      {/* Line Modal */}
      <Modal title={editingLine ? '编辑生产线' : '新增生产线'} open={lineModalOpen} onCancel={() => setLineModalOpen(false)} onOk={submitLine} width={600}>
        <Form form={lineForm} layout="vertical">
          <Form.Item name="code" label="生产线编号" rules={[{ required: true }]}>
            <Input placeholder="如: PL-TAB-001" />
          </Form.Item>
          <Form.Item name="name" label="生产线名称" rules={[{ required: true }]}>
            <Input placeholder="如: 片剂1号线" />
          </Form.Item>
          <Form.Item name="dosageForm" label="剂型" rules={[{ required: true }]}>
            <Select options={dosageFormOptions} />
          </Form.Item>
          <Form.Item name="capacity" label="日产能" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} addonAfter="单位/日" />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select options={lineStatusOptions} />
          </Form.Item>
          <Form.Item name="workshop" label="所属车间">
            <Input />
          </Form.Item>
          <Form.Item name="location" label="位置">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Product Modal */}
      <Modal title={editingProduct ? '编辑产品' : '新增产品'} open={productModalOpen} onCancel={() => setProductModalOpen(false)} onOk={submitProduct} width={600}>
        <Form form={productForm} layout="vertical">
          <Form.Item name="code" label="产品编码" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="药品名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="dosageForm" label="剂型" rules={[{ required: true }]}>
            <Select options={dosageFormOptions} />
          </Form.Item>
          <Form.Item name="specification" label="规格" rules={[{ required: true }]}>
            <Input placeholder="如: 250mg" />
          </Form.Item>
          <Form.Item name="standard" label="质量标准" rules={[{ required: true }]}>
            <Input placeholder="如: CP2020" />
          </Form.Item>
          <Form.Item name="shelfLife" label="有效期(月)" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Material Modal */}
      <Modal title={editingMaterial ? '编辑物料' : '新增物料'} open={materialModalOpen} onCancel={() => setMaterialModalOpen(false)} onOk={submitMaterial} width={600}>
        <Form form={materialForm} layout="vertical">
          <Form.Item name="code" label="物料编码" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="物料名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="物料类型" rules={[{ required: true }]}>
            <Select options={[{ value: 'raw', label: '原料' }, { value: 'auxiliary', label: '辅料' }, { value: 'packaging', label: '包装材料' }]} />
          </Form.Item>
          <Form.Item name="specification" label="规格">
            <Input />
          </Form.Item>
          <Form.Item name="unit" label="单位" rules={[{ required: true }]}>
            <Input placeholder="如: kg" />
          </Form.Item>
          <Form.Item name="quantity" label="当前库存" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="safetyStock" label="安全库存" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="supplier" label="供应商">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BasicData;
