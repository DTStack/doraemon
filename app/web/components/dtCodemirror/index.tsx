import React, { useEffect, useState } from 'react';
import { Controlled as CodeMirror } from 'react-codemirror2';
import { Select } from 'antd';

import './style.scss';
const { Option } = Select;
const themes: any = [
    '3024-day.css',
    '3024-night.css',
    'abcdef.css',
    'ambiance-mobile.css',
    'ambiance.css',
    'ayu-dark.css',
    'ayu-mirage.css',
    'base16-dark.css',
    'base16-light.css',
    'bespin.css',
    'blackboard.css',
    'cobalt.css',
    'colorforth.css',
    'darcula.css',
    'dracula.css',
    'duotone-dark.css',
    'duotone-light.css',
    'eclipse.css',
    'elegant.css',
    'erlang-dark.css',
    'gruvbox-dark.css',
    'hopscotch.css',
    'icecoder.css',
    'idea.css',
    'isotope.css',
    'lesser-dark.css',
    'liquibyte.css',
    'lucario.css',
    'material-darker.css',
    'material-ocean.css',
    'material-palenight.css',
    'material.css',
    'mbo.css',
    'mdn-like.css',
    'midnight.css',
    'monokai.css',
    'moxer.css',
    'neat.css',
    'neo.css',
    'night.css',
    'nord.css',
    'oceanic-next.css',
    'panda-syntax.css',
    'paraiso-dark.css',
    'paraiso-light.css',
    'pastel-on-dark.css',
    'railscasts.css',
    'rubyblue.css',
    'seti.css',
    'shadowfox.css',
    'solarized.css',
    'ssms.css',
    'the-matrix.css',
    'tomorrow-night-bright.css',
    'tomorrow-night-eighties.css',
    'ttcn.css',
    'twilight.css',
    'vibrant-ink.css',
    'xq-dark.css',
    'xq-light.css',
    'yeti.css',
    'yonce.css',
    'zenburn.css',
];
function DtCodemirror(props: any) {
    const { fileType = 'nginx' } = props;
    const defaultTheme = 'ayu-dark.css';
    const [theme, setThemes] = useState(defaultTheme);
    const onChange = (value: any) => {
        setThemes(value);
        try {
            require(`codemirror/theme/${value}`);
        } catch (error) {
            console.log(error);
        }
    };
    useEffect(() => {
        try {
            require('codemirror/theme/ayu-dark.css');
            require(`codemirror/mode/${fileType}/${fileType}.js`);
        } catch (error) {
            console.log(error);
        }
    }, []);
    return (
        <div className="dt-codemirror">
            <CodeMirror {...props} />
            <Select
                showSearch
                value={theme}
                className="dt-codemirror-select-themes"
                placeholder="选择主题"
                optionFilterProp="children"
                onChange={onChange}
                filterOption={(input: any, option: any) =>
                    option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
            >
                {themes.map((item: any) => (
                    <Option value={item} key={item}>
                        {item}
                    </Option>
                ))}
            </Select>
        </div>
    );
}
export default DtCodemirror;
