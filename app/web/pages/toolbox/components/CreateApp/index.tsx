import * as React from 'react';
import { Modal, Input, Select, Form, FormInstance } from 'antd';
import PropsTypes from 'prop-types';

const { Option } = Select;
class CreateApp extends React.PureComponent<any, any> {
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

    formRef: FormInstance<any> = null;

    handleModalOk = () => {
        const { onOk, appInfo } = this.props;
        const { validateFields, scrollToField } = this.formRef;
        validateFields()
            .then((values: any) => {
                onOk({ ...values, id: appInfo.id || '' });
            })
            .catch(({ errorFields }) => {
                scrollToField(errorFields[0].name);
            })
    }
    handleModalCancel = () => {
        const { onCancel } = this.props;
        onCancel();
    }
    render() {
        const { visible, appInfo = {}, tagList, confirmLoading } = this.props;
        const { appName, appUrl, appDesc, appTags } = appInfo;
        const formItemLayout: any = {
            labelCol: {
                span: 6
            },
            wrapperCol: {
                span: 15
            }
        };
        return (<Modal
            title={Object.keys(appInfo).length > 0 ? '编辑应用' : '添加应用'}
            visible={visible}
            confirmLoading={confirmLoading}
            onOk={this.handleModalOk}
            onCancel={this.handleModalCancel}>
            <Form
                {...formItemLayout}
                ref={(form) => this.formRef = form}
                initialValues={{
                    appName: appName || '',
                    appUrl: appUrl || '',
                    appTags: appTags ? appTags.split(',').map((id: string) => Number(id)) : [],
                    appDesc: appDesc || ''
                }}
            >
                <Form.Item
                    label="应用名称"
                    name="appName"
                    rules={[{
                        required: true, message: '请输入应用名称'
                    }]}
                    hasFeedback
                >
                    <Input placeholder="请输入请输入应用名称" />
                </Form.Item>
                <Form.Item
                    label="应用URL"
                    name="appUrl"
                    rules={[{
                        required: true,
                        message: '请输入应用URL'
                    }]}
                    hasFeedback
                >
                    <Input placeholder="请输入应用URL" />
                </Form.Item>
                <Form.Item
                    label="应用标签"
                    name="appTags"
                    rules={[{
                        type: 'array',
                        required: true, max: 3, message: '请选择标签, 最多不超过3个'
                    }]}
                    hasFeedback
                >
                    <Select mode="multiple" placeholder="请选择标签" onChange={(value: any) => console.log('value -- ', value, typeof value[0])}>
                        {
                            tagList.map((item: any) => <Option key={item.id} value={item.id}>{item.tagName}</Option>)
                        }
                    </Select>
                </Form.Item>
                <Form.Item
                    label="应用描述"
                    name="appDesc"
                    rules={[{
                        required: true,
                        max: 120,
                        message: '请输入应用描述'
                    }]}
                    hasFeedback
                >
                    <Input.TextArea placeholder="请输入应用描述" />
                </Form.Item>
            </Form>
        </Modal>)
    }
}
export default CreateApp;
