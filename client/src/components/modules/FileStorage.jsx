import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Upload, File, Folder, Download, Trash2 } from 'lucide-react';
import * as fileService from '../../services/fileService';

const FileStorage = ({ module }) => {
  const { workspaceId } = useParams();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    loadFiles();
  }, [workspaceId]);

  const loadFiles = async () => {
    try {
      setError('');
      const { data } = await fileService.getFiles(workspaceId);
      setFiles(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load files');
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspace', workspaceId);
    try {
      await fileService.uploadFile(formData);
      loadFiles();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
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
              <a href={file.url} target="_blank" rel="noreferrer" className="p-1 hover:bg-white/10 rounded">
                <Download size={18} />
              </a>
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