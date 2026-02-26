import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Shield, Clock, Copy, Check, AlertCircle, Printer, Lock } from 'lucide-react';
import axios from 'axios';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError('');
    if (rejectedFiles.length > 0) {
      setError('Invalid file type. Please upload PDF or image files only.');
      return;
    }
    
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB.');
        return;
      }
      setFile(selectedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif']
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false
  });

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadResult(response.data);
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy link');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const resetForm = () => {
    setFile(null);
    setUploadResult(null);
    setError('');
    setCopied(false);
  };

  return (
    <div className="App">
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="logo">
              <Lock className="logo-icon" />
              <h1>SecurePrint</h1>
            </div>
            <p className="tagline">Print documents securely without risking your files</p>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <div className="features">
            <div className="feature">
              <Shield className="feature-icon" />
              <h3>AES-256 Encryption</h3>
              <p>Military-grade encryption protects your documents</p>
            </div>
            <div className="feature">
              <Clock className="feature-icon" />
              <h3>24-Hour Expiry</h3>
              <p>Links automatically expire after 24 hours</p>
            </div>
            <div className="feature">
              <Printer className="feature-icon" />
              <h3>One-Time Access</h3>
              <p>Documents are deleted immediately after viewing</p>
            </div>
          </div>

          {!uploadResult ? (
            <div className="upload-section">
              <div className="upload-card">
                <h2>Upload Your Document</h2>
                <p className="upload-description">
                  Upload PDF or image files (max 10MB). Your files will be encrypted and can only be accessed once.
                </p>

                <div
                  {...getRootProps()}
                  className={`dropzone ${isDragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
                >
                  <input {...getInputProps()} />
                  {file ? (
                    <div className="file-info">
                      <FileText className="file-icon" />
                      <div className="file-details">
                        <p className="file-name">{file.name}</p>
                        <p className="file-size">{formatFileSize(file.size)}</p>
                      </div>
                      <button className="remove-file" onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}>
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="dropzone-content">
                      <Upload className="upload-icon" />
                      <p>
                        {isDragActive
                          ? 'Drop the file here...'
                          : 'Drag & drop a file here, or click to select'}
                      </p>
                      <p className="supported-formats">
                        Supported: PDF, JPG, PNG, GIF (max 10MB)
                      </p>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="error-message">
                    <AlertCircle className="error-icon" />
                    {error}
                  </div>
                )}

                <button
                  className="upload-button"
                  onClick={handleUpload}
                  disabled={!file || uploading}
                >
                  {uploading ? (
                    <>
                      <div className="spinner"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload />
                      Upload & Generate Secure Link
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="result-section">
              <div className="success-card">
                <div className="success-header">
                  <Shield className="success-icon" />
                  <h2>Document Uploaded Successfully!</h2>
                </div>

                <div className="document-info">
                  <h3>Document Details</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Document ID:</span>
                      <span className="info-value">{uploadResult.documentId}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Expires:</span>
                      <span className="info-value">{formatDate(uploadResult.expiresAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="link-section">
                  <h3>Secure Access Link</h3>
                  <div className="link-container">
                    <input
                      type="text"
                      value={uploadResult.viewUrl}
                      readOnly
                      className="link-input"
                    />
                    <button
                      className="copy-button"
                      onClick={() => copyToClipboard(uploadResult.viewUrl)}
                    >
                      {copied ? <Check /> : <Copy />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="link-warning">
                    ⚠️ This link will expire immediately after the document is viewed or printed.
                  </p>
                </div>

                <div className="instructions">
                  <h3>How to Use</h3>
                  <ol>
                    <li>Share the secure link with your cyber café</li>
                    <li>They will open the link in a secure viewer</li>
                    <li>The document can be viewed and printed directly</li>
                    <li>The link and document are permanently deleted after access</li>
                  </ol>
                </div>

                <button className="new-upload-button" onClick={resetForm}>
                  <Upload />
                  Upload Another Document
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <p>&copy; 2026 SecurePrint. Your documents, your privacy.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
