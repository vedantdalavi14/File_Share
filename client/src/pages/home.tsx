import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share, Shield, Upload, Zap, Users, Smartphone, Trash2, UserX } from "lucide-react";
import UploadInterface from "@/components/upload-interface";
import P2PInterface from "@/components/p2p-interface";

export default function Home() {
  const [selectedMode, setSelectedMode] = useState<string | null>(null);

  if (selectedMode === "upload") {
    return <UploadInterface onBack={() => setSelectedMode(null)} />;
  }

  if (selectedMode === "p2p") {
    return <P2PInterface onBack={() => setSelectedMode(null)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Share className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">SnapShare Hybrid</h1>
                <p className="text-sm text-gray-500">Secure File Sharing Platform</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Shield className="text-green-600 w-4 h-4" />
                <span>End-to-end encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="text-center space-y-4 mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Share Files <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">Securely</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose your preferred sharing method. No account required, completely private, and secure.
          </p>
        </div>

        {/* Mode Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          {/* P2P Mode Card */}
          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-gray-200">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                  <Zap className="text-white text-2xl" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-gray-900">Instant P2P Share</h3>
                  <p className="text-gray-600">Direct peer-to-peer transfer using WebRTC. No server storage, maximum privacy.</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                    <Zap className="w-4 h-4" />
                    <span>Real-time transfer</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                    <Shield className="w-4 h-4" />
                    <span>No server storage</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                    <Users className="w-4 h-4" />
                    <span>Direct connection</span>
                  </div>
                </div>
                <Button 
                  onClick={() => setSelectedMode("p2p")}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 px-6 rounded-xl font-semibold"
                >
                  Start P2P Share
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upload & Share Mode Card */}
          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-gray-200">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                  <Upload className="text-white text-2xl" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-gray-900">Upload & Share</h3>
                  <p className="text-gray-600">Upload to secure cloud storage with 24-hour expiration and QR code sharing.</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                    <Trash2 className="w-4 h-4" />
                    <span>24-hour expiry</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                    <Smartphone className="w-4 h-4" />
                    <span>QR code sharing</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                    <Shield className="w-4 h-4" />
                    <span>Secure links</span>
                  </div>
                </div>
                <Button 
                  onClick={() => setSelectedMode("upload")}
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3 px-6 rounded-xl font-semibold"
                >
                  Upload & Share
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <Card className="border-gray-200">
          <CardContent className="p-8">
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">Why Choose SnapShare?</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto">
                  <UserX className="text-green-600 text-xl" />
                </div>
                <h4 className="font-semibold text-gray-900">No Account Required</h4>
                <p className="text-sm text-gray-600">Start sharing immediately without registration</p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto">
                  <Shield className="text-blue-600 text-xl" />
                </div>
                <h4 className="font-semibold text-gray-900">End-to-End Security</h4>
                <p className="text-sm text-gray-600">Files are encrypted during transfer</p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto">
                  <Smartphone className="text-purple-600 text-xl" />
                </div>
                <h4 className="font-semibold text-gray-900">Mobile Optimized</h4>
                <p className="text-sm text-gray-600">Works perfectly on all devices</p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto">
                  <Trash2 className="text-red-500 text-xl" />
                </div>
                <h4 className="font-semibold text-gray-900">Auto-Delete</h4>
                <p className="text-sm text-gray-600">Files automatically expire for security</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Share className="text-white text-sm" />
              </div>
              <span className="font-semibold text-gray-900">SnapShare Hybrid</span>
            </div>
            <p className="text-sm text-gray-500">Secure, private, and easy file sharing. No account required.</p>
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-400">
              <span>© 2024 SnapShare</span>
              <span>•</span>
              <a href="#" className="hover:text-gray-600 transition-colors">Privacy Policy</a>
              <span>•</span>
              <a href="#" className="hover:text-gray-600 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
