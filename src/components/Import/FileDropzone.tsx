import React, { useState, useRef, type DragEvent } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  selectedFile?: File | null;
  onClear?: () => void;
}

export function FileDropzone({ onFileSelect, accept = '.csv,.xlsx,.xls', selectedFile, onClear }: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };
  const handleClick = () => inputRef.current?.click();
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  if (selectedFile) {
    return (
      <div className="flex items-center gap-3 p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl">
        <FileSpreadsheet size={24} className="text-teal-600 dark:text-teal-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{selectedFile.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</div>
        </div>
        {onClear && (
          <button onClick={onClear} className="p-1 rounded-md hover:bg-teal-100 dark:hover:bg-teal-900/40 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
        ${isDragOver
          ? 'border-teal-400 bg-teal-50/50 dark:bg-teal-900/20 dark:border-teal-600'
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
        }
      `}
    >
      <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
      <Upload size={32} className={`mx-auto mb-3 ${isDragOver ? 'text-teal-500' : 'text-gray-400 dark:text-gray-500'}`} />
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Drop your file here, or <span className="text-teal-600 dark:text-teal-400">browse</span>
      </div>
      <div className="text-xs text-gray-400 dark:text-gray-500">Supports CSV and Excel (.xlsx) files</div>
    </div>
  );
}
