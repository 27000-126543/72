import { useState } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, Select, InputNumber, message, Space, Tag, Popconfirm, DatePicker, List, Divider, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, InboxOutlined } from '@ant-design/icons';
import { useAppStore } from '../store/appStore';
import type { ProductionLine, Product, Material, ProductBatch, ProductMaterial } from '../types';
import dayjs from 'dayjs';

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

const batchStatusOptions = [
  { value: 'producing', label: '生产中' },
  { value: 'qc', label: '检验中' },
  { value: 'released', label: '已放行' },
  { value: 'expired', label: '已过期' }
];

const BasicData: React.FC = () => {
  const { lines, products, materials, addLine, updateLine, addProduct, updateProduct, addProductBatch, updateProductMaterialList, addMaterial, updateMaterial } = useAppStore();
  const [activeTab, setActiveTab] = useState('lines');

  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<ProductionLine | null>(null);
  const [lineForm] = Form.useForm();

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm] = Form.useForm();
  const [tempBatches, setTempBatches] = useState<ProductBatch[]>([]);
  const [tempMaterials, setTempMaterials] = useState<ProductMaterial[]>([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [editingBatchIdx, setEditingBatchIdx] = useState<number | null>(null);
  const [batchForm] = Form.useForm();
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [bomForm] = Form.useForm();

  const [materialModalVisible, setMaterialModalVisible] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [materialFormState] = Form.useForm();

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
    if (product) {
      productForm.setFieldsValue(product);
      setTempBatches(product.batchList ? [...product.batchList] : []);
      setTempMaterials(product.materialList ? [...product.materialList] : []);
    } else {
      productForm.resetFields();
      setTempBatches([]);
      setTempMaterials([]);
    }
    setProductModalOpen(true);
  };

  const submitProduct = async () => {
    const values = await productForm.validateFields();
    if (editingProduct) {
      const releasedBatch = tempBatches.find((b) => b.status === 'released');
      updateProduct(editingProduct.id, {
        ...values,
        batchList: tempBatches,
        materialList: tempMaterials,
        lastBatch: releasedBatch?.batchNo,
        lastProductionDate: releasedBatch?.productionDate
      });
      message.success('产品更新成功');
    } else {
      const releasedBatch = tempBatches.find((b) => b.status === 'released');
      addProduct({
        ...values,
        batchList: tempBatches,
        materialList: tempMaterials,
        lastBatch: releasedBatch?.batchNo,
        lastProductionDate: releasedBatch?.productionDate
      });
      message.success('产品添加成功');
    }
    setProductModalOpen(false);
  };

  const openBatchModal = (idx?: number) => {
    if (idx != null) {
      setEditingBatchIdx(idx);
      const b = tempBatches[idx];
      batchForm.setFieldsValue({
        batchNo: b.batchNo,
        productionDate: b.productionDate ? dayjs(b.productionDate) : undefined,
        expiryDate: b.expiryDate ? dayjs(b.expiryDate) : undefined,
        quantity: b.quantity,
        status: b.status
      });
    } else {
      setEditingBatchIdx(null);
      batchForm.resetFields();
    }
    setBatchModalOpen(true);
  };

  const submitBatch = async () => {
    const values = await batchForm.validateFields();
    const batchData: ProductBatch = {
      id: editingBatchIdx != null && tempBatches[editingBatchIdx]?.id ? tempBatches[editingBatchIdx].id : 'batch_' + Date.now(),
      batchNo: values.batchNo,
      productionDate: values.productionDate ? values.productionDate.format('YYYY-MM-DD') : undefined,
      expiryDate: values.expiryDate ? values.expiryDate.format('YYYY-MM-DD') : undefined,
      quantity: values.quantity,
      status: values.status
    };
    if (editingBatchIdx != null) {
      const newBatches = [...tempBatches];
      newBatches[editingBatchIdx] = batchData;
      setTempBatches(newBatches);
      message.success('批号已更新');
    } else {
      setTempBatches([...tempBatches, batchData]);
      message.success('批号已添加');
    }
    setBatchModalOpen(false);
    setEditingBatchIdx(null);
  };

  const openBomModal = () => {
    bomForm.resetFields();
    setMaterialModalOpen(true);
  };

  const submitBom = async () => {
    const values = await bomForm.validateFields();
    const mat = materials.find((m) => m.id === values.materialId);
    if (!mat) return;
    const newMat: ProductMaterial = {
      materialId: values.materialId,
      materialName: mat.name,
      dosagePerUnit: values.dosagePerUnit,
      unit: values.unit || mat.unit
    };
    setTempMaterials([...tempMaterials, newMat]);
    setMaterialModalOpen(false);
    message.success('物料已添加到配方');
  };

  const openMaterialModal = (material?: Material) => {
    setEditingMaterial(material || null);
    if (material) materialFormState.setFieldsValue(material);
    else materialFormState.resetFields();
    setMaterialModalVisible(true);
  };

  const submitMaterial = async () => {
    const values = await materialFormState.validateFields();
    if (editingMaterial) {
      updateMaterial(editingMaterial.id, values);
      message.success('物料更新成功');
    } else {
      addMaterial(values);
      message.success('物料添加成功');
    }
    setMaterialModalVisible(false);
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
    { title: '已有批号', key: 'batches', render: (_: any, rec: Product) => {
      if (!rec.batchList || rec.batchList.length === 0) return <Tag color="default">暂无批号</Tag>;
      return (
        <Space wrap>
          {rec.batchList.slice(0, 3).map((b) => {
            const colorMap: any = { producing: 'blue', qc: 'orange', released: 'green', expired: 'red' };
            const st = (b.status || 'producing') as keyof typeof colorMap;
            return <Tag key={b.id} color={colorMap[st] || 'default'}>{b.batchNo}</Tag>;
          })}
          {rec.batchList.length > 3 && <Tag>共{rec.batchList.length}个</Tag>}
        </Space>
      );
    }},
    { title: '配方物料数', key: 'materials', render: (_: any, rec: Product) => (
      <Tag color="blue">{(rec.materialList?.length || 0)} 种</Tag>
    )},
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

      <Modal title={editingProduct ? '编辑产品' : '新增产品'} open={productModalOpen} onCancel={() => setProductModalOpen(false)} onOk={submitProduct} width={800}>
        <Form form={productForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="code" label="产品编码" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="药品名称" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="dosageForm" label="剂型" rules={[{ required: true }]}>
                <Select options={dosageFormOptions} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="specification" label="规格" rules={[{ required: true }]}>
                <Input placeholder="如: 250mg" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="shelfLife" label="有效期(月)" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="standard" label="质量标准" rules={[{ required: true }]}>
            <Input placeholder="如: CP2020" />
          </Form.Item>

          <Divider orientation="left">产品批号管理</Divider>
          <div style={{ marginBottom: 12 }}>
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openBatchModal()}>添加批号</Button>
          </div>
          {tempBatches.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', background: '#fafafa', border: '1px dashed #d9d9d9', borderRadius: 4 }}>
              <InboxOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />
              <div style={{ color: '#8c8c8c', marginTop: 8 }}>暂无批号，请点击上方按钮添加</div>
            </div>
          ) : (
            <List
              size="small"
              bordered
              dataSource={tempBatches}
              renderItem={(item, idx) => {
                const colorMap: any = { producing: 'blue', qc: 'orange', released: 'green', expired: 'red' };
                const statusText: any = { producing: '生产中', qc: '检验中', released: '已放行', expired: '已过期' };
                const st = (item.status || 'producing') as keyof typeof colorMap;
                return (
                  <List.Item
                    actions={[
                      <Button key="edit" size="small" type="link" icon={<EditOutlined />} onClick={() => openBatchModal(idx)}>编辑</Button>,
                      <Popconfirm key="del" title="确定删除此批号？" onConfirm={() => setTempBatches(tempBatches.filter((_, i) => i !== idx))}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    ]}
                  >
                    <List.Item.Meta
                      title={<Space><Tag color={colorMap[st]}>{item.batchNo}</Tag><Tag>{statusText[st] || st}</Tag></Space>}
                      description={
                        <Space>
                          {item.productionDate && <span>生产日期: {item.productionDate}</span>}
                          {item.expiryDate && <span>有效期至: {item.expiryDate}</span>}
                          {item.quantity != null && <span>数量: {item.quantity}</span>}
                        </Space>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          )}

          <Divider orientation="left">物料配方(BOM)</Divider>
          <div style={{ marginBottom: 12 }}>
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openBomModal}>添加物料</Button>
          </div>
          {tempMaterials.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', background: '#fafafa', border: '1px dashed #d9d9d9', borderRadius: 4 }}>
              <InboxOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />
              <div style={{ color: '#8c8c8c', marginTop: 8 }}>暂无配方物料，请添加以支持物料齐套检查</div>
            </div>
          ) : (
            <List
              size="small"
              bordered
              dataSource={tempMaterials}
              renderItem={(item, idx) => {
                const mat = materials.find((m) => m.id === item.materialId);
                const typeText = mat?.type === 'raw' ? '原料' : mat?.type === 'auxiliary' ? '辅料' : '包材';
                return (
                  <List.Item
                    actions={[
                      <Popconfirm title="确定移除此物料？" onConfirm={() => setTempMaterials(tempMaterials.filter((_, i) => i !== idx))}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    ]}
                  >
                    <List.Item.Meta
                      title={<Space><Tag color="blue">{item.materialName}</Tag><Tag>{typeText}</Tag></Space>}
                      description={`每单位产品用量: ${item.dosagePerUnit} ${item.unit}`}
                    />
                  </List.Item>
                );
              }}
            />
          )}
        </Form>
      </Modal>

      <Modal title={editingBatchIdx != null ? '编辑产品批号' : '添加产品批号'} open={batchModalOpen} onCancel={() => { setBatchModalOpen(false); setEditingBatchIdx(null); }} onOk={submitBatch} width={500}>
        <Form form={batchForm} layout="vertical">
          <Form.Item name="batchNo" label="批号" rules={[{ required: true, message: '请输入批号' }]}>
            <Input placeholder="如: AML20250101" disabled={editingBatchIdx != null} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="productionDate" label="生产日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expiryDate" label="有效期至">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="quantity" label="数量">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                <Select options={batchStatusOptions} defaultValue="producing" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal title="添加配方物料" open={materialModalOpen} onCancel={() => setMaterialModalOpen(false)} onOk={submitBom} width={500}>
        <Form form={bomForm} layout="vertical">
          <Form.Item name="materialId" label="选择物料" rules={[{ required: true, message: '请选择物料' }]}>
            <Select
              showSearch
              placeholder="搜索物料名称或编码"
              optionFilterProp="children"
              options={materials.map((m) => ({
                value: m.id,
                label: `${m.code} - ${m.name} [${m.type === 'raw' ? '原料' : m.type === 'auxiliary' ? '辅料' : '包材'}]`,
              }))}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="dosagePerUnit" label="每单位产品用量" rules={[{ required: true }]}>
                <InputNumber min={0} step={0.001} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unit" label="单位">
                <Input placeholder="默认沿用物料单位" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal title={editingMaterial ? '编辑物料' : '新增物料'} open={materialModalVisible} onCancel={() => setMaterialModalVisible(false)} onOk={submitMaterial} width={600}>
        <Form form={materialFormState} layout="vertical">
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
