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

  const placeCall = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play();
        }
        setConnected(true);

        // Notify the server about the new call
        const callId = `${peerId}-${Date.now()}`;
        wsRef.current?.send(JSON.stringify({ type: 'call', from: peerId, callId }));
        setCurrentCallId(callId);
      })
      .catch(console.error);
  };

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
          setActiveCalls((prevCalls) =>
            prevCalls.filter((call) => call.callId !== data.callId)
          );
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
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Group Video Calling App</h1>
      <div className="mb-4">
        <p className="text-sm">Your ID: {peerId}</p>
      </div>
      <div className="flex space-x-4 mb-4">
        <button
          onClick={placeCall}
          disabled={connected}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Start a Call
        </button>
        {connected && (
          <button
            onClick={endCall}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            End Call
          </button>
        )}
      </div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Active Calls</h2>
        <ul>
          {activeCalls.map((call: any) => (
            <li key={call.callId} className="flex justify-between items-center mb-2">
              <span>Call from {call.from}</span>
              <button
                onClick={() => joinCall(call.callId, call.from)}
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
              >
                Join Call
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex space-x-4">
        <video ref={localVideoRef} className="w-64 h-64 bg-black" muted />
        <video ref={remoteVideoRef} className="w-64 h-64 bg-black" />
      </div>
    </div>
  );
}
