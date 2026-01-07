
import React, { useState, useRef } from 'react';

interface Props {
  onAudioUploaded: (base64: string, mimeType: string) => void;
  onClear: () => void;
}

export const AudioUploader: React.FC<Props> = ({ onAudioUploaded, onClear }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      onAudioUploaded(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClear();
  };

  return (
    <div className="space-y-4">
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-colors cursor-pointer ${
          fileName ? 'border-green-500 bg-green-500/5' : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
        }`}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="audio/wav,audio/mpeg,audio/mp4,audio/m4a,audio/x-m4a" 
          className="hidden" 
        />
        
        {fileName ? (
          <div className="flex flex-col items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <span className="text-sm font-medium text-slate-200 truncate max-w-[200px]">{fileName}</span>
            <button onClick={clearFile} className="text-xs text-red-400 hover:text-red-300 underline mt-1">ファイルを削除</button>
          </div>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <p className="text-sm font-bold text-slate-300">発表音声ファイル (WAV/MP3/M4A)</p>
            <p className="text-[10px] text-slate-500 mt-1">クリックしてアップロード</p>
          </>
        )}
      </div>
      <p className="text-[10px] text-slate-400">
        ※音声ファイルを提出すると、発表の内容も踏まえたより高度な批評が可能になります。
      </p>
    </div>
  );
};
