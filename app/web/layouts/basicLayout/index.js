import React,{useEffect} from 'react';
import {Layout,Row,Col} from 'antd';
import {Link} from 'react-router-dom';
import {bindActionCreators} from 'redux';
import {useSelector,useDispatch} from 'react-redux';
import classnames from 'classnames';
import * as actions from '../../store/actions';
import './style.scss';

const {Header, Content} = Layout;
const BasicLayout = (props)=>{
  const {className,children} = props;
  const {localIp} = useSelector((state)=>state.global);
  const {changeLocalIp} = bindActionCreators(actions,useDispatch());
  useEffect(() => {
    changeLocalIp();
  }, [])
  return (
    <Layout className="layout-basic">
      <Header style={{ padding: '0 10px' }}>
        <Row>
          <Col span={12}>
            <Link to='/page/home'>
              <span className="system-title">哆啦A梦</span>
            </Link>
          </Col>
          <Col span={12} style={{textAlign:'right'}}><span className="local-ip">{localIp}</span></Col>
        </Row>
      </Header>
      <Content className={classnames("main-content",className)}>
        {children}
      </Content>
    </Layout>)
}
export default BasicLayout;