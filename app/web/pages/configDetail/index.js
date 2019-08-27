import React,{useState,useRef,useEffect,useCallback} from 'react';
import {Button,Row,Col,Card,Icon,Breadcrumb,Tooltip,message as Message,Typography} from 'antd';
import {isEmpty,replace} from 'lodash';
import {Controlled as CodeMirror} from 'react-codemirror2';
import Loading from '@/components/loading';
import {API} from '@/api';
import './style.scss';
const { Title,Paragraph } = Typography;

const ConfigDetail = (props)=>{
  const {match} = props;
  const {params} = match;
  const {id} = params;
  const codeEditorRef = useRef(null);
  const shellEditorRef = useRef(null);;
  const [config,setConfig] = useState();
  const [basicInfo,setBasicInfo] = useState({});
  const [loading,setLoading] = useState(true);
  const [updating,setUpdating] = useState(false);
  const [errorMessage,setErrorMessage] = useState('');
  const [shell,setShell] = useState('#!/bin/bash\n');
  const {filename,filePath,hostIp,hostName,username,password,remark} = basicInfo;
  const loadBasicInfoData = useCallback(()=>{
    return API.getConfigDetail({
      id
    }).then((response)=>{
      const {success,data,message} = response;
      if(success){
        setBasicInfo(data);
        setShell(isEmpty(data.updateShell)?'#!/bin/bash\n':data.updateShell);
      }else{
        Message.error(message);
      }
    })
  },[id]);
  const loadRemoteConfigInfo = useCallback(()=>{
    return API.getRemoteConfig({
      id
    }).then((response)=>{
      const {success,data,message} = response;
      if(success){
        setConfig(data);
      }else{
        Message.error(message);
      }
    })
  },[id]);
  const handleConfigSave = ()=>{
    setUpdating(true);
    API.saveConfig({
      id,
      config,
      shell
    }).then((response)=>{
      setUpdating(false);
      const {success,data,message} = response;
      if(success){
        Message.success('配置保存成功');
        setErrorMessage('');
        loadBasicInfoData();
        loadRemoteConfigInfo();
      }else{
        setErrorMessage(message);
        Message.error(message);
      }
    })
  }
  useEffect(()=>{
    Promise.all([loadBasicInfoData(),loadRemoteConfigInfo()]).then(()=>{
      setLoading(false);
    });
  },[])
  return <div className="page-config-detail">
    <Loading loading={loading}>
      <Card
        bodyStyle={{padding:'0 0 0 10px'}}>
          <Row>
            <Col span={18}>
              <Breadcrumb style={{height:'47px',lineHeight:'47px'}}>
                <Breadcrumb.Item><a href="/page/config-center">配置中心</a></Breadcrumb.Item>
                <Breadcrumb.Item>配置详情</Breadcrumb.Item>
              </Breadcrumb>
            </Col>
            <Col span={6} style={{textAlign:'right'}}>
              <Button type="primary" loading={updating} icon="check" onClick={handleConfigSave}>保存</Button>
            </Col>
          </Row>
      </Card>
      <div className="page-content">
        <Row  gutter={16}>
          <Col span={16}>
            <CodeMirror
              ref={codeEditorRef}
              value={config}
              options={{
                mode:'nginx',
                tabSize:2,
                theme: 'dracula',
                lineNumbers: true
              }}
              onBeforeChange={(editor, data, value) => {
                setConfig(value)
              }}
              editorDidMount={(editor, data, value) => {editor.setSize('auto','460px')}}
            />
            <Title style={{marginTop:20}} level={4}>文件更新之后执行 <Tooltip title="文件更新之后执行下面脚本" placement="right"><Icon type="question-circle" /></Tooltip></Title>
            <CodeMirror
              ref={shellEditorRef}
              value={shell}
              options={{
                tabSize:2,
                theme: 'dracula',
                lineNumbers: true,
                height:500
              }}
              onBeforeChange={(editor, data, value) => {
                console.log(value);
                setShell(value)
              }}
              onChange={(editor, data, value) => {}}/>
          </Col>
          <Col span={8}>
            <Card title="信息简介">
              <Row gutter={8}  className="info-item">
                  <Col span={6} className="label">文件名：</Col>
                  <Col span={18}>{filename}</Col>
              </Row>
              <Row gutter={8} className="info-item">
                  <Col span={6} className="label">文件路径：</Col>
                  <Col span={18}>{filePath}</Col>
              </Row>
              <Row gutter={8} className="info-item">
                  <Col span={6} className="label">主机IP：</Col>
                  <Col span={18}>{hostIp}</Col>
              </Row>
              <Row gutter={8} className="info-item">
                  <Col span={6} className="label">主机名：</Col>
                  <Col span={18}>{hostName}</Col>
              </Row>
              <Row gutter={8} className="info-item">
                  <Col span={6} className="label">SSH连接：</Col>
                  <Col span={18}><Paragraph style={{marginBottom:0}} copyable>{`ssh ${username}@${hostIp}`}</Paragraph></Col>
              </Row>
              <Row gutter={8} className="info-item">
                  <Col span={6} className="label">密码：</Col>
                  <Col span={18}><Paragraph style={{marginBottom:0}} copyable={{text:password}}>{replace(password,/./g,'*')}</Paragraph></Col>
              </Row>
              <Row gutter={8} className="info-item">
                  <Col span={6} className="label">备注：</Col>
                  <Col span={18}>{remark}</Col>
              </Row>
            </Card>
            {!isEmpty(errorMessage)&&<Card title="错误信息" style={{marginTop:20}}>
              <div style={{color:'red'}}>{errorMessage}</div>
            </Card>}
          </Col>
        </Row>
      </div>
    </Loading>
  </div>
}
export default ConfigDetail;