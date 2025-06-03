import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download as DownloadIcon, AlertTriangle, ArrowLeft, Clock } from "lucide-react";
import { formatFileSize, calculateTimeRemaining } from "@/lib/file-utils";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

interface FileInfo {
  uuid: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  downloadCount: number;
  createdAt: string;
  expiresAt: string;
}

export default function Download() {
  const { uuid } = useParams();
  const { toast } = useToast();
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  const { data: fileInfo, isLoading, error } = useQuery<FileInfo>({
    queryKey: [`/api/file/${uuid}`],
    enabled: !!uuid,
  });

  useEffect(() => {
    if (fileInfo?.expiresAt) {
      const updateCountdown = () => {
        const remaining = calculateTimeRemaining(fileInfo.expiresAt);
        setTimeRemaining(remaining);
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);

      return () => clearInterval(interval);
    }
  }, [fileInfo?.expiresAt]);

  const handleDownload = async () => {
    if (!uuid) return;

    try {
      const response = await fetch(`/api/download/${uuid}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileInfo?.filename || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download started",
        description: "Your file download has begun.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "An error occurred during download.",
        variant: "destructive",
      });
    }
  };

  const goHome = () => {
    window.location.href = '/';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-600">Loading file information...</p>
        </div>
      </div>
    );
  }

  if (error || !fileInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4">
          <Card className="border-red-200">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
                  <AlertTriangle className="text-red-500 text-3xl" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900">File Not Available</h3>
                  <p className="text-gray-600">This file has either expired or doesn't exist.</p>
                </div>

                <div className="text-sm text-gray-500 space-y-1">
                  <p>• Files are automatically deleted after 24 hours</p>
                  <p>• Check if the link is correct</p>
                  <p>• Contact the sender for a new link</p>
                </div>

                <Button onClick={goHome} className="bg-blue-500 hover:bg-blue-600 text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go to SnapShare Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center font-inter">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Download File</h2>
          <p className="text-gray-600 mt-2">Secure file transfer via SnapShare</p>
        </div>

        <Card className="border-gray-200">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
                <DownloadIcon className="text-green-600 text-3xl" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">{fileInfo.filename}</h3>
                <p className="text-gray-600">{formatFileSize(fileInfo.fileSize)}</p>
              </div>

              {/* Expiry Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center justify-center space-x-2 text-amber-800">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">This file expires in:</span>
                  <span className="font-bold text-xl">{timeRemaining}</span>
                </div>
              </div>

              <Button 
                onClick={handleDownload}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-4 px-8 rounded-xl font-semibold text-lg"
              >
                <DownloadIcon className="w-5 h-5 mr-2" />
                Download File
              </Button>

              <div className="text-sm text-gray-500 space-y-1">
                <p>• File will be automatically deleted after 24 hours</p>
                <p>• This download link is secure and cannot be accessed by others</p>
                <p>• No login required</p>
                {fileInfo.downloadCount > 0 && (
                  <p>• Downloaded {fileInfo.downloadCount} time{fileInfo.downloadCount !== 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
