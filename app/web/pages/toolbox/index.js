import React,{useState,useEffect} from 'react';
import {message as Message,Row,Col, Icon,Tooltip} from 'antd';
import Loading from '@/components/loading';
import {API} from '@/api';
import {colorList} from '@/constant';
import {urlReg} from '@/utils/reg';
import './style.scss';
const Toolbox = ()=>{
  const initApp = [{name:'签名制作',desc:'袋鼠云邮箱签名制作',url:'/page/mail-sign'}];
  const [toolList,setToolList] = useState([]);
  const [loading,setLoading] = useState(true);
  const loadMainData=()=>{
    setLoading(true);
    API.getConfigJsonInGithub({
      name:'tool-box-list.json'
    }).then((response)=>{
      setLoading(false);
      const {success,data,message}  = response;
      if(success){
        setToolList(data);
      }else{
        Message.error(message);
      }

    });
  }
  useEffect(()=>{
    loadMainData();
  },[]);
  const renderCard = (list) => list.map((tool,index)=>{
    const {name,url,desc,remark} = tool;
    return (<Col className="navigation-item-wrapper" key={name} span={6}>
      <a href={url} target={urlReg.test(url) ? '_blank':'_self' } className="navigation-item" style={{background:colorList[index%colorList.length]}}>
        {remark&&<Tooltip title={remark}>
          <Icon className="icon" type="question-circle"/>
        </Tooltip>}
        <div className="title">{name}</div>
        <div className="desc">{desc}</div>
      </a>
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
