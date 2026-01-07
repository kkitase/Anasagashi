
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const slideFeedbacks = feedbacks.filter(f => f.slideIndex === currentSlide);

  useEffect(() => {
    // Play the latest professor voice automatically
    const latestMsg = messages[messages.length - 1];
    if (latestMsg && latestMsg.role === 'professor' && latestMsg.audio) {
      playAudio(latestMsg.audio);
    }
    // 教授のメッセージが届いたら思考中フラグを下ろす
    if (latestMsg?.role === 'professor') {
      setIsThinking(false);
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
    if (!inputText.trim() || isThinking) return;
    setIsThinking(true);
    onCounter(inputText);
    setInputText('');
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-0 overflow-hidden">
      {/* Slide & Feedbacks Area */}
      <div className="flex-1 bg-black p-4 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="relative max-w-full max-h-full shadow-2xl">
          <img 
            src={slides[currentSlide]} 
            alt={`Slide ${currentSlide + 1}`} 
            className="max-h-[70vh] rounded-sm object-contain"
          />
          
          {/* Feedback Overlays */}
          {slideFeedbacks.map((fb) => fb.coordinates && (
            <div 
              key={fb.id}
              className="absolute border-4 border-red-500 bg-red-500/10 group cursor-help transition-all"
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
          <button 
            disabled={currentSlide === 0}
            onClick={() => setCurrentSlide(s => s - 1)}
            className="p-1 hover:text-white disabled:text-slate-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-bold min-w-[60px] text-center">
            Slide {currentSlide + 1} / {slides.length}
          </span>
          <button 
            disabled={currentSlide === slides.length - 1}
            onClick={() => setCurrentSlide(s => s + 1)}
            className="p-1 hover:text-white disabled:text-slate-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Professor Interaction Sidebar */}
      <div className="w-full md:w-[400px] bg-slate-800 border-l border-slate-700 flex flex-col h-full">
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase">指摘事項 (Slide {currentSlide + 1})</h4>
            {slideFeedbacks.length > 0 ? slideFeedbacks.map(fb => (
              <div key={fb.id} className="bg-red-500/5 border border-red-500/20 p-3 rounded-lg space-y-1">
                <p className="text-sm font-bold text-red-400">{fb.title}</p>
                <p className="text-xs text-slate-300 leading-relaxed">{fb.comment}</p>
              </div>
            )) : (
              <p className="text-xs text-slate-600 italic">このスライドへの指摘は今のところありません。</p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-700 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase">対話ログ</h4>
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'professor' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed ${
                  m.role === 'professor' 
                    ? 'bg-slate-700 text-slate-200 rounded-tl-none' 
                    : 'bg-blue-600 text-white rounded-tr-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-slate-700 text-slate-200 p-3 rounded-xl rounded-tl-none flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
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
              placeholder={isThinking ? "教授が考え中です..." : "反論または質問を入力..."}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <button 
              type="submit"
              disabled={isThinking || !inputText.trim()}
              className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg text-white transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed"
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
