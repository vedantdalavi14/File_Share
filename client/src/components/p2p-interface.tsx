import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, QrCode, Zap, Users, Share2 } from "lucide-react";
import QRCode from "./qr-code";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

interface P2PInterfaceProps {
  onBack: () => void;
}

interface CreateRoomResponse {
  success: boolean;
  roomId: string;
  roomUrl: string;
}

export default function P2PInterface({ onBack }: P2PInterfaceProps) {
  const [roomCreated, setRoomCreated] = useState(false);
  const [roomData, setRoomData] = useState<CreateRoomResponse | null>(null);
  const { toast } = useToast();

  const createRoomMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/p2p/create-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create room');
      }

      return response.json() as Promise<CreateRoomResponse>;
    },
    onSuccess: (data) => {
      setRoomData(data);
      setRoomCreated(true);
      toast({
        title: "Room Created",
        description: "Your P2P room is ready! Share the link or QR code.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create room",
        description: error instanceof Error ? error.message : "An error occurred.",
        variant: "destructive",
      });
    },
  });

  const copyRoomLink = () => {
    if (roomData) {
      const fullUrl = `${window.location.origin}/p2p/${roomData.roomId}`;
      navigator.clipboard.writeText(fullUrl).then(() => {
        toast({
          title: "Link Copied",
          description: "Room link has been copied to clipboard.",
        });
      });
    }
  };

  const joinRoom = () => {
    if (roomData) {
      window.location.href = `/p2p/${roomData.roomId}`;
    }
  };

  if (roomCreated && roomData) {
    const roomUrl = `${window.location.origin}/p2p/${roomData.roomId}`;

    return (
      <div className="min-h-screen bg-gray-50 font-inter">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">P2P Room Created</h2>
            <Button variant="ghost" onClick={onBack} className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>

          <Card className="border-gray-200">
            <CardContent className="p-8">
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                    <Zap className="text-blue-600 text-2xl" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Room Ready for P2P Transfer!</h3>
                  <p className="text-gray-600">Share this room with someone to start instant file transfer</p>
                </div>

                {/* Room Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="text-blue-600 w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-800">Room ID:</p>
                      <p className="text-sm font-mono text-blue-900">{roomData.roomId}</p>
                    </div>
                  </div>
                </div>

                {/* Sharing Options */}
                <div className="grid sm:grid-cols-2 gap-6">
                  {/* Room Link */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">Room Link</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyRoomLink}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-sm text-gray-900 font-mono break-all">
                        {roomUrl}
                      </p>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">QR Code</h4>
                    <div className="flex justify-center">
                      <QRCode value={roomUrl} size={150} />
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-medium text-gray-900 mb-4">How to use P2P Transfer</h4>
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-blue-600">1</span>
                      </div>
                      <p>Share the room link or QR code with the person you want to send files to</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-blue-600">2</span>
                      </div>
                      <p>Both people join the same room using the link</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-blue-600">3</span>
                      </div>
                      <p>Files transfer directly between devices - no server storage!</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    onClick={joinRoom}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 px-8 rounded-xl font-semibold"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Join Room Now
                  </Button>
                  <Button 
                    onClick={() => {
                      setRoomCreated(false);
                      setRoomData(null);
                    }}
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Create New Room
                  </Button>
                </div>

                {/* Features */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div className="space-y-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
                        <Zap className="w-4 h-4 text-green-600" />
                      </div>
                      <p className="text-xs text-gray-600">Instant Transfer</p>
                    </div>
                    <div className="space-y-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
                        <Users className="w-4 h-4 text-green-600" />
                      </div>
                      <p className="text-xs text-gray-600">Direct P2P</p>
                    </div>
                    <div className="space-y-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
                        <Share2 className="w-4 h-4 text-green-600" />
                      </div>
                      <p className="text-xs text-gray-600">No Server Storage</p>
                    </div>
                    <div className="space-y-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
                        <QrCode className="w-4 h-4 text-green-600" />
                      </div>
                      <p className="text-xs text-gray-600">QR Code Sharing</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Instant P2P Share</h2>
          <Button variant="ghost" onClick={onBack} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <Card className="border-gray-200">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                <Zap className="text-white text-3xl" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">Create P2P Room</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Start an instant peer-to-peer file transfer session. Files transfer directly between devices with no server storage.
                </p>
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
                <div className="text-center space-y-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
                    <Zap className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">Real-time</p>
                  <p className="text-xs text-gray-500">Instant transfer</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">Direct P2P</p>
                  <p className="text-xs text-gray-500">No intermediary</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto">
                    <Share2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">Private</p>
                  <p className="text-xs text-gray-500">No server storage</p>
                </div>
              </div>

              <Button 
                onClick={() => createRoomMutation.mutate()}
                disabled={createRoomMutation.isPending}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 px-8 rounded-xl font-semibold"
              >
                {createRoomMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Creating Room...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Create P2P Room
                  </>
                )}
              </Button>

              <div className="text-sm text-gray-500 space-y-1">
                <p>• Files transfer directly between devices</p>
                <p>• No file size limits or server storage</p>
                <p>• Maximum privacy and security</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}