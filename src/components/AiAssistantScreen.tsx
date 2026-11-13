import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User as UserIcon,
  ExternalLink,
  Building2,
  MapPin,
  Globe,
  Trash2,
  AlertCircle,
  Languages,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ChatMessage, BusinessListing } from '../types';
import { BusinessContactActions } from './BusinessContactActions';
import { VIZAG_TOURISM_DESTINATIONS } from '../data/tourismData';

type SupportedLanguage = 'auto' | 'telugu' | 'hindi' | 'english';

const LOCAL_INTENT_KEYWORDS = [
  'vizag',
  'visakhapatnam',
  'వైజాగ్',
  'విశాఖ',
  'विशाखापट्टनम',
  'gajuwaka',
  'parawada',
  'autonagar',
  'mvp',
  'siripuram',
  'dwaraka',
  'jagadamba',
  'rushikonda',
  'bheemili',
  'rk beach',
  'yarada',
  'araku',
  'borra',
  'simhachalam',
  'kailasagiri',
  'shop',
  'store',
  'factory',
  'manufacturer',
  'business',
  'supplier',
  'steel',
  'pharma',
  'seafood',
  'fish',
  'handloom',
  'silk',
  'coffee',
  'hardware',
  'electronics',
  'price',
  'near me',
  'restaurant',
  'hotel',
  'hospital',
  'tourism',
  'beach',
  'museum',
  'కొనుగోలు',
  'దుకాణం',
  'ఫ్యాక్టరీ',
  'స్టీల్',
  'చేపలు',
  'दुकान',
  'फैक्ट्री',
];

