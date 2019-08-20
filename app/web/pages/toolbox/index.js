import React,{useState,useEffect} from 'react';
import {message as Message,Row,Col, Icon,Tooltip} from 'antd';
import Loading from '@/components/loading';
import {API} from '@/api';
import {colorList} from '@/constant';
import './style.scss';
const Toolbox = ()=>{
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
  return (<Loading loading={loading}>
    <div className="page-toolbox">
      <Row className="tool-list" gutter={10}>
        {
          toolList.map((tool,index)=>{
            const {name,url,desc,remark} = tool;
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
    </div>
  </Loading>)
}
export default Toolbox;
