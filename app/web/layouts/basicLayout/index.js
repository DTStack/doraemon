import React,{useEffect} from 'react';
import {Layout,Row,Col} from 'antd';
import {Link} from 'react-router-dom';
import {useSelector} from 'react-redux';
import classnames from 'classnames';
import logo from '../../asset/images/logo.png';
import './style.scss';

const {Header, Content} = Layout;
const BasicLayout = (props)=>{
  const {className,children} = props;
  const {localIp} = useSelector((state)=>state.global);
  return (
    <Layout className="layout-basic">
      <Header style={{ padding: '0 10px',background:'#2E3943' }}>
        <Row>
          <Col span={12}>
            <Link to='/page/home'>
              <img className="logo" src={logo}/>
              <span className="system-title">哆啦A梦</span>
            </Link>
          </Col>
          <Col span={12} style={{textAlign:'right'}}><span className="local-ip">{`本机IP: ${localIp}`}</span></Col>
        </Row>
      </Header>
      <Content className={classnames('main-content',className)}>
        {children}
      </Content>
    </Layout>)
}
export default BasicLayout;