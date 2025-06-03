import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Clock, Copy, Upload } from "lucide-react";
import FileUploadZone from "./file-upload-zone";
import QRCode from "./qr-code";
import { formatFileSize, calculateTimeRemaining } from "@/lib/file-utils";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useEffect } from "react";

interface UploadInterfaceProps {
  onBack: () => void;
}

interface UploadResponse {
  success: boolean;
  fileId: string;
  filename: string;
  fileSize: number;
  downloadUrl: string;
  expiresAt: string;
}

export default function UploadInterface({ onBack }: UploadInterfaceProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      return response.json() as Promise<UploadResponse>;
    },
    onSuccess: (data) => {
      setUploadResult(data);
      setSelectedFile(null);
      toast({
        title: "Upload successful",
        description: "Your file has been uploaded and is ready to share.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred during upload.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (uploadResult?.expiresAt) {
      const updateCountdown = () => {
        const remaining = calculateTimeRemaining(uploadResult.expiresAt);
        setTimeRemaining(remaining);
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);

      return () => clearInterval(interval);
    }
  }, [uploadResult?.expiresAt]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
  };

  const copyDownloadLink = () => {
    if (uploadResult) {
      const fullUrl = `${window.location.origin}/download/${uploadResult.fileId}`;
      navigator.clipboard.writeText(fullUrl).then(() => {
        toast({
          title: "Link copied",
          description: "Download link has been copied to clipboard.",
        });
      });
    }
  };

  const uploadAnother = () => {
    setUploadResult(null);
    setSelectedFile(null);
  };

  if (uploadResult) {
    const downloadUrl = `${window.location.origin}/download/${uploadResult.fileId}`;

    return (
      <div className="min-h-screen bg-gray-50 font-inter">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Upload Complete</h2>
            <Button variant="ghost" onClick={onBack} className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>

          <Card className="max-w-4xl mx-auto border-gray-200">
            <CardContent className="p-8">
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
                    <Check className="text-green-600 text-2xl" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">File Uploaded Successfully!</h3>
                  <p className="text-gray-600">Your file will be automatically deleted after 24 hours</p>
                </div>

                {/* Expiry Countdown */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                      <Clock className="text-amber-600 w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-amber-800">Auto-delete in:</p>
                      <p className="text-2xl font-bold text-amber-900">{timeRemaining}</p>
                    </div>
                  </div>
                </div>

                {/* Sharing Options */}
                <div className="grid sm:grid-cols-2 gap-6">
                  {/* Download Link */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">Download Link</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyDownloadLink}
                        className="text-purple-600 hover:text-purple-700"
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-sm text-gray-900 font-mono break-all">
                        {downloadUrl}
                      </p>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">QR Code</h4>
                    <div className="flex justify-center">
                      <QRCode value={downloadUrl} size={150} />
                    </div>
                  </div>
                </div>

                {/* File Info */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-medium text-gray-900 mb-4">File Information</h4>
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">File Name:</span>
                      <p className="font-medium text-gray-900">{uploadResult.filename}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">File Size:</span>
                      <p className="font-medium text-gray-900">{formatFileSize(uploadResult.fileSize)}</p>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <Button 
                    onClick={uploadAnother}
                    className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3 px-8 rounded-xl font-semibold"
                  >
                    Upload Another File
                  </Button>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Upload & Share</h2>
          <Button variant="ghost" onClick={onBack} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <Card className="max-w-4xl mx-auto border-gray-200">
          <CardContent className="p-8">
            <div className="space-y-6">
              <FileUploadZone 
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
                onClearFile={clearSelectedFile}
              />

              {selectedFile && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Upload className="text-purple-600 text-xl" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{selectedFile.name}</h4>
                      <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSelectedFile}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </Button>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                      onClick={handleUpload}
                      disabled={uploadMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3 px-6 rounded-xl font-semibold"
                    >
                      {uploadMutation.isPending ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload File
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={clearSelectedFile}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Choose Different File
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
