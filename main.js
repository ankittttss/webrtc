let APP_ID="2bf94d7eb9f341fa82d7e9b0ae48101c" //appid from agora dashboard

let token=null;
let uid=String(Math.floor(Math.random()*10000)) //random id is generated 

let client;
let channel;

let queryString=window.location.search
let urlParams=new URLSearchParams(queryString)
let roomID=urlParams.get('room') 

if(!roomID){
    window.location='lobby.html'
}

let localStream;
let remoteStream;
let peerConnection;

const servers={ //sturn server is created..needed in case of firewall 
    iceServers:[
        {
            urls:['stun:stun1.1.google.com:19302','stun:stun2.1.google.com:19302']
        }
    ]
}

let init =async()=>{
    client =await AgoraRTM.createInstance(APP_ID)//create an instance of agora sdk
    await client.login({uid,token}) //log's in the agora rtm system

    channel=client.createChannel(roomID) //searches for this channel if not found creates one
    await channel.join() //join the channel so, that communication can take place
    channel.on('MemberJoined',handleUserJoined)//call the function when user joins the channel
    channel.on('MemberLeft',handleUserLeft)
    client.on('MessageFromPeer',handleMessageFromPeer);//agora api,when we recieve a message from user

    if(!localStream){
    localStream=await navigator.mediaDevices.getUserMedia({video:true,audio:true}) //pop up to ask user permission for accessing mic and camera
    document.getElementById("user-1").srcObject=localStream //defining parameters for user-1 profile
}
}

let handleUserLeft=(MemberId)=>{
    document.getElementById('user-2').style.display='none';
    document.getElementById('user-1').classList.remove('smallFrame')
}

let handleMessageFromPeer=async(message,MemberId)=>{
    message=JSON.parse(message.text);
    if(message.type==="offer"){
        createAnswer(MemberId,message.offer)
    }
    if(message.type==='answer'){
        addAnswer(message.answer)
    }
    if(message.type==='candidate'){
        if(peerConnection){
            peerConnection.addIceCandidate(message.candidate);
        }
    }
}

let handleUserJoined=async (MemberId)=>{ //when user joins creating an offer for communication
    console.log("A new User joined the Channel: ",MemberId)
    createOffer(MemberId);
}

let createPeerConnection =async (MemberId) =>{
    peerConnection = new RTCPeerConnection(servers); //generating a peer-peer connection
    remoteStream=new MediaStream(); // getting all media streams, audio and video in this case
   
    document.getElementById("user-2").srcObject=remoteStream //defining parameters for user-2
    document.getElementById('user-2').style.display='block'

    document.getElementById('user-1').classList.add('smallFrame')
    
    if(!localStream){
    localStream=await navigator.mediaDevices.getUserMedia({video:true,audio:false})
    document.getElementById('user-1').srcObject=localStream
   }

    localStream.getTracks().forEach((track)=>{ //iterating all the tracks
    peerConnection.addTrack(track,localStream)//putting all the tracks to use.
        
})

peerConnection.ontrack=(event)=>{//if a user joins iterating its tracks
    event.streams[0].getTracks().forEach((track)=>{ 
        remoteStream.addTrack(track);//adding tracks to remote peer
    })
}
peerConnection.onicecandidate=async (event)=>{ // icecandidate defines the connection properties 
    if(event.candidate){ //incase of finding a candidate, log the candidate
        client.sendMessageToPeer({text: JSON.stringify({'type':'candidate','candidate':event.candidate})},MemberId)
    }
}
}

let createOffer=async (MemberId)=>{ //function to create offer  
    await createPeerConnection(MemberId);
    let offer = await peerConnection.createOffer() //waiting for offer creation
    await peerConnection.setLocalDescription(offer);//specifies the properties of local end of the system
    
    client.sendMessageToPeer({text: JSON.stringify({'type':'offer','offer':offer})},MemberId)

}

let createAnswer=async(MemberId,offer)=>{
    await createPeerConnection(MemberId)
    await peerConnection.setRemoteDescription(offer)

    let answer=await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer)

    client.sendMessageToPeer({text: JSON.stringify({'type':'answer','answer':answer})},MemberId)

}

let addAnswer =async (answer)=>{
    if(!peerConnection.currentRemoteDescription){
        peerConnection.setRemoteDescription(answer)
    }
}

let leaveChannel=async () =>{
    await channel.leave();
    await client.logout();
}

let toggleCamera=async()=>{
    let videoTrack=localStream.getTracks().find(track=>track.kind=='video') 
    if(videoTrack.enabled){
        videoTrack.enabled=false
        document.getElementById("camera-btn").style.backgroundColor="rgb(255,80,80)"
    }else{
        videoTrack.enabled=true
        document.getElementById('camera-btn').style.backgroundColor='rgb(179,102,249,.9)'
    }
}

let toggleMic=async()=>{
    let audioTrack=localStream.getTracks().find(track=>track.kind=='audio') 
    if(audioTrack.enabled){
        audioTrack.enabled=false
        document.getElementById("mic-btn").style.backgroundColor="rgb(255,80,80)"
    }else{
        audioTrack.enabled=true
        document.getElementById('mic-btn').style.backgroundColor='rgb(179,102,249,.9)'
    }
}


window.addEventListener('beforeunload',leaveChannel)

document.getElementById("camera-btn").addEventListener('click',toggleCamera)
document.getElementById("mic-btn").addEventListener('click',toggleMic)

init();