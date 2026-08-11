import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    DeleteOutlined,
    ImportOutlined,
    SearchOutlined,
    UploadOutlined,
} from '@ant-design/icons';
import {
    Button,
    Card,
    Empty,
    Input,
    message,
    Modal,
    Pagination,
    Select,
    Space,
    Spin,
    Tag,
    Typography,
    Upload,
} from 'antd';
import debounce from 'lodash/debounce';

import { API } from '@/api';
import type { AgentItem, AgentListResponse } from './types';
import './style.scss';

const { Search } = Input;
const { Option } = Select;
const { Paragraph, Text, Title } = Typography;

const FALLBACK_CATEGORIES = [
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
    category: '',
    pageNum: 1,
    pageSize: 12,
};
const AGENT_DELETE_STORAGE_KEY = 'doraemon.agentMarket.deleteEnabled';
const AGENT_DELETE_STORAGE_VALUE = 'true';

interface AgentMarketProps {
    history: { push: (path: string) => void };
}

const AgentMarket: React.FC<AgentMarketProps> = ({ history }) => {
    const [loading, setLoading] = useState(false);
    const [agents, setAgents] = useState<AgentItem[]>([]);
    const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES);
    const [total, setTotal] = useState(0);
    const [query, setQuery] = useState(INITIAL_QUERY);
    const [keywordInput, setKeywordInput] = useState('');
    const [importVisible, setImportVisible] = useState(false);
    const [importing, setImporting] = useState(false);
    const [uploadFiles, setUploadFiles] = useState<any[]>([]);
    const [deleteEnabled, setDeleteEnabled] = useState(false);
    const queryRef = useRef(query);
    queryRef.current = query;

    const fetchAgents = useCallback(async (nextQuery) => {
        setLoading(true);
        try {
            const response = await API.getAgentList(nextQuery);
            if (!response.success) {
                message.error(response.msg || '获取 Agent 列表失败');
                return;
            }

            const data = response.data as AgentListResponse;
            setAgents(data.list || []);
            setCategories(data.categories?.length ? data.categories : FALLBACK_CATEGORIES);
            setTotal(data.total || 0);
        } catch (error) {
            message.error('获取 Agent 列表失败');
            console.error('获取 Agent 列表失败:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAgents(INITIAL_QUERY);
    }, [fetchAgents]);

    useEffect(() => {
        const debouncedFetch = debouncedFetchRef.current;
        return () => {
            debouncedFetch.cancel();
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setDeleteEnabled(
            window.localStorage.getItem(AGENT_DELETE_STORAGE_KEY) === AGENT_DELETE_STORAGE_VALUE
        );
    }, []);

    const updateQueryAndFetch = (patch: Partial<typeof query>) => {
        const next = { ...queryRef.current, ...patch };
        setQuery(next);
        fetchAgents(next);
    };

    const debouncedFetchRef = useRef(
        debounce((keyword: string) => {
            const next = { ...queryRef.current, keyword, pageNum: 1 };
            setQuery(next);
            fetchAgents(next);
        }, 300)
    );

    const handleDelete = (agent: AgentItem, event?: React.MouseEvent<HTMLElement>) => {
        event?.stopPropagation();
        Modal.confirm({
            title: `删除 Agent「${agent.displayName}」`,
            content: '删除后会移除当前 Agent 与资源文件，但不会删除已收录的 Skills',
            okText: '删除',
            okButtonProps: { danger: true },
            cancelText: '取消',
            async onOk() {
                const response = await API.deleteAgent({ name: agent.name });
                if (!response.success) {
                    message.error(response.msg || '删除失败');
                    return;
                }
                message.success('删除成功');
                fetchAgents(queryRef.current);
            },
        });
    };

    const submitImport = async (confirmOverwrite = false) => {
        const targetFile = uploadFiles[0]?.originFileObj;
        if (!targetFile) {
            message.error('请先选择 .zip 文件');
            return;
        }

        setImporting(true);
        try {
            const response = await API.importAgentFile({
                file: targetFile,
                confirmOverwrite: confirmOverwrite ? 'true' : 'false',
            });
            if (!response.success) {
                message.error(response.msg || '导入失败');
                return;
            }

            if (response.data?.requiresConfirm) {
                Modal.confirm({
                    title: `检测到同名 Agent「${response.data.name}」`,
                    content: `当前版本 ${response.data.currentVersion}，导入版本 ${response.data.incomingVersion}，是否覆盖`,
                    okText: '覆盖导入',
                    cancelText: '取消',
                    onOk: () => submitImport(true),
                });
                return;
            }

            if (response.data?.unchanged) {
                message.info('内容未变化');
            } else if (response.data?.updated) {
                message.success('更新成功');
            } else {
                message.success('导入成功');
            }

            setImportVisible(false);
            setUploadFiles([]);
            fetchAgents(queryRef.current);
        } catch (error) {
            message.error('导入失败，请检查 ZIP 文件');
            console.error('导入 Agent 失败:', error);
        } finally {
            setImporting(false);
        }
    };

    const categoryOptions = useMemo(
        () => (categories.length ? categories : FALLBACK_CATEGORIES),
        [categories]
    );

    return (
        <div className="page-agents">
            <div className="agents-header">
                <div className="title-group">
                    <h1 className="page-title">Agent 市场</h1>
                    <p className="page-subtitle">发现并导入适用于不同研发场景的 Agent</p>
                </div>
                <Button type="primary" icon={<ImportOutlined />} onClick={() => setImportVisible(true)}>
                    导入 Agent
                </Button>
            </div>

            <div className="search-filter-row">
                <Search
                    value={keywordInput}
                    className="keyword-search"
                    placeholder="搜索名称、描述、标签或作者"
                    allowClear
                    enterButton={<SearchOutlined />}
                    onChange={(event) => {
                        const nextValue = event.target.value;
                        setKeywordInput(nextValue);
                        debouncedFetchRef.current(nextValue);
                    }}
                    onSearch={(value) => {
                        setKeywordInput(value);
                        updateQueryAndFetch({ keyword: value, pageNum: 1 });
                    }}
                />
                <Select
                    value={query.category}
                    className="category-filter"
                    onChange={(value) => updateQueryAndFetch({ category: value, pageNum: 1 })}
                >
                    <Option value="">全部分类</Option>
                    {categoryOptions.map((item) => (
                        <Option key={item} value={item}>
                            {item}
                        </Option>
                    ))}
                </Select>
            </div>

            <Spin spinning={loading}>
                {agents.length === 0 ? (
                    <div className="agents-empty">
                        <Empty description="暂无 Agent 数据" />
                    </div>
                ) : (
                    <div className="agents-grid">
                        {agents.map((agent) => (
                            <Card
                                key={agent.name}
                                hoverable
                                className="agent-card"
                                onClick={() => history.push(`/page/agents/${agent.name}`)}
                            >
                                <div className="agent-card-head">
                                    <div className="agent-card-brand">
                                        <img
                                            className="agent-card-logo"
                                            src={agent.logoUrl}
                                            alt={agent.displayName}
                                            onError={(event) => {
                                                event.currentTarget.style.visibility = 'hidden';
                                            }}
                                        />
                                        <div className="agent-card-meta">
                                            <Title level={4}>{agent.displayName}</Title>
                                            <div className="agent-card-subline">
                                                <Text type="secondary">
                                                    {agent.authorName || '未知作者'}
                                                </Text>
                                                <span className="dot">•</span>
                                                <Text type="secondary">{agent.category}</Text>
                                            </div>
                                        </div>
                                    </div>
                                    {deleteEnabled ? (
                                        <Button
                                            type="text"
                                            danger
                                            size="small"
                                            icon={<DeleteOutlined />}
                                            // 浏览器控制台启用删除入口：localStorage.setItem('doraemon.agentMarket.deleteEnabled', 'true')
                                            onClick={(event) => handleDelete(agent, event)}
                                        />
                                    ) : null}
                                </div>

                                <Paragraph className="agent-card-description" ellipsis={{ rows: 3 }}>
                                    {agent.description || '暂无描述'}
                                </Paragraph>

                                <div className="agent-card-tags">
                                    {agent.tags.slice(0, 4).map((tag) => (
                                        <Tag key={tag}>{tag}</Tag>
                                    ))}
                                </div>

                                <div className="agent-card-footer">
                                    <Text type="secondary">版本 {agent.version || '-'}</Text>
                                    <Text type="secondary">内置 Skills {agent.dependencyCount}</Text>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </Spin>

            {total > query.pageSize ? (
                <div className="agents-pagination">
                    <Pagination
                        current={query.pageNum}
                        pageSize={query.pageSize}
                        total={total}
                        showSizeChanger={false}
                        onChange={(pageNum) => updateQueryAndFetch({ pageNum })}
                    />
                </div>
            ) : null}

            <Modal
                title="导入 Agent"
                visible={importVisible}
                confirmLoading={importing}
                okText="开始导入"
                cancelText="取消"
                onCancel={() => {
                    if (importing) return;
                    setImportVisible(false);
                    setUploadFiles([]);
                }}
                onOk={() => submitImport(false)}
            >
                <Space direction="vertical" style={{ width: '100%' }} size={16}>
                    <Text type="secondary">
                        仅支持导入单个 Agent ZIP。Agent 信息会从包内 `agent.yaml` 自动解析。
                    </Text>
                    <Upload
                        accept=".zip"
                        fileList={uploadFiles}
                        beforeUpload={() => false}
                        onChange={(info) => setUploadFiles(info.fileList.slice(-1))}
                    >
                        <Button icon={<UploadOutlined />}>选择 .zip 文件</Button>
                    </Upload>
                </Space>
            </Modal>
        </div>
    );
};

export default AgentMarket;
