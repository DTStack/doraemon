import React,{useState} from 'react';
import { SketchPicker } from 'react-color';
import DtTag from '@/components/dtTag';
import './style.scss';

const ColorPicker = (props: any) => {
    const {value,onChange} = props;
    const [colorPicker,setColorPicker] = useState(false)
    const handleChangeComplete = (color: any) => {
        onChange(color.hex)
    }
    const popover: any = {
        position: 'absolute',
        zIndex: '2'
    }
    const cover: any = {
        position: 'fixed',
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px'
    }
    return (<span className="colorPicker">
        <DtTag color={value} onClick={()=>setColorPicker(true)}>{value||'Pick Color'}</DtTag>
        <div className="tip">(可点击选择标签颜色)</div>
        { 
            colorPicker ? <div style={ popover }>
                <div style={ cover } onClick={()=>setColorPicker(false) }/>
                <SketchPicker
                    presetColors={
                        ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722']
                    }
                    className="sketchPicker"
                    color={ value }
                    onChangeComplete={ handleChangeComplete }/>
            </div> : null 
        }
    </span>)
}
export default ColorPicker;