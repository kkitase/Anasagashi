import React, { useState, useEffect, useRef } from 'react';
import { ProfessorType, FeedbackPoint, Message } from '../types';

interface Props {
  reportText: string;
  feedbacks: FeedbackPoint[];
  messages: Message[];
  professorType: ProfessorType;
  onCounter: (text: string) => void;
}

export const FeedbackDisplay: React.FC<Props> = ({ reportText, feedbacks, messages, professorType, onCounter }) => {
  const [inputText, setInputText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Play the latest professor voice automatically
    const latestMsg = messages[messages.length - 1];
    if (latestMsg && latestMsg.role === 'professor' && latestMsg.audio) {
      playAudio(latestMsg.audio);
    }
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const playAudio = async (base64: string) => {
    try {
      setIsPlaying(true);
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
    } catch (e) {
      console.error(e);
      setIsPlaying(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onCounter(inputText);
    setInputText('');
  };

  // ハイライトされたテキストを生成する関数
  const renderHighlightedText = () => {
    if (!feedbacks || feedbacks.length === 0) return reportText;

    let parts: (string | React.ReactNode)[] = [reportText];

    // 指摘箇所を長い順にソート（入れ子対策の簡易版）
    const sortedFeedbacks = [...feedbacks].sort((a, b) => b.originalText.length - a.originalText.length);

    sortedFeedbacks.forEach((fb) => {
      const newParts: (string | React.ReactNode)[] = [];
      parts.forEach((part) => {
        if (typeof part !== 'string') {
          newParts.push(part);
          return;
        }

        const index = part.indexOf(fb.originalText);
        if (index === -1) {
          newParts.push(part);
        } else {
          newParts.push(part.substring(0, index));
          newParts.push(
            <span
              key={fb.id}
              className="bg-red-500/30 border-b-2 border-red-500 cursor-help group relative"
            >
              {fb.originalText}
              <span className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-slate-800 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none border border-red-500/50">
                <p className="font-bold text-red-400 mb-1">{fb.title}</p>
                <p className="text-slate-300">修正案: {fb.suggestion}</p>
              </span>
            </span>
          );
          newParts.push(part.substring(index + fb.originalText.length));
        }
      });
      parts = newParts;
    });

    return parts;
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-0 overflow-hidden">
      {/* Report Text & Feedbacks Area */}
      <div className="flex-1 bg-slate-900 border-r border-slate-700 overflow-y-auto p-12">
        <div className="max-w-3xl mx-auto bg-white text-slate-900 p-12 shadow-2xl rounded-sm min-h-full font-serif leading-relaxed text-lg whitespace-pre-wrap">
          {renderHighlightedText()}
        </div>
      </div>

      {/* Professor Interaction Sidebar */}
      <div className="w-full md:w-[400px] bg-slate-800 flex flex-col h-full">
        {/* Professor Profile */}
        <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex items-center gap-4">
          <div className="relative">
            <div className={`w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-2xl border-2 ${isPlaying ? 'border-red-500' : 'border-slate-500'}`}>
              👨‍🏫
            </div>
            {isPlaying && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping"></div>}
          </div>
          <div>
            <p className="font-bold text-sm">{professorType}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Professor Persona</p>
          </div>
        </div>

        {/* Chat / Feedback List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-300">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase">指摘事項</h4>
            {feedbacks.length > 0 ? feedbacks.map(fb => (
              <div key={fb.id} className="bg-red-500/5 border border-red-500/20 p-3 rounded-lg space-y-1">
                <p className="text-sm font-bold text-red-400">{fb.title}</p>
                <div className="bg-black/20 p-2 rounded text-[10px] text-slate-400 font-serif italic border-l-2 border-red-500/30">
                  "{fb.originalText}"
                </div>
                <p className="text-xs leading-relaxed mt-2">{fb.comment}</p>
                <div className="text-xs text-blue-400 mt-1 pt-1 border-t border-slate-700/50">
                  <span className="font-bold text-slate-400">修正案:</span> {fb.suggestion}
                </div>
              </div>
            )) : (
              <p className="text-xs text-slate-600 italic">このレポートへの指摘は今のところありません。完璧かもしれませんね。</p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-700 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase">対話ログ</h4>
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'professor' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed ${m.role === 'professor'
                    ? 'bg-slate-700 text-slate-200 rounded-tl-none'
                    : 'bg-blue-600 text-white rounded-tr-none'
                  }`}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Counter Argument Input */}
        <div className="p-4 bg-slate-900/50 border-t border-slate-700">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="反論または質問を入力..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </form>
          <p className="text-[10px] text-slate-500 mt-2 text-center">教授は学生の甘い反論を好みません。論理的に答えましょう。</p>
        </div>
      </div>
    </div>
  );
};
