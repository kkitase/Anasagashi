
import React, { useState, useEffect, useRef } from 'react';
import { ProfessorType, FeedbackPoint, Message } from '../types';
import { PROFESSOR_CONFIGS } from '../constants';

interface Props {
  slides: string[];
  feedbacks: FeedbackPoint[];
  messages: Message[];
  professorType: ProfessorType;
  onCounter: (text: string) => void;
}

export const FeedbackDisplay: React.FC<Props> = ({ slides, feedbacks, messages, professorType, onCounter }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [inputText, setInputText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const slideFeedbacks = feedbacks.filter(f => f.slideIndex === currentSlide);

  useEffect(() => {
    const latestMsg = messages[messages.length - 1];
    if (latestMsg?.role === 'professor') {
      setIsThinking(false);
    }
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const playAudio = async (base64: string) => {
    if (!base64 || isPlaying) return;
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
    if (!inputText.trim() || isThinking) return;
    setIsThinking(true);
    onCounter(inputText);
    setInputText('');
  };

  const jumpToSlide = (index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlide(index);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-0 overflow-hidden">
      {/* Slide Area */}
      <div className="flex-1 bg-black p-4 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="relative max-w-full max-h-full shadow-2xl">
          <img 
            src={slides[currentSlide]} 
            alt={`Slide ${currentSlide + 1}`} 
            className="max-h-[70vh] rounded-sm object-contain"
          />
          {slideFeedbacks.map((fb) => fb.coordinates && (
            <div 
              key={fb.id}
              className="absolute border-4 border-red-600 bg-red-500/10 group cursor-help transition-all"
              style={{
                left: `${fb.coordinates.x}%`,
                top: `${fb.coordinates.y}%`,
                width: `${fb.coordinates.w}%`,
                height: `${fb.coordinates.h}%`,
              }}
            >
              <div className="absolute -top-10 left-0 bg-red-600 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
                {fb.title}
              </div>
            </div>
          ))}
        </div>

        {/* Slide Controls */}
        <div className="absolute bottom-8 flex items-center gap-4 bg-slate-800/80 backdrop-blur px-6 py-2 rounded-full border border-slate-700">
          <button disabled={currentSlide === 0} onClick={() => setCurrentSlide(s => s - 1)} className="p-1 hover:text-white disabled:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-sm font-bold min-w-[60px] text-center">Slide {currentSlide + 1} / {slides.length}</span>
          <button disabled={currentSlide === slides.length - 1} onClick={() => setCurrentSlide(s => s + 1)} className="p-1 hover:text-white disabled:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {/* Professor Interaction Sidebar */}
      <div className="w-full md:w-[400px] bg-slate-800 border-l border-slate-700 flex flex-col h-full">
        <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex items-center gap-4">
          <div className="relative">
            <div className={`w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-2xl border-2 ${isPlaying ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'border-slate-500'}`}>
              👨‍🏫
            </div>
          </div>
          <div>
            <p className="font-bold text-sm">{professorType}</p>
            <p className="text-[10px] text-red-500 uppercase tracking-widest font-bold">WARNING: High Pressure</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase">指摘事項一覧 (クリックで移動)</h4>
            {feedbacks.length > 0 ? feedbacks.map(fb => (
              <div 
                key={fb.id} 
                onClick={() => jumpToSlide(fb.slideIndex)}
                className={`cursor-pointer transition-all border p-3 rounded-lg space-y-2 ${fb.slideIndex === currentSlide ? 'bg-red-900/40 border-red-400' : 'bg-slate-700/30 border-slate-600 hover:bg-slate-700/50'}`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 mb-1">Slide {fb.slideIndex + 1}</span>
                    <p className="text-sm font-bold text-red-400">{fb.title}</p>
                  </div>
                  {fb.audio && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); playAudio(fb.audio!); }} 
                      className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded flex items-center gap-1 shrink-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828a1 1 0 010-1.415z" clipRule="evenodd" /></svg>
                      聴く
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed italic">"{fb.comment}"</p>
              </div>
            )) : <p className="text-xs text-slate-600 italic">指摘事項の生成に失敗したか、指摘がありません。</p>}
          </div>

          <div className="pt-4 border-t border-slate-700 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase">対話ログ</h4>
            {messages.map((m, idx) => (
              <div key={idx} className={`flex flex-col ${m.role === 'professor' ? 'items-start' : 'items-end'}`}>
                <div className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed ${
                  m.role === 'professor' ? 'bg-slate-700 text-slate-200 rounded-tl-none' : 'bg-blue-600 text-white rounded-tr-none'
                }`}>
                  {m.text}
                </div>
                {m.role === 'professor' && m.audio && (
                  <button onClick={() => playAudio(m.audio!)} className="mt-1 text-[10px] text-slate-400 hover:text-red-400 flex items-center gap-1 px-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                    教授のお言葉を聴く
                  </button>
                )}
              </div>
            ))}
            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-slate-700 text-slate-200 p-3 rounded-xl rounded-tl-none flex gap-1">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
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
              disabled={isThinking}
              placeholder={isThinking ? "教授が品定め中..." : "反論する勇気はありますか？"}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-red-500 disabled:opacity-50"
            />
            <button type="submit" disabled={isThinking || !inputText.trim()} className="bg-red-700 hover:bg-red-800 p-2 rounded-lg text-white disabled:bg-slate-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
