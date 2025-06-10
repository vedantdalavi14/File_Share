import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Shield, Smartphone, Trash2, Upload, UserX } from 'lucide-react';
import { P2PFileSender } from '@/components/P2PFileSender';

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
        <Card className="mb-8 shadow-lg border-0">
          <CardContent className="p-8">
            <P2PFileSender />
          </CardContent>
        </Card>

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
      </div>

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
  );
}