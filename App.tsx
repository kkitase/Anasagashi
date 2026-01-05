
import React, { useState, useCallback, useRef } from 'react';
import { ProfessorType, FeedbackPoint, Message } from './types';
import { PROFESSOR_CONFIGS } from './constants';
import { gemini } from './services/geminiService';
import { FileUploader } from './components/FileUploader';
import { VoiceRecorder } from './components/VoiceRecorder';
import { ProfessorSelection } from './components/ProfessorSelection';
import { FeedbackDisplay } from './components/FeedbackDisplay';

const App: React.FC = () => {
  const [step, setStep] = useState<'setup' | 'analyzing' | 'result'>('setup');
  const [professorType, setProfessorType] = useState<ProfessorType>(ProfessorType.NECHONECHO);
  const [slides, setSlides] = useState<string[]>([]);
  const [transcript, setTranscript] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackPoint[]>([]);
  const [loadingMsg, setLoadingMsg] = useState('資料を精読中...');

  const handleStartAnalysis = async () => {
    if (slides.length === 0) {
      alert("スライドを提出してください。");
      return;
    }
    setStep('analyzing');
    try {
      setLoadingMsg('教授が眼鏡をクイッと上げています...');
      const { text, feedbacks: points } = await gemini.analyzeResearch(slides, transcript, professorType);

      setLoadingMsg('声を整えています...');
      const audio = await gemini.generateProfessorVoice(text, professorType);

      setFeedbacks(points);
      setMessages([{ role: 'professor', text, audio }]);
      setStep('result');
    } catch (error) {
      console.error(error);
      alert("教授の機嫌を損ねたようです。もう一度試してください。");
      setStep('setup');
    }
  };

  const handleCounterArgument = async (text: string) => {
    const newMessage: Message = { role: 'user', text };
    setMessages(prev => [...prev, newMessage]);

    try {
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const response = await gemini.getCounterResponse(history, text, professorType);
      setMessages(prev => [...prev, { role: 'professor', text: response.text, audio: response.audio }]);
    } catch (error) {
      alert("教授が沈黙してしまいました。");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-700 p-4 bg-slate-800 shadow-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tighter">穴探し <span className="text-slate-500 font-normal text-sm ml-2">- 論文クラッシャー -</span></h1>
          </div>
          {step !== 'setup' && (
            <button
              onClick={() => {
                if (confirm("分析結果が消えますがよろしいですか？")) setStep('setup');
              }}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              最初からやり直す
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        {step === 'setup' && (
          <div className="max-w-4xl mx-auto p-8 space-y-12">
            <section className="text-center space-y-4">
              <h2 className="text-4xl font-extrabold text-white">その研究、穴だらけですよ？</h2>
              <p className="text-slate-400 text-lg">スライドをアップロードし、発表を録音してください。現役教授並みの鋭さで批評します。</p>
            </section>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <ProfessorSelection selected={professorType} onSelect={setProfessorType} />
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-red-500 rounded"></span>
                    プレゼン音声録音 (任意)
                  </h3>
                  <VoiceRecorder onTranscriptChange={setTranscript} />
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg h-full flex flex-col">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-blue-500 rounded"></span>
                    研究スライド (PDF)
                  </h3>
                  <FileUploader onSlidesLoaded={setSlides} />

                  <button
                    onClick={handleStartAnalysis}
                    className="mt-6 w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={slides.length === 0}
                  >
                    批評を開始する
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center h-full space-y-8 p-12">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-slate-700 border-t-red-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">👀</span>
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-xl font-bold text-white">{loadingMsg}</p>
              <p className="text-slate-500">教授は非常に厳しい方です。深呼吸してお待ちください。</p>
            </div>
          </div>
        )}

        {step === 'result' && (
          <FeedbackDisplay
            slides={slides}
            feedbacks={feedbacks}
            messages={messages}
            professorType={professorType}
            onCounter={handleCounterArgument}
          />
        )}
      </main>

      <footer className="p-4 text-center text-slate-600 text-xs border-t border-slate-800">
        &copy; 2024 穴探し - 完璧な論理を目指す研究者のためのアプリ
      </footer>
    </div>
  );
};

export default App;
