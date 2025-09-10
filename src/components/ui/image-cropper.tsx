import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crop, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageCropperProps {
  imageFile: File;
  onCrop: (croppedFile: File) => void;
  onCancel: () => void;
  disabled?: boolean;
  className?: string;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
  imageFile,
  onCrop,
  onCancel,
  disabled = false,
  className
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [imageUrl, setImageUrl] = useState<string>('');

  useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleImageLoad = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;

    const container = containerRef.current;
    if (!container) return;

    // Calculate initial crop area (centered square)
    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    
    const size = Math.min(imgRect.width, imgRect.height, 200);
    const x = (imgRect.width - size) / 2;
    const y = (imgRect.height - size) / 2;
    
    setCropArea({ x, y, width: size, height: size });
    setImageLoaded(true);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDragging(true);
    setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
  }, [disabled, cropArea]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || disabled) return;

    const rect = containerRef.current?.getBoundingClientRect();
    const img = imageRef.current;
    if (!rect || !img) return;

    const x = e.clientX - rect.left - dragStart.x;
    const y = e.clientY - rect.top - dragStart.y;
    
    const imgRect = img.getBoundingClientRect();
    const maxX = imgRect.width - cropArea.width;
    const maxY = imgRect.height - cropArea.height;
    
    setCropArea(prev => ({
      ...prev,
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY))
    }));
  }, [isDragging, disabled, dragStart, cropArea.width, cropArea.height]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.1, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    handleImageLoad();
  }, [handleImageLoad]);

  const cropImage = useCallback(async () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for the crop
    const cropSize = 300; // Output size
    canvas.width = cropSize;
    canvas.height = cropSize;

    // Calculate scale factor
    const imgRect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / imgRect.width;
    const scaleY = img.naturalHeight / imgRect.height;

    // Draw the cropped portion
    ctx.drawImage(
      img,
      cropArea.x * scaleX,
      cropArea.y * scaleY,
      cropArea.width * scaleX,
      cropArea.height * scaleY,
      0,
      0,
      cropSize,
      cropSize
    );

    // Convert to blob and create file
    canvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], imageFile.name, {
          type: imageFile.type,
          lastModified: Date.now()
        });
        onCrop(croppedFile);
      }
    }, imageFile.type, 0.9);
  }, [cropArea, imageFile, onCrop]);

  return (
    <Card className={cn("w-full max-w-2xl mx-auto", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crop className="h-5 w-5" />
          Crop Image
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div 
          ref={containerRef}
          className="relative border rounded-lg overflow-hidden bg-muted"
          style={{ height: '300px' }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Image to crop"
            className="w-full h-full object-contain"
            style={{ transform: `scale(${zoom})` }}
            onLoad={handleImageLoad}
            draggable={false}
          />
          
          {imageLoaded && (
            <>
              {/* Crop overlay */}
              <div
                className="absolute border-2 border-primary bg-primary/10 cursor-move"
                style={{
                  left: cropArea.x,
                  top: cropArea.y,
                  width: cropArea.width,
                  height: cropArea.height,
                }}
                onMouseDown={handleMouseDown}
              >
                {/* Corner handles */}
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-primary border border-background rounded-full"></div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary border border-background rounded-full"></div>
                <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-primary border border-background rounded-full"></div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary border border-background rounded-full"></div>
              </div>
              
              {/* Dark overlay for uncropped areas */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Top */}
                <div 
                  className="absolute bg-black/50"
                  style={{ 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    height: cropArea.y 
                  }}
                />
                {/* Bottom */}
                <div 
                  className="absolute bg-black/50"
                  style={{ 
                    bottom: 0, 
                    left: 0, 
                    right: 0, 
                    top: cropArea.y + cropArea.height
                  }}
                />
                {/* Left */}
                <div 
                  className="absolute bg-black/50"
                  style={{ 
                    top: cropArea.y, 
                    left: 0, 
                    width: cropArea.x,
                    height: cropArea.height
                  }}
                />
                {/* Right */}
                <div 
                  className="absolute bg-black/50"
                  style={{ 
                    top: cropArea.y, 
                    right: 0, 
                    left: cropArea.x + cropArea.width,
                    height: cropArea.height
                  }}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={disabled || zoom <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={disabled || zoom >= 3}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={disabled}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onCancel} disabled={disabled}>
              Cancel
            </Button>
            <Button onClick={cropImage} disabled={disabled || !imageLoaded}>
              <Crop className="h-4 w-4 mr-2" />
              Crop & Save
            </Button>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
};