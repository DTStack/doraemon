import * as React from 'react';
import { Select, TimePicker } from 'antd';
import moment from 'moment';
import { SUBSCRIPTIONSENDTYPE, SUBSCRIPTIONSENDTYPECN } from '../../consts';

const Option = Select.Option;

interface IProps {
    value?: any;
    onChange?: Function;
}
const initState = {
}
type IState = typeof initState
const defaultFormat = 'HH:mm'
const defaultTime = '09:20'

class ChooseSendTime extends React.Component<IProps, IState> {
    state: IState = {
        ...initState
    }

    componentDidMount() {
        const { onChange, value = {} } = this.props
        const { sendType = SUBSCRIPTIONSENDTYPE.WORKDAY, time = defaultTime } = value
        onChange?.({ sendType, time })
    }
    
    handleChange = (key: string, val) => {
        const { onChange, value = {} } = this.props
        const { sendType = SUBSCRIPTIONSENDTYPE.WORKDAY, time = defaultTime } = value
        let realVal = {}
        if (key === 'sendType') {
            realVal = {
                sendType: val,
                time
            }
        } else {
            realVal = {
                sendType,
                time: moment(val).format(defaultFormat)
            }
        }
        onChange?.(realVal)
    }

    render() {
        const { value = {} } = this.props;
        const { sendType = SUBSCRIPTIONSENDTYPE.WORKDAY, time = defaultTime } = value
        return (
            <div className="send-time">
                <Select style={{ width: 120 }} value={sendType} onChange={(val) => { this.handleChange('sendType', val) }}>
                    <Option value={SUBSCRIPTIONSENDTYPE.WORKDAY}>{SUBSCRIPTIONSENDTYPECN[SUBSCRIPTIONSENDTYPE.WORKDAY]}</Option>
                    <Option value={SUBSCRIPTIONSENDTYPE.EVERYDAY}>{SUBSCRIPTIONSENDTYPECN[SUBSCRIPTIONSENDTYPE.EVERYDAY]}</Option>
                </Select>

                <TimePicker
                    style={{ width: 200 }}
                    allowClear={false}
                    value={moment(time, defaultFormat)}
                    onChange={(val) => { this.handleChange('time', val) }}
                    minuteStep={5}
                    format={defaultFormat}
                />
            </div>
        )
    }
}

export default ChooseSendTime;
