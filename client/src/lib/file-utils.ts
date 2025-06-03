export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function calculateTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return "Expired";
  }
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  return `${hours}h ${minutes}m ${seconds}s`;
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'fa-image';
  if (mimeType.startsWith('video/')) return 'fa-video';
  if (mimeType === 'application/pdf') return 'fa-file-pdf';
  if (mimeType.includes('word')) return 'fa-file-word';
  if (mimeType.includes('excel') || mimeType.includes('sheet')) return 'fa-file-excel';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fa-file-powerpoint';
  if (mimeType === 'text/plain') return 'fa-file-text';
  return 'fa-file';
}
