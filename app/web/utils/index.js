

export function getIPs(){
  return new Promise((resolve,reject)=>{
    //compatibility for firefox and chrome
    const myPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
    const pc = new myPeerConnection({
      iceServers: []
    });
    const noop = function() {};
    const localIPs = {};
    const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/g;
    function iterateIP(ip) {
      if (!localIPs[ip]) resolve(ip);
      localIPs[ip] = true;
    }
    //create a bogus data channel
    pc.createDataChannel("");

    // create offer and set local description
    pc.createOffer().then(function(sdp) {
      sdp.sdp.split('\n').forEach(function(line) {
          if (line.indexOf('IP4') < 0) return;
          line.match(ipRegex).forEach(iterateIP);
      });
      pc.setLocalDescription(sdp, noop, noop);
    }).catch(function(error) {
      // An error occurred, so handle the failure to connect
      reject(error)
    });
    pc.onicecandidate = function(ice) {
      if (!ice || !ice.candidate || !ice.candidate.candidate || !ice.candidate.candidate.match(ipRegex)) return;
      ice.candidate.candidate.match(ipRegex).forEach(iterateIP);
    };
  })
}