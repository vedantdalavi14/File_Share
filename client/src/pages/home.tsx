import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Upload,
  Shield,
  Users,
  Clock,
  QrCode,
  ArrowRightLeft,
  Server,
  Wifi,
  Smartphone,
  UserX,
  Trash2
} from 'lucide-react';

export default function Home() {
  console.log('🏠 Home page loaded - SnapShare Hybrid');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-500 w-12 h-12 rounded-xl flex items-center justify-center mr-3">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-gray-800">SnapShare Hybrid</h1>
              <p className="text-sm text-gray-600">Secure File Sharing Platform</p>
            </div>
            <div className="ml-auto">
              <Badge variant="outline" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                End-to-end encrypted
              </Badge>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            Share Files <span className="text-blue-500">Securely</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose your preferred sharing method. No account required, completely private,
            and secure.
          </p>
        </div>

        {/* Main Options */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">

          {/* P2P Share Option */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="bg-blue-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Zap className="h-8 w-8 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-gray-800 mb-3">Instant P2P Share</h3>
                <p className="text-gray-600 mb-6">
                  Direct peer-to-peer transfer using WebRTC. No server storage, maximum privacy.
                </p>

                {/* Features */}
                <div className="space-y-3 mb-6 text-left">
                  <div className="flex items-center text-gray-700">
                    <Zap className="h-4 w-4 mr-3 text-blue-500" />
                    <span className="text-sm">Real-time transfer</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Server className="h-4 w-4 mr-3 text-blue-500" />
                    <span className="text-sm">No server storage</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Users className="h-4 w-4 mr-3 text-blue-500" />
                    <span className="text-sm">Direct connection</span>
                  </div>
                </div>

                <Link href="/p2p">
                  <Button className="w-full bg-blue-500 hover:bg-blue-600" size="lg">
                    Start P2P Share
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Upload & Share Option */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="bg-purple-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Upload className="h-8 w-8 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-gray-800 mb-3">Upload & Share</h3>
                <p className="text-gray-600 mb-6">
                  Upload to secure cloud storage with 24-hour expiration and QR code sharing.
                </p>

                {/* Features */}
                <div className="space-y-3 mb-6 text-left">
                  <div className="flex items-center text-gray-700">
                    <Clock className="h-4 w-4 mr-3 text-purple-500" />
                    <span className="text-sm">24-hour expiry</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <QrCode className="h-4 w-4 mr-3 text-purple-500" />
                    <span className="text-sm">QR code sharing</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Shield className="h-4 w-4 mr-3 text-purple-500" />
                    <span className="text-sm">Secure links</span>
                  </div>
                </div>

                <Link href="/upload-share">
                  <Button className="w-full bg-purple-500 hover:bg-purple-600" size="lg">
                    Upload & Share
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Why Choose SnapShare */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardContent className="p-12">
            <h3 className="text-2xl font-bold text-gray-800 text-center mb-12">Why Choose SnapShare?</h3>
            <div className="grid md:grid-cols-4 gap-8">
              {/* No Account Required */}
              <div className="text-center flex flex-col items-center">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-xl bg-green-100">
                  <UserX className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">No Account Required</h4>
                <p className="text-sm text-gray-600">Start sharing immediately without registration</p>
              </div>

              {/* End-to-End Security */}
              <div className="text-center flex flex-col items-center">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-xl bg-blue-100">
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">End-to-End Security</h4>
                <p className="text-sm text-gray-600">Files are encrypted during transfer</p>
              </div>

              {/* Mobile Optimized */}
              <div className="text-center flex flex-col items-center">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-xl bg-purple-100">
                  <Smartphone className="w-8 h-8 text-purple-600" />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Mobile Optimized</h4>
                <p className="text-sm text-gray-600">Works perfectly on all devices</p>
              </div>

              {/* Auto-Delete */}
              <div className="text-center flex flex-col items-center">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-xl bg-red-100">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Auto-Delete</h4>
                <p className="text-sm text-gray-600">Files automatically expire for security</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center mt-12 py-8 border-t border-gray-200">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100">
                <Upload className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="ml-3 text-lg font-bold text-gray-800">SnapShare Hybrid</h3>
            </div>
            <p className="text-gray-600 mb-6 text-sm">
              Secure, private, and easy file sharing. No account required.
            </p>
            <div className="text-sm text-gray-500 space-x-4">
              <span>© 2024 SnapShare</span>
              <span className="text-gray-300">•</span>
              <Link href="/privacy" className="hover:text-gray-800">Privacy Policy</Link>
              <span className="text-gray-300">•</span>
              <Link href="/terms" className="hover:text-gray-800">Terms of Service</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
