import React, { useState } from 'react';
import { useFileOptimizer } from '../hooks/useFileOptimizer';
import type { ProcessedFile } from '../hooks/useFileOptimizer';

interface Props {
  label: string;
  onFileChange: (file: ProcessedFile) => void;
  accept: string;
  required?: boolean;
  maxSizeMB?: number; // Not strictly used for the prompt as we always target 3MB
  currentFileName?: string;
}

const OptimizedFileUpload: React.FC<Props> = ({ 
  label, 
  onFileChange, 
  accept, 
  required, 
  currentFileName 
}) => {
  const { optimizeFile, isOptimizing, progress } = useFileOptimizer();
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const result = await optimizeFile(file);
      setProcessedFile(result);
      onFileChange(result);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="form-group file-optimizer-wrapper" style={{ marginBottom: '16px' }}>
      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{label} {required && <span style={{ color: '#ef4444' }}>*</span>}</span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PDF / JPG (Max 3MB)</span>
      </label>
      
      <div className="optimized-upload-container" style={{ position: 'relative' }}>
        <input
          type="file"
          className="input-field"
          accept={accept}
          onChange={handleInputChange}
          style={{ padding: '8px' }}
        />

        {isOptimizing && (
          <div className="optimization-overlay" style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(4px)',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            border: '1px solid var(--primary)'
          }}>
            <div className="pulse-circle small" style={{ marginBottom: '12px' }}></div>
            <span style={{ fontSize: '12px', color: 'white', fontWeight: 600 }}>
              Optimizing Document... {Math.round(progress)}%
            </span>
            <div className="progress-bar-mini" style={{ width: '80%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.2s ease' }}></div>
            </div>
          </div>
        )}

        {(processedFile || currentFileName) && !isOptimizing && (
          <div className="file-meta-badge" style={{ 
            marginTop: '8px', 
            background: 'rgba(16, 185, 129, 0.08)', 
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              <span style={{ color: '#10b981', fontWeight: 600 }}>
                {processedFile ? processedFile.name : currentFileName}
              </span>
            </div>
            
            {processedFile && processedFile.percentageReduced > 5 && (
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                  {formatSize(processedFile.originalSize)} → 
                </span>
                <span style={{ color: '#10b981', fontWeight: 700, marginLeft: '4px' }}>
                  {formatSize(processedFile.compressedSize)}
                </span>
                <span className="reduction-pill" style={{ marginLeft: '8px', background: '#10b981', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                  -{processedFile.percentageReduced}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OptimizedFileUpload;
