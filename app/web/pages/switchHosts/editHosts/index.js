import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Row, Col, Breadcrumb, Button, message } from 'antd';
import { Controlled as CodeMirror } from 'react-codemirror2';
import { API } from '@/api';
import Loading from '@/components/loading';
import HostsInfo from './hostsInfo';

const EditHosts = (props) => {
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [pushSaveLoading, setPushSaveLoading] = useState(false);
  const [hosts, setHosts] = useState();
  const [hostsInfo, setHostsInfo] = useState({});
  const infoRef = useRef(null);

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

  // 编辑条件下，获取hosts信息
  const getHostsInfo = () => {
    API.getHostsInfo({ id }).then(res => {
      const { success, data } = res;
      if (success) {
        setHostsInfo(data);
        setHosts(data.hosts || '');
        setLoading(false)
      }
    })
  }

  // 保存
  const handleHostsSave = ({ is_push }) => {
    infoRef.current.validateFields((err, values) => {
      if (!err) {
        const params = {
          ...values,
          hosts,
          is_push: isCreate ? is_push : (hostsInfo.is_push || is_push)
        }
        const setLoadingAction = is_push ? setPushSaveLoading : setSaveLoading;
        isCreate
          ? createHosts(params, setLoadingAction)
          : updateHosts(Object.assign(params, { id }), setLoadingAction)
      }
    })
  }

  // 创建群组
  const createHosts = (params, setLoadingAction) => {
    setLoadingAction(true);
    API.createHosts(params)
      .then((res) => {
        setLoadingAction(false);
        const { success } = res;
        if (success) {
          message.success('保存成功')
        }
      })
  }

  // 更新群组
  const updateHosts = (params, setLoadingAction) => {
    setLoadingAction(true);
    API.updateHosts(params)
      .then(res => {
        setLoadingAction(false);
        const { success } = res;
        if (success) {
          message.success('更新成功')
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
            icon="check"
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
    </Loading>
  )
}

export default EditHosts;