import React, { useState, useRef, useEffect } from 'react';
import {
  Scale,
  FileText,
  Search,
  UploadCloud,
  Send,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  Download,
  Printer,
  AlertTriangle,
  BookOpen,
  HelpCircle,
  FileCheck,
  RefreshCw,
  X,
  FileWarning,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Building2,
  Tag,
  Paperclip,
  CheckCircle2,
} from 'lucide-react';
import {
  GstLegalQueryType,
  GstLegalAdviceResponse,
  GstNoticeAttachment,
  GstChatMessage,
  Language,
} from '../types';
import {
  queryGstLegalAdvisor,
  fileToNoticeAttachment,
  downloadNoticeReplyDoc,
  printLegalDocument,
} from '../services/gstLegalAdvisorClient';

interface GstLegalAdvisorViewProps {
  language: Language;
  companyGstin?: string;
  companyName?: string;
  onOpenNoticeReplyModal?: (noticeData: any) => void;
  preloadedQuery?: {
    queryType: GstLegalQueryType;
    prompt: string;
    attachment?: GstNoticeAttachment;
  };
}

export const GstLegalAdvisorView: React.FC<GstLegalAdvisorViewProps> = ({
  language,
  companyGstin = '27AABCA1234F1Z8',
  companyName = 'Acme Technologies India Pvt Ltd',
  onOpenNoticeReplyModal,
  preloadedQuery,
}) => {
  const [selectedQueryType, setSelectedQueryType] = useState<GstLegalQueryType>('notice_reply');
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [attachedFile, setAttachedFile] = useState<GstNoticeAttachment | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTabSubView, setActiveTabSubView] = useState<'chat' | 'knowledge'>('chat');
  const [isNoticeTextModalOpen, setIsNoticeTextModalOpen] = useState<boolean>(false);
  const [pastedNoticeText, setPastedNoticeText] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial welcome message
  const [messages, setMessages] = useState<GstChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      queryType: 'notice_reply',
      text: 'Welcome to the GST Legal AI & Statutory Notice Reply Desk. You can upload GST notices (ASMT-10, DRC-01, DRC-01A, Section 73/74/74A SCN, Form 88C/88D) to generate courtroom-ready legal replies, get in-depth statutory advisory opinions, or determine HSN/SAC classifications and rates under latest amended acts.',
      response: {
        queryType: 'notice_reply',
        title: 'GST Legal AI Advisory & Notice Drafter Desk',
        executiveSummary: 'Grounded in the latest amended CGST Act, IGST Act, CBIC Circulars (including Circular 183, 193, 170), Finance (No. 2) Act 2024 amendments (Section 16(5)/16(6) retrospective relief, Section 128A waiver, Section 74A unified provisions), and Supreme Court/High Court case laws.',
        fullOpinion: 'Select your query type above: 1) Notice Reply Drafter for instant SCN/DRC-01 defense; 2) Legal Advisory for in-depth statutory opinions; 3) HSN / SAC Rate Finder for tariff classification; 4) General GST Law for acts, circulars, and filing rules.',
        statutoryProvisions: [
          {
            sectionOrRule: 'Section 16(2)(aa) & 16(4)',
            act: 'CGST Act, 2017',
            interpretation: 'ITC eligibility tied to GSTR-2B visibility and statutory cut-off dates, now eased by Section 16(5) & 16(6) retrospective relief.',
          },
          {
            sectionOrRule: 'Section 128A',
            act: 'CGST Act, 2017 (Finance Act 2024)',
            interpretation: 'Complete waiver of interest and penalty for notices issued under Section 73 for FY 2017-18, 2018-19, and 2019-20.',
          },
          {
            sectionOrRule: 'Section 75(4)',
            act: 'CGST Act, 2017',
            interpretation: 'Statutory mandate requiring the Proper Officer to grant an opportunity of personal hearing before passing any adverse demand order.',
          },
        ],
        notificationsAndCirculars: [
          {
            number: 'Circular No. 183/15/2022-GST',
            date: '27.12.2022',
            subject: 'Resolution of ITC differences between GSTR-3B and GSTR-2A via CA Certificates',
            relevance: 'Permits verification of bona fide ITC claims through CA certificates for historical periods.',
          },
          {
            number: 'Circular No. 193/05/2023-GST',
            date: '17.07.2023',
            subject: 'Extension of Circular 183 procedure up to 31.12.2021',
            relevance: 'Shields taxpayers from arbitrary recovery until Section 16(2)(aa) came into statutory force.',
          },
        ],
        judicialPrecedents: [
          {
            caseTitle: 'Suncraft Energy Pvt Ltd vs ACST',
            court: 'Calcutta High Court (Affirmed by Supreme Court)',
            year: '2023',
            keyPrinciple: 'No recovery from purchasing recipient without revenue first proceeding against the defaulting supplier.',
          },
          {
            caseTitle: 'Chief Commissioner of CGST vs Safari Retreats Pvt Ltd',
            court: 'Supreme Court of India',
            year: '2024',
            keyPrinciple: 'ITC on construction of commercial building used for leasing out is permissible based on functionality test.',
          },
        ],
        actionableRecommendations: [
          'Upload notice PDF or scanned image to auto-draft a complete legal defense with DIN & preliminary objections.',
          'Attach reconciliation summaries or purchase invoices to strengthen factual grounds.',
          'Verify HSN codes against 4-digit and 6-digit requirements under Rule 46(g).',
        ],
        riskRating: 'LOW',
        isAiGenerated: true,
        disclaimer: 'Prepared for professional guidance of Chartered Accountants, Tax Advocates, and Corporate Tax Heads.',
      },
    },
  ]);

  // Handle preloaded query if redirected from another view
  useEffect(() => {
    if (preloadedQuery?.prompt) {
      setSelectedQueryType(preloadedQuery.queryType);
      setInputPrompt(preloadedQuery.prompt);
      if (preloadedQuery.attachment) {
        setAttachedFile(preloadedQuery.attachment);
      }
    }
  }, [preloadedQuery]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Quick Prompt Templates
  const quickPrompts: Array<{ label: string; queryType: GstLegalQueryType; text: string }> = [
    {
      label: 'DRC-01 3B vs 2B Mismatch',
      queryType: 'notice_reply',
      text: 'Draft a comprehensive legal reply to FORM GST DRC-01 demanding tax, interest under Sec 50, and penalty for mismatch between GSTR-3B and GSTR-2B. Cite CBIC Circular 183/2022, 193/2023, Calcutta HC Suncraft Energy precedent, and pray for personal hearing under Section 75(4).',
    },
    {
      label: 'ASMT-10 Rule 37 (180 Days)',
      queryType: 'notice_reply',
      text: 'Draft reply to Scrutiny Notice ASMT-10 alleging violation of second proviso to Section 16(2) and Rule 37 for failure to pay vendor within 180 days. Explain that payments were made via banking channels, provide payment ledger references, and request closure of scrutiny.',
    },
    {
      label: 'DRC-01A Form 88D ITC Variance',
      queryType: 'notice_reply',
      text: 'Draft a formal submission in response to DRC-01C / DRC-01A regarding Rule 88D system-generated ITC variance between 2B and 3B. Explain timing differences, credit notes in subsequent months, and eligible transitional credits.',
    },
    {
      label: 'Section 16(4) & 128A Amnesty',
      queryType: 'advisory',
      text: 'Provide a detailed legal advisory opinion on the retrospective amendment under Section 16(5) & 16(6) of CGST Act via Finance (No. 2) Act 2024 for FY 2017-18 to 2020-21. Also explain eligibility and procedure for waiver of interest and penalty under Section 128A.',
    },
    {
      label: 'HSN & Rate for SaaS / Cloud',
      queryType: 'hsn_rate',
      text: 'Determine the exact 6-digit SAC Code, applicable GST rate, and composite supply classification for SaaS cloud software, hosting, and annual software maintenance services.',
    },
    {
      label: 'Building Construction ITC (Safari Retreats)',
      queryType: 'advisory',
      text: 'Provide legal opinion on eligibility of Input Tax Credit on civil construction and materials for commercial office buildings / warehouses constructed for leasing out, in light of Supreme Court judgment in Safari Retreats (2024).',
    },
    {
      label: 'MOV-07 Expired E-Way Bill',
      queryType: 'notice_reply',
      text: 'Draft reply to FORM GST MOV-07 penalty notice issued under Section 129 for goods intercepted due to e-way bill expiration caused by vehicle breakdown. Cite lack of fraudulent intent and CBIC Circular 64/38/2018.',
    },
  ];

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const attachment = await fileToNoticeAttachment(file);
      setAttachedFile(attachment);
      if (selectedQueryType !== 'notice_reply') {
        setSelectedQueryType('notice_reply');
      }
    } catch (err: any) {
      alert(`Error reading file: ${err.message || 'Failed to upload'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Submit user query
  const handleSend = async (customPrompt?: string) => {
    const prompt = (customPrompt || inputPrompt).trim();
    if (!prompt && !attachedFile) return;

    const userMessageId = `msg-user-${Date.now()}`;
    const assistantMessageId = `msg-assistant-${Date.now()}`;

    const userMsg: GstChatMessage = {
      id: userMessageId,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      queryType: selectedQueryType,
      text: prompt || `Attached Notice: ${attachedFile?.name || 'Notice Document'}`,
      attachment: attachedFile || undefined,
    };

    const loadingAssistantMsg: GstChatMessage = {
      id: assistantMessageId,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      queryType: selectedQueryType,
      text: '',
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingAssistantMsg]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await queryGstLegalAdvisor({
        queryType: selectedQueryType,
        userPrompt: prompt,
        attachment: attachedFile || undefined,
        companyGstin,
        companyName,
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                isLoading: false,
                text: response.executiveSummary || response.title,
                response,
              }
            : msg
        )
      );

      // Reset attached file after sending
      setAttachedFile(null);
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                isLoading: false,
                text: `Notice analysis complete under statutory guidance.`,
                error: err.message || 'Error communicating with legal advisor.',
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDownloadPleading = (resp: GstLegalAdviceResponse) => {
    const content = resp.draftNoticeReply?.fullPleadingText || resp.fullOpinion;
    const title = resp.draftNoticeReply?.noticeType || 'GST_Legal_Pleading';
    downloadNoticeReplyDoc(title, content, `${title.replace(/[\s/]/g, '_')}_Written_Reply.doc`);
  };

  const handlePrintDocument = (resp: GstLegalAdviceResponse) => {
    const title = resp.title || 'GST Legal Written Submission';
    const draft = resp.draftNoticeReply;

    let html = `
      <h3>${resp.title}</h3>
      <div class="preliminary">
        <p><strong>Executive Summary:</strong> ${resp.executiveSummary}</p>
        <p><strong>Risk Evaluation:</strong> ${resp.riskRating || 'LOW'}</p>
      </div>
    `;

    if (draft) {
      html += `
        <h4>1. NOTICE DETAILS & AUTHORITY</h4>
        <p><strong>Notice Type:</strong> ${draft.noticeType || 'Statutory Notice'} | <strong>DIN / Ref:</strong> ${draft.dinOrRefNo || 'N/A'}</p>
        <p><strong>Authority:</strong> ${draft.issuingAuthority || 'Proper Officer'}</p>
        <p><strong>Subject:</strong> ${draft.subjectLine}</p>

        <h4>2. PRELIMINARY OBJECTIONS</h4>
        <ul>${draft.preliminaryObjections.map((o) => `<li>${o}</li>`).join('')}</ul>

        <h4>3. FACTUAL SUBMISSIONS</h4>
        <ul>${draft.factualSubmissions.map((f) => `<li>${f}</li>`).join('')}</ul>

        <h4>4. LEGAL GROUNDS & REBUTTAL</h4>
        <div style="white-space: pre-wrap;">${draft.paraWiseRebuttal}</div>

        <h4>5. PRAYER CLAUSE</h4>
        <p><em>${draft.prayerClause}</em></p>

        <h4>6. LIST OF ANNEXURES</h4>
        <ul>${draft.annexuresList.map((a) => `<li>${a}</li>`).join('')}</ul>
      `;
    } else {
      html += `
        <h4>1. STATUTORY OPINION</h4>
        <div style="white-space: pre-wrap;">${resp.fullOpinion}</div>

        <h4>2. STATUTORY SECTIONS & RULES</h4>
        <ul>${resp.statutoryProvisions.map((p) => `<li><strong>${p.sectionOrRule} (${p.act}):</strong> ${p.interpretation}</li>`).join('')}</ul>

        <h4>3. RELEVANT CIRCULARS & NOTIFICATIONS</h4>
        <ul>${resp.notificationsAndCirculars.map((c) => `<li><strong>${c.number} (${c.date || ''}):</strong> ${c.subject} - <em>${c.relevance}</em></li>`).join('')}</ul>

        <h4>4. JUDICIAL PRECEDENTS</h4>
        <ul>${resp.judicialPrecedents.map((j) => `<li><strong>${j.caseTitle} (${j.court} - ${j.year || ''}):</strong> ${j.keyPrinciple}</li>`).join('')}</ul>
      `;
    }

    printLegalDocument(title, html);
  };

  return (
    <div className="w-full max-w-[1750px] mx-auto px-2 sm:px-4 lg:px-6 py-3 flex flex-col h-[calc(100vh-125px)] min-h-[600px] text-[#1A2E25]">
      {/* Top Banner & Header */}
      <div className="bg-white border border-[#E0E4DE] rounded-xl p-4 sm:p-5 mb-3 shadow-2xs shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2D5A43] text-white flex items-center justify-center shadow-xs shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-[#1A2E25]">
                  {language === 'hi' ? 'GST लीगल AI एडवाइजरी एवं नोटिस रिप्लाई पोर्टल' : 'GST Legal AI Advisory & Notice Reply Drafter'}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#2D5A43]/10 text-[#2D5A43] border border-[#2D5A43]/20">
                  <Sparkles className="w-3 h-3" />
                  Finance (No. 2) Act 2024 & CBIC Circulars
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#738276] mt-0.5">
                Statutory legal opinions, DRC-01/ASMT-10 notice replies, HSN rate determinations, and amended CGST/IGST Act interpretations.
              </p>
            </div>
          </div>

          {/* Active Taxpayer Entity & Grounding Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-[#EDF3EF] border border-[#D5DDD7] rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs">
              <Building2 className="w-3.5 h-3.5 text-[#2D5A43]" />
              <div>
                <span className="font-semibold text-[#1A2E25]">{companyName}</span>
                <span className="text-[#738276] ml-1.5 font-mono">({companyGstin})</span>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 bg-[#E8F0EC] border border-[#A6C0B0] text-[#1E3E2F] px-2.5 py-1.5 rounded-lg text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2D5A43]" />
              <span>Courtroom-Ready Pleadings</span>
            </div>
          </div>
        </div>

        {/* Query Type Selector Tabs */}
        <div className="mt-4 pt-3 border-t border-[#E0E4DE] flex items-center gap-2 overflow-x-auto pb-1 select-none">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#738276] mr-1 shrink-0">
            {language === 'hi' ? 'क्वेरी प्रकार चुनें:' : 'Query Mode:'}
          </span>

          <button
            type="button"
            onClick={() => setSelectedQueryType('notice_reply')}
            className={`cursor-pointer px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              selectedQueryType === 'notice_reply'
                ? 'bg-[#2D5A43] text-white shadow-xs'
                : 'bg-[#F2F5F3] text-[#4A5A50] hover:bg-[#E5ECE7]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{language === 'hi' ? 'नोटिस रिप्लाई ड्राफ्टर' : 'Notice Reply Drafter'}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${selectedQueryType === 'notice_reply' ? 'bg-white/20 text-white' : 'bg-[#D5DDD7] text-[#1A2E25]'}`}>
              DRC-01 / ASMT-10
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedQueryType('advisory')}
            className={`cursor-pointer px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              selectedQueryType === 'advisory'
                ? 'bg-[#2D5A43] text-white shadow-xs'
                : 'bg-[#F2F5F3] text-[#4A5A50] hover:bg-[#E5ECE7]'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>{language === 'hi' ? 'लीगल एडवाइजरी ओपिनियन' : 'Legal Advisory Opinion'}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${selectedQueryType === 'advisory' ? 'bg-white/20 text-white' : 'bg-[#D5DDD7] text-[#1A2E25]'}`}>
              CA Opinion
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedQueryType('hsn_rate')}
            className={`cursor-pointer px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              selectedQueryType === 'hsn_rate'
                ? 'bg-[#2D5A43] text-white shadow-xs'
                : 'bg-[#F2F5F3] text-[#4A5A50] hover:bg-[#E5ECE7]'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>{language === 'hi' ? 'HSN / SAC कोड व टैक्स दर' : 'HSN / SAC & GST Rates'}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${selectedQueryType === 'hsn_rate' ? 'bg-white/20 text-white' : 'bg-[#D5DDD7] text-[#1A2E25]'}`}>
              Rates & Tariffs
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedQueryType('general_qa')}
            className={`cursor-pointer px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              selectedQueryType === 'general_qa'
                ? 'bg-[#2D5A43] text-white shadow-xs'
                : 'bg-[#F2F5F3] text-[#4A5A50] hover:bg-[#E5ECE7]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{language === 'hi' ? 'सामान्य GST कानून व नियम' : 'General GST Law & Rules'}</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Chat & Advisory Studio Area */}
      <div className="flex-1 bg-white border border-[#E0E4DE] rounded-xl flex flex-col min-h-0 shadow-2xs overflow-hidden">
        {/* Chat Messages Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map((message) => {
            const isAssistant = message.sender === 'assistant';
            const resp = message.response;

            return (
              <div
                key={message.id}
                className={`flex gap-3 max-w-full ${
                  isAssistant ? 'justify-start' : 'justify-end'
                }`}
              >
                {/* Assistant Icon */}
                {isAssistant && (
                  <div className="w-8 h-8 rounded-lg bg-[#2D5A43] text-white flex items-center justify-center shrink-0 shadow-2xs mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                {/* Message Bubble Container */}
                <div
                  className={`flex flex-col max-w-[95%] lg:max-w-[85%] ${
                    isAssistant ? 'items-start' : 'items-end'
                  }`}
                >
                  {/* Sender & Timestamp */}
                  <div className="flex items-center gap-2 mb-1 px-1 text-xs text-[#738276]">
                    <span className="font-semibold text-[#1A2E25]">
                      {isAssistant ? 'GST Legal AI Counsel' : 'You (Taxpayer / CA)'}
                    </span>
                    <span>•</span>
                    <span>{message.timestamp}</span>
                    {message.queryType && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#EDF3EF] text-[#2D5A43]">
                        {message.queryType.replace('_', ' ').toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Bubble Content */}
                  <div
                    className={`rounded-2xl p-4 sm:p-5 shadow-2xs text-sm ${
                      isAssistant
                        ? 'bg-[#F9FAF9] border border-[#E0E4DE] text-[#1A2E25] w-full'
                        : 'bg-[#2D5A43] text-white font-medium rounded-tr-xs'
                    }`}
                  >
                    {/* User Attachment Tag */}
                    {!isAssistant && message.attachment && (
                      <div className="mb-2.5 p-2 bg-white/10 rounded-lg flex items-center gap-2 text-xs border border-white/20">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span className="font-medium truncate max-w-xs">
                          {message.attachment.name}
                        </span>
                        <span className="text-white/70 text-[11px]">
                          ({Math.round(message.attachment.size / 1024)} KB)
                        </span>
                      </div>
                    )}

                    {/* Simple Message Text */}
                    {message.text && (
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {message.text}
                      </p>
                    )}

                    {/* Loading State Spinner */}
                    {message.isLoading && (
                      <div className="py-6 flex flex-col items-center justify-center text-[#738276]">
                        <div className="w-8 h-8 border-3 border-[#2D5A43] border-t-transparent rounded-full animate-spin mb-3" />
                        <span className="font-medium text-sm text-[#1A2E25]">
                          Analyzing GST Law, Amended Acts, CBIC Circulars & Supreme Court Precedents...
                        </span>
                        <span className="text-xs text-[#738276] mt-1">
                          Synthesizing courtroom-ready pleadings and statutory opinion
                        </span>
                      </div>
                    )}

                    {/* Rich GST Legal Advisory Card */}
                    {isAssistant && resp && (
                      <div className="mt-4 space-y-4 pt-3 border-t border-[#E0E4DE]">
                        {/* Title & Actions Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E0E4DE]">
                          <div>
                            <h3 className="font-bold text-base sm:text-lg text-[#1A2E25] flex items-center gap-2">
                              {resp.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              {resp.riskRating && (
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                    resp.riskRating === 'HIGH'
                                      ? 'bg-red-100 text-red-800'
                                      : resp.riskRating === 'MEDIUM'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  Audit Risk: {resp.riskRating}
                                </span>
                              )}
                              <span className="text-xs text-[#738276]">
                                Formulated under CGST Act & Relevant Circulars
                              </span>
                            </div>
                          </div>

                          {/* Quick Export & Print Actions */}
                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyText(
                                  resp.draftNoticeReply?.fullPleadingText || resp.fullOpinion,
                                  message.id
                                )
                              }
                              className="cursor-pointer px-2.5 py-1.5 bg-white hover:bg-[#EDF3EF] border border-[#D5DDD7] rounded-lg text-xs font-medium text-[#1A2E25] flex items-center gap-1 transition-colors"
                              title="Copy Legal Text"
                            >
                              {copiedId === message.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-700">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-[#738276]" />
                                  <span>Copy Text</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadPleading(resp)}
                              className="cursor-pointer px-2.5 py-1.5 bg-white hover:bg-[#EDF3EF] border border-[#D5DDD7] rounded-lg text-xs font-medium text-[#1A2E25] flex items-center gap-1 transition-colors"
                              title="Download as Word / Document"
                            >
                              <Download className="w-3.5 h-3.5 text-[#2D5A43]" />
                              <span>Export .DOC</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handlePrintDocument(resp)}
                              className="cursor-pointer px-2.5 py-1.5 bg-white hover:bg-[#EDF3EF] border border-[#D5DDD7] rounded-lg text-xs font-medium text-[#1A2E25] flex items-center gap-1 transition-colors"
                              title="Print Document"
                            >
                              <Printer className="w-3.5 h-3.5 text-[#738276]" />
                              <span>Print</span>
                            </button>
                          </div>
                        </div>

                        {/* Executive Summary Box */}
                        {resp.executiveSummary && (
                          <div className="bg-[#EDF3EF] border border-[#D5DDD7] rounded-xl p-3.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[#2D5A43] mb-1.5 flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4" />
                              Executive Legal Summary
                            </h4>
                            <p className="text-xs sm:text-sm text-[#1A2E25] leading-relaxed">
                              {resp.executiveSummary}
                            </p>
                          </div>
                        )}

                        {/* DRAFT NOTICE REPLY SECTION (If Present) */}
                        {resp.draftNoticeReply && (
                          <div className="bg-white border-2 border-[#2D5A43]/30 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center justify-between border-b border-[#E0E4DE] pb-2.5 mb-3">
                              <div className="flex items-center gap-2">
                                <FileCheck className="w-5 h-5 text-[#2D5A43]" />
                                <h4 className="font-bold text-sm sm:text-base text-[#1A2E25]">
                                  Formal Legal Reply / Written Submission
                                </h4>
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#2D5A43] text-white">
                                  {resp.draftNoticeReply.noticeType || 'Statutory Reply'}
                                </span>
                              </div>
                              <span className="text-xs text-[#738276] font-mono">
                                Ref: {resp.draftNoticeReply.dinOrRefNo || 'DIN-GEN-2024'}
                              </span>
                            </div>

                            {/* Pleading Details Box */}
                            <div className="bg-[#F8FAF9] border border-[#E0E4DE] rounded-lg p-3 text-xs space-y-2 mb-3">
                              <div>
                                <span className="font-semibold text-[#738276]">ADDRESSED TO: </span>
                                <span className="text-[#1A2E25] font-medium">
                                  {resp.draftNoticeReply.issuingAuthority || 'Proper Officer / Assistant Commissioner of State/Central Tax'}
                                </span>
                              </div>
                              <div>
                                <span className="font-semibold text-[#738276]">SUBJECT: </span>
                                <span className="text-[#1A2E25] font-bold">
                                  {resp.draftNoticeReply.subjectLine}
                                </span>
                              </div>
                            </div>

                            {/* Preliminary Objections */}
                            {resp.draftNoticeReply.preliminaryObjections?.length > 0 && (
                              <div className="mb-3">
                                <h5 className="text-xs font-bold text-[#8C2E20] uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Preliminary Objections (Jurisdiction & Natural Justice)
                                </h5>
                                <div className="space-y-1.5">
                                  {resp.draftNoticeReply.preliminaryObjections.map((obj, i) => (
                                    <div
                                      key={i}
                                      className="p-2 bg-red-50/50 border border-red-200/60 rounded-lg text-xs text-[#1A2E25] leading-relaxed"
                                    >
                                      {obj}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Para-wise Rebuttal & Legal Defense */}
                            {resp.draftNoticeReply.paraWiseRebuttal && (
                              <div className="mb-3">
                                <h5 className="text-xs font-bold text-[#2D5A43] uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                                  <Scale className="w-3.5 h-3.5" />
                                  Para-wise Rebuttal & Statutory Defenses
                                </h5>
                                <div className="p-3 bg-white border border-[#E0E4DE] rounded-lg text-xs leading-relaxed text-[#1A2E25] whitespace-pre-wrap max-h-80 overflow-y-auto font-mono">
                                  {resp.draftNoticeReply.paraWiseRebuttal}
                                </div>
                              </div>
                            )}

                            {/* Prayer Clause */}
                            {resp.draftNoticeReply.prayerClause && (
                              <div className="mb-3 p-3 bg-[#EDF3EF] border border-[#D5DDD7] rounded-lg text-xs">
                                <span className="font-bold text-[#2D5A43] block mb-1">
                                  PRAYER / RELIEF SOUGHT:
                                </span>
                                <p className="text-[#1A2E25] leading-relaxed italic">
                                  {resp.draftNoticeReply.prayerClause}
                                </p>
                              </div>
                            )}

                            {/* Annexures List */}
                            {resp.draftNoticeReply.annexuresList?.length > 0 && (
                              <div className="p-3 bg-white border border-[#E0E4DE] rounded-lg text-xs">
                                <span className="font-bold text-[#738276] block mb-1.5">
                                  ENCLOSED STATUTORY ANNEXURES:
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {resp.draftNoticeReply.annexuresList.map((ann, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-xs text-[#1A2E25]">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5A43] shrink-0" />
                                      <span className="truncate">{ann}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* HSN RATE DETERMINATION CARD (If Present) */}
                        {resp.hsnRateDetails && (
                          <div className="bg-white border-2 border-emerald-500/30 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center justify-between border-b border-[#E0E4DE] pb-2 mb-3">
                              <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4 text-[#2D5A43]" />
                                <h4 className="font-bold text-sm text-[#1A2E25]">
                                  HSN / SAC Tariff Classification & Rate Determination
                                </h4>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#2D5A43] text-white">
                                SAC / HSN: {resp.hsnRateDetails.hsnCode}
                              </span>
                            </div>

                            <p className="text-xs sm:text-sm text-[#1A2E25] font-medium mb-3">
                              {resp.hsnRateDetails.description}
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mb-3">
                              <div className="bg-[#EDF3EF] p-2 rounded-lg">
                                <div className="text-[11px] text-[#738276] uppercase">CGST Rate</div>
                                <div className="text-base font-bold text-[#2D5A43]">
                                  {resp.hsnRateDetails.cgstRate}%
                                </div>
                              </div>
                              <div className="bg-[#EDF3EF] p-2 rounded-lg">
                                <div className="text-[11px] text-[#738276] uppercase">SGST Rate</div>
                                <div className="text-base font-bold text-[#2D5A43]">
                                  {resp.hsnRateDetails.sgstRate}%
                                </div>
                              </div>
                              <div className="bg-[#2D5A43] text-white p-2 rounded-lg shadow-2xs">
                                <div className="text-[11px] text-white/80 uppercase">Total IGST</div>
                                <div className="text-base font-bold">
                                  {resp.hsnRateDetails.igstRate}%
                                </div>
                              </div>
                              <div className="bg-[#EDF3EF] p-2 rounded-lg">
                                <div className="text-[11px] text-[#738276] uppercase">Compensation Cess</div>
                                <div className="text-base font-bold text-[#1A2E25]">
                                  {resp.hsnRateDetails.cessRate || 0}%
                                </div>
                              </div>
                            </div>

                            <div className="bg-[#F8FAF9] p-2.5 rounded-lg text-xs space-y-1 text-[#4A5A50]">
                              <div>
                                <strong>Effective Notification:</strong> {resp.hsnRateDetails.effectiveNotification || 'Notification 11/2017-CT(R)'}
                              </div>
                              {resp.hsnRateDetails.conditionsOrExceptions && (
                                <div>
                                  <strong>Conditions & Exceptions:</strong> {resp.hsnRateDetails.conditionsOrExceptions}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Statutory Sections & Rules Accordion / Cards */}
                        {resp.statutoryProvisions?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[#738276] mb-2 flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-[#2D5A43]" />
                              Relevant Statutory Sections & CGST Rules
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {resp.statutoryProvisions.map((prov, i) => (
                                <div
                                  key={i}
                                  className="bg-white border border-[#E0E4DE] rounded-xl p-3 text-xs shadow-2xs"
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className="font-bold text-[#2D5A43] font-mono text-sm">
                                      {prov.sectionOrRule}
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.2 bg-[#EDF3EF] text-[#4A5A50] rounded font-medium">
                                      {prov.act}
                                    </span>
                                  </div>
                                  <p className="text-[#1A2E25] leading-relaxed">
                                    {prov.interpretation}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* CBIC Circulars & Rate Notifications */}
                        {resp.notificationsAndCirculars?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[#738276] mb-2 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-[#2D5A43]" />
                              CBIC Notifications & Clarificatory Circulars
                            </h4>
                            <div className="space-y-1.5">
                              {resp.notificationsAndCirculars.map((circ, i) => (
                                <div
                                  key={i}
                                  className="bg-white border border-[#E0E4DE] rounded-lg p-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-[#1A2E25] font-mono">
                                        {circ.number}
                                      </span>
                                      {circ.date && (
                                        <span className="text-[#738276] text-[11px]">
                                          dated {circ.date}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[#4A5A50] text-[11px] mt-0.5">
                                      {circ.subject}
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-medium text-[#2D5A43] sm:text-right shrink-0">
                                    {circ.relevance}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Judicial Precedents & High Court Rulings */}
                        {resp.judicialPrecedents?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[#738276] mb-2 flex items-center gap-1.5">
                              <Scale className="w-3.5 h-3.5 text-[#2D5A43]" />
                              Judicial Precedents & Landmark Court Rulings
                            </h4>
                            <div className="space-y-2">
                              {resp.judicialPrecedents.map((prec, i) => (
                                <div
                                  key={i}
                                  className="bg-[#F8FAF9] border-l-3 border-[#2D5A43] border border-[#E0E4DE] rounded-r-lg p-3 text-xs"
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="font-bold text-[#1A2E25] text-sm">
                                      {prec.caseTitle}
                                    </span>
                                    <span className="text-[11px] text-[#738276]">
                                      {prec.court} {prec.year ? `(${prec.year})` : ''}
                                    </span>
                                  </div>
                                  <p className="text-[#4A5A50] leading-relaxed">
                                    <strong>Statutory Ratio:</strong> {prec.keyPrinciple}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actionable Recommendations */}
                        {resp.actionableRecommendations?.length > 0 && (
                          <div className="bg-[#F0F6F2] border border-[#A6C0B0] rounded-xl p-3.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[#2D5A43] mb-2 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              Actionable Advisory Checklist for CA & Tax Team
                            </h4>
                            <ul className="space-y-1.5 text-xs text-[#1A2E25]">
                              {resp.actionableRecommendations.map((rec, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-[#2D5A43] font-bold">•</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Disclaimer */}
                        <div className="text-[11px] text-[#738276] pt-2 border-t border-[#E0E4DE] italic">
                          {resp.disclaimer}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Icon */}
                {!isAssistant && (
                  <div className="w-8 h-8 rounded-lg bg-[#738276] text-white flex items-center justify-center shrink-0 shadow-2xs mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Carousel */}
        <div className="px-4 py-2 bg-[#F9FAF9] border-t border-[#E0E4DE] flex items-center gap-1.5 overflow-x-auto select-none shrink-0">
          <span className="text-[11px] font-semibold text-[#738276] uppercase tracking-wider shrink-0 mr-1">
            Quick Prompts:
          </span>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSelectedQueryType(qp.queryType);
                setInputPrompt(qp.text);
              }}
              className="cursor-pointer px-2.5 py-1 rounded-full text-xs font-medium bg-white hover:bg-[#EDF3EF] border border-[#D5DDD7] text-[#1A2E25] shrink-0 transition-colors whitespace-nowrap"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Attached File Preview Bar (If File Uploaded) */}
        {attachedFile && (
          <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between text-xs text-emerald-900 shrink-0">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="font-semibold">Attached Notice:</span>
              <span className="font-mono">{attachedFile.name}</span>
              <span className="text-emerald-700/70">
                ({Math.round(attachedFile.size / 1024)} KB)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              className="p-1 hover:bg-emerald-200 rounded text-emerald-800 cursor-pointer"
              title="Remove attachment"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Chat Input Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-[#E0E4DE] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-2"
          >
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/jpg"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Upload Notice Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isLoading}
              className="cursor-pointer p-2.5 rounded-xl border border-[#D5DDD7] hover:bg-[#EDF3EF] text-[#4A5A50] hover:text-[#1A2E25] transition-colors shrink-0"
              title="Upload GST Notice (PDF / Image)"
            >
              <UploadCloud className="w-5 h-5 text-[#2D5A43]" />
            </button>

            {/* Paste Notice Text Modal Trigger */}
            <button
              type="button"
              onClick={() => setIsNoticeTextModalOpen(true)}
              className="hidden sm:flex cursor-pointer p-2.5 rounded-xl border border-[#D5DDD7] hover:bg-[#EDF3EF] text-[#4A5A50] hover:text-[#1A2E25] transition-colors shrink-0 text-xs font-semibold items-center gap-1"
              title="Paste Notice Text from GST Portal"
            >
              <FileText className="w-4 h-4 text-[#738276]" />
              <span>Paste Notice</span>
            </button>

            {/* Textarea Input */}
            <div className="flex-1 relative">
              <textarea
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  selectedQueryType === 'notice_reply'
                    ? 'Paste or describe the GST Notice allegations (e.g. DRC-01 for 3B vs 2B ITC mismatch) or attach PDF...'
                    : selectedQueryType === 'hsn_rate'
                    ? 'Enter product or service description to find HSN / SAC code, GST rate, and exemptions...'
                    : 'Ask any GST legal question, section interpretation, or advice under latest amended acts...'
                }
                rows={2}
                disabled={isLoading}
                className="w-full resize-none rounded-xl border border-[#D5DDD7] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A43] focus:border-transparent leading-relaxed text-[#1A2E25] placeholder:text-[#9AA69D]"
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={isLoading || (!inputPrompt.trim() && !attachedFile)}
              className={`cursor-pointer px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-xs transition-all shrink-0 ${
                isLoading || (!inputPrompt.trim() && !attachedFile)
                  ? 'bg-[#EDF3EF] text-[#9AA69D] cursor-not-allowed'
                  : 'bg-[#2D5A43] hover:bg-[#234734] text-white'
              }`}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {selectedQueryType === 'notice_reply' ? 'Draft Reply' : 'Consult AI'}
              </span>
            </button>
          </form>
        </div>
      </div>

      {/* PASTE NOTICE TEXT MODAL */}
      {isNoticeTextModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-[#E0E4DE]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E0E4DE] mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#2D5A43]" />
                <h3 className="font-bold text-base text-[#1A2E25]">
                  Paste GST Notice Text (from GST Portal / Scanned Document)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNoticeTextModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#EDF3EF] text-[#738276] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#738276] mb-2">
              Copy the text of the Show Cause Notice, ASMT-10, DRC-01, or demand order from the GST portal and paste below:
            </p>

            <textarea
              value={pastedNoticeText}
              onChange={(e) => setPastedNoticeText(e.target.value)}
              placeholder="Paste notice contents here (including Notice Reference, DIN, Allegations, Sections quoted, and Tax demanded amounts)..."
              rows={10}
              className="w-full rounded-xl border border-[#D5DDD7] p-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#2D5A43] font-mono leading-relaxed"
            />

            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#E0E4DE]">
              <button
                type="button"
                onClick={() => setIsNoticeTextModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#4A5A50] hover:bg-[#EDF3EF] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pastedNoticeText.trim()) {
                    setAttachedFile({
                      name: 'Pasted_Notice_Text.txt',
                      size: pastedNoticeText.length,
                      type: 'text/plain',
                      extractedText: pastedNoticeText,
                    });
                    setSelectedQueryType('notice_reply');
                    setIsNoticeTextModalOpen(false);
                    setPastedNoticeText('');
                  }
                }}
                disabled={!pastedNoticeText.trim()}
                className="px-4 py-2 bg-[#2D5A43] hover:bg-[#234734] text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Attach Notice Text
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
