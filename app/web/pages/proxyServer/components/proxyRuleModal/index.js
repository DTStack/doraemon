import React from 'react';
import {Modal,Form,Input} from 'antd';
import PropsTypes from 'prop-types'; 

class ProxyRuleModal extends React.PureComponent{
  static defaultProps = {
    visible:false,
    onOk:()=>{},
    onCancel:()=>{},
    proxyServer:{},
    confirmLoading:false
  }
  static propsTypes ={
    visible:PropsTypes.bool,
    onOk:PropsTypes.func,
    onCancel:PropsTypes.func,
    proxyServer:PropsTypes.object,
    confirmLoading:PropsTypes.bool
  }
  state={
    initIp:''
  }
  getUserIP = (onNewIP) => { 
    //compatibility for firefox and chrome
    var myPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
    var pc = new myPeerConnection({
       iceServers: []
   }),
   noop = function() {},
   localIPs = {},
   ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/g,
   key;
   function iterateIP(ip) {
       if (!localIPs[ip]) onNewIP(ip);
       localIPs[ip] = true;
  }
    //create a bogus data channel
   pc.createDataChannel("");

   // create offer and set local description
   pc.createOffer().then(function(sdp) {
       sdp.sdp.split('\n').forEach(function(line) {
           if (line.indexOf('candidate') < 0) return;
           line.match(ipRegex).forEach(iterateIP);
       });
       pc.setLocalDescription(sdp, noop, noop);
   }).catch(function(reason) {
       // An error occurred, so handle the failure to connect
   });
   pc.onicecandidate = function(ice) {
       if (!ice || !ice.candidate || !ice.candidate.candidate || !ice.candidate.candidate.match(ipRegex)) return;
       ice.candidate.candidate.match(ipRegex).forEach(iterateIP);
   };
  }
  componentDidMount(){
    this.getUserIP((ip)=>{
      this.setState({
        initIp:ip
      })
    });
  }
  handleModalOk=()=>{
    const {onOk,form,editable,proxyServer} = this.props;
    form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        if(editable){
          onOk(Object.assign({},proxyServer,values));
        }else{
          onOk(values);
        }
      }
    });
  }
  handleModalCancel=()=>{
    const {onCancel} = this.props;
    onCancel();
  }
  render(){
    const {visible,editable,form,proxyServer,confirmLoading} = this.props;
    const {getFieldDecorator} = form;
    const {ip,target} = proxyServer;
    const {initIp} = this.state;
    const formItemLayout = {
      labelCol: {
        span: 6
      },
      wrapperCol: {
        span: 17
      },
    };
    return (<Modal
      title={`${editable?'编辑':'新增'}代理规则`}
      visible={visible}
      confirmLoading={confirmLoading}
      onOk={this.handleModalOk}
      onCancel={this.handleModalCancel}>
      <Form {...formItemLayout} >
        <Form.Item
          label="IP">
          {
            getFieldDecorator('ip',{
              rules:[{
                required: true, message: '请输入IP',
              }],
              initialValue:ip||initIp
            })(<Input placeholder="请输入ip"/>)
          }
        </Form.Item>
        <Form.Item
          label="目标服务地址">
          {
            getFieldDecorator('target',{
              rules:[{
                type:'url',required: true, message: '请输入正确格式的目标服务地址',
              }],
              initialValue:target
            })(<Input placeholder="请输入目标服务地址"/>)
          }
        </Form.Item>
      </Form>
    </Modal>)
  }
} 
export default Form.create()(ProxyRuleModal)
