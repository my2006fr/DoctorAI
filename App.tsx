
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageRole, ChatMessage, AppState } from './types.ts';
import { getTutorResponse } from './services/geminiService.ts';
import Visualizer from './components/Visualizer.tsx';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    messages: [
      {
        id: '1',
        role: MessageRole.MODEL,
        content: "Hello! I'm your DocuTutor. Upload a PDF, and I'll help you master its content with explanations and interactive diagrams.",
        timestamp: new Date()
      }
    ],
    isUploading: false,
    isProcessing: false,
    currentPdfName: null,
    currentPdfBase64: null
  });

  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [state.messages, scrollToBottom]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    setState(prev => ({ ...prev, isUploading: true }));

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setState(prev => ({
        ...prev,
        isUploading: false,
        currentPdfName: file.name,
        currentPdfBase64: base64,
        messages: [
          ...prev.messages,
          {
            id: Date.now().toString(),
            role: MessageRole.SYSTEM,
            content: `Document uploaded: ${file.name}. I've processed the content and am ready to teach!`,
            timestamp: new Date()
          }
        ]
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || state.isProcessing) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      content: input,
      timestamp: new Date()
    };

    const currentInput = input;
    setInput('');
    setState(prev => ({
      ...prev,
      isProcessing: true,
      messages: [...prev.messages, userMsg]
    }));

    try {
      const { text, visualization } = await getTutorResponse(
        state.messages,
        state.currentPdfBase64,
        currentInput
      );

      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: MessageRole.MODEL,
        content: text,
        timestamp: new Date(),
        visualization
      };

      setState(prev => ({
        ...prev,
        isProcessing: false,
        messages: [...prev.messages, modelMsg]
      }));
    } catch (error) {
      console.error(error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        messages: [
          ...prev.messages,
          {
            id: Date.now().toString(),
            role: MessageRole.MODEL,
            content: "I encountered an error while thinking. Please try again or check your file.",
            timestamp: new Date()
          }
        ]
      }));
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <i className="fas fa-graduation-cap"></i>
            DocuTutor AI
          </h1>
          <p className="text-xs text-slate-500 mt-1">Interactive Learning Environment</p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Current Session</h3>
            <div className={`p-4 rounded-xl border-2 border-dashed transition-colors ${state.currentPdfName ? 'border-blue-200 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept=".pdf"
              />
              {state.currentPdfName ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-700 truncate">
                    <i className="fas fa-file-pdf"></i>
                    {state.currentPdfName}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-blue-500 hover:underline text-left"
                  >
                    Change document
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 w-full"
                >
                  <i className="fas fa-cloud-upload-alt text-slate-400 text-xl"></i>
                  <span className="text-sm text-slate-500 font-medium">Upload PDF to start</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
             <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-600 mb-2">Tutor Strategies</h4>
                <ul className="text-xs text-slate-500 space-y-2">
                  <li className="flex gap-2"><i className="fas fa-check text-green-500"></i> Concept Summarization</li>
                  <li className="flex gap-2"><i className="fas fa-check text-green-500"></i> Visual Data Comparisons</li>
                  <li className="flex gap-2"><i className="fas fa-check text-green-500"></i> Socratic Questioning</li>
                </ul>
             </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <img src="https://picsum.photos/seed/tutor/40/40" className="w-10 h-10 rounded-full border border-slate-200" alt="Avatar" />
            <div>
              <p className="text-sm font-semibold text-slate-700">Dr. Gemini</p>
              <p className="text-xs text-green-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                Online
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        <header className="md:hidden p-4 bg-white border-b border-slate-200 flex justify-between items-center">
          <h1 className="text-lg font-bold text-blue-600">DocuTutor AI</h1>
          <button onClick={() => fileInputRef.current?.click()} className="text-blue-500 text-sm">
            <i className="fas fa-upload mr-1"></i> PDF
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {state.messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-4 ${msg.role === MessageRole.USER ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  msg.role === MessageRole.USER ? 'bg-blue-600 text-white' : 
                  msg.role === MessageRole.SYSTEM ? 'bg-slate-200 text-slate-600' : 'bg-white border border-slate-200 text-blue-600'
                }`}>
                  {msg.role === MessageRole.USER ? 'U' : msg.role === MessageRole.SYSTEM ? <i className="fas fa-cog"></i> : 'T'}
                </div>
                
                <div className={`flex flex-col max-w-[85%] ${msg.role === MessageRole.USER ? 'items-end' : 'items-start'}`}>
                  {msg.role === MessageRole.SYSTEM ? (
                    <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-200">
                      {msg.content}
                    </div>
                  ) : (
                    <div className={`p-4 rounded-2xl shadow-sm ${
                      msg.role === MessageRole.USER 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                    }`}>
                      <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-sm">
                        {msg.content.split('\n').map((line, i) => (
                          <p key={i} className={i !== 0 ? 'mt-2' : ''}>{line}</p>
                        ))}
                      </div>
                      
                      {msg.visualization && <Visualizer data={msg.visualization} />}
                    </div>
                  )}
                  <span className="text-[10px] text-slate-400 mt-1 block px-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {state.isProcessing && (
              <div className="flex gap-4 items-start animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                   <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                </div>
                <div className="bg-slate-100 rounded-2xl p-4 w-48 h-12"></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        <div className="p-4 md:p-8 bg-slate-50/80 backdrop-blur-sm border-t border-slate-200 sticky bottom-0">
          <div className="max-w-4xl mx-auto flex gap-3 relative">
            <div className="flex-1 relative">
              <textarea 
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={state.currentPdfName ? "Ask your tutor about the document..." : "Upload a PDF to start tutoring..."}
                className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 pr-12 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none overflow-hidden text-slate-700"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!input.trim() || state.isProcessing}
                className={`absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  input.trim() && !state.isProcessing ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <i className={`fas ${state.isProcessing ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
              </button>
            </div>
          </div>
          <p className="text-[10px] text-center text-slate-400 mt-3">
            DocuTutor can make mistakes. Verify important information.
          </p>
        </div>
      </main>
    </div>
  );
};

export default App;
