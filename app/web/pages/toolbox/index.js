import React, { useState, useEffect, Fragment } from 'react';
import { Row, Col, Icon, Button } from 'antd';
import Loading from '@/components/loading';
import { API } from '@/api';
import { colorList } from '@/constant';
import { urlReg } from '@/utils/reg';
import { Link } from 'react-router-dom';
import CreateApp from './components/CreateApp'
import './style.scss';
const Toolbox = () => {
  const initApp = [
    {
      appName: 'Switch Hosts',
      appDesc: '袋鼠云内部团队host集中管理系统',
      appUrl: '/page/mail-sign'
    },
    {
      appName: '签名制作',
      appDesc: '袋鼠云邮箱签名制作',
      appUrl: '/page/mail-sign'
    }
  ];
  const [toolList, setToolList] = useState([]);
  const [appInfo, setAppInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [visible, setVisbile] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const loadMainData = () => {
    setLoading(true);
    API.getAppCentersList({}).then((response) => {
      setLoading(false);
      const { success, data } = response;
      if (success) {
        setToolList(data.data);
      }
    });
  }
  const addApplication = (params) => {
    const { appName, appUrl, appDesc, id } = params
    setConfirmLoading(true)
    API.addApplication({
      appName,
      appUrl,
      appDesc,
      id
    }).then((response) => {
      const { success } = response
      if (success) {
        setConfirmLoading(false)
        onHandleAddApp()
        setAppInfo({})
        loadMainData()
      }
    });
  }
  useEffect(() => {
    loadMainData();
  }, []);
  const onHandleAddApp = () => {
    setVisbile(!visible)
    setAppInfo({})
  }
  const onHandleEditApp = (id) => {
    setVisbile(!visible)
    API.getApplicationById({ id }).then((response) => {
      const { success, data } = response
      if (success) {
        setAppInfo(data)
      }
    });
  }
  const renderCard = (list, edit) => list.map((tool, index) => {
    const { id, appName, appUrl, appDesc } = tool;
    const componentContent = <Fragment>
      <div className="title">
        <a href={appUrl} target='_blank' >{appName}</a>
        {edit && <Icon
          type="form"
          onClick={() => { onHandleAddApp(); onHandleEditApp(id); }}
          style={{ marginLeft: 10 }}
        />}
      </div>
      <div className="desc">{appDesc}</div>
    </Fragment>
    return (<Col className="navigation-item-wrapper" key={id || appName} span={6}>
      {
        urlReg.test(appUrl) ? (
          <div className="navigation-item" style={{ background: colorList[index % colorList.length] }}>
            {
              componentContent
            }
          </div>
        ) : (<Link to={appUrl} className="navigation-item" style={{ background: colorList[index % colorList.length] }}>
          {
            componentContent
          }
        </Link>)
      }
    </Col>)
  })
  return (<Loading loading={loading}>
    <div className="page-toolbox">
      <div className="toolbox-header">
          <div>应用中心</div>
          <Button onClick={onHandleAddApp}>添加应用</Button>
      </div>
      <Row className="tool-list" gutter={10}>
        {
          renderCard(initApp, false)
        }
        {
          renderCard(toolList, true)
        }
      </Row>
      <CreateApp
        key={visible}
        visible={visible}
        appInfo={appInfo}
        confirmLoading={confirmLoading}
        onOk={addApplication}
        onCancel={onHandleAddApp} />
    </div>
  </Loading>)
}
export default Toolbox;
