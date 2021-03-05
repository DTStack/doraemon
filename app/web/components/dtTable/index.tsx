import * as React from 'react';
import { Table, Pagination } from 'antd';

import './style.scss';
export default class DtTable extends React.Component<any, any> {
    constructor(props: any) {
        super(props);
        this.state = {
            pagination: props.pagination,
            filters: [],
            sorter: {},
            extra: {}
        }
    }

    onTableChange = (pagination: any, filters: any, sorter: any, extra: any) => {
        this.setState({
            filters,
            sorter,
            extra,
            pagination: Object.assign({}, this.state.pagination, {
                current: 1,
                total: 0
            })
        }, this.onChange)
    }
    onPaginationChange = (page: any, pageSize: any) => {
        this.setState({
            pagination: Object.assign({}, this.state.pagination, {
                current: page,
                pageSize
            })
        }, this.onChange)
    }
    onShowSizeChange = (current: any, size: any) => {
        this.setState({
            pagination: Object.assign({}, this.state.pagination, {
                current: 1,
                pageSize: size
            })
        }, this.onChange)
    }
    onChange = () => {
        const { pagination, filters, sorter, extra } = this.state;
        this.props.onChange(pagination, filters, sorter, extra)
    }
    render () {
        const { props } = this;
        const { emptyText, pagination } = props;
        return (
            <div className="dt-table flexDirection">
                <div className="dt-table-body flexAuto">
                    <Table {...props} pagination={false} onChange={this.onTableChange}/>
                    {
                        emptyText ? <span className="dt-empty">{emptyText}</span> : null
                    }
                </div>
                {
                    pagination && (
                        <div className="dt-table-footer">
                            <Pagination {...pagination} size="small" onChange={this.onPaginationChange} onShowSizeChange={this.onShowSizeChange}/>
                        </div>
                    )
                }

            </div>
        )
    }
}
