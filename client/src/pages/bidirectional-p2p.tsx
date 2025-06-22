import { useParams } from 'wouter';
import { BidirectionalP2PRoom } from '@/components/BidirectionalP2PRoom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function BidirectionalP2PPage() {
  const params = useParams<{ roomId?: string }>();

  if (params.roomId) {
    console.log('[BiDiPage] 🎨 Rendering room for ID:', params.roomId);
    return (
      <div className="flex-1 flex items-center justify-center">
        <BidirectionalP2PRoom roomId={params.roomId} />
      </div>
    );
  }

  console.log('[BiDiPage] ⚠️ Invalid access, no room ID provided.');
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <AlertTriangle className="text-red-500"/>
            <span>Invalid Access</span>
          </CardTitle>
          <CardDescription>
            This page cannot be accessed directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            Please create a new secure room from the <a href="/" className="text-blue-500 hover:underline">homepage</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 