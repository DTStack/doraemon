import io from 'socket.io-client'

export const Socket = io('ws://127.0.0.1:7001/', {
    query: { name: 'shanshan' }, transports: ['websocket']
})
