
import React, { useState, useRef, useCallback } from 'react';

// Use standard window.pdfjsLib loaded from CDN
declare const pdfjsLib: any;

interface Props {
  onSlidesLoaded: (images: string[]) => void;
  currentSlides: string[];
}

export const FileUploader: React.FC<Props> = ({ onSlidesLoaded, currentSlides }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      alert("PDFファイルのみ対応しています。");
      return;
    }

    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const images: string[] = [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // 解析上限を20枚に増加
      for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx!, viewport }).promise;
        images.push(canvas.toDataURL('image/png'));
      }

      onSlidesLoaded(images);
    } catch (err) {
      console.error(err);
      alert("PDFの読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [onSlidesLoaded]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`flex-[0_0_auto] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 transition-colors text-center cursor-pointer ${
          isDragging ? 'bg-blue-500/10 border-blue-500' : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
          className="hidden"
          accept=".pdf"
        />
        
        {loading ? (
          <div className="space-y-2">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-slate-400">スライドを解析中...</p>
          </div>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-bold text-slate-300">PDFをドラッグ＆ドロップ</p>
            <p className="text-[10px] text-slate-500 mt-1">またはクリックして選択 (最大20枚)</p>
          </>
        )}
      </div>

      {currentSlides.length > 0 && (
        <div className="flex-1 overflow-y-auto bg-slate-900/50 rounded-xl p-3 border border-slate-700 min-h-[150px]">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">プレビュー ({currentSlides.length}枚)</p>
          <div className="grid grid-cols-2 gap-2">
            {currentSlides.map((src, i) => (
              <div key={i} className="relative group aspect-video bg-black rounded border border-slate-600 overflow-hidden">
                <img src={src} className="w-full h-full object-contain" alt={`Preview ${i+1}`} />
                <div className="absolute bottom-0 right-0 bg-black/50 text-[8px] px-1 text-white">{i+1}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
