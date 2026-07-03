import { useState, useRef } from "react";
import { UploadCloud, FileImage, AlertCircle } from "lucide-react";

interface UploadDropzoneProps {
  onFileSelected: (file: File) => void;
  className?: string;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

export default function UploadDropzone({
  onFileSelected,
  className = "",
  maxSizeMB = 10,
  acceptedTypes = ["image/jpeg", "image/png", "image/webp"],
}: UploadDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    if (!acceptedTypes.includes(file.type)) {
      setError(`Unsupported file format. Please upload JPEG, PNG, or WEBP.`);
      return false;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds limit. Max allowed is ${maxSizeMB}MB.`);
      return false;
    }
    setError("");
    return true;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        onFileSelected(file);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        onFileSelected(file);
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all ${
        isDragActive
          ? "border-teal-500 bg-teal-50/40"
          : "border-teal-500/30 bg-white hover:border-teal-400"
      } ${className}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={acceptedTypes.join(",")}
        onChange={handleFileInputChange}
      />

      <UploadCloud className={`h-12 w-12 transition-colors ${
        isDragActive ? "text-teal-600" : "text-teal-500/70"
      }`} />

      <h3 className="mt-4 text-base font-semibold text-ink">Upload Condition Scan</h3>
      <p className="mt-1 text-xs text-ink/50 max-w-xs">
        Drag and drop your photo here, or click the button below to pick from your camera roll.
      </p>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-tier-red bg-tier-red-bg p-2.5 rounded border border-tier-red/10 max-w-md">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={handleButtonClick}
          className="flex min-h-touch items-center gap-2 rounded-lg bg-teal-500 px-6 text-sm font-semibold text-white shadow shadow-teal-500/10 hover:bg-teal-600 transition-colors"
        >
          <FileImage className="h-4 w-4" />
          Select File
        </button>
      </div>
    </div>
  );
}
