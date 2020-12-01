import React,{useState,useEffect,useRef} from 'react';
import {isEmpty,isFunction,isNull} from 'lodash';
import {Modal,Form,Input,Select,Spin,message as Message} from 'antd';
import {API} from '@/api';
const FormItem = Form.Item;
const {TextArea} = Input;
const {Option} = Select;


const ConfigForm = Form.create()(
  (props)=>{
    const [hostList,setHostList] = useState([]);
    const {form,value,tagList} = props;
    const {getFieldDecorator} = form;
    const {filename,hostId,filePath,remark,tags={}} = value;
    const { id ='' } = tags;
    const loadHostsData = ()=>{
      API.getHostList().then((response)=>{
        const {success,data} = response;
        if(success){
          setHostList(data);
        }
      })
    }
    useEffect(()=>{
      loadHostsData();
    },[])
    return <Form labelCol={{span:5}} wrapperCol={{span:17}} >
       <FormItem label="主机" hasFeedback>
        {getFieldDecorator('hostId',{
          initialValue:hostId,
          rules:[{
            required:true,message:'请选择主机'
          }]
        })(
          <Select placeholder="请选择主机">
            {
              hostList.map((host)=>{
                const {id,hostIp,hostName} = host;
                return <Option key={id} value={id}>{`${hostIp}-${hostName}`}</Option>
              })
            }
          </Select>
        )}
      </FormItem>
      <FormItem label="文件名" hasFeedback>
        {getFieldDecorator('filename',{
          initialValue:filename,
          rules:[{
            required:true,message:'请输入文件名'
          }]
        })(
          <Input placeholder="请输入文件名"/>
        )}
      </FormItem>
     <FormItem label="文件路径" hasFeedback>
        {getFieldDecorator('filePath',{
          initialValue:filePath,
          rules:[{
            required:true,message:'请输入文件路径'
          }]
        })(
          <Input placeholder="请输入文件路径"/>
        )}
      </FormItem>
      <FormItem label="标签" hasFeedback>
        {getFieldDecorator('tagIds',{
          initialValue:`${id}`,
          rules:[{
            required:true,message:'请选择标签'
          }]
        })(
          <Select placeholder="请选择标签">
             {
               tagList.map(item=><Option key={item.id}>{item.tagName}</Option>)
             }
          </Select>
        )}
        </FormItem>
      <FormItem label="备注" hasFeedback>
        {getFieldDecorator('remark',{
          initialValue:remark
        })(
          <TextArea placeholder="请输入备注" rows={4}/>
        )}
      </FormItem>
    </Form>
  }
)
const ConfigModal = (props)=>{
  const {value,visible,onOk,onCancel,tagList} = props;
  const [confirmLoading,setConfirmLoading] = useState(false);
  const configFormRef = useRef(null);
  const isAdd = isEmpty(value);
  const {id,filename} = value;
  const handleModalOk = ()=>{
    if(!isNull(configFormRef.current)){
      configFormRef.current.validateFields((err,values)=>{
        if(!err){
          setConfirmLoading(true);
          API[isAdd?'addConfig':'editConfig']({
            id:isAdd?undefined:id,
            ...values
          }).then((response)=>{
            setConfirmLoading(false);
            const {success,message} = response;
            if(success){
              Message.success(isAdd?'配置新增成功':`配置「${filename}」编辑成功`);
              isFunction(onOk)&&onOk(values);
            }
          })
        }
      })
    }
  }
  const handleModalCancel = ()=>{
    isFunction(onCancel)&&onCancel();
  }
  useEffect(() => {
    if(!visible){
      setConfirmLoading(false);
    }
  }, [props.visible])
  return <Modal
    title={isAdd?'新增配置':'编辑配置'}
    visible={visible}
    confirmLoading={confirmLoading}
    onOk={handleModalOk}
    onCancel={handleModalCancel}>
    <Spin spinning={confirmLoading}>
      {visible&&<ConfigForm tagList={tagList} value={value} ref={configFormRef}/>}
    </Spin>
  </Modal>
}
export default ConfigModal;