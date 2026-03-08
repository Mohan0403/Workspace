import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Upload, File, Download, Trash2 } from 'lucide-react';
import * as fileService from '../../services/fileService';

const getUploadErrorMessage = (err) => {
  const status = err.response?.status;
  const serverMessage = err.response?.data?.message;
  const rawMessage = (serverMessage || err.message || '').toLowerCase();

  if (
    status === 503 ||
    /cloudinary|must supply api_key|must supply api_secret|must supply cloud_name|upload is not configured/.test(rawMessage)
  ) {
    return 'File upload is not configured on the server yet. Ask admin to set CLOUDINARY_CLOUD_NAME (or CLOUDINARY_NAME), CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in server/.env, then restart backend.';
  }

  return serverMessage || 'Failed to upload file';
};

const FileStorage = ({ module }) => {
  const { workspaceId } = useParams();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    loadFiles();
  }, [workspaceId]);

  const loadFiles = async ({ preserveExistingOnEmpty = false } = {}) => {
    try {
      setError('');
      const { data } = await fileService.getFiles(workspaceId);
      const nextFiles = Array.isArray(data) ? data : [];
      setFiles((prevFiles) => {
        if (preserveExistingOnEmpty && prevFiles.length > 0 && nextFiles.length === 0) {
          return prevFiles;
        }
        return nextFiles;
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load files');
    }
  };

  const handleUpload = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspace', workspaceId);

    try {
      const { data: uploadedFile } = await fileService.uploadFile(formData);

      // Keep the new file visible even if the immediate refetch is briefly stale.
      setFiles((prevFiles) => {
        const exists = prevFiles.some((existingFile) => existingFile._id === uploadedFile?._id);
        if (exists) return prevFiles;

        return [
          {
            ...uploadedFile,
            uploadedBy: uploadedFile?.uploadedBy || {
              _id: user?._id,
              name: user?.name,
            },
          },
          ...prevFiles,
        ];
      });

      await loadFiles({ preserveExistingOnEmpty: true });
    } catch (err) {
      setError(getUploadErrorMessage(err));
    } finally {
      setUploading(false);
      // Allow selecting the same file again after a failed/successful upload.
      input.value = '';
    }
  };

  const handleDelete = async (fileId) => {
    if (confirm('Are you sure?')) {
      try {
        await fileService.deleteFile(fileId);
        loadFiles();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete file');
      }
    }
  };

  const handleDownload = async (file) => {
    try {
      const response = await fetch(file.url);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = file.name || 'download';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError('Failed to download file. Please try again.');
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">File Storage</h3>
        <label className="cursor-pointer bg-accent hover:bg-accent-glow px-3 py-1 rounded-lg text-sm flex items-center">
          <Upload size={16} className="mr-1" />
          Upload
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
      {error && <div className="mb-3 text-sm text-red-400">{error}</div>}
      <div className="space-y-2">
        {files.map((file) => (
          <div key={file._id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
            <div className="flex items-center">
              <File size={20} className="mr-3 text-gray-400" />
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-xs text-gray-400">{formatBytes(file.size)} • Uploaded by {file.uploadedBy?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleDownload(file)}
                className="p-1 hover:bg-white/10 rounded"
                aria-label={`Download ${file.name}`}
              >
                <Download size={18} />
              </button>
              {file.uploadedBy?._id === user?._id && (
                <button onClick={() => handleDelete(file._id)} className="p-1 hover:bg-white/10 rounded text-red-400">
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        ))}
        {files.length === 0 && (
          <div className="text-center text-gray-400 py-8">No files yet. Upload one!</div>
        )}
      </div>
    </div>
  );
};

export default FileStorage;