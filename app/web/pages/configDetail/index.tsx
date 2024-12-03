import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CheckOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import {
    Button,
    Row,
    Col,
    Card,
    Breadcrumb,
    Tooltip,
    message as Message,
    Typography, 
    Popconfirm
} from 'antd';
import { Link } from 'react-router-dom';
import { isEmpty, replace } from 'lodash';
import { Controlled as CodeMirror } from 'react-codemirror2';
import Loading from '@/components/loading';
import DTDingConfig from '@/components/dtDingconfig'
import { API } from '@/api';
import './style.scss';

const { Title, Paragraph } = Typography;

const ConfigDetail = (props: any) => {
    const { match } = props;
    const { params } = match;
    const { id } = params;
    const codeEditorRef: any = useRef(null);
    const shellEditorRef = useRef(null);;
    const [config, setConfig] = useState();
    const [basicInfo, setBasicInfo] = useState({});
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [shell, setShell] = useState('#!/bin/bash\n');
    const { filename, filePath, hostIp, hostName, username, password, remark }: any = basicInfo;
    const loadBasicInfoData = useCallback(() => {
        return API.getConfigDetail({
            id
        }).then((response: any) => {
            const { success, data, message } = response;
            if (success) {
                setBasicInfo(data);
                setShell(isEmpty(data.updateShell) ? '#!/bin/bash\n' : data.updateShell);
            }
        })
    }, [id]);  
    const loadRemoteConfigInfo = useCallback(() => {
        return API.getRemoteConfig({
            id
        }).then((response: any) => {
            const { success, data } = response;
            if (success) {
                setConfig(data);
            }
        })
    }, [id]);   
    const handleConfigSave = () => {
        setUpdating(true);
        API.saveConfig({
            id,
            config,
            shell,
            basicInfo
        }).then((response: any) => {
            setUpdating(false);
            const { success, data, message } = response;
            if (success) {
                Message.success('配置保存成功');
                setErrorMessage('');
                loadBasicInfoData();
                loadRemoteConfigInfo();
            } else {
                setErrorMessage(message);
            }
        })
    }
    const onGutterClick = (cm: any, n: any, gutter: any, event: any) => {
        let info = cm.lineInfo(n)
        let ln = info.text
        if (/^\s*$/.test(ln)) return

        let new_ln: any
        if (/^#/.test(ln)) {
            new_ln = ln.replace(/^#\s*/, '')
        } else {
            new_ln = '# ' + ln
        }
        codeEditorRef.current.editor.getDoc()
            .replaceRange(new_ln, { line: info.line, ch: 0 }, {
                line: info.line,
                ch: ln.length
            })
    }
    useEffect(() => {
        try {
            require('codemirror/mode/nginx/nginx');
            require('codemirror/mode/shell/shell');
            require('codemirror/theme/material-darker.css');
        } catch (err) {
            console.log(err)
        }
        Promise.all([loadBasicInfoData(),loadRemoteConfigInfo()]).then(()=>{
            setLoading(false);
        });

    }, [])
    return (
        <div className="page-config-detail">
            <Loading loading={loading}>
                <Row className="mb-12">
                    <Col span={18}>
                        <Breadcrumb>
                            <Breadcrumb.Item><Link to="/page/config-center">配置中心</Link></Breadcrumb.Item>
                            <Breadcrumb.Item>配置详情</Breadcrumb.Item>
                        </Breadcrumb>
                    </Col>
                    <Col span={6} style={{ textAlign: 'right' }}>
                        <Button type="primary" loading={updating} icon={<CheckOutlined />} onClick={handleConfigSave}>应用</Button>
                    </Col>
                </Row>
                <div className="page-content">
                    <Row gutter={16}>
                        <Col span={18}>
                            <CodeMirror
                                ref={codeEditorRef}
                                value={config}
                                options={{
                                    mode: 'nginx',
                                    tabSize: 2,
                                    theme: 'dracula',
                                    lineNumbers: true
                                }}
                                onGutterClick={onGutterClick}
                                onBeforeChange={(editor: any, data: any, value: any) => {
                                    setConfig(value)
                                }}
                                editorDidMount={(editor: any, data: any, value: any) => { editor.setSize('auto', '460px') }}
                            />
                            <Title style={{ marginTop: 20 }} level={4}>Execute shell <Tooltip title="文件更新之后执行下面脚本" placement="right"><QuestionCircleOutlined /></Tooltip></Title>
                            <CodeMirror
                                ref={shellEditorRef}
                                value={shell}
                                options={{
                                    mode: 'shell',
                                    tabSize: 2,
                                    theme: 'dracula',
                                    lineNumbers: true,
                                    height: 300
                                }}
                                onBeforeChange={(editor: any, data: any, value: any) => {
                                    console.log(value);
                                    setShell(value)
                                }}
                                onChange={(editor: any, data: any, value: any) => { }} />
                        </Col>
                        <Col span={6}>
                            <Card title="信息简介" className="card-form">
                                <Row gutter={8} className="info-item">
                                    <Col span={6} className="label">文件名：</Col>
                                    <Col span={18}>{filename}</Col>
                                </Row>
                                <Row gutter={8} className="info-item">
                                    <Col span={6} className="label">文件路径：</Col>
                                    <Col span={18}>{filePath}</Col>
                                </Row>
                                <Row gutter={8} className="info-item">
                                    <Col span={6} className="label">主机IP：</Col>
                                    <Col span={18}>{hostIp}</Col>
                                </Row>
                                <Row gutter={8} className="info-item">
                                    <Col span={6} className="label">主机名：</Col>
                                    <Col span={18}>{hostName}</Col>
                                </Row>
                                <Row gutter={8} className="info-item">
                                    <Col span={6} className="label">SSH连接：</Col>
                                    <Col span={18}><Paragraph style={{ marginBottom: 0 }} copyable>{`ssh ${username}@${hostIp}`}</Paragraph></Col>
                                </Row>
                                <Row gutter={8} className="info-item">
                                    <Col span={6} className="label">密码：</Col>
                                    <Col span={18}><Paragraph style={{ marginBottom: 0 }} copyable={{ text: password }}>{replace(password, /./g, '*')}</Paragraph></Col>
                                </Row>
                                <Row gutter={8} className="info-item">
                                    <Col span={6} className="label">备注：</Col>
                                    <Col span={18}>{remark}</Col>
                                </Row>
                            </Card>
                            {!isEmpty(errorMessage) && <Card title="错误信息" style={{ marginTop: 20 }}>
                                <div style={{ color: 'red' }}>{errorMessage}</div>
                            </Card>}
                            <DTDingConfig 
                                id={id}
                                type='config-center'
                                />
                        </Col>
                    </Row>
                </div>
            </Loading>
        </div>
    );
}
export default ConfigDetail;
