import React from 'react';
import { Form } from 'antd';
import { Modal, Input, Select } from 'antd';
import PropsTypes from 'prop-types';

const { Option } = Select;
class CreateApp extends React.PureComponent {
  static defaultProps = {
    visible: false,
    onOk: () => { },
    onCancel: () => { },
    proxyServer: {},
    tagList: [],
    confirmLoading: false
  }
  static propsTypes = {
    visible: PropsTypes.bool,
    onOk: PropsTypes.func,
    onCancel: PropsTypes.func,
    proxyServer: PropsTypes.object,
    tagList: PropsTypes.array,
    confirmLoading: PropsTypes.bool
  }

  formRef = null;

  handleModalOk = () => {
    const { onOk, appInfo } = this.props;
    this.formRef.validateFields()
      .then((values) => {
        onOk({ ...values, id: appInfo.id || '' });
      })
      .catch(({ errorFields }) => {
        this.formRef.scrollToField(errorFields[0].name);
      })
  }
  handleModalCancel = () => {
    const { onCancel } = this.props;
    onCancel();
  }
  render() {
    const { visible, appInfo, tagList, confirmLoading } = this.props;
    const { appName, appUrl, appDesc, appTags } = appInfo;
    const formItemLayout = {
      labelCol: {
        span: 6
      },
      wrapperCol: {
        span: 15
      }
    };
    return (<Modal
      title={appInfo ? '添加应用' : '编辑应用'}
      visible={visible}
      confirmLoading={confirmLoading}
      onOk={this.handleModalOk}
      onCancel={this.handleModalCancel}>
      <Form
        {...formItemLayout}
        ref={form => this.formRef = form}
        initialValues={{
          appName: appName || '',
          appUrl: appUrl || '',
          appTags: appTags ? appTags.split(',') : [10, '10', '产品'],
          appDesc: appDesc || ''
        }}
      >
        <Form.Item
          label="应用名称"
          hasFeedback
          name="appName"
          // initialValue="test"
          rules={[
            { required: true, message: '请输入应用名称' }
          ]}
        >
          <Input placeholder="请输入请输入应用名称" />
        </Form.Item>
        <Form.Item
          label="应用URL"
          hasFeedback
          name="appUrl"
          rules={[
            { required: true, message: '请输入应用URL' }
          ]}
        >
          <Input placeholder="请输入应用URL" />
        </Form.Item>
        <Form.Item
          label="应用标签"
          hasFeedback
          name="appTags"
          rules={[{
            type: 'array',
            required: true, max: 3, message: '请选择标签, 最多不超过3个'
          }]}
        >
          <Select mode="multiple" placeholder="请选择标签">
            {
              tagList.map(item => <Option key={item.id}>{item.tagName}</Option>)
            }
          </Select>
        </Form.Item>
        <Form.Item
          label="应用描述"
          hasFeedback
          name="appDesc"
          rules={[{
            required: true,
            max: 120,
            message: '请输入应用描述'
          }]}
        >
          <Input.TextArea placeholder="请输入应用描述" />
        </Form.Item>
      </Form>
    </Modal >)
  }
}
export default CreateApp;
