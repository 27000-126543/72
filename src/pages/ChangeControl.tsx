import { useState } from 'react';
import {
  Tabs, Table, Card, Tag, Button, Modal, Descriptions, Space, Steps,
  Form, Input, Select, DatePicker, Checkbox, Row, Col, List, Avatar,
  message, App, Alert, Progress, Divider, Timeline
} from 'antd';
import {
  FileProtectOutlined, PlusOutlined, EditOutlined, CheckCircleOutlined,
  ExperimentOutlined, BellOutlined, SafetyOutlined, StopOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { useAppStore } from '../store/appStore';
import type { ChangeControl, StabilityStudy, AuditRecord } from '../types';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { Step } = Steps;
const { TextArea } = Input;

const decisionText: any = {
  approved: { color: 'green', text: '批准' },
  rejected: { color: 'red', text: '驳回' },
  additional_info: { color: 'orange', text: '需要补充信息' }
};

const roleText: any = {
  admin: '系统管理员',
  production_director: '生产总监',
  qa: 'QA质量保证',
  production_supervisor: '生产主管',
  operator: '操作员',
  maintenance: '设备维修'
};

const ChangeControlPage: React.FC = () => {
  const { message: msg } = App.useApp();
  const { changes, products, addChange, updateChange, currentUser } = useAppStore();
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedChange, setSelectedChange] = useState<ChangeControl | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [qaDecision, setQaDecision] = useState<'approved' | 'rejected' | 'additional_info'>('approved');
  const [qaComment, setQaComment] = useState('');
  const [isEditingImpact, setIsEditingImpact] = useState(false);
  const [editImpactForm] = Form.useForm();
  const [additionalNote, setAdditionalNote] = useState('');
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signaturePassword, setSignaturePassword] = useState('');
  const [signatureAction, setSignatureAction] = useState<(() => void) | null>(null);
  const [signatureTitle, setSignatureTitle] = useState('');

  const requireSignature = (title: string, action: () => void) => {
    setSignatureTitle(title);
    setSignatureAction(() => action);
    setSignaturePassword('');
    setSignatureModalOpen(true);
  };

  const confirmSignature = () => {
    if (signaturePassword !== 'gmp123') {
      msg.error('签名口令错误，默认口令: gmp123');
      return;
    }
    if (signatureAction) signatureAction();
    setSignatureModalOpen(false);
    setSignaturePassword('');
    setSignatureAction(null);
  };

  const changeStatusFlow = ['draft', 'submitted', 'assessing', 'qa_review', 'approved', 'implemented', 'closed'];
  const changeStatusText: any = { draft: '草稿', submitted: '已提交', assessing: '评估中', qa_review: 'QA审核', approved: '已批准', rejected: '已驳回', implemented: '已实施', closed: '已关闭' };
  const changeStatusColor: any = { draft: 'default', submitted: 'blue', assessing: 'cyan', qa_review: 'purple', approved: 'green', rejected: 'red', implemented: 'geekblue', closed: 'success' };

  const openDetail = (chg: ChangeControl) => {
    setSelectedChange(chg);
    setQaDecision(chg.qaDecision || 'approved');
    setQaComment(chg.qaComment || '');
    setIsEditingImpact(false);
    setAdditionalNote('');
    editImpactForm.setFieldsValue({
      productAffected: chg.impactAssessment.productAffected,
      processAffected: chg.impactAssessment.processAffected,
      documentAffected: chg.impactAssessment.documentAffected,
      validationRequired: chg.impactAssessment.validationRequired,
      stabilityRequired: chg.impactAssessment.stabilityRequired
    });
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

  const qaSubmit = () => {
    if (!selectedChange) return;
    if (qaComment.trim() === '') {
      msg.warning('请填写QA审核意见');
      return;
    }
    requireSignature('变更QA审批电子签名', () => {
      const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
      const record: AuditRecord = {
        id: 'qa_' + Date.now(),
        time: now,
        reviewer: currentUser.name,
        role: currentUser.role,
        decision: qaDecision,
        comment: qaComment,
        signatureVerified: true
      };
      const newHistory = [...(selectedChange.qaReviewHistory || []), record];
      let nextStatus: ChangeControl['status'] = 'approved';
      if (qaDecision === 'approved') nextStatus = 'approved';
      else if (qaDecision === 'rejected') nextStatus = 'rejected';
      else if (qaDecision === 'additional_info') nextStatus = 'assessing';
      const updated = {
        ...selectedChange,
        status: nextStatus,
        qaDecision,
        qaComment,
        qaApprover: currentUser.name,
        qaReviewHistory: newHistory
      };
      updateChange(selectedChange.id, {
        status: nextStatus,
        qaDecision,
        qaComment,
        qaApprover: currentUser.name,
        qaReviewHistory: newHistory
      });
      setSelectedChange(updated);
      if (qaDecision === 'approved') msg.success('变更已批准');
      else if (qaDecision === 'rejected') msg.success('变更已驳回');
      else msg.success('已退回补充资料');
    });
  };

  const changeColumns = [
    { title: '变更编号', dataIndex: 'changeNo', key: 'changeNo', width: 150 },
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '类型', dataIndex: 'type', key: 'type', render: (v: string) => <Tag>{v === 'process' ? '工艺' : v === 'equipment' ? '设备' : v === 'material' ? '物料' : v === 'documentation' ? '文件' : '设施'}</Tag> },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={changeStatusColor[s]}>{changeStatusText[s]}</Tag> },
    { title: '发起人', dataIndex: 'initiator', key: 'initiator' },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 160 },
    { title: '最新QA意见', key: 'qa', render: (_: any, rec: ChangeControl) => {
      if (!rec.qaComment && (!rec.qaReviewHistory || rec.qaReviewHistory.length === 0)) return <span style={{ color: '#bfbfbf' }}>暂无</span>;
      if (rec.qaDecision) {
        const dec = decisionText[rec.qaDecision];
        return (
          <Space direction="vertical" size={0}>
            <Tag color={dec.color}>{dec.text}</Tag>
            <span style={{ fontSize: 12, color: '#595959' }}>{rec.qaComment || '无意见'}</span>
          </Space>
        );
      }
      const last = rec.qaReviewHistory[rec.qaReviewHistory.length - 1];
      return <span style={{ fontSize: 12, color: '#595959' }}>{last?.comment || '无意见'}</span>;
    }},
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

            <Card size="small" title="QA审核历史记录" style={{ marginBottom: 16 }}>
              {selectedChange.qaReviewHistory && selectedChange.qaReviewHistory.length > 0 ? (
                <Timeline>
                  {selectedChange.qaReviewHistory.map((rec: AuditRecord) => {
                    const dec = decisionText[rec.decision];
                    return (
                      <Timeline.Item
                        key={rec.id}
                        color={dec?.color || 'blue'}
                      >
                        <Space wrap>
                          <strong>{rec.time}</strong>
                          <Tag color={dec?.color || 'blue'}>{dec?.text || rec.decision}</Tag>
                          <span>审核人: {rec.reviewer}</span>
                          {rec.role && <Tag color="purple">{roleText[rec.role] || rec.role}</Tag>}
                          {rec.signatureVerified && <Tag color="green" icon={<SafetyOutlined />}>电子签名已验证</Tag>}
                        </Space>
                        <div style={{ marginTop: 4, color: '#595959' }}>
                          {rec.comment || '无审核意见'}
                        </div>
                      </Timeline.Item>
                    );
                  })}
                </Timeline>
              ) : (
                <span style={{ color: '#bfbfbf' }}>暂无QA审核记录</span>
              )}
              {selectedChange.status === 'rejected' && selectedChange.qaComment && (
                <Alert
                  type="error"
                  showIcon
                  message="驳回原因"
                  description={selectedChange.qaComment}
                  style={{ marginTop: 12 }}
                />
              )}
            </Card>

            <Card size="small" title="操作">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space wrap>
                  {selectedChange.status === 'draft' && (
                    <Button type="primary" onClick={() => updateChangeStatus(selectedChange, 'submitted')}>提交评估</Button>
                  )}
                  {selectedChange.status === 'submitted' && (
                    <Button type="primary" onClick={() => updateChangeStatus(selectedChange, 'assessing')}>开始评估</Button>
                  )}
                  {selectedChange.status === 'assessing' && currentUser.role !== 'operator' && (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {selectedChange.qaDecision === 'additional_info' && selectedChange.qaComment && (
                        <Alert
                          type="warning"
                          showIcon
                          message="QA要求补充以下信息"
                          description={selectedChange.qaComment}
                        />
                      )}
                      {!isEditingImpact ? (
                        <Space wrap>
                          <Button onClick={() => setIsEditingImpact(true)}>编辑影响评估/补充说明</Button>
                          <Button type="primary" onClick={() => updateChangeStatus(selectedChange, 'qa_review')}>送QA审核</Button>
                        </Space>
                      ) : (
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Divider orientation="left" style={{ margin: '4px 0' }}>编辑影响评估</Divider>
                          <Form form={editImpactForm} layout="vertical">
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
                          <Divider orientation="left" style={{ margin: '4px 0' }}>补充说明</Divider>
                          <TextArea
                            rows={3}
                            value={additionalNote}
                            onChange={(e) => setAdditionalNote(e.target.value)}
                            placeholder="对QA要求补充信息的说明..."
                          />
                          <Space wrap style={{ marginTop: 8 }}>
                            <Button onClick={() => setIsEditingImpact(false)}>取消</Button>
                            <Button
                              type="primary"
                              onClick={() => {
                                if (!selectedChange) return;
                                const values = editImpactForm.getFieldsValue();
                                const updated = {
                                  ...selectedChange,
                                  impactAssessment: {
                                    productAffected: values.productAffected || [],
                                    processAffected: values.processAffected || [],
                                    documentAffected: values.documentAffected || [],
                                    validationRequired: !!values.validationRequired,
                                    stabilityRequired: !!values.stabilityRequired
                                  },
                                  description: additionalNote
                                    ? (selectedChange.description + '\n\n[' + dayjs().format('YYYY-MM-DD HH:mm') + ' 补充说明] ' + additionalNote)
                                    : selectedChange.description,
                                  status: 'qa_review' as const
                                };
                                updateChange(selectedChange.id, updated);
                                setSelectedChange(updated);
                                setIsEditingImpact(false);
                                setAdditionalNote('');
                                msg.success('已保存并送QA审核');
                              }}
                            >
                              保存并送QA审核
                            </Button>
                          </Space>
                        </Space>
                      )}
                    </Space>
                  )}
                  {selectedChange.status === 'qa_review' && (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {currentUser.role !== 'qa' ? (
                        <Alert type="warning" showIcon message="当前用户不是QA角色，请点击右上角「角色切换」选择QA角色，或直接以当前角色模拟审批" />
                      ) : (
                        <Alert type="success" showIcon message="您当前为QA角色，可执行变更审批" />
                      )}
                      <Divider orientation="left" style={{ margin: '8px 0' }}>QA审核</Divider>
                      <Form.Item label="审批结论" required>
                        <Select value={qaDecision} onChange={(v: any) => setQaDecision(v)} style={{ width: 280 }}>
                          <Select.Option value="approved">批准变更</Select.Option>
                          <Select.Option value="rejected">驳回变更</Select.Option>
                          <Select.Option value="additional_info">需要补充信息（退回评估）</Select.Option>
                        </Select>
                      </Form.Item>
                      <Form.Item label="审核意见" required>
                        <TextArea rows={3} value={qaComment} onChange={(e) => setQaComment(e.target.value)} placeholder="请详细填写审核意见（必填）..." />
                      </Form.Item>
                      <Space>
                        <Button type="primary" icon={<SafetyOutlined />} onClick={qaSubmit}>
                          提交审批{currentUser.role !== 'qa' ? '（模拟）' : ''}
                        </Button>
                      </Space>
                    </Space>
                  )}
                  {selectedChange.status === 'approved' && (
                    <Button type="primary" onClick={() => updateChangeStatus(selectedChange, 'implemented')}>标记已实施</Button>
                  )}
                  {selectedChange.status === 'implemented' && (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {currentUser.role !== 'qa' && (
                        <Alert type="warning" showIcon message="建议切换QA角色执行关闭操作" />
                      )}
                      <Button type="primary" icon={<SafetyOutlined />} onClick={() => updateChangeStatus(selectedChange, 'closed')}>关闭变更</Button>
                    </Space>
                  )}
                </Space>
              </Space>
            </Card>
          </div>
        )}
      </Modal>

      {/* Electronic Signature Modal */}
      <Modal
        title={`电子签名 - ${signatureTitle}`}
        open={signatureModalOpen}
        onCancel={() => setSignatureModalOpen(false)}
        onOk={confirmSignature}
        okText="确认签名"
        okButtonProps={{ icon: <SafetyOutlined />, type: 'primary' }}
      >
        <Alert
          type="warning"
          showIcon
          message="GMP电子签名要求"
          description="此操作将生成具有法律效应的电子签名，请确认您是当前登录用户并对操作内容负责。默认签名口令: gmp123"
          style={{ marginBottom: 16 }}
        />
        <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="签名人">{currentUser.name}</Descriptions.Item>
          <Descriptions.Item label="角色">{roleText[currentUser.role] || currentUser.role}</Descriptions.Item>
          <Descriptions.Item label="签名时间">{dayjs().format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
        </Descriptions>
        <Form layout="vertical">
          <Form.Item label="签名口令" required>
            <Input.Password
              value={signaturePassword}
              onChange={(e) => setSignaturePassword(e.target.value)}
              placeholder="请输入签名口令"
              onPressEnter={confirmSignature}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ChangeControlPage;
