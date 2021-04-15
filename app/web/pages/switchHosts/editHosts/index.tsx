import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckOutlined } from '@ant-design/icons';
import { Card, Row, Col, Breadcrumb, Button, message } from 'antd';
import { Controlled as CodeMirror } from 'react-codemirror2';
import { API } from '@/api';
import Loading from '@/components/loading';
import DTDingConfig from '@/components/dtDingconfig' 
import HostsInfo from './hostsInfo';

const EditHosts = (props: any) => {
    const [loading, setLoading] = useState(true);
    const [saveLoading, setSaveLoading] = useState(false);
    const [pushSaveLoading, setPushSaveLoading] = useState(false);
    const [hosts, setHosts] = useState();
    const [hostsInfo, setHostsInfo]: any = useState({});
    const infoRef: any = useRef(null);

    const { match } = props;
    const { id, type } = match.params;
    const isCreate = type === 'add';

    useEffect(() => {
        if (isCreate) {
            setLoading(false);
        } else {
            getHostsInfo();
        }
    }, [id]);
    useEffect(() => {
        try {
            require('codemirror/mode/nginx/nginx');
            require('codemirror/mode/shell/shell');
            require('codemirror/theme/material-darker.css');
        } catch (err) {
            console.log(err)
        }
    }, [])
    // 编辑条件下，获取hosts信息
    const getHostsInfo = () => {
        API.getHostsInfo({ id }).then((res: any) => {
            const { success, data } = res;
            if (success) {
                setHostsInfo(data);
                setHosts(data.hosts || '');
                setLoading(false)
            }
        })
    }

    // 保存
    const handleHostsSave = ({ is_push }: any) => {
        infoRef.current.validateFields().then((values: any) => {
            const params: any = {
                ...values,
                hosts,
                is_push: isCreate ? is_push : (hostsInfo.is_push || is_push)
            }
            const setLoadingAction = is_push ? setPushSaveLoading : setSaveLoading;
            isCreate
                ? createHosts(params, setLoadingAction)
                : updateHosts(Object.assign(params, { id }), setLoadingAction)
        })
    }

    // 创建分组
    const createHosts = (params: any, setLoadingAction: any) => {
        setLoadingAction(true);
        API.createHosts(params)
            .then((res: any) => {
                setLoadingAction(false);
                const { success } = res;
                if (success) {
                    message.success('保存成功');
                    props.history.push('/page/switch-hosts-list');
                }
            })
    }

    // 更新分组
    const updateHosts = (params: any, setLoadingAction: any) => {
        setLoadingAction(true);
        API.updateHosts(params)
            .then((res: any) => {
                setLoadingAction(false);
                const { success } = res;
                if (success) {
                    message.success('更新成功');
                    props.history.push('/page/switch-hosts-list');
                }
            })
    }

    return (
        <Loading loading={loading}>
            <Row className="mb-12">
                <Col span={18}>
                    <Breadcrumb>
                        <Breadcrumb.Item><Link to="/page/switch-hosts-list">hosts管理</Link></Breadcrumb.Item>
                        <Breadcrumb.Item>{isCreate ? '创建' : '编辑'}hosts</Breadcrumb.Item>
                    </Breadcrumb>
                </Col>
                <Col span={6} style={{ textAlign: 'right' }}>
                    {/* {!(!isCreate && hostsInfo.is_push) && (
              <Button
                type="primary"
                icon="check"
                loading={pushSaveLoading}
                onClick={() => handleHostsSave({ is_push: 1 })}
              >保存并推送</Button>
            )} */}
                    <Button
                        type="primary"
                        loading={saveLoading}
                        icon={<CheckOutlined />}
                        onClick={() => handleHostsSave({ is_push: 0 })}
                    >保存</Button>
                </Col>
            </Row>
            <div style={{ flex: 1 }}>
                <Row gutter={16}>
                    <Col span={16}>
                        <CodeMirror
                            value={hosts}
                            options={{
                                mode: 'nginx',
                                tabSize: 2,
                                theme: 'dracula',
                                lineNumbers: true
                            }}
                            onBeforeChange={(editor: any, data: any, value: any) => {
                                setHosts(value)
                            }}
                            editorDidMount={(editor: any, data: any, value: any) => { editor.setSize('auto', '460px') }}
                        />
                    </Col>
                    <Col span={8}>
                        <Card title="信息" className="card-form">
                            <HostsInfo
                                ref={infoRef}
                                isEdit={type === 'edit'}
                                hostsInfo={hostsInfo}
                            />
                        </Card>
                        {!isCreate&&
                            <DTDingConfig 
                                id={id}
                                type='switch-hosts'
                            />
                        }
                    </Col>
                </Row>
            </div>
        </Loading>
    );
}

export default EditHosts;