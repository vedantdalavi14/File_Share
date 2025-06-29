import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Copy,
  CheckCircle,
  AlertCircle,
  XCircle,
  Send,
  Paperclip,
  Download,
  Users,
  Loader2,
  Share2,
  MessageSquare
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { socketManager } from '@/lib/socket';
import { WebRTCManager, FileTransferProgress } from '@/lib/webrtc';
import { apiRequest } from '@/lib/queryClient';

interface BidirectionalP2PRoomProps {
  roomId: string;
}

type ConnectionStatus = 'waiting' | 'connecting' | 'connected' | 'disconnected' | 'error';
type FileTransfer = {
  id: string;
  name: string;
  size: number;
  type: 'sent' | 'received';
  progress?: FileTransferProgress;
  blob?: Blob;
  status: 'progress' | 'completed' | 'failed';
};
type ChatMessage = {
  id: string;
  message: string;
  fromId: string;
  timestamp: string;
  type: 'sent' | 'received';
};

export function BidirectionalP2PRoom({ roomId }: BidirectionalP2PRoomProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [webrtcManager] = useState(() => new WebRTCManager());

  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [peerId, setPeerId] = useState<string | null>(null);
  const [shareableLink, setShareableLink] = useState('');
  const [transfers, setTransfers] = useState<FileTransfer[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [error, setError] = useState('');
  const [myId, setMyId] = useState('');

  // Setup listeners and join room
  useEffect(() => {
    console.log('[BiDiRoom] 🚀 Component mounted, attempting to connect.', { roomId });
    setShareableLink(window.location.href);
    const socket = socketManager.connect();

    const handleConnect = () => {
      console.log('[BiDiRoom] 🔌 Socket connected with ID:', socket.id);
      setMyId(socket.id!);

      const setup = async () => {
        try {
          console.log('[BiDiRoom] 🔍 Verifying room existence...');
          await apiRequest('GET', `/api/bidirectional-rooms/${roomId}`);
          console.log('[BiDiRoom] ✔️ Room verified. Setting up WebRTC listeners.');
        } catch (e) {
          console.error('[BiDiRoom] ❌ Failed to verify room:', e);
          setStatus('error');
          setError('Room not found or has expired.');
          return;
        }

        webrtcManager.onConnectionStateChange((state) => {
          console.log('[BiDiRoom] 🌐 WebRTC connection state changed:', state);
          if (state === 'connected') setStatus('connected');
          if (state === 'disconnected' || state === 'failed') {
            setStatus('disconnected');
            setPeerId(null);
          }
        });

        webrtcManager.onFileReceived((file, fileName) => {
          console.log(`[BiDiRoom] 📥 File received via WebRTC: ${fileName}`, file);
          const transferId = `${fileName}-${Date.now()}`;
          setTransfers(prev => [...prev, {
            id: transferId,
            name: fileName,
            size: file.size,
            type: 'received',
            blob: file,
            status: 'completed',
          }]);
          toast({ title: 'File Received', description: fileName });
        });

        webrtcManager.onProgress(progress => {
          // This can be very verbose
          // console.log('[BiDiRoom] 📤 File transfer progress:', progress);
          setTransfers(prev => prev.map(t =>
            (t.id === progress.id)
              ? { ...t, progress }
              : t
          ));
        });

        console.log('[BiDiRoom] 🚪 Emitting join room event.');
        socket.emit('bidi-join-room', { roomId });
      };

      setup();
      setupSocketListeners();
    };

    socket.on('connect', handleConnect);

    const cleanupSocketListeners = () => {
      console.log('[BiDiRoom] 🔕 Removing all socket event listeners.');
      socket.off('bidi-room-participants');
      socket.off('bidi-peer-joined');
      socket.off('bidi-webrtc-offer');
      socket.off('bidi-webrtc-answer');
      socket.off('bidi-webrtc-ice-candidate');
      socket.off('bidi-peer-left');
      socket.off('bidi-chat-message');
      socket.off('bidi-error');
    };

    return () => {
      console.log('[BiDiRoom] 🧼 Component unmounting. Cleaning up connections.');
      socket.off('connect', handleConnect);
      cleanupSocketListeners();
      webrtcManager.close();
      socketManager.disconnect();
    };
  }, [roomId, webrtcManager]);

  const setupSocketListeners = () => {
    const socket = socketManager.getSocket()!;

    socket.on('bidi-room-participants', ({ participants }) => {
      console.log('[BiDiRoom] 👥 Received room participants:', participants);
      if (participants.length > 0) {
        const targetPeerId = participants[0];
        console.log('[BiDiRoom] 🤙 Peer found, initiating connection to:', targetPeerId);
        setPeerId(targetPeerId);
        initiateConnection(targetPeerId);
      } else {
        console.log('[BiDiRoom] ⏳ No peers in room, waiting for someone to join.');
        setStatus('waiting');
      }
    });

    socket.on('bidi-peer-joined', ({ peerId: joinedPeerId }) => {
      console.log('[BiDiRoom] 👋 A new peer has joined:', joinedPeerId);
      setPeerId(joinedPeerId);
      setStatus('connecting');

      // The existing peer (host) must also set up their ICE handler to send candidates to the new peer.
      webrtcManager.onIceCandidate(candidate => {
        socketManager.getSocket()?.emit('bidi-webrtc-ice-candidate', { candidate, targetId: joinedPeerId, roomId });
      });

      // The host just needs to be ready to receive channels, not create them.
      webrtcManager.onDataChannel(channel => console.log('[BiDiRoom] ⚡️ Data channel received from peer:', channel.label));
    });

    socket.on('bidi-webrtc-offer', async ({ offer, fromId }) => {
      console.log('[BiDiRoom] 📨 Received WebRTC offer from:', fromId);
      const answer = await webrtcManager.createAnswer(offer);
      console.log('[BiDiRoom] 📩 Sending WebRTC answer to:', fromId);
      socket.emit('bidi-webrtc-answer', { answer, targetId: fromId, roomId });
    });

    socket.on('bidi-webrtc-answer', async ({ answer }) => {
      console.log('[BiDiRoom] 🤝 Received WebRTC answer. Setting remote description.');
      await webrtcManager.handleAnswer(answer);
    });

    socket.on('bidi-webrtc-ice-candidate', async ({ candidate }) => {
      // console.log('[BiDiRoom] 🧊 Received ICE candidate.');
      await webrtcManager.addIceCandidate(candidate);
    });

    socket.on('bidi-peer-left', () => {
      console.log('[BiDiRoom] 👋 Peer has left the room.');
      setStatus('disconnected');
      setPeerId(null);
      webrtcManager.close(true); // Soft close
    });

    socket.on('bidi-chat-message', ({ message, fromId, timestamp }) => {
      console.log('[BiDiRoom] 💬 Received chat message from:', fromId);
      setChatMessages(prev => [...prev, { id: timestamp, message, fromId, timestamp, type: 'received' }]);
    });

    socket.on('bidi-error', ({ message }) => {
      console.error('[BiDiRoom] 🚨 Received error from server:', message);
      setStatus('error');
      setError(message);
    });
  };

  const initiateConnection = async (targetPeerId: string) => {
    console.log(`[BiDiRoom] 🤙 Setting up ICE candidate listener and creating offer for peer ${targetPeerId}.`);
    webrtcManager.onIceCandidate(candidate => {
      // console.log('[BiDiRoom] 🧊 Sending ICE candidate.');
      socketManager.getSocket()?.emit('bidi-webrtc-ice-candidate', { candidate, targetId: targetPeerId, roomId });
    });
    // The initiator must create the data channels before creating the offer.
    webrtcManager.createDataChannels();
    const offer = await webrtcManager.createOffer();
    console.log('[BiDiRoom] 📨 WebRTC offer created, sending to peer.');
    socketManager.getSocket()?.emit('bidi-webrtc-offer', { offer, targetId: targetPeerId, roomId });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && peerId) {
      console.log(`[BiDiRoom] 📄 File selected: ${file.name}. Starting transfer.`);
      const transferId = `${file.name}-${Date.now()}`;
      setTransfers(prev => [...prev, {
        id: transferId,
        name: file.name,
        size: file.size,
        type: 'sent',
        status: 'progress',
        progress: { id: transferId, fileName: file.name, fileSize: file.size, bytesTransferred: 0, percentage: 0, speed: 0, timeRemaining: Infinity }
      }]);
      webrtcManager.sendFile(file, transferId)
        .then(() => {
          console.log(`[BiDiRoom] ✅ File transfer completed for: ${file.name}`);
          setTransfers(prev => prev.map(t => t.id === transferId ? { ...t, status: 'completed' } : t));
        })
        .catch((err) => {
          console.error(`[BiDiRoom] ❌ File transfer failed for: ${file.name}`, err);
          setTransfers(prev => prev.map(t => t.id === transferId ? { ...t, status: 'failed' } : t));
        });
    }
  };

  const handleSendChatMessage = () => {
    if (chatInput.trim() && peerId) {
      const message = chatInput.trim();
      const timestamp = new Date().toISOString();
      console.log(`[BiDiRoom] 💬 Sending chat message: "${message}"`);
      socketManager.getSocket()?.emit('bidi-chat-message', { roomId, message });
      setChatMessages(prev => [...prev, { id: timestamp, message, fromId: myId, timestamp, type: 'sent' }]);
      setChatInput('');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    toast({ title: 'Copied to clipboard!', description: 'The shareable link has been copied.' });
  };

  const downloadFile = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderStatus = () => {
    switch (status) {
      case 'waiting': return <div className="flex items-center text-yellow-500"><Loader2 className="animate-spin mr-2" />Waiting for another user to join...</div>;
      case 'connecting': return <div className="flex items-center text-red-500"><Loader2 className="animate-spin mr-2" />Connecting to peer...</div>;
      case 'connected': return <div className="flex items-center text-green-500"><CheckCircle className="mr-2" />Connected to peer. You can now share files and chat.</div>;
      case 'disconnected': return <div className="flex items-center text-gray-500"><XCircle className="mr-2" />Peer has disconnected.</div>;
      case 'error': return <div className="flex items-center text-red-500"><AlertCircle className="mr-2" />Error: {error}</div>;
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <Card className="shadow-xl relative overflow-hidden">
        <img
          src="/ope_ope_no_mi1.png"
          alt="Ope Ope no Mi"
          className="absolute top-0 right-0 h-32 w-32 -mr-8 -mt-4 text-red-500 opacity-10"
        />
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <img
              src="/ope_ope_no_mi1.png"
              alt="Ope Ope no Mi"
              className="h-8 w-8 drop-shadow-[0_2px_4px_rgba(239,68,68,0.4)]"
            />
            <span>Secure P2P Room</span>
          </CardTitle>
          <CardDescription>Room ID: {roomId}</CardDescription>
          <div className="pt-2">{renderStatus()}</div>
        </CardHeader>
        <CardContent>
          {status === 'waiting' && (
            <div className="text-center p-8 border-2 border-dashed rounded-lg">
              <h3 className="font-semibold text-lg mb-2">Share this room to connect</h3>
              <p className="text-gray-600 mb-4">Send the link below to the other person.</p>
              <div className="flex items-center gap-2">
                <Input value={shareableLink} readOnly />
                <Button onClick={copyLink} size="icon" className="bg-red-500 hover:bg-red-600 text-white"><Copy /></Button>
              </div>
              <div className="my-4">OR</div>
              <QRCodeSVG value={shareableLink} size={128} className="mx-auto" />
            </div>
          )}

          {(status === 'connected' || status === 'disconnected') && (
            <div className="grid md:grid-cols-2 gap-4">
              {/* File Transfer Column */}
              <div className="border-r pr-4">
                <h3 className="font-semibold mb-2 flex items-center text-red-800"><Share2 className="mr-2 text-red-500" />File Transfers</h3>
                <div className="h-96 overflow-y-auto p-2 border rounded-md bg-gray-50 space-y-2">
                  {transfers.map(t => (
                    <div key={t.id} className="p-2 border rounded-md bg-white">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold truncate">{t.name}</span>
                        <Badge variant={t.type === 'sent' ? 'secondary' : 'default'}>{t.type}</Badge>
                      </div>
                      {t.status === 'progress' && t.progress && <Progress value={t.progress.percentage} className="my-1" />}
                      {t.status === 'completed' && t.type === 'received' && t.blob && (
                        <Button onClick={() => downloadFile(t.blob!, t.name)} size="sm" className="mt-1 w-full bg-red-500 hover:bg-red-600 text-white"><Download className="mr-2" />Download</Button>
                      )}
                      {t.status === 'completed' && t.type === 'sent' && <div className="text-green-600 text-xs flex items-center mt-1"><CheckCircle className="mr-1" />Sent</div>}
                    </div>
                  ))}
                  {transfers.length === 0 && <div className="text-center text-gray-500 pt-16">No files transferred yet.</div>}
                </div>
                <Button className="w-full mt-2 bg-red-500 hover:bg-red-600 text-white" onClick={() => fileInputRef.current?.click()} disabled={status !== 'connected'}>
                  <Paperclip className="mr-2" />Send a File
                </Button>
                <Input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
              </div>
              {/* Chat Column */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center text-red-800"><Users className="mr-2 text-red-500" />Chat</h3>
                <div className="h-96 overflow-y-auto p-2 border rounded-md bg-gray-50 flex flex-col space-y-2">
                  {chatMessages.map(m => (
                    <div key={m.id} className={`p-2 rounded-lg max-w-xs ${m.type === 'sent' ? 'bg-red-500 text-white self-end' : 'bg-gray-200 self-start'}`}>
                      {m.message}
                    </div>
                  ))}
                  {chatMessages.length === 0 && <div className="text-center text-gray-500 pt-16">Chat is end-to-end encrypted.</div>}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    onKeyPress={e => e.key === 'Enter' && handleSendChatMessage()}
                    disabled={status !== 'connected'}
                  />
                  <Button onClick={handleSendChatMessage} disabled={status !== 'connected'} className="bg-red-500 hover:bg-red-600 text-white"><Send /></Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 