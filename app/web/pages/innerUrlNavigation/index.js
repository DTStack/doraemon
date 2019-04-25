import React from 'react';
import {Tabs,message as Message,Row,Col, Icon,Tooltip} from 'antd';
import Loading from '@/components/loading';
import {API} from '@/api';
import {colorList} from '@/constant';
import './style.scss';

const TabPane = Tabs.TabPane;
export default class InnerUrlNavigation extends React.PureComponent {
  state={
    navigationData:[],
    activePaneKey:'0',
    loading:true
  }
  loadMainData(){
    this.setState({
      loading:true
    });
    API.getConfigJsonInGithub({
      name:'internal-url-navigation.json'
    }).then((response)=>{
      const {success,data,message}  = response;
      if(success){
        this.setState({
          navigationData:data
        });
      }else{
        Message.error(message);
      }
      this.setState({
        loading:false
      });
    });
  }
  handleTabChange=(key)=>{
    this.setState({
      activePaneKey:key
    });
  }
  componentDidMount(){
    this.loadMainData();
  }
  render() {
    const {navigationData,activePaneKey,loading} = this.state;
    return (<Loading loading={loading}> 
        <div className="page-internal-url-navigation">
          <Tabs activeKey={activePaneKey} onChange={this.handleTabChange}>
            {
              navigationData.map((group,index)=>{
                const {groupName,children} = group;
                return <TabPane className="tab-pane" tab={groupName} key={index}>
                  <Row gutter={10}>
                    {
                      children.map((child,index)=>{
                        const {name,url,desc,remark} = child;
                        return (<Col className="navigation-item-wrapper" key={name} span={6}>
                          <a href={url} target="_blank" className="navigation-item" style={{background:colorList[index%colorList.length]}}>
                            {remark&&<Tooltip title={remark}>
                              <Icon className="icon" type="question-circle"/>
                            </Tooltip>}
                            <div className="title">{name}</div>
                            <div className="desc">{desc}</div>
                          </a>
                        </Col>)
                      })
                    }
                  </Row>
                </TabPane>
              })
            }
          </Tabs>
        </div>
      </Loading>)
  }
}
