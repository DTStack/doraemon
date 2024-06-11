const initialState: any = {
    localIp: '',
    serverInfo: {
        protocol: '',
        host: ''
    }
}
export default (state = initialState, action: any) => {
    const { type, payload } = action;
    switch (type) {
        case 'CHANGE_LOCAL_IP':
            const { localIp, protocol, host } = payload;
            localStorage.setItem('localIp', localIp);
            return {
                ...state,
                localIp,
                serverInfo: {
                    protocol,
                    host
                }
            }
        default: return state;
    }
}