export const AiAssistantScreen: React.FC = () => {
  const {
    approvedBusinesses,
    selectedArea,
    openBusinessModal,
    aiPrefillPrompt,
    triggerAiPrompt,
  } = useApp();

  const [activeLang, setActiveLang] = useState<SupportedLanguage>('auto');

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'msg-welcome',
      role: 'model',
      text: `Namaskaram! నమస్కారం! 🙏
I am **Vizag AI** (*Your AI. Your City. Your World.*), the intelligent assistant of **VizagConnect**.

**How I can help you:**
• 🏙️ **Visakhapatnam First:** Discover verified Vizag businesses, product prices, local services, jobs, events, and 15 iconic Vizag tourist destinations (RK Beach, Araku, Kailasagiri, INS Kursura & more).
• 🌍 **General AI Assistant:** Ask me anything about the world, science, coding, education, business, writing, or everyday life in English, Telugu (తెలుగు), or Hindi (हिन्दी).`,
      timestamp: 'Just now',
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (aiPrefillPrompt) {
      void sendMessage(aiPrefillPrompt);
      triggerAiPrompt('');
    }
  }, [aiPrefillPrompt]);

  const hasLocalIntent = (queryText: string): boolean => {
    const lower = queryText.toLowerCase();
    if (LOCAL_INTENT_KEYWORDS.some((kw) => lower.includes(kw))) return true;
    return approvedBusinesses.some(
      (b) =>
        lower.includes(b.name.toLowerCase()) ||
        lower.includes(b.area.toLowerCase()) ||
        (b.products || []).some((p) => lower.includes(p.name.toLowerCase()))
    );
  };

  // Match verified approved businesses ONLY when query has local commerce intent
  const findMatchingBusinesses = (userQuery: string, replyText: string): BusinessListing[] => {
    if (!hasLocalIntent(userQuery)) return [];
    const combined = (userQuery + ' ' + replyText).toLowerCase();
    return approvedBusinesses
      .filter((b) => {
        const nameMatch = b.name
          .toLowerCase()
          .split(' ')
          .some((w) => w.length > 3 && combined.includes(w));
        const teluguMatch =
          b.teluguName &&
          (combined.includes(b.teluguName.toLowerCase()) ||
            b.teluguName.split(' ').some((w) => w.length > 2 && combined.includes(w.toLowerCase())));
        const categoryMatch =
          combined.includes(b.category.toLowerCase()) ||
          combined.includes(b.categoryLabel.toLowerCase());
        const areaMatch = combined.includes(b.area.toLowerCase());
        const offeringsMatch = b.keyOfferings.some((o) => combined.includes(o.toLowerCase()));
        const productMatch = (b.products || []).some((p) =>
          combined.includes(p.name.toLowerCase())
        );

        return (
          nameMatch ||
          Boolean(teluguMatch) ||
          categoryMatch ||
          areaMatch ||
          offeringsMatch ||
          productMatch ||
          (combined.includes('steel') && b.category === 'manufacturing-steel') ||
          (combined.includes('pharma') && b.category === 'pharma-chemicals') ||
          (combined.includes('coffee') && b.category === 'agro-coffee') ||
          (combined.includes('fish') && b.category === 'seafood-coldchain')
        );
      })
      .slice(0, 3);
  };

  // Match verified Visakhapatnam tourism destinations strictly for local tourism queries
  const findMatchingTourismPlaces = (userQuery: string) => {
    const lower = userQuery.toLowerCase();
    const tourismKeywords = [
      'beach',
      'beaches',
      'museum',
      'museums',
      'temple',
      'park',
      'cave',
      'caves',
      'waterfall',
      'lighthouse',
      'tourism',
      'tourist',
      'visit',
      'places',
      'sightseeing',
      'పర్యాటక',
      'బీచ్',
      'प्रमुख जगहें',
      'घूमने',
    ];

    const directMatches = VIZAG_TOURISM_DESTINATIONS.filter((dest) => {
      const nameWords = dest.name
        .toLowerCase()
        .replace(/[()']/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3 && w !== 'beach' && w !== 'park' && w !== 'hilltop');
      return (
        lower.includes(dest.name.toLowerCase()) ||
        (dest.teluguName && lower.includes(dest.teluguName.toLowerCase())) ||
        lower.includes(dest.area.toLowerCase()) ||
        lower.includes(dest.category.toLowerCase()) ||
        nameWords.some((w) => lower.includes(w))
      );
    });

    if (directMatches.length > 0) {
      return directMatches.slice(0, 4);
    }

    if (
      hasLocalIntent(userQuery) &&
      tourismKeywords.some((kw) => lower.includes(kw))
    ) {
      return VIZAG_TOURISM_DESTINATIONS.slice(0, 4);
    }

    return [];
  };

  const sendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    setInput('');
    setErrorMessage(null);

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({
            role: m.role,
            text: m.text,
          })),
          userLocation: selectedArea,
          preferredLanguage: activeLang !== 'auto' ? activeLang : undefined,
          registeredBusinesses: approvedBusinesses.map((b) => ({
            name: b.name,
            teluguName: b.teluguName,
            scale: b.scale,
            category: b.categoryLabel,
            area: b.area,
            phone: b.phone,
            whatsapp: b.whatsapp,
            address: b.address,
            offerings: b.keyOfferings,
            products: (b.products || []).map((p) => ({
              name: p.name,
              price: p.price,
              unit: p.unit,
              availability: p.availability,
            })),
            offers: (b.offers || []).map((o) => `${o.title} (${o.discountBadge || o.validTill})`),
          })),
          tourismPlaces: VIZAG_TOURISM_DESTINATIONS.map((d) => ({
            name: d.name,
            area: d.area,
            timings: d.timings,
            entryInfo: d.entryInfo,
          })),
        }),
      });

      const data = await response.json().catch(() => ({} as Record<string, unknown>));

      if (!response.ok) {
        const serverErrMsg =
          typeof data?.error === 'string' && data.error.trim().length > 0
            ? data.error.trim()
            : `Server returned status ${response.status}`;
        throw new Error(serverErrMsg);
      }

      const replyStr = typeof data?.reply === 'string' ? data.reply : 'How can I help you today?';
      const matchedBiz = findMatchingBusinesses(text, replyStr);

      const modelMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'model',
        text: replyStr,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: Array.isArray(data?.sources) ? data.sources : [],
        recommendedBusinessIds: matchedBiz.map((b) => b.id),
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (err) {
      console.error('AI chat error:', err);
      const errMsg =
        err instanceof Error && err.message.trim().length > 0
          ? err.message.trim()
          : 'Unable to reach Vizag AI service right now. Please try again in a moment.';
      setErrorMessage(errMsg);

      const fallbackBiz = findMatchingBusinesses(text, '');
      const fallbackTourism = findMatchingTourismPlaces(text);

      const sections: string[] = [];
      if (fallbackBiz.length > 0) {
        sections.push(
          `**Verified VizagConnect Businesses matching "${text}":**\n` +
            fallbackBiz
              .map(
                (b) =>
                  `• **${b.name}** (${b.area}) — ${b.address}${b.phone ? ` • Phone: ${b.phone}` : ''}`
              )
              .join('\n')
        );
      }
      if (fallbackTourism.length > 0) {
        sections.push(
          `**Official Visakhapatnam Tourism Places:**\n` +
            fallbackTourism
              .map(
                (d) =>
                  `• **${d.name}** (${d.area}) — Timings: ${d.timings} • Entry: ${d.entryInfo}`
              )
              .join('\n')
        );
      }

      const fallbackText =
        sections.length > 0
          ? `${sections.join('\n\n')}\n\n*Live AI note: ${errMsg}*`
          : `${errMsg}\n\nFor verified Visakhapatnam businesses, prices, and tourist destinations right now, please browse the **Explore**, **Discover**, or **Map** tabs.`;

      const fallbackMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'model',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendedBusinessIds: fallbackBiz.map((b) => b.id),
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'msg-welcome',
        role: 'model',
        text: `Namaskaram! నమస్కారం! I am **Vizag AI** (*Your AI. Your City. Your World.*). Ask me anything about Visakhapatnam or any general topic!`,
        timestamp: 'Just now',
      },
    ]);
  };

  const quickPromptsByLang: Record<SupportedLanguage, string[]> = {
    auto: [
      'Best beaches & museums to visit in Vizag today',
      'Approved steel & fabrication suppliers in Gajuwaka',
      'Explain quantum computing simply',
      'Python script to sort CSV rows by date',
    ],
    telugu: [
      'వైజాగ్‌లో ఈ వారాంతంలో చూడదగిన పర్యాటక ప్రదేశాలు ఏవి?',
      'గాజువాకలో స్టీల్ & నిర్మాణ సామాగ్రి వ్యాపారాలు',
      'కృత్రిమ మేధస్సు (AI) ఎలా పనిచేస్తుంది?',
    ],
    hindi: [
      'विशाखापट्टनम में घूमने की प्रमुख जगहें और समय बताइए',
      'गाजुवाका और परवाड़ा में पंजीकृत व्यवसाय',
      'सौर ऊर्जा नेट मीटरिंग कैसे काम करती है?',
    ],
    english: [
      'Best beaches & museums to visit in Vizag today',
      'Approved businesses & listed product prices in VizagConnect',
      'Compare React state management approaches cleanly',
    ],
  };

  return (
    <div className="pb-24 pt-2 flex flex-col h-[calc(100vh-8.5rem)] max-w-4xl mx-auto px-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-teal-900 text-white rounded-2xl p-3.5 shadow-md border border-teal-500/30 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-400/20 text-teal-300 flex items-center justify-center border border-teal-300/30">
              <Bot className="w-6 h-6 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-extrabold text-base text-white">Vizag AI</h2>
                <span className="bg-teal-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5" />
                  Your AI. Your City. Your World.
                </span>
              </div>
              <p className="text-[11px] text-teal-100 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-teal-300 inline" />
                Visakhapatnam First • Capable General AI Assistant
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClearChat}
            className="p-2 text-teal-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            title="Reset Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Language Pills */}
        <div className="mt-2.5 pt-2 border-t border-teal-500/20 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-[11px] text-teal-200">
            <Languages className="w-3.5 h-3.5 text-teal-300" />
            <span className="font-semibold">Language:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                ['auto', 'Auto'],
                ['telugu', 'తెలుగు'],
                ['hindi', 'हिन्दी'],
                ['english', 'English'],
              ] as const
            ).map(([code, label]) => (
              <button
                key={code}
                type="button"
                onClick={() => setActiveLang(code)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                  activeLang === code
                    ? 'bg-teal-400 text-slate-950'
                    : 'bg-white/10 text-teal-100 hover:bg-white/20'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar my-3 space-y-4 pr-1">
        {messages.map((msg) => {
          const isModel = msg.role === 'model';
          const recommendedBiz = msg.recommendedBusinessIds
            ? approvedBusinesses.filter((b) => msg.recommendedBusinessIds?.includes(b.id))
            : [];

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isModel ? 'items-start' : 'items-start flex-row-reverse'}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${
                  isModel
                    ? 'bg-gradient-to-tr from-blue-700 to-teal-500 text-white'
                    : 'bg-slate-700 text-white'
                }`}
              >
                {isModel ? (
                  <Sparkles className="w-4 h-4 text-teal-200" />
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
              </div>

              <div className="max-w-[85%] sm:max-w-[80%] space-y-2">
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl shadow-xs text-xs sm:text-sm leading-relaxed ${
                    isModel
                      ? 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                      : 'bg-blue-950 text-white rounded-tr-xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap space-y-1">
                    {msg.text.split('\n').map((line, idx) => {
                      if (!line.trim()) return <div key={idx} className="h-1.5" />;
                      const escapedLine = line
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                      const formattedLine = escapedLine
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>');
                      return (
                        <p
                          key={idx}
                          dangerouslySetInnerHTML={{ __html: formattedLine }}
                          className={line.startsWith('-') || line.startsWith('•') ? 'pl-2' : ''}
                        />
                      );
                    })}
                  </div>
                  <span
                    className={`text-[10px] block mt-2 ${
                      isModel ? 'text-slate-400' : 'text-blue-200'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>

                {isModel && msg.sources && msg.sources.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1 font-semibold text-blue-900 mb-1">
                      <Globe className="w-3 h-3 text-blue-700" />
                      <span>Web Sources:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((s, idx) => (
                        <a
                          key={idx}
                          href={s.web.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 bg-white hover:bg-blue-50 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
                        >
                          <span className="truncate max-w-[200px]">{s.web.title}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {isModel && recommendedBiz.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-blue-700" />
                      Verified VizagConnect Contacts:
                    </span>
                    <div className="space-y-2">
                      {recommendedBiz.map((biz) => (
                        <div
                          key={biz.id}
                          onClick={() => openBusinessModal(biz)}
                          className="bg-white border border-blue-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs hover:shadow-sm cursor-pointer hover:border-blue-400"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={biz.imageUrl}
                              alt={biz.name}
                              className="w-12 h-12 rounded-lg object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-bold bg-blue-50 text-blue-900 px-1.5 py-0.2 rounded">
                                  {biz.scale}
                                </span>
                                <span className="text-[10px] text-slate-500">{biz.area}</span>
                              </div>
                              <h5 className="font-bold text-xs text-slate-900 truncate">
                                {biz.name}
                              </h5>
                              <p className="text-[11px] text-slate-600 truncate">
                                {biz.products?.[0]
                                  ? `${biz.products[0].name} • ₹${biz.products[0].price}`
                                  : biz.keyOfferings[0]}
                              </p>
                            </div>
                          </div>

                          <div className="self-end sm:self-auto shrink-0">
                            <BusinessContactActions business={biz} variant="card" showInquire={true} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 items-center text-xs text-slate-500 bg-white p-3 rounded-2xl border border-slate-200 max-w-xs shadow-2xs">
            <div className="w-7 h-7 rounded-xl bg-blue-900 text-white flex items-center justify-center">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <span>Vizag AI is thinking...</span>
          </div>
        )}

        {errorMessage && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-2.5 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="shrink-0 mb-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {quickPromptsByLang[activeLang].map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => void sendMessage(prompt)}
              className="whitespace-nowrap text-xs bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-900 border border-slate-200 font-medium px-3 py-1.5 rounded-full shadow-2xs"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage();
        }}
        className="shrink-0 flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-300 shadow-sm focus-within:border-blue-700"
      >
        <input
          type="text"
          placeholder="Ask Vizag AI about Visakhapatnam or anything in the world..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-slate-800 focus:outline-hidden placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-gradient-to-r from-blue-900 to-teal-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-40"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
