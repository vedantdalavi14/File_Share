import { useState, useRef, useCallback } from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  Image, 
  Video, 
  Archive,
  CheckCircle,
  Clock,
  QrCode,
  Shield,
  Copy
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function UploadShare() {
  console.log('📂 Upload & Share page loaded');
  
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
    console.log('📄 File selected:', file.name, 'Size:', file.size);
    setSelectedFile(file);
    setUploadProgress(0);
    setIsComplete(false);
    setShareLink('');
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    console.log('🎯 File dropped');
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📁 File input changed');
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Get a signed URL from our server
      const initResponse = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        }),
      });

      if (!initResponse.ok) {
        throw new Error('Could not initiate upload with the server.');
      }
      
      const { signedUrl, filePath, uuid } = await initResponse.json();

      // Step 2: Upload the file directly to Supabase using the signed URL
      // We use XMLHttpRequest here to get progress tracking, which is not
      // directly available in supabase.storage.uploadToSignedUrl.
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedUrl, true);
        xhr.setRequestHeader('Content-Type', selectedFile.type);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            setUploadProgress(percentComplete);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('A network error occurred during the direct upload.'));
        };

        xhr.send(selectedFile);
      });
      
      // Step 3: Finalize the upload with our server
      const finalizeResponse = await fetch('/api/files/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuid,
          filePath,
          originalName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type,
        }),
      });

      if (!finalizeResponse.ok) {
        throw new Error('Server could not finalize the upload.');
      }

      const { shareLink: finalShareLink } = await finalizeResponse.json();
      
      setShareLink(finalShareLink);
      setIsComplete(true);
      toast({
        title: "Upload Complete",
        description: "Your file is ready to share",
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      console.log('📋 Share link copied to clipboard');
      toast({
        title: "Link Copied",
        description: "Share link copied to clipboard",
      });
    } catch (error) {
      console.error('❌ Failed to copy link:', error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy link to clipboard",
        variant: "destructive"
      });
    }
  };

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.startsWith('image/')) return <Image className="h-6 w-6" />;
    if (type.startsWith('video/')) return <Video className="h-6 w-6" />;
    if (type.includes('pdf') || type.includes('document')) return <FileText className="h-6 w-6" />;
    if (type.includes('zip') || type.includes('rar')) return <Archive className="h-6 w-6" />;
    return <FileText className="h-6 w-6" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Upload & Share</h1>
            <p className="text-gray-600 mt-1">Upload to secure cloud storage with 24-hour expiration and QR code sharing</p>
          </div>
        </div>

        {/* Main Upload Card */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="pt-8">
            {!selectedFile ? (
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-purple-400 transition-colors cursor-pointer"
                onDrop={handleFileDrop}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="bg-purple-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Drop your file here</h3>
                <p className="text-gray-600 mb-4">or click to browse</p>
                <p className="text-sm text-gray-500 mb-6">Supported: PDF, Images, Videos, Documents • Max: 100MB</p>
                
                <Button 
                  className="bg-purple-500 hover:bg-purple-600"
                >
                  Choose File
                </Button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInputChange}
                  className="hidden"
                  accept="*/*"
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selected File Info */}
                <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                  <div className="bg-purple-500 p-2 rounded-lg mr-4">
                    {getFileIcon(selectedFile)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-800 break-all line-clamp-2">{selectedFile.name}</h4>
                    <p className="text-sm text-gray-600">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  {!isUploading && !isComplete && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        console.log('🗑️ Removing selected file');
                        setSelectedFile(null);
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="space-y-3">
                    {isProcessing ? (
                      <>
                        <span className="text-sm font-medium text-gray-700">Securing file... Please wait.</span>
                        <Progress value={100} className="h-2 animate-pulse bg-purple-400" />
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Uploading...</span>
                          <span className="text-sm text-gray-600">{Math.round(uploadProgress)}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                      </>
                    )}
                  </div>
                )}

                {/* Share Link and QR Code */}
                {isComplete && shareLink && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <QrCode className="mr-2" />
                      Share Your File
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Link Section */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Shareable Link</label>
                        <div className="flex">
                          <input 
                            value={shareLink} 
                            readOnly 
                            className="flex-1 rounded-l-md border border-gray-300 bg-white px-3 py-2 text-sm font-mono"
                          />
                          <Button 
                            onClick={() => {
                              navigator.clipboard.writeText(shareLink);
                              toast({
                                title: "Link copied!",
                                description: "Share this link with anyone to download your file.",
                              });
                            }}
                            className="rounded-l-none"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Share this link with anyone to download your file</p>
                      </div>

                      {/* QR Code Section */}
                      <div className="text-center">
                        <label className="block text-sm font-medium text-gray-700 mb-2">QR Code</label>
                        <div className="inline-block p-4 bg-white border border-gray-200 rounded-lg">
                          <QRCodeSVG value={shareLink} size={128} />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Scan to open download link</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Button */}
                {!isUploading && !isComplete && (
                  <Button 
                    onClick={handleUpload}
                    className="w-full bg-purple-500 hover:bg-purple-600"
                    size="lg"
                  >
                    Upload & Share
                  </Button>
                )}

                {/* New Upload Button */}
                {isComplete && (
                  <Button 
                    onClick={() => {
                      console.log('🔄 Starting new upload');
                      setSelectedFile(null);
                      setIsComplete(false);
                      setShareLink('');
                      setUploadProgress(0);
                    }}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    Upload Another File
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card className="text-center p-4">
            <Clock className="h-8 w-8 text-purple-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-800 mb-2">24-hour expiry</h3>
            <p className="text-sm text-gray-600">Files automatically expire for security</p>
          </Card>
          
          <Card className="text-center p-4">
            <QrCode className="h-8 w-8 text-purple-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-800 mb-2">QR code sharing</h3>
            <p className="text-sm text-gray-600">Easy sharing with QR codes</p>
          </Card>
          
          <Card className="text-center p-4">
            <Shield className="h-8 w-8 text-purple-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-800 mb-2">Secure links</h3>
            <p className="text-sm text-gray-600">Encrypted and protected sharing</p>
          </Card>
        </div>
      </div>
    </div>
  );
}