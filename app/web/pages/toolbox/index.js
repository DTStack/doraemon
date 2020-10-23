import React, { useState, useEffect, Fragment } from 'react';
import { Row, Col, Icon, Button } from 'antd';
import Loading from '@/components/loading';
import { API } from '@/api';
import { colorList } from '@/constant';
import { urlReg } from '@/utils/reg';
import { Link } from 'react-router-dom';
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
  const [loading, setLoading] = useState(true);
  const [visbile, setVisbile] = useState(false);
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
  useEffect(() => {
    loadMainData();
  }, []);
  const onHandleAddApp = () => {
    setVisbile(true)
  }
  const renderCard = (list) => list.map((tool, index) => {
    const { id, appName, appUrl, appDesc } = tool;
    const componentContent = <Fragment>
      <div className="title">{appName}</div>
      <div className="desc">{appDesc}</div>
    </Fragment>
    return (<Col className="navigation-item-wrapper" key={id || appName} span={6}>
      {
        urlReg.test(appUrl) ? (
          <a href={appUrl} target='_blank' className="navigation-item" style={{ background: colorList[index % colorList.length] }}>
            {
              componentContent
            }
          </a>
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
          renderCard(initApp)
        }
        {
          renderCard(toolList)
        }
      </Row>
    </div>
  </Loading>)
}
export default Toolbox;
