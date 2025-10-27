import React, { useState } from 'react';
import { CodeOutlined, FileTextOutlined } from '@ant-design/icons';
import { Card, Collapse, Divider, Space, Switch, Table, Tag, Typography } from 'antd';

import { McpServerDetail } from '../../types';
import './style.scss';

const { Panel } = Collapse;
const { Title, Text, Paragraph } = Typography;

interface ToolsResourcesTabProps {
    serverDetail: McpServerDetail;
}

const ToolsResourcesTab: React.FC<ToolsResourcesTabProps> = ({ serverDetail }) => {
    const [toolsViewMode, setToolsViewMode] = useState<'doc' | 'json'>('doc');
    const [promptsViewMode, setPromptsViewMode] = useState<'doc' | 'json'>('doc');
    const [resourcesViewMode, setResourcesViewMode] = useState<'doc' | 'json'>('doc');

    // 用于记录每个部分的展开状态
    const [toolsExpandedKeys, setToolsExpandedKeys] = useState<string[]>([]);
    const [promptsExpandedKeys, setPromptsExpandedKeys] = useState<string[]>([]);
    const [resourcesExpandedKeys, setResourcesExpandedKeys] = useState<string[]>([]);

    const renderViewModeSwitch = (
        viewMode: 'doc' | 'json',
        onChange: (mode: 'doc' | 'json') => void,
        label: string
    ) => (
        <Space align="center" size="small">
            <Text type="secondary" style={{ fontSize: '12px' }}>
                {label}
            </Text>
            <FileTextOutlined style={{ fontSize: '12px' }} />
            <Switch
                checked={viewMode === 'json'}
                onChange={(checked) => onChange(checked ? 'json' : 'doc')}
                size="small"
            />
            <CodeOutlined style={{ fontSize: '12px' }} />
            <Text type="secondary" style={{ fontSize: '12px' }}>
                {viewMode === 'json' ? 'JSON' : '文档'}
            </Text>
        </Space>
    );

    const renderJsonView = (
        data: any[],
        title: string,
        expandedKeys: string[],
        onExpandedKeysChange: (keys: string[]) => void
    ) => (
        <div className="json-view">
            <Collapse
                activeKey={expandedKeys}
                onChange={(keys) => onExpandedKeysChange(keys as string[])}
            >
                {data.map((item: any, index: number) => (
                    <Panel
                        header={
                            <div className="json-header">
                                <Text strong style={{ fontSize: '14px' }}>
                                    {item.name || `${title} ${index + 1}`}
                                </Text>
                                {item.description && (
                                    <div className="json-description">
                                        <Text type="secondary">{item.description}</Text>
                                    </div>
                                )}
                            </div>
                        }
                        key={index.toString()}
                    >
                        <pre className="json-content">
                            <code>{JSON.stringify(item, null, 2)}</code>
                        </pre>
                    </Panel>
                ))}
            </Collapse>
        </div>
    );

    const renderToolsDoc = () => {
        if (!serverDetail.tools || serverDetail.tools.length === 0) {
            return (
                <div className="empty-state">
                    <Paragraph type="secondary">
                        暂无工具信息，请确保服务器正在运行并点击"同步信息"按钮
                    </Paragraph>
                </div>
            );
        }

        return (
            <Collapse
                className="tools-collapse"
                activeKey={toolsExpandedKeys}
                onChange={(keys) => setToolsExpandedKeys(keys as string[])}
            >
                {serverDetail.tools.map((tool: any, index: number) => {
                    // 解析 inputSchema 参数
                    const parseInputSchemaParameters = (tool: any) => {
                        if (tool.inputSchema && tool.inputSchema.properties) {
                            const required = tool.inputSchema.required || [];
                            return Object.entries(tool.inputSchema.properties).map(
                                ([name, schema]: [string, any]) => ({
                                    key: name,
                                    name,
                                    type: schema.type || 'string',
                                    required: required.includes(name),
                                    description: schema.description || '-',
                                    default: schema.default,
                                    enum: schema.enum,
                                })
                            );
                        }
                        return [];
                    };

                    // 解析 annotations 参数
                    const parseAnnotationsParameters = (tool: any) => {
                        if (tool.annotations && Object.keys(tool.annotations).length > 0) {
                            return Object.entries(tool.annotations).map(
                                ([name, schema]: [string, any]) => ({
                                    key: name,
                                    name,
                                    type: schema.type || 'string',
                                    required: !schema.hasOwnProperty('default'),
                                    description: schema.description || '-',
                                    default: schema.default,
                                    enum: schema.enum,
                                    originalData: schema, // 保存原始数据用于展示
                                })
                            );
                        }
                        return [];
                    };

                    const inputSchemaParameters = parseInputSchemaParameters(tool);
                    const annotationsParameters = parseAnnotationsParameters(tool);

                    // InputSchema 表格列定义
                    const inputSchemaColumns = [
                        {
                            title: '名称',
                            dataIndex: 'name',
                            key: 'name',
                            width: '20%',
                            render: (text: string) => <Text code>{text}</Text>,
                        },
                        {
                            title: '类型',
                            dataIndex: 'type',
                            key: 'type',
                            width: '15%',
                            render: (text: string) => <Tag color="blue">{text}</Tag>,
                        },
                        {
                            title: '必填',
                            dataIndex: 'required',
                            key: 'required',
                            width: '10%',
                            render: (required: boolean) => (
                                <Tag color={required ? 'red' : 'default'}>
                                    {required ? '是' : '否'}
                                </Tag>
                            ),
                        },
                        {
                            title: '描述',
                            dataIndex: 'description',
                            key: 'description',
                            width: '55%',
                            render: (text: string, record: any) => (
                                <div>
                                    <Text>{text}</Text>
                                    {record.enum && (
                                        <div style={{ marginTop: 8 }}>
                                            <div style={{ marginBottom: 4 }}>
                                                <Text strong style={{ fontSize: '12px' }}>
                                                    可选值：
                                                </Text>
                                            </div>
                                            {record.enum.map((value: string, idx: number) => (
                                                <Tag
                                                    key={idx}
                                                    style={{
                                                        margin: '2px',
                                                        fontSize: '11px',
                                                        padding: '0 4px',
                                                        height: '20px',
                                                        lineHeight: '18px',
                                                    }}
                                                >
                                                    {value}
                                                </Tag>
                                            ))}
                                        </div>
                                    )}
                                    {record.default !== undefined && (
                                        <div style={{ marginTop: 8 }}>
                                            <Text strong style={{ fontSize: '12px' }}>
                                                默认值：
                                            </Text>
                                            <Tag
                                                color="orange"
                                                style={{
                                                    marginLeft: 4,
                                                    fontSize: '11px',
                                                    padding: '0 4px',
                                                    height: '20px',
                                                    lineHeight: '18px',
                                                }}
                                            >
                                                {String(record.default)}
                                            </Tag>
                                        </div>
                                    )}
                                </div>
                            ),
                        },
                    ];

                    // Annotations 表格列定义
                    const annotationsColumns = [
                        {
                            title: '参数名',
                            dataIndex: 'name',
                            key: 'name',
                            width: '20%',
                            render: (text: string) => <Text code>{text}</Text>,
                        },
                        {
                            title: '原始数据',
                            dataIndex: 'originalData',
                            key: 'originalData',
                            width: '80%',
                            render: (originalData: any) => (
                                <div
                                    style={{
                                        backgroundColor: '#f6f8fa',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        border: '1px solid #e1e4e8',
                                    }}
                                >
                                    <pre
                                        style={{
                                            margin: 0,
                                            fontSize: '12px',
                                            lineHeight: '1.4',
                                            fontFamily:
                                                "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-all',
                                        }}
                                    >
                                        {JSON.stringify(originalData, null, 2)}
                                    </pre>
                                </div>
                            ),
                        },
                    ];

                    return (
                        <Panel
                            header={
                                <div className="tool-header">
                                    <Space>
                                        <Text strong style={{ fontSize: '14px' }}>
                                            {tool.name}
                                        </Text>
                                    </Space>
                                    {tool.description && (
                                        <div className="tool-description">
                                            <Text type="secondary">{tool.description}</Text>
                                        </div>
                                    )}
                                </div>
                            }
                            key={index.toString()}
                        >
                            <div className="tool-content">
                                {/* InputSchema 参数 */}
                                {inputSchemaParameters.length > 0 && (
                                    <div
                                        className="input-schema-section"
                                        style={{ marginBottom: 24 }}
                                    >
                                        <Title
                                            level={5}
                                            style={{ marginBottom: 16, color: '#1890ff' }}
                                        >
                                            输入参数
                                        </Title>
                                        <Table
                                            columns={inputSchemaColumns}
                                            dataSource={inputSchemaParameters}
                                            pagination={false}
                                            size="small"
                                            bordered
                                        />
                                    </div>
                                )}

                                {/* Annotations 参数 */}
                                {annotationsParameters.length > 0 && (
                                    <div className="annotations-section">
                                        <Title
                                            level={5}
                                            style={{ marginBottom: 16, color: '#52c41a' }}
                                        >
                                            Annotations 参数
                                        </Title>
                                        <Table
                                            columns={annotationsColumns}
                                            dataSource={annotationsParameters}
                                            pagination={false}
                                            size="small"
                                            bordered
                                        />
                                    </div>
                                )}

                                {/* 无参数提示 */}
                                {inputSchemaParameters.length === 0 &&
                                    annotationsParameters.length === 0 && (
                                        <Text type="secondary">该工具无需参数</Text>
                                    )}
                            </div>
                        </Panel>
                    );
                })}
            </Collapse>
        );
    };

    const renderPromptsDoc = () => {
        if (!serverDetail.prompts || serverDetail.prompts.length === 0) {
            return (
                <div className="empty-state">
                    <Paragraph type="secondary">
                        暂无提示词信息，请确保服务器正在运行并点击"同步信息"按钮
                    </Paragraph>
                </div>
            );
        }

        const promptColumns = [
            {
                title: '名称',
                dataIndex: 'name',
                key: 'name',
                width: '25%',
                render: (text: string) => <Text strong>{text}</Text>,
            },
            {
                title: '描述',
                dataIndex: 'description',
                key: 'description',
                width: '45%',
                render: (text: string) => text || '-',
            },
            {
                title: '参数',
                dataIndex: 'arguments',
                key: 'arguments',
                width: '30%',
                render: (args: any[]) => (
                    <div>
                        {args && args.length > 0 ? (
                            args.map((arg: any, index: number) => (
                                <Tag key={index} style={{ marginBottom: '4px' }}>
                                    {arg.name}
                                </Tag>
                            ))
                        ) : (
                            <Text type="secondary">无</Text>
                        )}
                    </div>
                ),
            },
        ];

        const promptData = serverDetail.prompts.map((prompt: any, index: number) => ({
            ...prompt,
            key: index,
        }));

        return (
            <Table
                columns={promptColumns}
                dataSource={promptData}
                pagination={false}
                size="small"
                bordered
            />
        );
    };

    const renderResourcesDoc = () => {
        if (!serverDetail.resources || serverDetail.resources.length === 0) {
            return (
                <div className="empty-state">
                    <Paragraph type="secondary">
                        暂无资源信息，请确保服务器正在运行并点击"同步信息"按钮
                    </Paragraph>
                </div>
            );
        }

        const resourceColumns = [
            {
                title: '名称',
                dataIndex: 'name',
                key: 'name',
                width: '25%',
                render: (text: string) => <Text strong>{text}</Text>,
            },
            {
                title: '描述',
                dataIndex: 'description',
                key: 'description',
                width: '35%',
                render: (text: string) => text || '-',
            },
            {
                title: 'URI',
                dataIndex: 'uri',
                key: 'uri',
                width: '30%',
                render: (text: string) => (
                    <Text code style={{ fontSize: '12px' }}>
                        {text}
                    </Text>
                ),
            },
            {
                title: 'MIME类型',
                dataIndex: 'mimeType',
                key: 'mimeType',
                width: '10%',
                render: (text: string) => (text ? <Tag color="blue">{text}</Tag> : '-'),
            },
        ];

        const resourceData = serverDetail.resources.map((resource: any, index: number) => ({
            ...resource,
            key: index,
        }));

        return (
            <Table
                columns={resourceColumns}
                dataSource={resourceData}
                pagination={false}
                size="small"
                bordered
            />
        );
    };

    return (
        <div className="tools-resources-tab">
            {/* 工具部分 */}
            <Card
                className="tools-section"
                title={`可用工具 (${serverDetail.tools?.length || 0})`}
                extra={
                    <Space>
                        {renderViewModeSwitch(toolsViewMode, setToolsViewMode, '工具')}
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            {serverDetail.last_sync_at
                                ? `最后同步: ${new Date(
                                      serverDetail.last_sync_at
                                  ).toLocaleString()}`
                                : '尚未同步'}
                        </Text>
                    </Space>
                }
            >
                {toolsViewMode === 'json'
                    ? renderJsonView(
                          serverDetail.tools || [],
                          '工具',
                          toolsExpandedKeys,
                          setToolsExpandedKeys
                      )
                    : renderToolsDoc()}
            </Card>

            <Divider />

            {/* 提示词部分 */}
            <Card
                className="prompts-section"
                title={`可用提示词 (${serverDetail.prompts?.length || 0})`}
                extra={renderViewModeSwitch(promptsViewMode, setPromptsViewMode, '提示词')}
            >
                {promptsViewMode === 'json'
                    ? renderJsonView(
                          serverDetail.prompts || [],
                          '提示词',
                          promptsExpandedKeys,
                          setPromptsExpandedKeys
                      )
                    : renderPromptsDoc()}
            </Card>

            <Divider />

            {/* 资源部分 */}
            <Card
                className="resources-section"
                title={`可用资源 (${serverDetail.resources?.length || 0})`}
                extra={renderViewModeSwitch(resourcesViewMode, setResourcesViewMode, '资源')}
            >
                {resourcesViewMode === 'json'
                    ? renderJsonView(
                          serverDetail.resources || [],
                          '资源',
                          resourcesExpandedKeys,
                          setResourcesExpandedKeys
                      )
                    : renderResourcesDoc()}
            </Card>
        </div>
    );
};

export default ToolsResourcesTab;
