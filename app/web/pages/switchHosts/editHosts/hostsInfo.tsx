import React from 'react';
import { useSelector } from 'react-redux';
import { Form, Input, Typography } from 'antd';

const { Paragraph } = Typography;
const FormItem = Form.Item;

const formItemLayout: any = {
    labelCol: {
        span: 6,
    },
    wrapperCol: {
        span: 17,
    },
};

const HostsInfo = (props: any) => {
    const { serverInfo } = useSelector((state: any) => state.global);
    const { isEdit, hostsInfo, forwardedRef } = props;
    const [form] = Form.useForm();

    return (
        <Form
            {...formItemLayout}
            form={form}
            ref={forwardedRef}
            name="hostsInfo"
            initialValues={{
                groupName: isEdit ? hostsInfo.groupName : '',
                groupDesc: isEdit ? hostsInfo.groupDesc : '',
            }}
        >
            <FormItem
                label="分组名称"
                name="groupName"
                rules={[
                    { required: true, message: '请输入分组名称' },
                    { max: 64, message: '长度不超过64个字符' },
                ]}
            >
                <Input placeholder="请输入分组名称，长度不超过64个字符" />
            </FormItem>
            {isEdit && (
                <FormItem label="分组API">
                    {hostsInfo.groupApi ? (
                        <Paragraph
                            style={{ marginBottom: 0 }}
                            copyable
                        >{`${serverInfo.protocol}://${serverInfo.host}${hostsInfo.groupApi}`}</Paragraph>
                    ) : (
                        '--'
                    )}
                </FormItem>
            )}
            <FormItem
                label="分组描述"
                name="groupDesc"
                rules={[{ max: 255, message: '长度不超过255个字符' }]}
            >
                <Input.TextArea placeholder="请输入分组描述，长度不超过255个字符" />
            </FormItem>
        </Form>
    );
};

const HostsInfoRef = React.forwardRef((props: any, ref: any) => (
    <HostsInfo forwardedRef={ref} {...props} />
));

export default HostsInfoRef;
