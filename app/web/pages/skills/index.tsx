import React, { useCallback, useEffect, useState } from 'react';
import {
    CopyOutlined,
    DeleteOutlined,
    FilterOutlined,
    ImportOutlined,
    SearchOutlined,
    UploadOutlined,
} from '@ant-design/icons';
import {
    Button,
    Col,
    Divider,
    Empty,
    Form,
    Input,
    message,
    Modal,
    Pagination,
    Row,
    Select,
    Space,
    Spin,
    Typography,
    Upload,
} from 'antd';

import { API } from '@/api';
import { SkillItem, SkillListResponse } from './types';
import { SkillCard } from '@/components/skills/SkillCard';
import './style.scss';

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;
const FIXED_CATEGORY_OPTIONS = [
    '通用',
    '前端',
    '后端',
    '数据与AI',
    '运维与系统',
    '工程效率',
    '安全',
    '其他',
];
const INITIAL_QUERY = {
    keyword: '',
    sortBy: 'stars',
    category: '',
    pageNum: 1,
    pageSize: 12,
};


const SkillsMarket: React.FC<any> = ({ history }) => {
    const [loading, setLoading] = useState(false);
    const [skills, setSkills] = useState<SkillItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [total, setTotal] = useState(0);
    const [importVisible, setImportVisible] = useState(false);
    const [importing, setImporting] = useState(false);
    const [uploadFiles, setUploadFiles] = useState<any[]>([]);
    const [editVisible, setEditVisible] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editUploadFiles, setEditUploadFiles] = useState<any[]>([]);
    const [editingSkill, setEditingSkill] = useState<SkillItem | null>(null);
    const [importForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [query, setQuery] = useState(INITIAL_QUERY);
    const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());

    const fetchSkills = useCallback(async (nextQuery) => {
        setLoading(true);
        try {
            const response = await API.getSkillList(nextQuery);
            if (response.success) {
                const data: SkillListResponse = response.data;
                setSkills(data.list || []);
                setCategories(data.categories || []);
                setTotal(data.total || 0);
            } else {
                message.error(response.msg || '获取 Skills 列表失败');
            }
        } catch (error) {
            message.error('获取 Skills 列表失败');
            console.error('获取 Skills 列表失败:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSkills(query);
    }, [fetchSkills, query]);

    const updateQueryAndFetch = (patch: Partial<typeof query>) => {
        const next = { ...query, ...patch };
        setQuery(next);
        setSelectedSlugs(new Set());
    };

    const handleSelect = (skill: SkillItem, selected: boolean) => {
        setSelectedSlugs((prev) => {
            const next = new Set(prev);
            if (selected) {
                next.add(skill.slug);
            } else {
                next.delete(skill.slug);
            }
            return next;
        });
    };

    const copyToClipboard = (text: string): boolean => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).catch(() => {});
            return true;
        }
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        let success = false;
        try {
            success = document.execCommand('copy');
        } catch {}
        document.body.removeChild(textarea);
        return success;
    };

    const handleCopyCommand = () => {
        if (selectedSlugs.size === 0) return;
        const selectedSkills = skills.filter((s) => selectedSlugs.has(s.slug));
        const installKeys = selectedSkills.map((s) => s.installKey || s.slug).join(' ');
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const command = `npx dt-skill install ${installKeys} --registry ${origin}`;
        const success = copyToClipboard(command);
        if (success) {
            message.success('安装命令已复制到剪贴板');
        } else {
            message.error('复制失败，请手动复制');
        }
    };

    const openImportModal = () => {
        setImportVisible(true);
        setUploadFiles([]);
        importForm.setFieldsValue({
            category: '通用',
            tags: [],
        });
    };

    const closeImportModal = () => {
        if (importing) return;
        setImportVisible(false);
        setUploadFiles([]);
        importForm.resetFields();
    };

    const openEditModal = (skill: SkillItem) => {
        setEditingSkill(skill);
        setEditVisible(true);
        setEditUploadFiles([]);
        editForm.setFieldsValue({
            name: skill.name,
            category: skill.category || '通用',
            tags: skill.tags || [],
            version: skill.version || '',
        });
    };

    const closeEditModal = () => {
        if (editing) return;
        setEditVisible(false);
        setEditingSkill(null);
        setEditUploadFiles([]);
        editForm.resetFields();
    };

    const handleImportSkill = async () => {
        try {
            await importForm.validateFields();
            setImporting(true);
            const targetFile = uploadFiles[0]?.originFileObj;
            if (!targetFile) {
                message.error('请先选择 .zip 文件');
                return;
            }
            const values = importForm.getFieldsValue();
            const response = await API.importSkillFile({
                file: targetFile,
                skillName: values.skillName || '',
                category: values.category,
                tags: JSON.stringify(values.tags || []),
            });

            if (!response.success) {
                message.error(response.msg || '导入失败');
                return;
            }

            const importedCount = Number(response.data?.importedCount || 0);
            if (importedCount > 0) {
                message.success(`导入成功，新增 ${importedCount} 个技能`);
            } else {
                message.success('导入完成，技能可能已存在');
            }
            setImportVisible(false);
            setUploadFiles([]);
            importForm.resetFields();
            fetchSkills({ ...query });
        } catch (error) {
            if (error?.errorFields) return;
            message.error('导入失败，请检查文件或网络权限');
            console.error('导入 Skill 失败:', error);
        } finally {
            setImporting(false);
        }
    };

    const handleUpdateSkill = async () => {
        if (!editingSkill) return;

        try {
            const values = await editForm.validateFields();
            setEditing(true);
            const targetFile = editUploadFiles[0]?.originFileObj;
            const response = await API.updateSkill({
                slug: editingSkill.slug,
                name: values.name,
                category: values.category,
                tags: JSON.stringify(values.tags || []),
                version: values.version || '',
                file: targetFile,
            });

            if (!response.success) {
                message.error(response.msg || '更新失败');
                return;
            }

            message.success(targetFile ? '技能已更新并替换 zip 内容' : '技能信息已更新');
            setEditVisible(false);
            setEditingSkill(null);
            setEditUploadFiles([]);
            editForm.resetFields();
            fetchSkills({ ...query });
        } catch (error) {
            if (error?.errorFields) return;
            message.error('更新失败，请稍后重试');
            console.error('更新 Skill 失败:', error);
        } finally {
            setEditing(false);
        }
    };

    const handleDeleteSkill = (skill: SkillItem) => {
        Modal.confirm({
            title: `确认删除「${skill.name}」？`,
            content: '删除后该技能将不再出现在列表和详情页中。',
            okText: '删除',
            okButtonProps: { danger: true },
            cancelText: '取消',
            onOk: async () => {
                const response = await API.deleteSkill({ slug: skill.slug });
                if (!response.success) {
                    message.error(response.msg || '删除失败');
                    return;
                }
                message.success('删除成功');
                fetchSkills({ ...query });
            },
        });
    };

    return (
        <div className="page-skills">
            <div className="skills-header">
                <div className="title-group">
                    <h1 className="page-title">Skills 市场</h1>
                    <p className="page-subtitle">发现、筛选并导入本地可用的 Skills 能力</p>
                </div>
            </div>

            <div className="search-filter-row">
                <Search
                    allowClear
                    value={query.keyword}
                    className="keyword-search"
                    placeholder="搜索名称、描述、标签或来源..."
                    enterButton={<SearchOutlined />}
                    onChange={(e) => setQuery({ ...query, keyword: e.target.value })}
                    onSearch={(value) => updateQueryAndFetch({ keyword: value, pageNum: 1 })}
                />
                <Space size={12}>
                    <Button
                        icon={<CopyOutlined />}
                        disabled={selectedSlugs.size === 0}
                        onClick={handleCopyCommand}
                    >
                        复制命令{selectedSlugs.size > 0 ? ` (${selectedSlugs.size})` : ''}
                    </Button>
                    <Button
                        icon={<ImportOutlined />}
                        className="import-btn"
                        onClick={openImportModal}
                    >
                        导入技能
                    </Button>
                    <Select
                        value={query.sortBy}
                        style={{ width: 160 }}
                        onChange={(value) => updateQueryAndFetch({ sortBy: value, pageNum: 1 })}
                    >
                        <Option value="stars">按 Stars 排序</Option>
                        <Option value="recent">按最近更新</Option>
                    </Select>
                    <Select
                        allowClear
                        value={query.category || undefined}
                        placeholder="分类筛选"
                        style={{ width: 180 }}
                        suffixIcon={<FilterOutlined />}
                        onChange={(value) =>
                            updateQueryAndFetch({ category: value || '', pageNum: 1 })
                        }
                    >
                        {categories.map((item) => (
                            <Option key={item} value={item}>
                                {item}
                            </Option>
                        ))}
                    </Select>
                </Space>
            </div>

            <Divider />

            <Spin spinning={loading}>
                {skills.length === 0 ? (
                    <Empty description="没有符合条件的 Skills" />
                ) : (
                    <div className="skills-list-section">
                        <Row gutter={[16, 16]} className="skills-grid">
                            {skills.map((skill) => (
                                <Col key={skill.slug} xs={24} sm={12} lg={8}>
                                    <SkillCard
                                        skill={skill}
                                        selected={selectedSlugs.has(skill.slug)}
                                        onSelect={handleSelect}
                                        onClick={(s) => history.push(`/page/skills/${s.slug}`)}
                                        onEdit={openEditModal}
                                        showMeta={true}
                                        showChildrenPreview={skill.isPackage === 1}
                                    />
                                </Col>
                            ))}
                        </Row>

                        <div className="pagination-wrap">
                            <Pagination
                                showSizeChanger
                                showQuickJumper
                                current={query.pageNum}
                                pageSize={query.pageSize}
                                total={total}
                                onChange={(page, pageSize) =>
                                    updateQueryAndFetch({ pageNum: page, pageSize: pageSize || 12 })
                                }
                                onShowSizeChange={(_, size) =>
                                    updateQueryAndFetch({ pageNum: 1, pageSize: size })
                                }
                            />
                        </div>
                    </div>
                )}
            </Spin>

            <Modal
                title="导入 Skill"
                visible={importVisible}
                confirmLoading={importing}
                okText="开始导入"
                cancelText="取消"
                onCancel={closeImportModal}
                onOk={handleImportSkill}
                destroyOnClose
            >
                <Form form={importForm} layout="vertical">
                    <Form.Item
                        label=".zip 文件"
                        required
                        extra="上传包含 SKILL.md 的 skill 目录打包文件"
                    >
                        <Upload
                            accept=".zip"
                            maxCount={1}
                            fileList={uploadFiles}
                            beforeUpload={() => false}
                            onChange={(info) => setUploadFiles(info.fileList || [])}
                        >
                            <Button icon={<UploadOutlined />}>选择 .zip 文件</Button>
                        </Upload>
                    </Form.Item>
                    <Form.Item
                        name="skillName"
                        label="技能名称（可选）"
                        extra="填写后将作为该技能卡片的唯一名称；留空则使用压缩包中的默认名称"
                        rules={[
                            {
                                max: 255,
                                message: '技能名称不能超过 255 个字符',
                            },
                        ]}
                    >
                        <Input placeholder="例如：skill-creator-prod" />
                    </Form.Item>
                    <Form.Item
                        name="category"
                        label="分类"
                        initialValue="通用"
                        rules={[{ required: true, message: '请选择分类' }]}
                    >
                        <Select placeholder="请选择分类">
                            {FIXED_CATEGORY_OPTIONS.map((item) => (
                                <Option key={item} value={item}>
                                    {item}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="tags"
                        label="标签（可选）"
                        extra="最多 5 个标签，可自定义输入，回车或逗号分隔"
                        rules={[
                            {
                                validator: (_, value = []) => {
                                    if (!Array.isArray(value)) return Promise.resolve();
                                    if (value.length > 5) {
                                        return Promise.reject(new Error('标签最多 5 个'));
                                    }
                                    return Promise.resolve();
                                },
                            },
                        ]}
                    >
                        <Select
                            mode="tags"
                            tokenSeparators={[',', '，']}
                            placeholder="例如：邮件, 效率, 命令行"
                            maxTagCount={5}
                        />
                    </Form.Item>
                </Form>
                <Text type="secondary">提示：.zip 包内部应包含 `技能目录/SKILL.md`</Text>
            </Modal>

            <Modal
                title="编辑 Skill"
                visible={editVisible}
                onCancel={closeEditModal}
                destroyOnClose
                footer={
                    <div className="skill-edit-modal-footer">
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            disabled={!editingSkill || editing}
                            onClick={() => {
                                if (!editingSkill) return;
                                closeEditModal();
                                handleDeleteSkill(editingSkill);
                            }}
                        >
                            删除
                        </Button>
                        <Space>
                            <Button onClick={closeEditModal} disabled={editing}>
                                取消
                            </Button>
                            <Button type="primary" loading={editing} onClick={handleUpdateSkill}>
                                保存
                            </Button>
                        </Space>
                    </div>
                }
            >
                <Form form={editForm} layout="vertical">
                    <Form.Item
                        name="name"
                        label="技能名称"
                        rules={[
                            { required: true, message: '请输入技能名称' },
                            { max: 255, message: '技能名称不能超过 255 个字符' },
                        ]}
                    >
                        <Input placeholder="请输入技能名称" />
                    </Form.Item>
                    <Form.Item
                        name="category"
                        label="分类"
                        rules={[{ required: true, message: '请选择分类' }]}
                    >
                        <Select placeholder="请选择分类">
                            {FIXED_CATEGORY_OPTIONS.map((item) => (
                                <Option key={item} value={item}>
                                    {item}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="tags"
                        label="标签（可选）"
                        extra="最多 5 个标签，可自定义输入，回车或逗号分隔"
                        rules={[
                            {
                                validator: (_, value = []) => {
                                    if (!Array.isArray(value)) return Promise.resolve();
                                    if (value.length > 5) {
                                        return Promise.reject(new Error('标签最多 5 个'));
                                    }
                                    return Promise.resolve();
                                },
                            },
                        ]}
                    >
                        <Select
                            mode="tags"
                            tokenSeparators={[',', '，']}
                            placeholder="例如：邮件, 效率, 命令行"
                            maxTagCount={5}
                        />
                    </Form.Item>
                    <Form.Item name="version" label="版本号">
                        <Input placeholder="例如：V2.4.0-STABLE" maxLength={128} />
                    </Form.Item>
                    <Form.Item
                        label="重新上传 .zip（可选）"
                        extra="上传后会替换当前技能文件内容；要求 zip 中只包含一个技能目录"
                    >
                        <Upload
                            accept=".zip"
                            maxCount={1}
                            fileList={editUploadFiles}
                            beforeUpload={() => false}
                            onChange={(info) => setEditUploadFiles(info.fileList || [])}
                        >
                            <Button icon={<UploadOutlined />}>选择新的 .zip 文件</Button>
                        </Upload>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default SkillsMarket;
