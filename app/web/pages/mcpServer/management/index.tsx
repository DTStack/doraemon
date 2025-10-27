import React, { useEffect, useState } from 'react';
import type { RouteComponentProps } from 'react-router';
import {
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    PauseCircleOutlined,
    PlayCircleOutlined,
    PlusOutlined,
    ReloadOutlined,
    SyncOutlined,
} from '@ant-design/icons';
import { Button, message, Popconfirm, Space, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { API } from '@/api';
import StatusBadge from '../components/statusBadge';
import TransportTag from '../components/transportTag';
import { McpServerItem } from '../types';
import './style.scss';

const { Title } = Typography;

const McpServerManagement: React.FC<RouteComponentProps> = (props) => {
    const { history } = props;
    const [loading, setLoading] = useState(false);
    const [serverList, setServerList] = useState<McpServerItem[]>([]);
    const [tablePagination, setTablePagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });

    const fetchServerList = async (
        page = tablePagination.current,
        pageSize = tablePagination.pageSize
    ) => {
        setLoading(true);
        try {
            const response = await API.getMCPServerList({
                page,
                pageSize,
                showAll: true,
            });
            if (response.success) {
                setServerList(response.data.list || []);
                setTablePagination((prev) => ({
                    ...prev,
                    current: page,
                    pageSize,
                    total: response.data.total || 0,
                }));
            } else {
                message.error(response.msg || '获取MCP服务器列表失败');
            }
        } catch (error) {
            message.error('获取MCP服务器列表失败');
            console.error('获取服务器列表错误:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartServer = async (serverId: string) => {
        try {
            const response = await API.startMCPServer({ serverId });
            if (response.success) {
                message.success('MCP服务器启动请求已发送');
                setTimeout(() => {
                    fetchServerList();
                }, 2000);
            } else {
                message.error(response.msg || 'MCP服务器启动失败');
            }
        } catch (error) {
            message.error('MCP服务器启动失败');
            console.error('启动服务器错误:', error);
        }
    };

    const handleStopServer = async (serverId: string) => {
        try {
            const response = await API.stopMCPServer({ serverId });
            if (response.success) {
                message.success('MCP服务器停止请求已发送');
                setTimeout(() => {
                    fetchServerList();
                }, 2000);
            } else {
                message.error(response.msg || 'MCP服务器停止失败');
            }
        } catch (error) {
            message.error('MCP服务器停止失败');
            console.error(error);
        }
    };

    const handleRestartServer = async (serverId: string) => {
        try {
            const response = await API.restartMCPServer({ serverId });
            if (response.success) {
                message.success('MCP服务器重启请求已发送');
                setTimeout(() => {
                    fetchServerList();
                }, 2000);
            } else {
                message.error(response.msg || 'MCP服务器重启失败');
            }
        } catch (error) {
            message.error('MCP服务器重启失败');
            console.log(error);
        }
    };

    const handleDeleteServer = async (serverId: string) => {
        try {
            const response = await API.deleteMCPServer({ serverId });
            if (response.success) {
                message.success('MCP删除成功');
                fetchServerList();
            } else {
                message.error(response.msg || 'MCP删除失败');
            }
        } catch (error) {
            message.error('MCP删除失败');
            console.log(error);
        }
    };

    const handleViewDetail = (serverId: string) => {
        history.push(`/page/mcp-server-detail/${serverId}`);
    };

    const handleAddServer = () => {
        history.push('/page/mcp-server-registry');
    };

    const handleEditServer = (serverId: string) => {
        history.push(`/page/mcp-server-registry/edit/${serverId}`);
    };

    const handleSyncServerInfo = async (serverId: string) => {
        try {
            const response = await API.syncMCPServerInfo({ serverId });
            if (response.success) {
                message.success('服务器信息同步成功');
                fetchServerList();
            } else {
                message.error(response.msg || '服务器信息同步失败');
            }
        } catch (error) {
            message.error('服务器信息同步失败');
            console.error('同步服务器信息错误:', error);
        }
    };

    const handleTableChange = (page: number, pageSize?: number) => {
        const newPageSize = pageSize || tablePagination.pageSize;
        fetchServerList(page, newPageSize);
    };

    const columns: ColumnsType<McpServerItem> = [
        {
            title: '服务器信息',
            key: 'server_info',
            width: 300,
            render: (_, record) => (
                <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{record.title}</div>
                    <div style={{ color: '#666', fontSize: '12px' }}>
                        ID: <code>{record.server_id}</code>
                    </div>
                </div>
            ),
        },
        {
            title: '传输类型',
            dataIndex: 'transport',
            key: 'transport',
            width: 160,
            render: (transport) => <TransportTag transport={transport} />,
        },
        {
            title: '运行状态',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status, record) => (
                <StatusBadge status={status} errorMsg={record.ping_error} />
            ),
        },
        {
            title: '版本',
            dataIndex: 'version',
            key: 'version',
            width: 80,
        },
        {
            title: '作者',
            dataIndex: 'author',
            key: 'author',
            width: 100,
        },
        {
            title: '使用次数',
            dataIndex: 'use_count',
            key: 'use_count',
            width: 100,
        },
        {
            title: '标签',
            dataIndex: 'tags',
            key: 'tags',
            width: 150,
            render: (tags) => (
                <div>
                    {tags.slice(0, 2).map((tag: string, index: number) => (
                        <Tag key={index}>{tag}</Tag>
                    ))}
                    {tags.length > 2 && <Tag>+{tags.length - 2}</Tag>}
                </div>
            ),
        },
        {
            title: '操作',
            key: 'actions',
            width: 230,
            fixed: 'right',
            render: (_, record) => {
                const isRunning = record.status === 'running';
                const isStopped = record.status === 'stopped';
                const isError = record.status === 'error';

                return (
                    <Space size="small">
                        <Tooltip title="查看详情">
                            <Button
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => handleViewDetail(record.server_id)}
                            />
                        </Tooltip>
                        <Tooltip title="工具同步">
                            <Button
                                size="small"
                                icon={<SyncOutlined />}
                                onClick={() => handleSyncServerInfo(record.server_id)}
                            />
                        </Tooltip>

                        {record.transport === 'stdio' && (
                            <>
                                {isRunning ? (
                                    <Tooltip title="停止">
                                        <Button
                                            size="small"
                                            icon={<PauseCircleOutlined />}
                                            onClick={() => handleStopServer(record.server_id)}
                                        />
                                    </Tooltip>
                                ) : isStopped || isError ? (
                                    <Tooltip title="启动">
                                        <Button
                                            size="small"
                                            icon={<PlayCircleOutlined />}
                                            onClick={() => handleStartServer(record.server_id)}
                                        />
                                    </Tooltip>
                                ) : null}

                                {isRunning && (
                                    <Tooltip title="重启">
                                        <Button
                                            size="small"
                                            icon={<ReloadOutlined />}
                                            onClick={() => handleRestartServer(record.server_id)}
                                        />
                                    </Tooltip>
                                )}
                            </>
                        )}

                        <Tooltip title="编辑">
                            <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleEditServer(record.server_id)}
                            />
                        </Tooltip>

                        <Popconfirm
                            title="确定要删除这个MCP服务器吗？"
                            onConfirm={() => handleDeleteServer(record.server_id)}
                            okText="确定"
                            cancelText="取消"
                        >
                            <Tooltip title="删除">
                                <Button size="small" danger icon={<DeleteOutlined />} />
                            </Tooltip>
                        </Popconfirm>
                    </Space>
                );
            },
        },
    ];

    useEffect(() => {
        fetchServerList();
    }, []);

    return (
        <div className="mcp-server-management">
            <div className="header">
                <Title level={2}>MCP服务器管理</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddServer}>
                    新增MCP
                </Button>
            </div>

            <Table
                className="dt-table-fixed-base"
                columns={columns}
                dataSource={serverList}
                rowKey="id"
                loading={loading}
                pagination={{
                    size: 'small',
                    showSizeChanger: true,
                    showQuickJumper: true,
                    total: tablePagination.total,
                    current: tablePagination.current,
                    pageSize: tablePagination.pageSize,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    onChange: handleTableChange,
                    showTotal: (total: any) => (
                        <span>
                            共<span style={{ color: '#3F87FF' }}>{total}</span>条数据，每页显示
                            {tablePagination.pageSize}条
                        </span>
                    ),
                }}
                scroll={{ x: 1200 }}
            />
        </div>
    );
};

export default McpServerManagement;
