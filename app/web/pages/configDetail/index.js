import React from 'react';
// import MonacoEditor from 'react-monaco-editor';
const ConfigDetail = (props)=>{
  const {match} = props;
  const {params} = match;
  const {id} = params;
  const onChange = (newValue,e)=>{
    console.log('onChange', newValue, e);
  }
  const editorDidMount = (editor, monaco)=>{
    console.log('editorDidMount', editor);
    editor.focus();
  }
  const options = {
    selectOnLineNumbers: true
  };
  return <div className="page-config-detail">
    {/* <MonacoEditor
        width="800"
        height="600"
        language="javascript"
        theme="vs-dark"
        value={code}
        options={options}
        onChange={onChange}
        editorDidMount={editorDidMount}
      /> */}
  </div>
}
export default ConfigDetail;