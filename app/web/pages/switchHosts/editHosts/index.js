import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Row, Col, Breadcrumb, Button, message } from 'antd';
import { Controlled as CodeMirror } from 'react-codemirror2';
import { API } from '@/api';
import HostsInfo from './hostsInfo';

const EditHosts = (props) => {
    const [saveLoading, setSaveLoading] = useState(false);
    const [hosts, setHosts] = useState();
    const [hostsInfo, setHostsInfo] = useState({});
    const infoRef = useRef(null);

    const { match } = props;
    const { id, type } = match.params;

    useEffect(() => {
        type !== 'add' && getHostsInfo();
    }, [id]);

    // 编辑条件下，获取hosts信息
    const getHostsInfo = () => {
        API.getHostsInfo({ id }).then(res => {
            const { success, data } = res;
            if (success) {
                setHostsInfo(data);
                setHosts(data.hosts || '');
            }
        })
    }

    // 保存
    const handleHostsSave = () => {
        infoRef.current.validateFields((err, values) => {
            if (!err) {
                const params = {
                    ...values,
                    hosts
                }
                type === 'add'
                    ? createHosts(params)
                    : updateHosts(Object.assign(params, { id }))
            }
        })
    }

    // 创建群组
    const createHosts = (params) => {
        setSaveLoading(true);
        API.createHosts(params)
            .then((res) => {
                setSaveLoading(false);
                const { success } = res;
                if (success) {
                    message.success('保存成功')
                }
            })
    }

    // 更新群组
    const updateHosts = (params) => {
        setSaveLoading(true);
        API.updateHosts(params)
            .then(res => {
                setSaveLoading(false);
                const { success } = res;
                if (success) {
                    message.success('更新成功')
                }
            })
    }

    // 推送
    const handleHostsPush = () => {

    }

    return (
        <div>
            <Card
                bodyStyle={{ padding: '0 0 0 10px' }}>
                <Row>
                    <Col span={18}>
                        <Breadcrumb style={{ height: '47px', lineHeight: '47px' }}>
                            <Breadcrumb.Item><Link to="/page/switch-hosts-list">hosts管理</Link></Breadcrumb.Item>
                            <Breadcrumb.Item>{type === 'add' ? '创建' : '编辑'}hosts</Breadcrumb.Item>
                        </Breadcrumb>
                    </Col>
                    <Col span={6} style={{ textAlign: 'right' }}>
                        {/* <Button type="primary" icon="check" onClick={handleHostsPush}>保存并推送</Button> */}
                        <Button type="primary" loading={saveLoading} icon="check" onClick={handleHostsSave}>保存</Button>
                    </Col>
                </Row>
            </Card>
            <Row gutter={16} style={{ margin: '20px 0' }}>
                <Col span={16}>
                    <CodeMirror
                        value={hosts}
                        options={{
                            mode: 'nginx',
                            tabSize: 2,
                            theme: 'dracula',
                            lineNumbers: true
                        }}
                        onBeforeChange={(editor, data, value) => {
                            setHosts(value)
                        }}
                        editorDidMount={(editor, data, value) => { editor.setSize('auto', '460px') }}
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
                </Col>
            </Row>
        </div>
    )
}

export default EditHosts;