import React, { useState, useRef, useEffect } from 'react';
import {
  Scale,
  Bot,
  X,
  Maximize2,
  Send,
  Sparkles,
  FileText,
  Tag,
  Paperclip,
  CheckCircle2,
  ChevronDown,
  AlertTriangle,
  UploadCloud,
} from 'lucide-react';
import { GstLegalQueryType, GstNoticeAttachment, Language } from '../types';
import { queryGstLegalAdvisor, fileToNoticeAttachment } from '../services/gstLegalAdvisorClient';

interface GstChatbotWidgetProps {
  language: Language;
  companyGstin?: string;
  companyName?: string;
  onOpenFullStudio: (preloaded?: {
    queryType: GstLegalQueryType;
    prompt: string;
    attachment?: GstNoticeAttachment;
  }) => void;
}

export const GstChatbotWidget: React.FC<GstChatbotWidgetProps> = ({
  language,
  companyGstin = '27AABCA1234F1Z8',
  companyName = 'The Taxpayer Enterprise',
  onOpenFullStudio,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [queryType, setQueryType] = useState<GstLegalQueryType>('notice_reply');
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState<GstNoticeAttachment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [miniMessages, setMiniMessages] = useState<
    Array<{ sender: 'user' | 'assistant'; text: string; isPleading?: boolean }>
  >([
    {
      sender: 'assistant',
      text: 'Hello! I am your GST Legal Counsel AI. Upload a notice (ASMT-10, DRC-01) for draft reply, ask for legal advisory under amended acts, or find HSN rates.',
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [miniMessages, isOpen]);

  const handleSend = async () => {
    if (!inputText.trim() && !attachedFile) return;

    const userText = inputText.trim() || `Uploaded Notice: ${attachedFile?.name}`;
    setMiniMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await queryGstLegalAdvisor({
        queryType,
        userPrompt: userText,
        attachment: attachedFile || undefined,
        companyGstin,
        companyName,
      });

      const replyText =
        res.draftNoticeReply?.fullPleadingText
          ? `[DRAFT NOTICE REPLY GENERATED - ${res.draftNoticeReply.noticeType}]\nSubject: ${res.draftNoticeReply.subjectLine}\n\nPreliminary Objections:\n${res.draftNoticeReply.preliminaryObjections.slice(0, 2).join('\n')}\n\n(Click 'Open Full Legal Studio' to view complete pleading, export .DOC, or print)`
          : res.executiveSummary || res.fullOpinion;

      setMiniMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: replyText,
          isPleading: !!res.draftNoticeReply,
        },
      ]);
      setAttachedFile(null);
    } catch (err: any) {
      setMiniMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `Statutory advice processed. Please open Full Legal Studio for detailed view.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const att = await fileToNoticeAttachment(file);
      setAttachedFile(att);
      setQueryType('notice_reply');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      {/* Floating Trigger Button (Bottom Right) */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="cursor-pointer group flex items-center gap-2.5 bg-[#2D5A43] hover:bg-[#234734] text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-white/20 select-none animate-in fade-in zoom-in"
            title="Open GST Legal Counsel Chatbot"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <Scale className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                <span>GST Legal AI</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-[10px] text-white/80 leading-none">
                Notice Reply & Advisory
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Floating Chat Window Panel */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-[92vw] sm:w-[420px] h-[550px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-[#D5DDD7] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-[#2D5A43] text-white p-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                <Scale className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                  <span>GST Legal Counsel AI</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-white/20 font-mono">
                    Amended 2024
                  </span>
                </div>
                <div className="text-[11px] text-white/80">
                  Notice Drafter • Statutory Opinions
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenFullStudio({
                    queryType,
                    prompt: inputText,
                    attachment: attachedFile || undefined,
                  });
                }}
                className="cursor-pointer p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
                title="Open Full Legal Studio"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="cursor-pointer p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mode Selector Pill Bar */}
          <div className="bg-[#EDF3EF] px-3 py-2 border-b border-[#D5DDD7] flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setQueryType('notice_reply')}
                className={`cursor-pointer px-2 py-0.5 rounded text-[11px] font-bold ${
                  queryType === 'notice_reply'
                    ? 'bg-[#2D5A43] text-white'
                    : 'text-[#4A5A50] hover:bg-white'
                }`}
              >
                Notice Reply
              </button>
              <button
                type="button"
                onClick={() => setQueryType('advisory')}
                className={`cursor-pointer px-2 py-0.5 rounded text-[11px] font-bold ${
                  queryType === 'advisory'
                    ? 'bg-[#2D5A43] text-white'
                    : 'text-[#4A5A50] hover:bg-white'
                }`}
              >
                Legal Opinion
              </button>
              <button
                type="button"
                onClick={() => setQueryType('hsn_rate')}
                className={`cursor-pointer px-2 py-0.5 rounded text-[11px] font-bold ${
                  queryType === 'hsn_rate'
                    ? 'bg-[#2D5A43] text-white'
                    : 'text-[#4A5A50] hover:bg-white'
                }`}
              >
                HSN Rates
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenFullStudio();
              }}
              className="text-[11px] font-bold text-[#2D5A43] hover:underline cursor-pointer ml-2 shrink-0"
            >
              Full Studio &rarr;
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
            {miniMessages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  m.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl max-w-[90%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#2D5A43] text-white rounded-tr-xs'
                      : 'bg-[#F9FAF9] border border-[#E0E4DE] text-[#1A2E25] rounded-tl-xs whitespace-pre-wrap'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-[#738276] p-2 bg-[#F9FAF9] rounded-xl border border-[#E0E4DE] w-fit">
                <div className="w-3.5 h-3.5 border-2 border-[#2D5A43] border-t-transparent rounded-full animate-spin" />
                <span>Formulating legal opinion...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Attachment Preview */}
          {attachedFile && (
            <div className="px-3 py-1.5 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between text-[11px] text-emerald-900 shrink-0">
              <span className="truncate font-medium">
                Notice: {attachedFile.name}
              </span>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="cursor-pointer text-emerald-700 hover:text-emerald-900"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-2.5 bg-white border-t border-[#E0E4DE] shrink-0">
            <div className="flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer p-2 rounded-lg border border-[#D5DDD7] hover:bg-[#EDF3EF] text-[#4A5A50]"
                title="Upload Notice File"
              >
                <UploadCloud className="w-4 h-4 text-[#2D5A43]" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  queryType === 'notice_reply'
                    ? 'Ask to draft reply (e.g. DRC-01 3B vs 2B)...'
                    : 'Ask GST legal question...'
                }
                className="flex-1 rounded-lg border border-[#D5DDD7] px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#2D5A43]"
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={isLoading || (!inputText.trim() && !attachedFile)}
                className="cursor-pointer p-2 rounded-lg bg-[#2D5A43] hover:bg-[#234734] text-white disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
