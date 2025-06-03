import { useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClearFile: () => void;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/quicktime', 'video/avi', 'video/mov',
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain'
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export default function FileUploadZone({ onFileSelect, selectedFile, onClearFile }: FileUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "File size must be less than 100MB.",
        variant: "destructive",
      });
      return false;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "File type not supported",
        description: "Please upload PDF, images, videos, or document files only.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-purple-500', 'bg-purple-50');
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-purple-500', 'bg-purple-50');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-purple-500', 'bg-purple-50');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  if (selectedFile) {
    return null;
  }

  return (
    <div
      className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-purple-500 transition-colors duration-300 cursor-pointer group"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={openFilePicker}
    >
      <div className="space-y-4">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
          <Upload className="text-white text-3xl" />
        </div>
        <div>
          <h4 className="text-xl font-semibold text-gray-900">Drop your file here</h4>
          <p className="text-gray-500">or click to browse</p>
          <p className="text-sm text-gray-400 mt-2">
            Supported: PDF, Images, Videos, Documents • Max: 100MB
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.avi,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          onChange={handleFileInputChange}
        />
        <Button 
          type="button"
          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3 px-8 rounded-xl font-semibold"
        >
          Choose File
        </Button>
      </div>
    </div>
  );
}
