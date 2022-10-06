import logo from './logo.svg';
import './App.css';
import { useEffect, useRef, useState } from 'react';


const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
  }
function App(props) {

  const [vDevID, setVDevID] = useState("");
const [aDevID, setADevID] = useState("");
const constraints = { audio: {autoplay: true, deviceId: aDevID}, video: { width: 1280, height: 720, deviceId: vDevID } };
const [devices, setDevices] = useState({videoin:null, audioin:null, audioout:null})
const [errorMSG, setErrorMSG] = useState(null);
const stream = useRef();
const [wrapServers, setWrapServers] = useState({primaryServer:null, secondaryServer:null})
const wsRef = useRef();
const [alertFromServers, setAlertFromServers] = useState(null);

const [status, setStatus] = useState({isConnecting:false, isStreaming:false, isShowPlayer:false})

const [debugMSG, setdebugMSG] = useState(null);
const mediaRecorder = useRef();

useEffect(()=>{
  
  (async function() {
    // C1 - init CAM
    try { 
      //const constraints = { audio: {autoplay: true, deviceId: aDevID}, video: { width: 1280, height: 720, deviceId: vDevID } };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      const gotDevices = await navigator.mediaDevices.enumerateDevices()
      handleList(gotDevices, mediaStream);
      
    } catch (e) {
        console.error('Device Error' , e);
        // handleError(e);
    }
    // getServers()
})();
  console.log('component mounted!')
},[vDevID, aDevID])



// C2 - list Cameras
const handleList = (gotDevices) => {
  console.log("List Cam", gotDevices.length)
  let vidin = [];
  let auin = [];
  let audioOut = [];  
  gotDevices.forEach(function (gotDevice) {
    console.log("retorno do for each")
    let i = 0 
    if (gotDevice.kind === 'audioinput'){
      //console.log("audioin", gotDevice.kind + ": " + gotDevice.label + " id = " + gotDevice.deviceId);
      auin.push({label: gotDevice.label, id: gotDevice.deviceId, len:i++})
    } else if (gotDevice.kind === 'videoinput'){
      //console.log("video", gotDevice.kind + ": " + gotDevice.label + " id = " + gotDevice.deviceId);
      vidin.push({label: gotDevice.label, id: gotDevice.deviceId})
    } else if (gotDevice.kind === 'audiooutput'){
      //console.log("audioout??", gotDevice.kind + ": " + gotDevice.label + " id = " + gotDevice.deviceId);
      audioOut.push({label: gotDevice.label, id: gotDevice.deviceId})
    } else {console.log('Some other kind of source/device: ', gotDevice);}
  })
  console.log("Como esta aqui??", vidin, auin, audioOut)
  setDevices({audioin:auin, videoin:vidin, audioout:audioOut})
  enableCam()
}


const fallbackServer = (err) => {
  console.log("got SERVERS!", wrapServers.secondaryServer);
  let serverSec = wrapServers.secondaryServer
  // if you are running in http, please change from https to http, to test transwrap_local change from wss to ws
  if (window.location.protocol == 'http:'){
    var protocol = window.location.protocol.replace('http', 'ws');
  } else {
    var protocol = window.location.protocol.replace('https', 'wss');
  } 
  let testserver = "//127.0.0.1:3004" // if you need to perform test locally you can use the internal 
  // let wsUrlFal = `${protocol}//${serverSec}/rtmps/${rtmpURL}${streamKey}`;
  let wsUrlFal = `ws://localhost:8080`;


     // Fallback flow ini
     console.log("Fallback route", err)
     wsRef.current = new WebSocket(wsUrlFal);
     console.log("Trying Server", wsUrlFal)
     

     wsRef.current.addEventListener('open', async function open(data) {
       console.log("Open, Server 2!!!", data) /// set state need
       setStatus({isConnecting:true}) 
       if(data){
         console.log("!@@@@!!!")
         await sleep(25000);
         setStatus({isConnecting:false, isStreaming:true, isShowPlayer:true})
         setAlertFromServers("") 
       }
     });


     wsRef.current.onmessage = evt =>{
       console.log("MSG!!", evt)
       setdebugMSG(evt.data)
     }

     wsRef.current.onerror = err => {
       console.error("Got a error, both servers are out!!!", err, wsRef.current)
       setAlertFromServers("CRITICAL ERROR: Both servers are closed") 
     }
     
     wsRef.current.onclose = e => {
       console.log ("Client Closing Conection")
       stopStreaming()
       console.log(
         "Socket is closed", e.reason)
     }  
      /// End fallback flow

}

// S2 - Stop streaming to IVS
const stopStreaming = () => {
  if (mediaRecorder.current.state === 'recording') {
    mediaRecorder.current.stop();
    wsRef.current.close();
  }
  setStatus({isConnecting:false, isStreaming:false, isShowPlayer:false})
  setdebugMSG(null)
};



//S1 - Start streaming to IVS
const startStreaming = async (e) =>{
  e.preventDefault();
  console.log("got SERVERS!", wrapServers.primaryServer);
  let serverPri = wrapServers.primaryServer
  if (window.location.protocol == 'http:'){
    var protocol = window.location.protocol.replace('http', 'ws');
  } else {
    var protocol = window.location.protocol.replace('https', 'wss');
  } 
  let localtest = '//127.0.0.1:3004'
  // let wsUrl = `${protocol}//${serverPri}/rtmps/${rtmpURL}${streamKey}`;
  let wsUrl = `ws://localhost:8080`;

  wsRef.current = new WebSocket(wsUrl)
  console.log("como esta o wsRef", wsRef)

  wsRef.current.onerror = err => {
    setAlertFromServers("WARNING! SERVER 1 - Socket Closed!!!") 
    console.error("Got a error!!!", err, wsRef.current)
    fallbackServer(err) 
  }

  wsRef.current.onclose = e => {
      console.log ("Fallback 1",  e.reason)
  }

  wsRef.current.onmessage = evt =>{
      //console.log("MSG!!", evt)
      setdebugMSG(evt.data)
  }

  wsRef.current.addEventListener('open', async function open(data) {
    console.log("Open!!!", data)
    setStatus({isConnecting:true})  
    if(data){
      console.log("!@@@@!!!")
      await sleep(25000);
      setStatus({isConnecting:false, isStreaming:true, isShowPlayer:true}) 
    }
  });

  let vidStreaming = stream.current.captureStream(30);
  let outputStream = new MediaStream();
  [vidStreaming].forEach(function (s) {
    s.getTracks().forEach(function (t) {
      outputStream.addTrack(t);
    });
  });
  mediaRecorder.current = new MediaRecorder(outputStream, {
    mimeType: 'video/webm',
    videoBitsPerSecond: 3000000,
  });
  mediaRecorder.current.start(1000);
  mediaRecorder.current.addEventListener('dataavailable', (e) => {
    wsRef.current.send(e.data);
    console.log(e.data);
  });
} 


// C3 enable camera 
const enableCam = async () => {
  console.log("Loop enable cam")
  console.log("video ID", vDevID, aDevID)
  //let constraints = { audio: {autoplay: true, deviceId: aDevID}, video: { width: 1280, height: 720, deviceId: vDevID } };
  console.log("contrainsts", constraints)
  await navigator.mediaDevices.getUserMedia(
    constraints
    ).then(function(mediaStream) {
        console.log("assim ta o media strema", mediaStream);
        window.stream = mediaStream;
        var stream = document.querySelector('video');
        console.log("E o stream??", stream)
        var videoTracks = mediaStream.getVideoTracks();

        
        console.log('Got stream with constraints:', constraints);
        console.log(`Using video device: ${videoTracks[0].label}`);

        //window.stream = stream;
        stream.srcObject = mediaStream;

        console.log("UUUUU", stream)

        stream.onloadedmetadata = async function (e) {
          await stream.play();
        };


      })
      .catch(error =>  {
        console.error("Error in EnCam", error);
        handleError(error);
      }); 
      
      //this.setState({showCam: true})
      //console.log("en cam", this.state.showCam);
};




// C2.1 In case error to enable cam  
const handleError = (error) => {
  if (error.name === 'ConstraintNotSatisfiedError') {
    //const constraints = { audio: {autoplay: true, deviceId: aDevID}, video: { width: 1280, height: 720, deviceId: vDevID } };
    const v = constraints.video;
    console.error(`The resolution ${v.width.exact}x${v.height.exact} px is not supported by your device.`);
  } else if (error.name === 'NotAllowedError') {
    console.error('Permissions have not been granted to use your camera and ' +
      'microphone, you need to allow the page access to your devices in ' +
      'order for the demo to work.');
  }
  console.error(`getUserMedia error: ${error.name}`, error);
  setErrorMSG(error.name);
  }
  
  // C5 handle device change
const handleDevChange = event => {
  /// if audio if video 
  event.preventDefault();
  console.log("Device Change block", vDevID, aDevID, constraints)
  console.log(event.target.value)
  console.log(event.target.id)
  if (event.target.id === 'videoin'){
    console.log("set video", event.target.value)
    setVDevID(event.target.value)
    }
  if (event.target.id === 'audioin'){
    console.log("set audio iN", aDevID)
    setADevID(event.target.value) 
  }
  if (event.target.id === 'audioout'){
    console.log("set audio out")
  }
  console.log("check State", props)
  enableCam()
}



  return (
    devices.videoin ? (
        <div className="App">
      {errorMSG && (
            <div className="errorMSG">
              <p>Please enable your Camera, check browser Permissions.</p>
              <p>Error: {errorMSG}</p>
            </div>
          )}

<select id="videoin" class="form-control" onChange={(e => setVDevID( vDevID => e.target.value), handleDevChange)}>
                    <option disabled>Select Camera</option>
                    {devices.videoin.map((videoin) =>
                      <option key={videoin.id} value={videoin.id}>{videoin.label}</option>)}
                    </select>
                    <select id="audioin" class="form-control"  onChange={(e => setADevID( aDevID => e.target.value), handleDevChange)}>
                    <option disabled>Select Audio In</option>
                    {devices.audioin.map((audioin) =>
                      <option key={audioin.id} value={audioin.id}>{audioin.label}</option>)}
                    </select>
                    <select id="audioout" class="form-control"  onChange={handleDevChange}>
                    <option disabled>Select Audio Out</option>
                    {devices.audioout.map((audioout) =>
                      <option key={audioout.id} value={audioout.id}>{audioout.label}</option>)}
                    </select>

       <video autoPlay={true} muted={true} ref={stream} id="videoElement" controls></video>

       <button type="button" className="formBot" onClick={startStreaming}>GoLive!</button>
    </div>
       ):(<div>loading...</div>)
  );
}

export default App;
