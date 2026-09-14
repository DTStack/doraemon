import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    DeleteOutlined,
    ImportOutlined,
    SearchOutlined,
    SettingOutlined,
    SyncOutlined,
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
    Tooltip,
    Typography,
} from 'antd';
import debounce from 'lodash/debounce';

import { API } from '@/api';
import helpIcon from '@/asset/images/help-icon.png';
import config from '../../../../env.json';
import defaultAgentLogo from '../../asset/images/default_agent.jpg';
import { AgentGitOpsModal } from './components/AgentGitOpsModal';
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
    const [syncingAll, setSyncingAll] = useState(false);
    const [syncingAgentName, setSyncingAgentName] = useState<string | null>(null);
    const [settingVisible, setSettingVisible] = useState(false);
    const [settingAgent, setSettingAgent] = useState<AgentItem | null>(null);
    const [settingLoading, setSettingLoading] = useState(false);
    const [deleteEnabled, setDeleteEnabled] = useState(false);
    const queryRef = useRef(query);
    queryRef.current = query;

    // 单独同步指定 Agent 的 Git 仓库代码
    const handleSyncSingleAgent = async (
        agent: AgentItem,
        event?: React.MouseEvent<HTMLElement>
    ) => {
        event?.stopPropagation();
        if (!agent.gitUrl) {
            message.warning('该 Agent 尚未配置 Git 仓库地址');
            return;
        }
        setSyncingAgentName(agent.name);
        try {
            const response = await API.syncSingleGitAgent({ name: agent.name });
            if (!response.success) {
                message.error(response.msg || '同步失败');
                return;
            }
            const displayName = agent.displayName || agent.name;
            // 根据远端代码是否发生变更给出差异化反馈
            if (response.data?.isContentChanged) {
                message.success(`已成功同步【${displayName}】的最新代码`);
            } else {
                message.info(`【${displayName}】当前已是最新版本，无代码变动`);
            }
            fetchAgents(queryRef.current);
        } catch (error: any) {
            message.error(error.message || '同步异常');
        } finally {
            setSyncingAgentName(null);
        }
    };

    const fetchAgents = useCallback(async (nextQuery) => {
        setLoading(true);
        try {
            const response = await API.getAgentList(nextQuery);
            if (!response.success) {
                message.error(response.msg || '获取 Agent 列表失败');
                return;
            }

            const data = response.data as AgentListResponse;
            // 列表按名称首字母升序排序，支持中文拼音与英文不区分大小写
            const sortedList = (data.list || []).slice().sort((a, b) => {
                const nameA = a.displayName || a.name || '';
                const nameB = b.displayName || b.name || '';
                return nameA.localeCompare(nameB, 'zh-CN', { sensitivity: 'base', numeric: true });
            });
            setAgents(sortedList);
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

    const submitImport = async (data: { gitUrl: string; gitBranch: string; category: string }) => {
        if (!data.gitUrl) {
            message.error('请填写 GitLab 仓库地址');
            return;
        }

        setImporting(true);
        try {
            const response = await API.importAgentFromGit({
                gitUrl: data.gitUrl,
                gitBranch: data.gitBranch || 'master',
                category: data.category,
            });
            if (!response.success) {
                message.error(response.msg || '导入失败');
                return;
            }

            message.success('导入成功');
            setImportVisible(false);
            fetchAgents(queryRef.current);
        } catch (error) {
            message.error('导入失败，请检查 URL、分支或服务端 Git 权限');
            console.error('导入 Agent 失败:', error);
        } finally {
            setImporting(false);
        }
    };

    const handleSyncGit = async () => {
        setSyncingAll(true);
        try {
            const response = await API.syncAllGitAgents({});
            if (!response.success) {
                message.error(response.msg || '同步失败');
                return;
            }
            message.success('同步触发成功');
            fetchAgents(queryRef.current);
        } catch (error: any) {
            message.error(error?.message || '同步失败');
        } finally {
            setSyncingAll(false);
        }
    };

    const handleOpenSetting = (agent: AgentItem, event?: React.MouseEvent<HTMLElement>) => {
        event?.stopPropagation();
        setSettingAgent(agent);
        setSettingVisible(true);
    };

    const handleSaveSetting = async (data: {
        gitUrl: string;
        gitBranch: string;
        category: string;
    }) => {
        if (!settingAgent) return;
        if (!data.gitUrl) {
            message.error('请填写 GitLab 仓库地址');
            return;
        }

        setSettingLoading(true);
        try {
            const response = await API.updateAgentGitConfig({
                name: settingAgent.name,
                gitUrl: data.gitUrl,
                gitBranch: data.gitBranch || 'master',
                category: data.category,
                syncNow: false,
            });

            if (!response.success) {
                message.error(response.msg || '保存失败');
                return;
            }

            message.success('配置保存成功');
            setSettingVisible(false);
            fetchAgents(queryRef.current);
        } catch (error: any) {
            message.error(error?.message || '保存失败');
        } finally {
            setSettingLoading(false);
        }
    };

    const categoryOptions = useMemo(
        () => (categories.length ? categories : FALLBACK_CATEGORIES),
        [categories]
    );

    const handleHelpIcon = () => {
        if (config.agentHelpDocUrl) {
            window.open(config.agentHelpDocUrl, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div className="page-agents">
            <div className="agents-header">
                <div className="title-group">
                    <h1 className="page-title">Agent 市场</h1>
                    <p className="page-subtitle">发现并导入适用于不同研发场景的 Agent</p>
                </div>
                <Space>
                    <Button onClick={handleSyncGit} loading={syncingAll} disabled={syncingAll}>
                        全量同步
                    </Button>
                    <Button
                        type="primary"
                        icon={<ImportOutlined />}
                        onClick={() => setImportVisible(true)}
                    >
                        导入 Agent
                    </Button>
                </Space>
            </div>

            {config.agentHelpDocUrl ? (
                <img
                    className="help-icon"
                    src={helpIcon}
                    onClick={handleHelpIcon}
                    alt="帮助文档"
                    title="Agent 市场帮助文档"
                />
            ) : null}

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
                                            src={agent.logoUrl || defaultAgentLogo}
                                            alt={agent.displayName}
                                            onError={(event) => {
                                                event.currentTarget.src = defaultAgentLogo;
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
                                    <div onClick={(event) => event.stopPropagation()}>
                                        <Space size={4}>
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
                                            <Tooltip title="Git 仓库设置">
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<SettingOutlined />}
                                                    onClick={(event) =>
                                                        handleOpenSetting(agent, event)
                                                    }
                                                />
                                            </Tooltip>
                                            {agent.gitUrl ? (
                                                <Tooltip title="从 Git 同步最新代码">
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        icon={
                                                            <SyncOutlined
                                                                spin={
                                                                    syncingAgentName === agent.name
                                                                }
                                                            />
                                                        }
                                                        loading={syncingAgentName === agent.name}
                                                        onClick={(event) =>
                                                            handleSyncSingleAgent(agent, event)
                                                        }
                                                    />
                                                </Tooltip>
                                            ) : null}
                                        </Space>
                                    </div>
                                </div>

                                <Paragraph
                                    className="agent-card-description"
                                    ellipsis={{ rows: 3 }}
                                >
                                    {agent.description || '暂无描述'}
                                </Paragraph>

                                <div className="agent-card-tags">
                                    {agent.tags.slice(0, 4).map((tag) => (
                                        <Tag key={tag}>{tag}</Tag>
                                    ))}
                                </div>

                                <div className="agent-card-footer">
                                    <Text type="secondary">版本 {agent.version || '-'}</Text>
                                    <Text type="secondary">Skills {agent.skillCount ?? 0}个</Text>
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

            <AgentGitOpsModal
                visible={importVisible}
                title="导入 Agent (GitLab)"
                description="请输入独立 Agent 的 GitLab 仓库地址。系统会自动拉取代码，并在后台完成入库和解析。"
                mode="import"
                loading={importing}
                onCancel={() => setImportVisible(false)}
                onOk={(data) => submitImport(data)}
            />

            <AgentGitOpsModal
                visible={settingVisible}
                title={`设置 Agent Git 仓库 - ${
                    settingAgent?.displayName || settingAgent?.name || ''
                }`}
                description="配置当前 Agent 的远程 GitLab 仓库地址与默认拉取分支"
                mode="setting"
                loading={settingLoading}
                initialUrl={settingAgent?.gitUrl || ''}
                initialBranch={settingAgent?.gitBranch || 'master'}
                initialCategory={settingAgent?.category || '工程效率'}
                onCancel={() => setSettingVisible(false)}
                onOk={handleSaveSetting}
            />
        </div>
    );
};

export default AgentMarket;
