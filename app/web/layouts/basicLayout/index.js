import React from 'react';
import {Layout,Row,Col} from 'antd';
import {Link} from 'react-router-dom';
import classnames from 'classnames';
import {getIPs} from '@/utils';
import './style.scss';
const {Header, Content} = Layout;
export default class BasicLayout extends React.PureComponent{
  state = {
    clientIp:''
  }
  componentDidMount(){
    getIPs().then((ip)=>{
      this.setState({
        clientIp:ip
      })
    });
  }
  render(){
    const {clientIp} = this.state;
    const {className} = this.props;
    return (
      <Layout className="layout-basic">
        <Header style={{ padding: '0 10px' }}>
          <Row>
            <Col span={12}>
              <Link to='/page/home'>
                <span className="system-title">哆啦A梦</span>
              </Link>
            </Col>
            <Col span={12} style={{textAlign:'right'}}><span className="clientip">{clientIp}</span></Col>
          </Row>
        </Header>
        <Content className={classnames("main-content",className)}>
          {this.props.children}
        </Content>
      </Layout>)
  }
}