import React, { useState, useEffect } from 'react';
import { 
    Input, 
    Row, 
    Button, 
    message, 
    Empty,
    Divider
} from 'antd';
import { 
    SearchOutlined, 
    SettingOutlined
} from '@ant-design/icons';
import { API } from '@/api';
import ServerCard from '../components/serverCard';
import ServerCardSkeleton from '../components/serverCardSkeleton';
import { McpServerItem } from '../types';
import './style.scss';

const { Search } = Input;

const McpMarket: React.FC = (props: any) => {
    const [searchValue, setSearchValue] = useState('');
    const [serverList, setServerList] = useState<McpServerItem[]>([]);
    const [filteredData, setFilteredData] = useState<McpServerItem[]>([]);
    const [loading, setLoading] = useState(false);
    const { history } = props;

    const fetchServerList = async (params?: any) => {
        setLoading(true);
        try {
            const response = await API.getMCPServerList(params);
            if (response.success) {
                setServerList(response.data.list || []);
                setFilteredData(response.data.list || []);
            } else {
                message.error(response.msg || '获取MCP服务器列表失败');
            }
        } catch (error) {
            message.error('获取MCP服务器列表失败');
            console.error('获取MCP服务器列表错误:', error);
        } finally {
            setLoading(false);
        }
    };


    // 搜索过滤
    const handleSearch = (value: string) => {
        setSearchValue(value);
        const filtered = serverList.filter(
            (item) =>
                item.title.toLowerCase().includes(value.toLowerCase()) ||
                item.description.toLowerCase().includes(value.toLowerCase()) ||
                item.author.toLowerCase().includes(value.toLowerCase()) ||
                item.server_id.toLowerCase().includes(value.toLowerCase()) ||
                item.tags.some((tag) => tag.toLowerCase().includes(value.toLowerCase()))
        );
        setFilteredData(filtered);
    };

    // 查看详情
    const handleViewDetail = (serverId: string) => {
        history.push(`/page/mcp-server-detail/${serverId}`);
    };

    // 跳转到管理页面
    const handleManagement = () => {
        history.push('/page/mcp-server-management');
    };

    // 页面加载时获取数据
    useEffect(() => {
        fetchServerList();
    }, []);


    return (
        <div className="mcp-server-market">
            <div className="header">
                <div className="header-text">
                    <h1>MCP Servers市场</h1>
                    <p>发现和查看可用的MCP服务器</p>
                </div>
                <div className="header-actions">
                    <Button
                        icon={<SettingOutlined />}
                        size="large"
                        onClick={handleManagement}
                        className="management-button"
                    >
                        管理MCP
                    </Button>
                </div>
            </div>

            <div className="search-section">
                <Search
                    placeholder="搜索MCP服务器..."
                    allowClear
                    enterButton={<SearchOutlined />}
                    size="large"
                    value={searchValue}
                    onChange={(e) => handleSearch(e.target.value)}
                    onSearch={handleSearch}
                    style={{ width: 600 }}
                />
            </div>

            <Divider style={{ backgroundColor: '#EEE' }} />

            <div className="server-grid">
                {loading ? (
                    <Row gutter={[24, 24]}>
                        {Array.from({ length: 8 }).map((_, index) => (
                            <ServerCardSkeleton key={`skeleton-${index}`} />
                        ))}
                    </Row>
                ) : filteredData.length === 0 ? (
                    <Empty
                        description="暂无MCP服务器"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        className="empty-state-enhanced"
                    >
                        <Button
                            type="primary"
                            onClick={handleManagement}
                            size="large"
                            className="empty-action-button"
                        >
                            去管理页面添加服务器
                        </Button>
                    </Empty>
                ) : (
                    <Row gutter={[24, 24]}>
                        {filteredData.map((server, index) => (
                            <ServerCard
                                key={server.id}
                                server={server}
                                index={index}
                                loading={loading}
                                onViewDetail={handleViewDetail}
                            />
                        ))}
                    </Row>
                )}
            </div>
        </div>
    );
};

export default McpMarket;