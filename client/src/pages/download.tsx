import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, Clock, AlertTriangle, ServerCrash } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FileDetails {
  uuid: string;
  fileName: string;
  fileSize: number;
  expiresAt: string;
  downloadUrl: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function DownloadPage() {
  const [match, params] = useRoute('/download/:uuid');
  const uuid = params?.uuid;

  const [fileDetails, setFileDetails] = useState<FileDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uuid) {
      setError("No file identifier provided.");
      setIsLoading(false);
      return;
    }

    const fetchFileDetails = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/files/${uuid}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'File not found or has expired.');
        }
        const data: FileDetails = await response.json();
        setFileDetails(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFileDetails();
  }, [uuid]);

  const handleDownload = () => {
    if (fileDetails) {
      // Create a temporary anchor element to trigger the download
      // with the correct original filename.
      const link = document.createElement('a');
      link.href = fileDetails.downloadUrl;
      link.setAttribute('download', fileDetails.fileName);
      
      // Append to the document, click, and then remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Alert variant="destructive" className="w-full max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!fileDetails) {
     return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Alert variant="destructive" className="w-full max-w-md">
           <ServerCrash className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Could not load file details.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Ready to Download</CardTitle>
          <CardDescription>Your file is prepared and waiting for you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <FileText className="h-10 w-10 text-purple-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-800 dark:text-gray-200 break-words" title={fileDetails.fileName}>
                {fileDetails.fileName}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{formatFileSize(fileDetails.fileSize)}</p>
            </div>
          </div>

          <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            <Clock className="h-4 w-4 mr-2" />
            <span>Expires {formatDistanceToNow(new Date(fileDetails.expiresAt), { addSuffix: true })}</span>
          </div>
          
          <Button className="w-full bg-purple-600 hover:bg-purple-700" size="lg" onClick={handleDownload}>
            <Download className="mr-2 h-5 w-5" />
            Download File
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 