import React, { useState, useEffect } from 'react';
import {
    Tabs,
    Tag,
    Button,
    Typography,
    Space,
    message,
    Spin,
    Badge,
} from 'antd';
import {
    ArrowLeftOutlined,
    GithubOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import { API } from '@/api';
import OverviewTab from '../components/overviewTab';
import ConfigTab from '../components/configTab';
import ToolsResourcesTab from '../components/toolsResourcesTab';
import InspectorTab from '../components/inspectorTab';
import { McpServerDetail } from '../types';
import StatusBadge from '../components/statusBadge';
import './style.scss';

const { TabPane } = Tabs;
const { Title, Text } = Typography;

const McpServerDetailPage: React.FC = (props: any) => {
    const { serverId } = props.match.params;
    const { history } = props;
    const [loading, setLoading] = useState(true);
    const [serverDetail, setServerDetail] = useState<McpServerDetail | null>(null);
    const [activeTab, setActiveTab] = useState('overview');

    // 获取服务器详情
    const fetchServerDetail = async () => {
        setLoading(true);
        try {
            const response = await API.getMCPServerDetail({ serverId });
            if (response.success) {
                setServerDetail(response.data);
            } else {
                message.error(response.msg || '获取服务器详情失败');
            }
        } catch (error) {
            message.error('获取服务器详情失败');
            console.error('获取服务器详情错误:', error);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchServerDetail();
    }, [serverId]);

    const handleBack = () => {
        history.push('/page/mcp-server-market');
    };

    const handleInspector = () => {
        setActiveTab('inspector');
    };

    const getTransportColor = (transport: string) => {
        switch (transport) {
            case 'stdio': return 'blue';
            case 'streamable-http': return 'green';
            case 'sse': return 'orange';
            default: return 'default';
        }
    };

    const getStatusBadge = () => {
        if (!serverDetail) {
            return <Badge status="default" text="未知" />;
        }
        
        return <StatusBadge status={serverDetail.status} errorMsg={serverDetail.ping_error} />;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('zh-CN');
    };

    const renderServerActions = () => {
        return (
            <Space>
                {serverDetail?.git_url && (
                    <Button
                        icon={<GithubOutlined />}
                        onClick={() => window.open(serverDetail.git_url, '_blank')}
                    >
                        GitHub
                    </Button>
                )}

                <Button 
                    icon={<SettingOutlined />} 
                    onClick={handleInspector}
                >
                    Inspector
                </Button>
            </Space>
        );
    };

    if (loading) {
        return (
            <div className="mcp-server-detail loading">
                <Spin size="large" />
            </div>
        );
    }

    if (!serverDetail) {
        return (
            <div className="mcp-server-detail error">
                <Title level={3}>服务器详情不存在</Title>
                <Button onClick={handleBack}>返回列表</Button>
            </div>
        );
    }

    return (
        <div className="mcp-server-detail">
            <div className="detail-header">
                <Button icon={<ArrowLeftOutlined />} onClick={handleBack} className="back-button">
                    返回列表
                </Button>

                <div className="server-info">
                    <div className="title-section">
                        <Title level={2} className="server-title">
                            {serverDetail.title}
                        </Title>
                        <div className="status-tags">
                            <Tag
                                color={getTransportColor(serverDetail.transport)}
                                className="transport-tag"
                            >
                                {serverDetail.transport.toUpperCase()}
                            </Tag>
                            {getStatusBadge()}
                        </div>
                    </div>

                    <Text code className="server-name">
                        {serverDetail.server_id}
                    </Text>

                    <div className="meta-info">
                        <Space size="large">
                            <span>v{serverDetail.version}</span>
                            <span>{serverDetail.use_count} 次使用</span>
                            <span>作者: {serverDetail.author}</span>
                            <span>更新: {formatDate(serverDetail.updated_at)}</span>
                        </Space>
                    </div>

                    <div className="tags">
                        {serverDetail.tags.map((tag, index) => (
                            <Tag key={index}>{tag}</Tag>
                        ))}
                    </div>
                </div>

                <div className="action-buttons">
                    {renderServerActions()}
                </div>
            </div>

            <div className="detail-content">
                <Tabs activeKey={activeTab} onChange={setActiveTab}>
                    <TabPane tab="概览" key="overview">
                        <OverviewTab 
                            serverDetail={serverDetail} 
                        />
                    </TabPane>

                    <TabPane tab="配置示例" key="config">
                        <ConfigTab serverDetail={serverDetail} />
                    </TabPane>

                    <TabPane tab="工具与资源" key="tools-resources">
                        <ToolsResourcesTab serverDetail={serverDetail} />
                    </TabPane>

                    <TabPane tab="Inspector" key="inspector">
                        <InspectorTab />
                    </TabPane>
                </Tabs>
            </div>
        </div>
    );
};

export default McpServerDetailPage;
