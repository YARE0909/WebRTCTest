/* eslint-disable @typescript-eslint/no-explicit-any */
import Image from "next/image";
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
  const [loading, setLoading] = useState<boolean>(false);

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
        setLoading(true);
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
        } else if (data.type === 'joinCall') {
          console.log('Host Joined Call', data);
          setLoading(false);
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
    <div className="flex flex-col h-screen overflow-hidden bg-black">
      <div className="w-full h-full flex-col">
        <div className="absolute w-full bg-black/80 border-b border-gray-600 flex justify-between p-4">
          <Image
            src="https://oliveliving.com/_nuxt/img/pinkinnerlogo.d6ddf2b.svg"
            width={100}
            height={50}
            alt="Logo"
          />
        </div>
        {loading && (
          <div className="w-full h-full bg-black flex flex-col items-center justify-center">
            <h1 className="text-white text-2xl font-bold">Please wait while the receptionist connects.</h1>
            <h1 className="text-white text-2xl font-bold">
              Thank you for your patience.
            </h1>
          </div>
        )}
      </div>
      {
        !connected && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-4 rounded-md border border-gray-600 flex flex-col items-center space-y-4">
            <div>
              <h1 className="font-bold text-2xl">Meet Your Virtual Receptionist!</h1>
            </div>
            <div>
              <Image
                src="/images/virtualReceptionist.png"
                width={200}
                height={200}
                alt="Virtual Receptionist"
              />
            </div>
            <button
              onClick={placeCall}
              disabled={connected}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 z-50 duration-500"
            >
              Start a Call
            </button>
          </div>
        )
      }
      {
        connected && !loading && (
          <>
            <video ref={localVideoRef} className="w-64 h-64 bg-black absolute rounded-full shadow-2xl bottom-4 right-4 object-cover z-50" muted />
            <video ref={remoteVideoRef} className="w-full h-full bg-black object-cover" />
          </>
        )
      }
    </div >
  );
}
