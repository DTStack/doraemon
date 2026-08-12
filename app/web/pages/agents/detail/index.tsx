import React from 'react';

import AgentDetailContent from './AgentDetailContent';

const AgentDetailPage: React.FC<any> = ({ history, match }) => {
    const name = decodeURIComponent(match?.params?.name || '');
    return <AgentDetailContent name={name} history={history} />;
};

export default AgentDetailPage;
