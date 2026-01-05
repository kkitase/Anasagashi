import React, { useState, useRef, useCallback } from 'react';

interface Props {
    onTextChange: (text: string) => void;
    initialText: string;
}

export const ReportInput: React.FC<Props> = ({ onTextChange, initialText }) => {
    const [text, setText] = useState(initialText);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setText(newText);
        onTextChange(newText);
    };

    const processFile = useCallback(async (file: File) => {
        if (file.type !== 'text/plain') {
            alert("現在はテキストファイル(.txt)のみ対応しています。コピペするか、txtファイルでお試しください。");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            setText(content);
            onTextChange(content);
        };
        reader.readAsText(file);
    }, [onTextChange]);

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="space-y-4 flex flex-col h-full">
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={`relative flex-1 border-2 border-dashed rounded-xl transition-colors ${isDragging ? 'bg-blue-500/10 border-blue-500' : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
                    }`}
            >
                <textarea
                    value={text}
                    onChange={handleTextChange}
                    placeholder="レポートの文章をここに貼り付けるか、テキストファイルをドラッグ＆ドロップしてください..."
                    className="w-full h-full bg-transparent p-6 text-slate-200 focus:outline-none resize-none font-serif leading-relaxed"
                />

                {text.length === 0 && !isDragging && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-500 space-y-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm">テキストを入力するか、ファイルをドロップ</p>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 px-2">
                <span>文字数: {text.length} 文字</span>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="hover:text-slate-300 transition-colors"
                >
                    ファイルをアップロード
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                    className="hidden"
                    accept=".txt"
                />
            </div>
        </div>
    );
};
