import * as React from 'react';
export default class Layout extends React.Component<any, any> {
    render() {
        if (EASY_ENV_IS_NODE) {
            return <html>
                <head>
                    <title>{this.props.title}</title>
                    <meta charSet="utf-8"></meta>
                    <meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no, minimal-ui"></meta>
                    <meta name="keywords" content={this.props.keywords}></meta>
                    <meta name="description" content={this.props.description}></meta>
                    <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon"></link>
                    <link></link>
                    <link href="https://cdn.bootcss.com/codemirror/5.48.4/codemirror.min.css" rel="stylesheet"></link>
                    <link href="https://cdn.bootcss.com/codemirror/5.48.4/theme/dracula.min.css" rel="stylesheet"></link>
                    <script src="https://cdn.bootcss.com/codemirror/5.48.4/codemirror.min.js"></script>
                    <script src="https://cdn.bootcss.com/codemirror/5.48.4/mode/nginx/nginx.min.js"></script>
                </head>
                <body><div id="app">{this.props.children}</div></body>
            </html>;
        }
        return <div id="app">{this.props.children}</div>;
    }
}