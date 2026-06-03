import React, { useRef, useState } from "react";

interface AvatarUploadProps {
  playerId: string;
  onUploadSuccess?: (avatarKey: string) => void;
  onUploadError?: (error: string) => void;
  onClose?: () => void;
}

const MAX_SIZE_MB = 5;
const PREVIEW_SIZE = 200;

export default function AvatarUpload({
  playerId,
  onUploadSuccess,
  onUploadError,
  onClose,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_SIZE_MB) {
      setError(`File size ${fileSizeMB.toFixed(2)}MB exceeds maximum ${MAX_SIZE_MB}MB`);
      setPreview(null);
      setSelectedFile(null);
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("File must be an image (JPEG, PNG, WebP, GIF)");
      setPreview(null);
      setSelectedFile(null);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      setSelectedFile(file);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("playerId", playerId);
      formData.append("image", selectedFile);

      const response = await fetch("/api/avatar/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await response.json();
      console.log("✓ Avatar uploaded successfully:", data.avatarKey);

      setPreview(null);
      setSelectedFile(null);
      
      onUploadSuccess?.(data.avatarKey);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to upload avatar";
      console.error("Avatar upload error:", err);
      setError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
        <h2 className="text-xl font-bold">Upload Avatar</h2>

        {/* Preview */}
        {preview && (
          <div className="flex justify-center">
            <img
              src={preview}
              alt="Preview"
              className="w-32 h-32 rounded-full object-cover border-4 border-blue-500"
            />
          </div>
        )}

        {/* File Input */}
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={loading}
            className="block w-full text-sm text-gray-600
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              disabled:opacity-50"
          />
          <p className="text-xs text-gray-500">
            Max size: {MAX_SIZE_MB}MB • Formats: JPEG, PNG, WebP, GIF
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-4">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || loading}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
