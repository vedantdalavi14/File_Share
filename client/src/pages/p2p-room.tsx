import { useParams } from "wouter";
import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Wifi, WifiOff, Upload, Download, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatFileSize } from "@/lib/file-utils";
import { io, Socket } from "socket.io-client";

interface FileTransferState {
  isActive: boolean;
  fileName: string;
  fileSize: number;
  progress: number;
  direction: 'sending' | 'receiving';
}

export default function P2PRoom() {
  const { roomId } = useParams();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const [fileTransfer, setFileTransfer] = useState<FileTransferState>({
    isActive: false,
    fileName: '',
    fileSize: 0,
    progress: 0,
    direction: 'sending'
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isHost, setIsHost] = useState<boolean | null>(null);
  const isHostRef = useRef<boolean | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const receivedChunks = useRef<Uint8Array[]>([]);
  const fileMetadata = useRef<{ name: string; size: number; type: string } | null>(null);
  // Track if isHost has been set
  const isHostSet = useRef(false);

  useEffect(() => {
    if (!roomId) return;

    // Initialize Socket.IO connection
    socketRef.current = io();
    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected, my id:', socket.id);
      socket.emit('join-room', roomId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });

    socket.on('room-joined', ({ participantCount, existingPeers }) => {
      setParticipantCount(participantCount);
      if (!isHostSet.current) {
        // Only set isHost once
        const amIHost = !existingPeers || existingPeers.length === 0;
        setIsHost(amIHost);
        isHostRef.current = amIHost;
        isHostSet.current = true;
        console.log('room-joined', { participantCount, isHost: amIHost, existingPeers });
      }
    });

    socket.on('room-created', () => {
      setIsHost(true);
      setParticipantCount(1);
    });

    socket.on('error', ({ message }) => {
      if (message === "Room not found or inactive") {
        // Create the room
        socket.emit('create-room', roomId);
      } else {
        toast({
          title: "Connection Error",
          description: message,
          variant: "destructive",
        });
      }
    });

    socket.on('peer-joined', ({ peerId, isHost: peerIsHost, participantCount: newCount }) => {
      console.log('Peer joined:', peerId, 'isHost (of peer):', peerIsHost, 'my isHost:', isHostRef.current, 'my socket id:', socket.id);
      setParticipantCount(newCount);
      // Only the host (the one who created the room) should initiate the connection to the new peer
      if (isHostRef.current && peerId !== socket.id) {
        console.log('Initiating peer connection as host to guest:', peerId);
        setTimeout(() => initiatePeerConnection(peerId), 100);
      }
      console.log('peer-joined', { peerId, isHost: peerIsHost, participantCount: newCount });
    });

    socket.on('peer-left', () => {
      setParticipantCount(1);
      if (peerConnection) {
        peerConnection.close();
        setPeerConnection(null);
        setDataChannel(null);
      }
    });

    socket.on('receive-offer', async ({ offer, fromPeerId }) => {
      console.log('Received offer from', fromPeerId);
      await handleReceiveOffer(offer, fromPeerId);
      console.log('receive-offer', { offer, fromPeerId });
    });

    socket.on('receive-answer', async ({ answer, fromPeerId }) => {
      console.log('Received answer from', fromPeerId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(answer);
      }
      console.log('receive-answer', { answer, fromPeerId });
    });

    socket.on('ice-candidate', async ({ candidate, fromPeerId }) => {
      console.log('Received candidate from', fromPeerId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(candidate);
      }
      console.log('ice-candidate', { candidate, fromPeerId });
    });

    return () => {
      socket.disconnect();
      if (peerConnection) {
        peerConnection.close();
      }
    };
  }, [roomId]);

  const initiatePeerConnection = async (targetPeerId: string) => {
    console.log('initiatePeerConnection called with targetPeerId:', targetPeerId);
    if (peerConnection) {
      peerConnection.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Only the host should create the data channel
    if (isHostRef.current) {
      const dc = pc.createDataChannel('fileTransfer', { 
        ordered: true,
        maxRetransmits: 3
      });
      setupDataChannel(dc);
      setDataChannel(dc);
      console.log('Host created data channel');
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log('Emitting ice-candidate to', targetPeerId);
        socketRef.current.emit('ice-candidate', {
          roomId,
          candidate: event.candidate,
          targetPeerId
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('PeerConnection state:', pc.connectionState);
    };
    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
    };
    pc.onicegatheringstatechange = () => {
      console.log('ICE gathering state:', pc.iceGatheringState);
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (socketRef.current) {
        console.log('Emitting send-offer to', targetPeerId);
        socketRef.current.emit('send-offer', {
          roomId,
          offer,
          targetPeerId
        });
      }
    } catch (error) {
      console.error('Error creating offer:', error);
      toast({
        title: "Connection Error",
        description: "Failed to create connection offer.",
        variant: "destructive",
      });
    }

    setPeerConnection(pc);
  };

  const handleReceiveOffer = async (offer: RTCSessionDescriptionInit, fromPeerId: string) => {
    console.log('handleReceiveOffer called with fromPeerId:', fromPeerId);
    if (peerConnection) {
      peerConnection.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Only the guest sets up the data channel in ondatachannel
    pc.ondatachannel = (event) => {
      const dc = event.channel;
      setupDataChannel(dc);
      setDataChannel(dc);
      console.log('Guest received data channel');
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log('Emitting ice-candidate to', fromPeerId);
        socketRef.current.emit('ice-candidate', {
          roomId,
          candidate: event.candidate,
          targetPeerId: fromPeerId
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('PeerConnection state:', pc.connectionState);
    };
    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
    };
    pc.onicegatheringstatechange = () => {
      console.log('ICE gathering state:', pc.iceGatheringState);
    };

    try {
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (socketRef.current) {
        console.log('Emitting send-answer to', fromPeerId);
        socketRef.current.emit('send-answer', {
          roomId,
          answer,
          targetPeerId: fromPeerId
        });
      }
    } catch (error) {
      console.error('Error handling offer:', error);
      toast({
        title: "Connection Error",
        description: "Failed to handle connection offer.",
        variant: "destructive",
      });
    }

    setPeerConnection(pc);
  };

  const setupDataChannel = (dc: RTCDataChannel) => {
    console.log('Setting up data channel:', dc.label, 'State:', dc.readyState);
    dc.binaryType = 'arraybuffer';

    dc.onopen = () => {
      console.log('Data channel opened successfully');
      toast({
        title: "Connected",
        description: "Ready to transfer files!",
      });
    };

    dc.onclose = () => {
      console.log('Data channel closed');
    };

    dc.onerror = (error) => {
      console.error('Data channel error:', error);
      toast({
        title: "Connection Error",
        description: "Data channel error occurred.",
        variant: "destructive",
      });
    };

    dc.onmessage = (event) => {
      console.log('Data channel message received', event);
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'file-metadata') {
          console.log('Receiving file metadata:', data);
          fileMetadata.current = data;
          receivedChunks.current = [];
          setFileTransfer({
            isActive: true,
            fileName: data.name,
            fileSize: data.size,
            progress: 0,
            direction: 'receiving'
          });
        } else if (data.type === 'file-chunk') {
          const chunk = new Uint8Array(data.chunk);
          receivedChunks.current.push(chunk);
          
          const totalReceived = receivedChunks.current.reduce((sum, chunk) => sum + chunk.length, 0);
          const progress = Math.min((totalReceived / fileMetadata.current!.size) * 100, 100);
          
          setFileTransfer(prev => ({ ...prev, progress }));
          
          if (totalReceived >= fileMetadata.current!.size) {
            // File transfer complete
            console.log('File transfer complete');
            const blob = new Blob(receivedChunks.current, { type: fileMetadata.current!.type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileMetadata.current!.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            setFileTransfer(prev => ({ ...prev, isActive: false, progress: 100 }));
            toast({
              title: "Download Complete",
              description: `${fileMetadata.current!.name} has been downloaded.`,
            });
            
            // Reset for next transfer
            setTimeout(() => {
              setFileTransfer({
                isActive: false,
                fileName: '',
                fileSize: 0,
                progress: 0,
                direction: 'sending'
              });
            }, 3000);
          }
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    dc.onbufferedamountlow = () => {
      console.log('Data channel bufferedAmountLow event');
    };

    // Log all state changes
    dc.addEventListener('open', () => console.log('Data channel event: open'));
    dc.addEventListener('close', () => console.log('Data channel event: close'));
    dc.addEventListener('error', (e) => console.log('Data channel event: error', e));
    dc.addEventListener('message', (e) => console.log('Data channel event: message', e));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const sendFile = async () => {
    if (!selectedFile || !dataChannel || dataChannel.readyState !== 'open') {
      toast({
        title: "Cannot send file",
        description: dataChannel ? 
          `Connection not ready. Status: ${dataChannel.readyState}` : 
          "No peer connection established.",
        variant: "destructive",
      });
      return;
    }

    console.log('Starting file transfer:', selectedFile.name, selectedFile.size);
    console.log('DataChannel state:', dataChannel.readyState);

    // Send file metadata first
    const metadata = {
      type: 'file-metadata',
      name: selectedFile.name,
      size: selectedFile.size,
      mimeType: selectedFile.type
    };
    
    try {
      dataChannel.send(JSON.stringify(metadata));
      console.log('Sent metadata:', metadata);
    } catch (error) {
      console.error('Error sending metadata:', error);
      toast({
        title: "Transfer Error",
        description: "Failed to send file metadata.",
        variant: "destructive",
      });
      return;
    }
    
    setFileTransfer({
      isActive: true,
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      progress: 0,
      direction: 'sending'
    });

    // Send file in chunks
    const chunkSize = 8192; // 8KB chunks for better reliability
    const fileReader = new FileReader();
    let offset = 0;
    let chunkCount = 0;

    const sendNextChunk = () => {
      if (offset >= selectedFile.size) {
        console.log('File transfer complete');
        setFileTransfer(prev => ({ ...prev, isActive: false, progress: 100 }));
        setSelectedFile(null);
        toast({
          title: "Transfer Complete",
          description: `${selectedFile.name} has been sent successfully.`,
        });
        
        // Reset for next transfer
        setTimeout(() => {
          setFileTransfer({
            isActive: false,
            fileName: '',
            fileSize: 0,
            progress: 0,
            direction: 'sending'
          });
        }, 3000);
        return;
      }

      const slice = selectedFile.slice(offset, offset + chunkSize);
      fileReader.readAsArrayBuffer(slice);
    };

    fileReader.onload = () => {
      try {
        const chunk = new Uint8Array(fileReader.result as ArrayBuffer);
        const chunkData = {
          type: 'file-chunk',
          chunk: Array.from(chunk),
          chunkIndex: chunkCount++
        };
        
        dataChannel.send(JSON.stringify(chunkData));
        
        offset += chunk.length;
        const progress = Math.min((offset / selectedFile.size) * 100, 100);
        setFileTransfer(prev => ({ ...prev, progress }));
        
        // Add small delay between chunks to prevent overwhelming the connection
        setTimeout(sendNextChunk, 10);
        
      } catch (error) {
        console.error('Error sending chunk:', error);
        toast({
          title: "Transfer Error",
          description: "Error occurred during file transfer.",
          variant: "destructive",
        });
        setFileTransfer(prev => ({ ...prev, isActive: false }));
      }
    };

    fileReader.onerror = () => {
      console.error('FileReader error');
      toast({
        title: "File Read Error",
        description: "Could not read the selected file.",
        variant: "destructive",
      });
      setFileTransfer(prev => ({ ...prev, isActive: false }));
    };

    sendNextChunk();
  };

  const goHome = () => {
    window.location.href = '/';
  };

  const shareRoomLink = () => {
    const roomUrl = `${window.location.origin}/p2p/${roomId}`;
    navigator.clipboard.writeText(roomUrl).then(() => {
      toast({
        title: "Link Copied",
        description: "Room link has been copied to clipboard.",
      });
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">P2P File Transfer</h2>
          <Button variant="ghost" onClick={goHome} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* Connection Status */}
        <Card className="mb-6 border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {isConnected ? (
                  <Wifi className="w-5 h-5 text-green-500" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-500" />
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {isConnected ? 'Connected' : 'Connecting...'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Room: {roomId}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{participantCount}/2</span>
                </div>
                <Button
                  onClick={shareRoomLink}
                  size="sm"
                  variant="outline"
                  className="border-gray-300"
                >
                  Share Room Link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {participantCount < 2 && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">Waiting for peer</p>
                  <p className="text-sm text-amber-700">
                    Share the room link with someone to start file transfer
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* File Transfer Interface */}
        {participantCount === 2 && (
          <Card className="border-gray-200">
            <CardContent className="p-8">
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Transfer Files</h3>
                  <p className="text-gray-600">Select a file to send to your peer</p>
                </div>

                {!fileTransfer.isActive && !selectedFile && (
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-500 transition-colors duration-300 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Upload className="text-blue-600 text-2xl" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Select File to Send</h4>
                    <p className="text-gray-500 mt-2">Click to browse files on your device</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </div>
                )}

                {selectedFile && !fileTransfer.isActive && (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Upload className="text-blue-600 text-lg" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => setSelectedFile(null)}
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </Button>
                    </div>
                    <div className="flex space-x-4">
                      <Button
                        onClick={sendFile}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Send File
                      </Button>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="border-gray-300"
                      >
                        Choose Different File
                      </Button>
                    </div>
                  </div>
                )}

                {fileTransfer.isActive && (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      {fileTransfer.direction === 'sending' ? (
                        <Upload className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Download className="w-5 h-5 text-green-600" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {fileTransfer.direction === 'sending' ? 'Sending' : 'Receiving'}: {fileTransfer.fileName}
                        </p>
                        <p className="text-sm text-gray-500">{formatFileSize(fileTransfer.fileSize)}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="text-gray-900">{Math.round(fileTransfer.progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${fileTransfer.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {fileTransfer.progress === 100 && !fileTransfer.isActive && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">Transfer Complete!</p>
                        <p className="text-sm text-green-700">
                          {fileTransfer.direction === 'sending' ? 'File sent successfully' : 'File downloaded successfully'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}