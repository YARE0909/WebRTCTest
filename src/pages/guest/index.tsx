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
    <div className="flex flex-col h-screen p-4">
      <div className="w-full border-b">
        <h1 className="text-2xl font-bold mb-4">Video Calling App</h1>
      </div>
      {!connected && (
        <button
          onClick={placeCall}
          disabled={connected}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 z-50"
        >
          Start a Call
        </button>
      )}
      <div className="flex mb-4">
      </div>
      <video ref={localVideoRef} className="w-64 h-64 bg-black absolute rounded-full border bottom-4 right-4 object-cover" muted />
      <video ref={remoteVideoRef} className="w-full h-full bg-black object-cover" />
    </div>
  );
}