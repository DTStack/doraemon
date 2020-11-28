import React,{useState,useEffect} from 'react';
import {isFunction} from 'lodash';
import {Modal,Form,Input,message as Message} from 'antd';
import ColorPicker from '../colorPicker';
import {API} from '@/api';
const FormItem = Form.Item;
const {TextArea} = Input;
const AddTagModal = Form.create()((props)=>{
  const { data,visible,onOk,onCancel,form } = props;
  const [confirmLoading,setConfirmLoading] = useState(false);
  useEffect(()=>{
    if(visible&&data){
      const { tagName='',tagDesc='',tagColor=''} = data;
      form.setFieldsValue({
        tagName,tagDesc,tagColor
      })
    }
  },[visible]);
  const updataTags = (params) => {
    setConfirmLoading(true);
    API[params.id ? 'updateTag':'createTag'](params).then((response)=>{
      const {success} = response;
      if(success){
        Message.success(params.id ? '编辑成功':'新增成功');
        isFunction(onOk)&&onOk();
        restData();
      }
    }).finally(()=>{
      setConfirmLoading(false);
    })
  }
  const handleModalOk = ()=>{
    form.validateFields((err,values)=>{
      if(!err){   
        updataTags(Object.assign(values,{
          id:data? data.id:''
        }))
        
      }
    })
  }
  const handleModalCancel = ()=>{
    isFunction(onCancel)&&onCancel();
    restData();
  }
  const restData = () => {
    setConfirmLoading(false);
    form.resetFields();
  }
  const { getFieldDecorator } = form; 
  return <Modal
    title={data?'新增标签':'编辑标签'}
    visible={visible}
    maskClosable={false}
    confirmLoading={confirmLoading}
    onOk={handleModalOk}
    onCancel={handleModalCancel}>
    <Form labelCol={{span:5}} wrapperCol={{span:17}} >
      <FormItem label="标签名称" hasFeedback>
        {getFieldDecorator('tagName',{
          initialValue:'',
          rules:[{
            required:true,message:'请输入标签名称'
          }]
        })(
          <Input placeholder="请输入文件名"/>
        )}
      </FormItem>
      <FormItem label="标签备注" hasFeedback>
        {getFieldDecorator('tagDesc',{
          initialValue:''
        })(
          <TextArea placeholder="请输入备注" rows={4}/>
        )}
      </FormItem>
      <FormItem label="标签标识">
        {getFieldDecorator('tagColor',{
          initialValue:'#ffadd2',
          rules:[{
            required:true,message:'请选择标签标识'
          }]
        })(
          <ColorPicker />
        )}
      </FormItem>
    </Form>
  </Modal>
})
export default AddTagModal;