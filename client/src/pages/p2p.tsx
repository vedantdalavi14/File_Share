import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Shield, QrCode, Zap } from 'lucide-react';
import { P2PFileSender } from '@/components/P2PFileSender.jsx';

export default function P2P() {
  console.log('⚡ P2P File Share page loaded');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Instant P2P Share</h1>
            <p className="text-gray-600 mt-1">Direct peer-to-peer transfer using WebRTC. No server storage, maximum privacy.</p>
          </div>
        </div>

        {/* Main P2P Card */}
        <P2PFileSender/>


        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1: Fast & Direct */}
          <Card className="text-center p-6">
            <Zap className="h-8 w-8 text-blue-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-800 mb-2">Fast & Direct</h3>
            <p className="text-sm text-gray-600">Files are sent directly to the other user without passing through a server.</p>
          </Card>

          {/* Feature 2: Secure & Private */}
          <Card className="text-center p-6">
            <Shield className="h-8 w-8 text-green-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-800 mb-2">Secure & Private</h3>
            <p className="text-sm text-gray-600">End-to-end encryption ensures only you and the recipient can see the files.</p>
          </Card>

          {/* Feature 3: Easy Sharing */}
          <Card className="text-center p-6">
            <QrCode className="h-8 w-8 text-blue-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-800 mb-2">QR code sharing</h3>
            <p className="text-sm text-gray-600">Easy sharing with QR codes</p>
          </Card>
        </div>
      </div>
    </div>
  );
}