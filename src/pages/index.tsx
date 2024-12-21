/* eslint-disable @typescript-eslint/no-explicit-any */
import Peer from "peerjs";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [peerId, setPeerId] = useState<string>('');
  const [connected, setConnected] = useState<boolean>(false);
  const [activeCalls, setActiveCalls] = useState<any[]>([]);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const joinCall = (callId: string, from: string) => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play();
        }
        const call = peerRef.current?.call(from, stream);
        call?.on('stream', (remoteStream: any) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play();
          }
        });

        wsRef.current?.send(JSON.stringify({ type: 'joinCall', from: peerId, callId }));
        setCurrentCallId(callId);
        setConnected(true);
      })
      .catch(console.error);
  };

  const endCall = () => {
    if (currentCallId) {
      wsRef.current?.send(JSON.stringify({ type: 'endCall', callId: currentCallId }));
      resetCallState();
    }
  };

  const resetCallState = () => {
    setConnected(false);
    setCurrentCallId(null);

    // Stop all tracks in the local video stream
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      localVideoRef.current.srcObject = null;
    }

    // Clear the remote video
    if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
      const stream = remoteVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      remoteVideoRef.current.srcObject = null;
    }

    setActiveCalls(
      activeCalls.map((call) => {
        if (call.callId === currentCallId) {
          return { ...call, active: false };
        }
        return call;
      })
    )
  };

  useEffect(() => {
    const peer = new Peer();

    peer.on('open', (id) => {
      setPeerId(id);
      console.log(`My peer ID is: ${id}`);

      // Connect to WebSocket server and register
      const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || '');
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'register', peerId: id }));
      };

      ws.onmessage = (event: { data: string }) => {
        const data = JSON.parse(event.data);
        if (data.type === 'activeCalls') {
          setActiveCalls(data.activeCalls);
        } else if (data.type === 'callEnded') {
          resetCallState();
        }
      };

      wsRef.current = ws;
    });

    peer.on('call', (call: any) => {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.play();
          }
          call.answer(stream);
          call.on('stream', (remoteStream: any) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
              remoteVideoRef.current.play();
            }
          });
        })
        .catch(console.error);
    });

    peerRef.current = peer;

    return () => {
      peer.disconnect();
      peer.destroy();
      wsRef.current?.close();
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="w-full h-screen flex">
        <div className="w-3/4 h-full relative">
          {connected ? (
            <>
              <video ref={remoteVideoRef} className="w-full h-full bg-black object-cover" />
            </>
          ) : (
            <div className="w-full h-full justify-center items-center flex">
              <div className="w-64 border-2 border-dashed border-gray-600 rounded-md p-4 flex items-center justify-center">
                <h1 className="text-gray-500 font-bold">Not In A Call</h1>
              </div>
            </div>
          )}
        </div>
        <div className="w-1/4 h-full border-l-2 border-l-gray-600 flex flex-col space-y-4 p-4">
          <div className="w-full flex justify-between items-center border-b-2 border-b-gray-600 pb-2">
            <div>
              <h1 className="text-lg font-bold">Active Calls</h1>
            </div>
            {connected && (
              <button
                onClick={endCall}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                End Call
              </button>
            )}
          </div>
          <ul>
            {activeCalls.length > 0 ? activeCalls.map((call: any) => (
              <li key={call.callId} className="flex justify-between items-center border-b-2 border-gray-600 pb-2">
                <h1>{call.from}</h1>
                <button
                  onClick={() => joinCall(call.callId, call.from)}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Join Call
                </button>
              </li>
            )) : (
              <div className="w-full border-2 border-dashed border-gray-600 rounded-md p-4 justify-center items-center flex">
                <h1 className="text-gray-500 font-bold">No Calls Pending</h1>
              </div>
            )}
          </ul>
        </div>
      </div>


    </div>
  );
}
