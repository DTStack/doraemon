import React, { useState, useEffect } from 'react';
import {
    Form,
    Input,
    Select,
    Button,
    Card,
    Upload,
    message,
    Row,
    Col,
    Radio,
    Space,
    Divider,
    Tabs,
    Typography,
    Spin,
    Tooltip,
} from 'antd';
import { UploadOutlined, PlusOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { API } from '@/api';
import env from '../../../../../env.json';
import { TransportType } from '../types';
import { copyToClipboard } from '@/utils/copyUtils';
import MarkdownEditor from '@/components/markdownEditor';
import './style.scss';

const { Option } = Select;
const { TextArea } = Input;
const { Paragraph } = Typography;

interface RegistryFormData {
    name: string;
    title: string;
    transport: TransportType;
    command?: string;
    args?: string[];
    env?: Array<{ key: string; value: string }>;
    httpUrl?: string;
    gitUrl?: string;
    description: string;
    author: string;
    version: string;
    tags: string[];
    files: UploadFile[];
}

// 获取输出transport类型的转换函数
const getOutputTransportType = (originalTransport: TransportType): string => {
    switch (originalTransport) {
        case 'sse':
            return 'sse';
        case 'stdio':
        case 'streamable-http':
            return 'streamable-http';
        default:
            return 'streamable-http';
    }
};

// 获取输出transport类型的颜色
const getOutputTransportColor = (originalTransport: TransportType): string => {
    const outputType = getOutputTransportType(originalTransport);
    switch (outputType) {
        case 'sse':
            return '#fa8c16'; // orange
        case 'streamable-http':
            return '#52c41a'; // green
        default:
            return '#1890ff'; // blue
    }
};

const McpServerRegistryCenter: React.FC = (props: any) => {
    const { history, location } = props;
    const [form] = Form.useForm();
    const [transport, setTransport] = useState<TransportType>('stdio');
    const [loading, setLoading] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [editServerId, setEditServerId] = useState<string>('');
    const [initialLoading, setInitialLoading] = useState(false);

    // 解析URL参数和加载编辑数据
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const editId = urlParams.get('edit');

        if (editId) {
            setIsEdit(true);
            setEditServerId(editId);
            loadServerData(editId);
        }
    }, [location.search]);

    // 加载服务器数据用于编辑
    const loadServerData = async (serverId: string) => {
        setInitialLoading(true);
        try {
            const response = await API.getMCPServerDetail({ serverId });
            if (response.success) {
                const server = response.data;

                // 设置表单值
                form.setFieldsValue({
                    serverId: server.server_id,
                    title: server.title,
                    description: server.description,
                    author: server.author,
                    version: server.version,
                    transport: server.transport,
                    tags: server.tags || [],
                    command: server.command,
                    args: server.args?.join('\n') || '',
                    httpUrl: server.http_url,
                    sseUrl: server.sse_url,
                    gitUrl: server.git_url,
                });

                // 设置传输类型
                setTransport(server.transport as TransportType);

                // 设置环境变量
                if (server.env) {
                    const envArray = Object.entries(server.env).map(([key, value]) => ({
                        key,
                        value: String(value),
                    }));
                    // 这里需要根据你的环境变量处理逻辑来设置
                }
            } else {
                message.error('获取服务器信息失败');
                history.push('/page/mcp-server-management');
            }
        } catch (error) {
            message.error('获取服务器信息失败');
            console.error('加载服务器数据错误:', error);
            history.push('/page/mcp-server-management');
        } finally {
            setInitialLoading(false);
        }
    };

    const handleTransportChange = (value: TransportType) => {
        setTransport(value);
        // 清除相关字段
        if (value === 'stdio') {
            form.setFieldsValue({ httpUrl: undefined });
        } else {
            form.setFieldsValue({ command: undefined, args: undefined, env: undefined });
        }
    };

    const handleSubmit = async (values: any) => {
        setLoading(true);
        try {
            const formData = new FormData();

            // 添加表单字段
            Object.keys(values).forEach((key) => {
                if (key === 'files') {
                    // 处理文件上传
                    if (values.files && values.files.length > 0) {
                        values.files.forEach((file: any) => {
                            formData.append('files', file.originFileObj || file);
                        });
                    }
                } else if (key === 'tags' && Array.isArray(values[key])) {
                    // 处理标签数组
                    formData.append(key, JSON.stringify(values[key]));
                } else if (key === 'env' && Array.isArray(values[key])) {
                    // 处理环境变量数组
                    formData.append(key, JSON.stringify(values[key]));
                } else if (values[key] !== undefined && values[key] !== null) {
                    formData.append(key, values[key]);
                }
            });

            // 发送请求（编辑或新增）
            let response;
            if (isEdit) {
                response = await fetch(`/api/mcp-servers/update`, {
                    method: 'PUT',
                    body: formData,
                });
            } else {
                response = await fetch(`/api/mcp-servers/register`, {
                    method: 'POST',
                    body: formData,
                });
            }

            const result = await response.json();

            if (result.success) {
                message.success(isEdit ? 'MCP服务器更新成功！' : 'MCP服务器注册成功！');
                if (!isEdit) {
                    form.resetFields();
                }
                // 跳转回管理页面
                setTimeout(() => {
                    history.push('/page/mcp-server-management');
                }, 1000);
            } else {
                throw new Error(result.msg || (isEdit ? '更新失败' : '注册失败'));
            }
        } catch (error: any) {
            message.error(error.message || (isEdit ? '更新失败，请重试' : '注册失败，请重试'));
        } finally {
            setLoading(false);
        }
    };

    const uploadProps = {
        beforeUpload: (file: any) => {
            const isValidType =
                file.type === 'application/zip' || file.type === 'application/x-tar';
            if (!isValidType) {
                message.error('只能上传 ZIP 或 TAR 格式的文件！');
                return false;
            }
            const isLt100M = file.size / 1024 / 1024 < 100;
            if (!isLt100M) {
                message.error('文件大小必须小于 100MB！');
                return false;
            }
            return false; // 阻止自动上传
        },
        maxCount: 1,
    };

    if (initialLoading) {
        return (
            <div className="mcp-server-registry-center">
                <Spin
                    size="large"
                    style={{ display: 'block', textAlign: 'center', padding: '100px 0' }}
                />
            </div>
        );
    }

    return (
        <div className="mcp-server-registry-center">
            <div className="header">
                <h2>{isEdit ? '编辑MCP服务器' : 'MCP-Server 注册中心'}</h2>
                <p>{isEdit ? '编辑您的MCP服务器配置' : '注册您的MCP服务器，让更多人发现和使用'}</p>
            </div>

            <Card className="registry-form-card">
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    initialValues={{
                        transport: 'stdio',
                        version: '1.0.0',
                    }}
                >
                    <Row gutter={24}>
                        <Col xs={24} lg={12}>
                            <Form.Item
                                label="名称"
                                name="serverId"
                                rules={[
                                    { required: true, message: '请输入名称' },
                                    {
                                        pattern: /^[a-z0-9-]+$/,
                                        message: '只能包含小写字母、数字和连字符',
                                    },
                                ]}
                                tooltip="用于标识的唯一名称，只能包含小写字母、数字和连字符"
                            >
                                <Input placeholder="例如: my-awesome-server" disabled={isEdit} />
                            </Form.Item>
                        </Col>

                        <Col xs={24} lg={12}>
                            <Form.Item
                                label="显示标题"
                                name="title"
                                rules={[{ required: true, message: '请输入显示标题' }]}
                            >
                                <Input placeholder="例如: 我的强大服务器" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={24}>
                        <Col xs={24} lg={8}>
                            <Form.Item label="创建者" name="author" initialValue={'dtstack'}>
                                <Input placeholder="请输入作者名称" />
                            </Form.Item>
                        </Col>

                        <Col xs={24} lg={8}>
                            <Form.Item
                                label="版本"
                                name="version"
                                rules={[
                                    { required: true, message: '请输入版本号' },
                                    { pattern: /^\d+\.\d+\.\d+$/, message: '版本号格式应为 x.y.z' },
                                ]}
                            >
                                <Input placeholder="1.0.0" />
                            </Form.Item>
                        </Col>

                        <Col xs={24} lg={8}>
                            <Form.Item
                                label="标签"
                                name="tags"
                                rules={[{ required: true, message: '请至少选择一个标签' }]}
                            >
                                <Select
                                    mode="tags"
                                    placeholder="选择或输入标签"
                                    tokenSeparators={[',']}
                                >
                                    <Option value="文件系统">文件系统</Option>
                                    <Option value="数据库">数据库</Option>
                                    <Option value="API">API</Option>
                                    <Option value="AI">AI</Option>
                                    <Option value="工具">工具</Option>
                                    <Option value="网络">网络</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={24}>
                        <Col xs={24} lg={12}>
                            <Form.Item label="Git源码地址" name="gitUrl">
                                <Input placeholder="https://github.com/username/repository" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider>协议配置</Divider>

                    <Row gutter={24}>
                        <Col xs={24} lg={12}>
                            <Form.Item
                                label="原始transport类型"
                                name="transport"
                                rules={[{ required: true, message: '请选择传输类型' }]}
                            >
                                <Radio.Group
                                    onChange={(e) => handleTransportChange(e.target.value)}
                                >
                                    <Space direction="vertical">
                                        <Radio value="stdio">
                                            <strong>STDIO</strong> - 通过标准输入输出进行通信
                                        </Radio>
                                        <Radio value="sse">
                                            <strong>SSE</strong> - 通过SSE协议
                                        </Radio>
                                        <Radio value="streamable-http">
                                            <strong>Streamable HTTP</strong> - 通过Streamable
                                            HTTP协议
                                        </Radio>
                                    </Space>
                                </Radio.Group>
                            </Form.Item>
                        </Col>
                        <Col xs={24} lg={12}>
                            <Form.Item
                                label="输出transport类型"
                                tooltip="根据原始transport类型自动转换的输出类型，用于实际通信"
                            >
                                <Input
                                    disabled
                                    value={getOutputTransportType(transport)}
                                    style={{
                                        fontWeight: 'bold',
                                        color: getOutputTransportColor(transport),
                                    }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    {transport === 'stdio' && (
                        <>
                            <Row>
                                <Form.Item noStyle dependencies={['serverId']}>
                                    {({ getFieldValue }) => {
                                        const name = getFieldValue('serverId');
                                        const deployPath = `${env.mcpDeployDir}${
                                            name ? name + '/' : ''
                                        }`;

                                        return (
                                            <Form.Item label="托管部署路径" tooltip="">
                                                <Input.Group compact>
                                                    <Input
                                                        style={{ width: 400 }}
                                                        disabled
                                                        value={deployPath}
                                                    />
                                                    <Tooltip title="复制路径">
                                                        <Button
                                                            icon={<CopyOutlined />}
                                                            onClick={() =>
                                                                copyToClipboard(
                                                                    deployPath,
                                                                    '复制成功'
                                                                )
                                                            }
                                                        >
                                                            复制
                                                        </Button>
                                                    </Tooltip>
                                                </Input.Group>
                                            </Form.Item>
                                        );
                                    }}
                                </Form.Item>
                            </Row>
                            <Row gutter={24}>
                                <Col xs={24} lg={12}>
                                    <Form.Item
                                        label="启动命令"
                                        name="command"
                                        rules={[{ required: true, message: '请输入启动命令' }]}
                                        tooltip="用于启动MCP服务器的命令"
                                    >
                                        <Input placeholder="例如: node, uv" />
                                    </Form.Item>
                                </Col>

                                <Col xs={24} lg={12}>
                                    <Form.Item
                                        label="命令参数"
                                        name="args"
                                        tooltip="启动命令的参数列表，每行一个参数"
                                    >
                                        <TextArea
                                            rows={3}
                                            placeholder="每行一个参数，例如:&#10;/opt/doraemon/mcp-server/my-awesome-server/dist/index.js&#10;--token&#10;your-token"
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item
                                label="环境变量"
                                tooltip="为MCP服务器设置环境变量，例如API密钥、配置参数等"
                            >
                                <Form.List name="env">
                                    {(fields, { add, remove }) => (
                                        <>
                                            {fields.map(({ key, name, ...restField }) => (
                                                <Row key={key} gutter={16} align="middle">
                                                    <Col xs={10}>
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'key']}
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message: '请输入环境变量名',
                                                                },
                                                                {
                                                                    pattern: /^[A-Z_][A-Z0-9_]*$/,
                                                                    message:
                                                                        '环境变量名只能包含大写字母、数字和下划线，且以字母或下划线开头',
                                                                },
                                                            ]}
                                                        >
                                                            <Input placeholder="变量名 (如: API_KEY)" />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col xs={12}>
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'value']}
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message: '请输入环境变量值',
                                                                },
                                                            ]}
                                                        >
                                                            <Input placeholder="变量值" />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col xs={2}>
                                                        <Button
                                                            type="text"
                                                            danger
                                                            icon={<DeleteOutlined />}
                                                            onClick={() => remove(name)}
                                                        />
                                                    </Col>
                                                </Row>
                                            ))}
                                            <Form.Item>
                                                <Button
                                                    type="dashed"
                                                    onClick={() => add()}
                                                    block
                                                    icon={<PlusOutlined />}
                                                >
                                                    添加环境变量
                                                </Button>
                                            </Form.Item>
                                        </>
                                    )}
                                </Form.List>
                            </Form.Item>
                        </>
                    )}

                    {transport === 'streamable-http' && (
                        <Form.Item
                            label="HTTP URL"
                            name="httpUrl"
                            rules={[
                                { required: true, message: '请输入HTTP URL' },
                                { type: 'url', message: '请输入有效的URL' },
                            ]}
                            tooltip="MCP服务器的HTTP访问地址, 哆啦A梦会进行透明的代理转发，最终通过统一的哆啦A梦端点访问到真实MCP服务器。如有需要可将目标服务器重写为STDIO类型或者手动部署在哆啦A梦服务器下以实现托管"
                        >
                            <Input placeholder="http://example.com/mcp" />
                        </Form.Item>
                    )}

                    {transport === 'sse' && (
                        <Form.Item
                            label="SSE URL"
                            name="sseUrl"
                            rules={[{ required: true, message: '请输入SSE URL' }]}
                        >
                            <Input placeholder="http://example.com/sse" />
                        </Form.Item>
                    )}

                    {transport === 'stdio' && (
                        <Form.Item
                            label="MCP服务器文件"
                            name="files"
                            tooltip="上传包含MCP服务器代码的压缩包, 如果是npx或者uvx类型命令，可以不用上传"
                            valuePropName="fileList"
                            getValueFromEvent={(e) => {
                                if (Array.isArray(e)) {
                                    return e;
                                }
                                return e && e.fileList;
                            }}
                        >
                            <Upload {...uploadProps}>
                                <Button icon={<UploadOutlined />}>上传文件 (ZIP/TAR)</Button>
                            </Upload>
                        </Form.Item>
                    )}

                    <Divider>配置预览</Divider>
                    <Form.Item
                        noStyle
                        dependencies={[
                            'serverId',
                            'transport',
                            'command',
                            'args',
                            'env',
                            'httpUrl',
                        ]}
                    >
                        {({ getFieldValue }) => {
                            const currentValues = {
                                name: getFieldValue('serverId'),
                                transport: getFieldValue('transport') || transport,
                                command: getFieldValue('command'),
                                args: getFieldValue('args'),
                                env: getFieldValue('env')?.filter(Boolean),
                                httpUrl: getFieldValue('httpUrl'),
                            };

                            const generateCurrentOriginalConfig = () => {
                                const { name, command, args, env, httpUrl } = currentValues;

                                if (currentValues.transport === 'stdio') {
                                    let envObj: Record<string, string> = {};

                                    // 添加环境变量
                                    if (env && env.length > 0) {
                                        env.forEach((item: { key: string; value: string }) => {
                                            if (item.key && item.value) {
                                                envObj[item.key] = item.value;
                                            }
                                        });
                                    }

                                    const config: any = {
                                        mcpServers: {
                                            [name || 'your-server-name']: {
                                                command: command || 'node',
                                                args: args
                                                    ? args.split('\n').filter(Boolean)
                                                    : ['path/to/your/server.js'],
                                                env:
                                                    Object.keys(envObj).length > 0
                                                        ? envObj
                                                        : undefined,
                                            },
                                        },
                                    };

                                    return JSON.stringify(config, null, 2);
                                } else if (currentValues.transport === 'streamable-http') {
                                    return JSON.stringify(
                                        {
                                            mcpServers: {
                                                [name || 'your-server-name']: {
                                                    url:
                                                        httpUrl || 'http://your-server-url.com/mcp',
                                                },
                                            },
                                        },
                                        null,
                                        2
                                    );
                                }

                                return '{}';
                            };

                            const generateCurrentHostedConfig = () => {
                                const { name } = currentValues;

                                return JSON.stringify(
                                    {
                                        mcpServers: {
                                            [name || 'your-server-name']: {
                                                url: `${location.host}/mcp-endpoint/${
                                                    name || 'your-server-name'
                                                }/mcp`,
                                            },
                                        },
                                    },
                                    null,
                                    2
                                );
                            };

                            return (
                                <Card className="config-preview-card" style={{ marginBottom: 24 }}>
                                    <Tabs defaultActiveKey="original">
                                        <Tabs.TabPane tab="原始MCP配置" key="original">
                                            <div>
                                                <div
                                                    style={{
                                                        marginBottom: 12,
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    <span style={{ color: '#666' }}>
                                                        基于当前表单配置生成的原始MCP配置文件
                                                    </span>
                                                    <Button
                                                        icon={<CopyOutlined />}
                                                        size="small"
                                                        onClick={() =>
                                                            copyToClipboard(
                                                                generateCurrentOriginalConfig(),
                                                                '原始MCP'
                                                            )
                                                        }
                                                    >
                                                        复制配置
                                                    </Button>
                                                </div>
                                                <Paragraph>
                                                    <pre
                                                        style={{
                                                            background: '#f6f8fa',
                                                            padding: '16px',
                                                            borderRadius: '6px',
                                                            overflow: 'auto',
                                                            margin: 0,
                                                            fontSize: '13px',
                                                            lineHeight: '1.45',
                                                        }}
                                                    >
                                                        {generateCurrentOriginalConfig()}
                                                    </pre>
                                                </Paragraph>
                                            </div>
                                        </Tabs.TabPane>
                                        <Tabs.TabPane tab="托管后MCP配置" key="hosted">
                                            <div>
                                                <div
                                                    style={{
                                                        marginBottom: 12,
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    <span style={{ color: '#666' }}>
                                                        注册到哆啦A梦后，用户使用的统一HTTP代理配置
                                                    </span>
                                                    <Button
                                                        icon={<CopyOutlined />}
                                                        size="small"
                                                        onClick={() =>
                                                            copyToClipboard(
                                                                generateCurrentHostedConfig(),
                                                                '托管后MCP'
                                                            )
                                                        }
                                                    >
                                                        复制配置
                                                    </Button>
                                                </div>
                                                <Paragraph>
                                                    <pre
                                                        style={{
                                                            background: '#f6f8fa',
                                                            padding: '16px',
                                                            borderRadius: '6px',
                                                            overflow: 'auto',
                                                            margin: 0,
                                                            fontSize: '13px',
                                                            lineHeight: '1.45',
                                                        }}
                                                    >
                                                        {generateCurrentHostedConfig()}
                                                    </pre>
                                                </Paragraph>
                                            </div>
                                        </Tabs.TabPane>
                                    </Tabs>
                                </Card>
                            );
                        }}
                    </Form.Item>

                    <Divider>文档描述</Divider>
                    <Form.Item
                        label="使用描述"
                        name="description"
                        rules={[{ required: true, message: '请输入使用描述' }]}
                        tooltip="详细描述MCP服务器的功能、用法和特性，支持Markdown格式"
                    >
                        <MarkdownEditor
                            height={300}
                            placeholder="请详细描述您的MCP服务器...

支持Markdown格式，例如：
## 功能特性
- 功能1
- 功能2

## 使用方法
```bash
npm install your-package
```

## API说明
详细的API使用说明..."
                        />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit" loading={loading} size="large">
                                提交MCP
                            </Button>
                            {!isEdit && (
                                <Button onClick={() => form.resetFields()} size="large">
                                    重置表单
                                </Button>
                            )}
                            <Button
                                onClick={() => history.push('/page/mcp-server-management')}
                                size="large"
                            >
                                返回管理页面
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default McpServerRegistryCenter;
