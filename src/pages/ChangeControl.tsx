import { useState } from 'react';
import {
  Tabs, Table, Card, Tag, Button, Modal, Descriptions, Space, Steps,
  Form, Input, Select, DatePicker, Checkbox, Row, Col, List, Avatar,
  message, App, Alert, Progress, Divider
} from 'antd';
import {
  FileProtectOutlined, PlusOutlined, EditOutlined, CheckCircleOutlined,
  ExperimentOutlined, BellOutlined, SafetyOutlined
} from '@ant-design/icons';
import { useAppStore } from '../store/appStore';
import type { ChangeControl, StabilityStudy } from '../types';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { Step } = Steps;
const { TextArea } = Input;

const ChangeControlPage: React.FC = () => {
  const { message: msg } = App.useApp();
  const { changes, products, addChange, updateChange, currentUser } = useAppStore();
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedChange, setSelectedChange] = useState<ChangeControl | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();

  const changeStatusFlow = ['draft', 'submitted', 'assessing', 'qa_review', 'approved', 'implemented', 'closed'];
  const changeStatusText: any = { draft: '草稿', submitted: '已提交', assessing: '评估中', qa_review: 'QA审核', approved: '已批准', rejected: '已驳回', implemented: '已实施', closed: '已关闭' };
  const changeStatusColor: any = { draft: 'default', submitted: 'blue', assessing: 'cyan', qa_review: 'purple', approved: 'green', rejected: 'red', implemented: 'geekblue', closed: 'success' };

  const openDetail = (chg: ChangeControl) => {
    setSelectedChange(chg);
    setDetailModalOpen(true);
  };

  const submitCreate = async () => {
    const values = await createForm.validateFields();
    addChange({
      ...values,
      initiator: currentUser.name,
      impactAssessment: {
        productAffected: values.productAffected || [],
        processAffected: values.processAffected || [],
        documentAffected: values.documentAffected || [],
        validationRequired: values.validationRequired || false,
        stabilityRequired: values.stabilityRequired || false
      }
    });
    msg.success('变更申请已创建');
    setCreateModalOpen(false);
    createForm.resetFields();
  };

  const updateChangeStatus = (chg: ChangeControl, nextStatus: ChangeControl['status']) => {
    updateChange(chg.id, { status: nextStatus });
    setSelectedChange({ ...chg, status: nextStatus });
    msg.success('状态已更新');
  };

  const changeColumns = [
    { title: '变更编号', dataIndex: 'changeNo', key: 'changeNo', width: 150 },
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '类型', dataIndex: 'type', key: 'type', render: (v: string) => <Tag>{v === 'process' ? '工艺' : v === 'equipment' ? '设备' : v === 'material' ? '物料' : v === 'documentation' ? '文件' : '设施'}</Tag> },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={changeStatusColor[s]}>{changeStatusText[s]}</Tag> },
    { title: '发起人', dataIndex: 'initiator', key: 'initiator' },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 160 },
    { title: '影响评估', key: 'impact', render: (_: any, rec: ChangeControl) => (
      <Space>
        {rec.impactAssessment.validationRequired && <Tag color="red">需验证</Tag>}
        {rec.impactAssessment.stabilityRequired && <Tag color="purple">需稳定性</Tag>}
        <Tag>{rec.impactAssessment.productAffected.length} 产品</Tag>
      </Space>
    )},
    { title: '操作', key: 'action', render: (_: any, rec: ChangeControl) => (
      <Button size="small" onClick={() => openDetail(rec)}>处理</Button>
    )}
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>发起变更申请</Button>
        </div>
        <Table dataSource={changes} columns={changeColumns} rowKey="id" />
      </Card>

      {/* Create Modal */}
      <Modal title="发起变更申请" open={createModalOpen} onCancel={() => setCreateModalOpen(false)} onOk={submitCreate} width={700}>
        <Form form={createForm} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="title" label="变更标题" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="变更类型" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'process', label: '工艺变更' },
                  { value: 'equipment', label: '设备变更' },
                  { value: 'material', label: '物料变更' },
                  { value: 'documentation', label: '文件变更' },
                  { value: 'facility', label: '设施变更' }
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="变更描述" rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item name="reason" label="变更原因" rules={[{ required: true }]}>
            <TextArea rows={2} />
          </Form.Item>
          <Divider orientation="left">影响评估</Divider>
          <Form.Item name="productAffected" label="受影响产品">
            <Select mode="multiple" options={products.map((p) => ({ value: p.id, label: p.name }))} />
          </Form.Item>
          <Form.Item name="processAffected" label="受影响工艺">
            <Select mode="multiple" options={[
              { value: 'mixing', label: '混合工艺' },
              { value: 'granulation', label: '制粒工艺' },
              { value: 'compression', label: '压片工艺' },
              { value: 'coating', label: '包衣工艺' },
              { value: 'packaging', label: '包装工艺' }
            ]} />
          </Form.Item>
          <Form.Item name="documentAffected" label="受影响文件">
            <Select mode="multiple" options={[
              { value: 'spec', label: '质量标准' },
              { value: 'bpr', label: '批生产记录' },
              { value: 'sop', label: '标准操作规程' },
              { value: 'validation', label: '验证方案' }
            ]} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="validationRequired" valuePropName="checked">
                <Checkbox>需要进行设备/工艺验证</Checkbox>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="stabilityRequired" valuePropName="checked">
                <Checkbox>需要进行稳定性考察</Checkbox>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal title={`变更详情 - ${selectedChange?.changeNo || ''}`} open={detailModalOpen} onCancel={() => setDetailModalOpen(false)} footer={null} width={750}>
        {selectedChange && (
          <div>
            <Alert
              message={changeStatusText[selectedChange.status]}
              type={selectedChange.status === 'rejected' ? 'error' : selectedChange.status === 'closed' ? 'success' : 'info'}
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="变更编号">{selectedChange.changeNo}</Descriptions.Item>
              <Descriptions.Item label="发起人">{selectedChange.initiator}</Descriptions.Item>
              <Descriptions.Item label="类型">
                {selectedChange.type === 'process' ? '工艺变更' : selectedChange.type === 'equipment' ? '设备变更' : selectedChange.type === 'material' ? '物料变更' : selectedChange.type === 'documentation' ? '文件变更' : '设施变更'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">{selectedChange.createdAt}</Descriptions.Item>
              <Descriptions.Item label="标题" span={2}>{selectedChange.title}</Descriptions.Item>
              <Descriptions.Item label="变更描述" span={2}>{selectedChange.description}</Descriptions.Item>
              <Descriptions.Item label="变更原因" span={2}>{selectedChange.reason}</Descriptions.Item>
            </Descriptions>

            <Card title="审批流程" size="small" style={{ marginBottom: 16 }}>
              <Steps size="small" current={changeStatusFlow.indexOf(selectedChange.status) > -1 ? changeStatusFlow.indexOf(selectedChange.status) : 0}>
                {changeStatusFlow.filter((s) => s !== 'rejected').map((s) => (
                  <Step key={s} title={changeStatusText[s]} />
                ))}
              </Steps>
            </Card>

            <Card title="自动影响评估结果" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={12}>
                <Col span={12}>
                  <Descriptions size="small" column={1}>
                    <Descriptions.Item label="受影响产品">
                      {selectedChange.impactAssessment.productAffected.length > 0
                        ? selectedChange.impactAssessment.productAffected.map((id) => products.find((p) => p.id === id)?.name).join('、')
                        : '无'}
                    </Descriptions.Item>
                    <Descriptions.Item label="受影响工艺">
                      {selectedChange.impactAssessment.processAffected.length > 0
                        ? selectedChange.impactAssessment.processAffected.map((p) => p === 'mixing' ? '混合' : p === 'granulation' ? '制粒' : p === 'compression' ? '压片' : p === 'coating' ? '包衣' : '包装').join('、')
                        : '无'}
                    </Descriptions.Item>
                    <Descriptions.Item label="受影响文件">
                      {selectedChange.impactAssessment.documentAffected.length > 0
                        ? selectedChange.impactAssessment.documentAffected.map((d) => d === 'spec' ? '质量标准' : d === 'bpr' ? '批生产记录' : d === 'sop' ? 'SOP' : '验证方案').join('、')
                        : '无'}
                    </Descriptions.Item>
                  </Descriptions>
                </Col>
                <Col span={12}>
                  <Space direction="vertical">
                    <Tag color={selectedChange.impactAssessment.validationRequired ? 'red' : 'green'} icon={selectedChange.impactAssessment.validationRequired ? <BellOutlined /> : <CheckCircleOutlined />}>
                      {selectedChange.impactAssessment.validationRequired ? '需要验证' : '无需验证'}
                    </Tag>
                    <Tag color={selectedChange.impactAssessment.stabilityRequired ? 'purple' : 'green'} icon={selectedChange.impactAssessment.stabilityRequired ? <ExperimentOutlined /> : <CheckCircleOutlined />}>
                      {selectedChange.impactAssessment.stabilityRequired ? '需要稳定性考察' : '无需稳定性考察'}
                    </Tag>
                  </Space>
                </Col>
              </Row>
            </Card>

            <Card size="small" title="操作">
              <Space>
                {selectedChange.status === 'draft' && (
                  <Button type="primary" onClick={() => updateChangeStatus(selectedChange, 'submitted')}>提交评估</Button>
                )}
                {selectedChange.status === 'submitted' && (
                  <Button type="primary" onClick={() => updateChangeStatus(selectedChange, 'assessing')}>开始评估</Button>
                )}
                {selectedChange.status === 'assessing' && currentUser.role !== 'operator' && (
                  <Button type="primary" onClick={() => updateChangeStatus(selectedChange, 'qa_review')}>送QA审核</Button>
                )}
                {selectedChange.status === 'qa_review' && currentUser.role === 'qa' && (
                  <>
                    <Button type="primary" onClick={() => updateChangeStatus(selectedChange, 'approved')}>批准</Button>
                    <Button danger onClick={() => updateChangeStatus(selectedChange, 'rejected')}>驳回</Button>
                  </>
                )}
                {selectedChange.status === 'approved' && (
                  <Button type="primary" onClick={() => updateChangeStatus(selectedChange, 'implemented')}>标记已实施</Button>
                )}
                {selectedChange.status === 'implemented' && currentUser.role === 'qa' && (
                  <Button type="primary" icon={<SafetyOutlined />} onClick={() => updateChangeStatus(selectedChange, 'closed')}>关闭变更</Button>
                )}
              </Space>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ChangeControlPage;
