import { useEffect, useRef } from "react";

interface QRCodeProps {
  value: string;
  size?: number;
}

declare global {
  interface Window {
    QRious: any;
  }
}

export default function QRCode({ value, size = 200 }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && window.QRious) {
      new window.QRious({
        element: canvasRef.current,
        size: size,
        value: value,
        background: '#ffffff',
        foreground: '#000000',
      });
    }
  }, [value, size]);

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 inline-block">
      <canvas ref={canvasRef} width={size} height={size} />
    </div>
  );
}
