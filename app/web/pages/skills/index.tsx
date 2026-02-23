import React, { useCallback, useEffect, useState } from 'react';
import {
    CopyOutlined,
    EyeOutlined,
    FilterOutlined,
    ImportOutlined,
    SearchOutlined,
    StarOutlined,
} from '@ant-design/icons';
import {
    Button,
    Card,
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
    Tag,
    Typography,
} from 'antd';

import { API } from '@/api';
import { copyToClipboard } from '@/utils/copyUtils';
import { SkillItem, SkillListResponse } from './types';
import './style.scss';

const { Search } = Input;
const { Option } = Select;
const { Paragraph, Text } = Typography;
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
    const [importForm] = Form.useForm();
    const [query, setQuery] = useState(INITIAL_QUERY);

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
    };

    const handleOpenDetail = (slug: string) => {
        history.push(`/page/skills/${slug}`);
    };

    const openImportModal = () => {
        setImportVisible(true);
        importForm.setFieldsValue({
            category: '通用',
            tags: [],
        });
    };

    const closeImportModal = () => {
        if (importing) return;
        setImportVisible(false);
        importForm.resetFields();
    };

    const handleImportSkill = async () => {
        try {
            const values = await importForm.validateFields();
            setImporting(true);
            const response = await API.importSkill(values);
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
            importForm.resetFields();
            fetchSkills({ ...query });
        } catch (error) {
            if (error?.errorFields) return;
            message.error('导入失败，请检查来源地址或网络权限');
            console.error('导入 Skill 失败:', error);
        } finally {
            setImporting(false);
        }
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
                    <Button icon={<ImportOutlined />} className="import-btn" onClick={openImportModal}>
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
                    <>
                        <Row gutter={[16, 16]}>
                            {skills.map((skill) => (
                                <Col key={skill.slug} xs={24} sm={12} lg={8}>
                                    <Card
                                        className="skill-card"
                                        hoverable
                                        onClick={() => handleOpenDetail(skill.slug)}
                                    >
                                        <div className="card-header">
                                            <span className="skill-name">{skill.name}</span>
                                            <span className="meta-stars">
                                                <StarOutlined /> {skill.stars || 0}
                                            </span>
                                        </div>
                                        <Paragraph className="skill-desc">
                                            {skill.description || '暂无描述'}
                                        </Paragraph>
                                        <div className="meta-row">
                                            <Text type="secondary">来源:</Text>
                                            <Text className="meta-value" ellipsis>
                                                {skill.sourceRepo || skill.sourcePath}
                                            </Text>
                                        </div>
                                        <div className="meta-row">
                                            <Text type="secondary">更新:</Text>
                                            <Text className="meta-value">
                                                {new Date(skill.updatedAt).toLocaleDateString(
                                                    'zh-CN'
                                                )}
                                            </Text>
                                        </div>
                                        <div className="tag-row">
                                            <Tag color="blue">{skill.category || '未分类'}</Tag>
                                            {skill.tags.slice(0, 3).map((tag) => (
                                                <Tag key={tag}>{tag}</Tag>
                                            ))}
                                        </div>
                                        <div className="action-row">
                                            <Button
                                                type="link"
                                                icon={<EyeOutlined />}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenDetail(skill.slug);
                                                }}
                                            >
                                                查看详情
                                            </Button>
                                            <Button
                                                type="link"
                                                icon={<CopyOutlined />}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    copyToClipboard(
                                                        skill.installCommand,
                                                        '安装命令已复制'
                                                    );
                                                }}
                                            >
                                                复制安装命令
                                            </Button>
                                        </div>
                                    </Card>
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
                    </>
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
                        name="source"
                        label="来源地址"
                        rules={[{ required: true, message: '请输入来源地址' }]}
                    >
                        <Input placeholder="支持 GitHub / GitLab / 内网 GitLab / tree 子目录 URL" />
                    </Form.Item>
                    <Form.Item name="skillName" label="Skill 名称（可选）">
                        <Input placeholder="可选，等价于 --skill <name>" />
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
                            tokenSeparators={[ ',', '，' ]}
                            placeholder="例如：邮件, 效率, 命令行"
                            maxTagCount={5}
                        />
                    </Form.Item>
                </Form>
                <Text type="secondary">
                    示例：`https://github.com/openclaw/openclaw/tree/main/skills/himalaya`
                </Text>
            </Modal>
        </div>
    );
};

export default SkillsMarket;
