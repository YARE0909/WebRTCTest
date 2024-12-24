/* eslint-disable @typescript-eslint/no-explicit-any */
import convertToTitleCase from "@/utils/titleCase";
import Image from "next/image";
import { useRouter } from "next/router";
import { parseCookies } from "nookies";
import Peer from "peerjs";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [peerId, setPeerId] = useState<string>('');
  const [connected, setConnected] = useState<boolean>(false);
  const [activeCalls, setActiveCalls] = useState<any[]>([]);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);

  const router = useRouter();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const joinCall = (callId: string, from: string) => {

    if (connected) {
      alert("Please end the current call before joining another.");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;

          // Wait for the video element to be ready
          localVideoRef.current.onloadedmetadata = () => {
            localVideoRef.current?.play().catch(console.error);
          };
        }

        const call = peerRef.current?.call(from, stream);
        call?.on("stream", (remoteStream: MediaStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.onloadedmetadata = () => {
              remoteVideoRef.current?.play().catch(console.error);
            };
          }
        });

        wsRef.current?.send(
          JSON.stringify({ type: "joinCall", from: peerId, callId })
        );
        setCurrentCallId(callId);
        setConnected(true);

        // Update the activeCalls list to mark the joined call as active
        setActiveCalls((prevCalls) =>
          prevCalls.map((call) =>
            call.callId === callId ? { ...call, active: true } : call
          )
        );
      })
      .catch(console.error);
  };

  const endCall = () => {
    if (currentCallId) {
      wsRef.current?.send(
        JSON.stringify({ type: "endCall", callId: currentCallId })
      );
      resetCallState();

      // Update the activeCalls list to mark the ended call as inactive
      setActiveCalls((prevCalls) =>
        prevCalls.map((call) =>
          call.callId === currentCallId ? { ...call, active: false } : call
        )
      );
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
    const cookies = parseCookies();
    const { user } = cookies;

    if (!user) {
      router.push('/');
    }

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


    peer.on("call", (call: any) => {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;

            // Wait for the video element to be ready
            localVideoRef.current.onloadedmetadata = () => {
              localVideoRef.current?.play().catch(console.error);
            };
          }

          call.answer(stream);
          call.on("stream", (remoteStream: MediaStream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
              remoteVideoRef.current.onloadedmetadata = () => {
                remoteVideoRef.current?.play().catch(console.error);
              };
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
    <div className="flex flex-col h-screen overflow-hidden bg-black text-white">
      <div className="w-full h-screen flex">
        <div className="w-3/4 h-full relative flex flex-col">
          <div className="w-ful h-16 flex items-center gap-3 p-4 border-b-2 border-b-gray-600">
            <Image
              src="https://oliveliving.com/_nuxt/img/pinkinnerlogo.d6ddf2b.svg"
              width={100}
              height={50}
              alt="Logo"
            />
            <div className="w-full flex items-center justify-center">
              <h1 className="font-bold text-xl">Welcome To Olive Head Office</h1>
            </div>
          </div>
          {connected ? (
            <>
              {/* <video ref={localVideoRef} className="h-64 bg-black absolute rounded-md shadow-2xl bottom-4 right-4 object-cover z-50" muted /> */}
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
        <div className="w-1/4 h-full border-l-2 border-l-gray-600 flex flex-col space-y-4">
          <div className="w-full h-16 flex items-center gap-3 p-4 border-b-2 border-b-gray-600">
            <div>
              <h1 className="font-bold text-xl">Active Calls</h1>
            </div>
          </div>
          <ul className="p-4 flex flex-col gap-2">
            {activeCalls.length > 0 ? (
              activeCalls.map((call: any) => (
                <li
                  key={call.callId}
                  className="flex justify-between items-center border-b-2 border-gray-600 pb-2"
                >
                  <h1>{convertToTitleCase(call.from)} Calling...</h1>
                  {call.active ? (
                    <button
                      onClick={endCall}
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                      End Call
                    </button>
                  ) : (
                    <button
                      onClick={() => joinCall(call.callId, call.from)}
                      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    >
                      Join Call
                    </button>
                  )}
                </li>
              ))
            ) : (
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
