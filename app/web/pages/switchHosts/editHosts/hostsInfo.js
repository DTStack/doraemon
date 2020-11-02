import React, { Fragment } from 'react';
import { Form, Input } from 'antd';
const FormItem = Form.Item;
const formItemLayout = {
  labelCol: {
    span: 6
  },
  wrapperCol: {
    span: 17
  }
};

const HostsInfo = (props) => {
  const { isEdit, form, hostsInfo } = props;
  const { getFieldDecorator } = form;

  return (
    <Form>
      <FormItem
        label="群组名称"
        {...formItemLayout}
      >
        {getFieldDecorator('groupName', {
          initialValue: isEdit ? hostsInfo.groupName : '',
          rules: [
            { required: true, message: '请输入群组名称' },
            { max: 64, message: '长度不超过64个字符' }
          ]
        })(
          <Input placeholder="请输入群组名称，长度不超过64个字符" />
        )}
      </FormItem>
      {
        isEdit && (
          <Fragment>
            <FormItem label="群組ID" {...formItemLayout}>
              <span>{hostsInfo.groupId || '--'}</span>
            </FormItem>
            <FormItem label="群組API" {...formItemLayout}>
              <span>{hostsInfo.groupApi || '--'}</span>
            </FormItem>
          </Fragment>
        )
      }
      <FormItem
        label="群组描述"
        {...formItemLayout}
      >
        {getFieldDecorator('groupDesc', {
          initialValue: isEdit ? hostsInfo.groupDesc : '',
          rules: [
            { max: 255, message: '长度不超过255个字符' }
          ]
        })(
          <Input.TextArea placeholder="请输入群组描述，长度不超过255个字符" />
        )}
      </FormItem>
    </Form>
  )
}

export default Form.create()(HostsInfo);