import React, { useEffect, useState } from 'react';
import {
    CopyOutlined,
    EyeOutlined,
    FilterOutlined,
    SearchOutlined,
    StarOutlined,
} from '@ant-design/icons';
import {
    Button,
    Card,
    Col,
    Divider,
    Empty,
    Input,
    Pagination,
    Row,
    Select,
    Space,
    Spin,
    Tag,
    Typography,
    message,
} from 'antd';

import { API } from '@/api';
import { copyToClipboard } from '@/utils/copyUtils';
import { SkillItem, SkillListResponse } from './types';
import './style.scss';

const { Search } = Input;
const { Option } = Select;
const { Paragraph, Text } = Typography;

const SkillsMarket: React.FC<any> = ({ history }) => {
    const [loading, setLoading] = useState(false);
    const [skills, setSkills] = useState<SkillItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [total, setTotal] = useState(0);
    const [query, setQuery] = useState({
        keyword: '',
        sortBy: 'stars',
        category: '',
        pageNum: 1,
        pageSize: 12,
    });

    const fetchSkills = async (nextQuery = query) => {
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
    };

    useEffect(() => {
        fetchSkills(query);
    }, []);

    const updateQueryAndFetch = (patch: Partial<typeof query>) => {
        const next = { ...query, ...patch };
        setQuery(next);
        fetchSkills(next);
    };

    const handleOpenDetail = (slug: string) => {
        history.push(`/page/skills/${slug}`);
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
                                        <Paragraph className="skill-desc" ellipsis={{ rows: 3 }}>
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
        </div>
    );
};

export default SkillsMarket;
