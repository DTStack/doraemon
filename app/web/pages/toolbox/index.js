import React, { useState, useEffect, Fragment } from 'react';
import { Row, Col, Icon, Tooltip } from 'antd';
import Loading from '@/components/loading';
import { API } from '@/api';
import { colorList } from '@/constant';
import { urlReg } from '@/utils/reg';
import { Link } from 'react-router-dom';
import './style.scss';
const Toolbox = () => {
  const initApp = [{ name: '签名制作', desc: '袋鼠云邮箱签名制作', url: '/page/mail-sign' }];
  const [toolList, setToolList] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadMainData = () => {
    setLoading(true);
    API.getConfigJsonInGithub({
      name: 'tool-box-list.json'
    }).then((response) => {
      setLoading(false);
      const { success, data } = response;
      if (success) {
        setToolList(data);
      }
    });
  }
  useEffect(() => {
    loadMainData();
  }, []);
  const renderCard = (list) => list.map((tool, index) => {
    const { name, url, desc, remark } = tool;
    const componentContent = <Fragment>
      {remark && <Tooltip title={remark}>
        <Icon className="icon" type="question-circle" />
      </Tooltip>}
      <div className="title">{name}</div>
      <div className="desc">{desc}</div>
    </Fragment>
    return (<Col className="navigation-item-wrapper" key={name} span={6}>
      {
        urlReg.test(url) ? (
          <a href={url} target='_blank' className="navigation-item" style={{ background: colorList[index % colorList.length] }}>
            {
              componentContent
            }
          </a>
        ) : (<Link to={url} className="navigation-item" style={{ background: colorList[index % colorList.length] }}>
          {
            componentContent
          }
        </Link>)
      }
    </Col>)
  })
  return (<Loading loading={loading}>
    <div className="page-toolbox">
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
