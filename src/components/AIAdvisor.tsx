import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import {
  Sparkles,
  Send,
  Loader2,
  FileText,
  TrendingDown,
  Activity,
  Copy,
  Check,
  RefreshCw,
  HelpCircle,
  MessageSquare,
  Download
} from "lucide-react";

interface AIAdvisorProps {
  id: string;
  aggregatedData: any;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIAdvisor({ id, aggregatedData }: AIAdvisorProps) {
  const [activeTab, setActiveTab] = useState<"reports" | "chat">("reports");

  // 1. Reports Generation State
  const [selectedReport, setSelectedReport] = useState<"executive" | "optimization" | "merchandise">("executive");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportsCache, setReportsCache] = useState<Record<string, string>>({});
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportCopied, setReportCopied] = useState(false);

  // 2. Chat State
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hello! I am your **Retail Sales Intelligence Co-Pilot**. I have ingested your latest stores dataset ($${(aggregatedData.totalSales || 0).toLocaleString()} in revenue across ${aggregatedData.storeCount || 0} locations).

How can I assist your business analysis today? You can ask me custom questions like:
* *Which store types are generating the highest transaction value?*
* *Analyze our lowest performing region and propose an action plan.*
* *Compare Copley Flagship against Mag Mile Flagship metrics.*`
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab]);

  // Report Generator Handler
  const generateReport = async (type: "executive" | "optimization" | "merchandise", forceRefresh = false) => {
    if (reportsCache[type] && !forceRefresh) {
      setSelectedReport(type);
      return;
    }

    setReportLoading(true);
    setReportError(null);
    setSelectedReport(type);

    try {
      const response = await fetch("/api/generate-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaryType: type, aggregatedData }),
      });

      if (!response.ok) {
        throw new Error("Failed to reach server. Please check dev server logs.");
      }

      const data = await response.json();
      if (data.success === false && data.message) {
        // Safe fallback / demo warning
        setReportsCache(prev => ({ ...prev, [type]: data.insight }));
        setReportError(data.message);
      } else {
        setReportsCache(prev => ({ ...prev, [type]: data.insight }));
      }
    } catch (err: any) {
      setReportError("Error generating report: " + err.message);
    } finally {
      setReportLoading(false);
    }
  };

  // Generate initial report on mount
  useEffect(() => {
    generateReport("executive");
  }, [aggregatedData]); // Re-generate if user uploads a new dataset!

  // Copy report handler
  const handleCopyReport = (text: string) => {
    navigator.clipboard.writeText(text);
    setReportCopied(true);
    setTimeout(() => setReportCopied(false), 2000);
  };

  // Download report handler
  const handleDownloadReport = () => {
    const text = reportsCache[selectedReport];
    if (!text) return;
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `retail_insights_${selectedReport}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Send Chat Message Handler
  const handleSendMessage = async (textToSend?: string) => {
    const prompt = textToSend || chatInput;
    if (!prompt.trim() || chatLoading) return;

    if (!textToSend) setChatInput(""); // Clear typing input

    const updatedMessages = [...chatMessages, { role: "user" as const, content: prompt }];
    setChatMessages(updatedMessages);
    setChatLoading(true);
    setChatError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, aggregatedData }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response from AI advisor.");
      }

      const data = await response.json();
      if (data.success === false && data.message) {
        setChatMessages(prev => [
          ...prev,
          { role: "assistant", content: data.response }
        ]);
        setChatError(data.message);
      } else {
        setChatMessages(prev => [
          ...prev,
          { role: "assistant", content: data.response }
        ]);
      }
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        { role: "assistant", content: `❌ **Error**: Failed to obtain answer. (${err.message})` }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Quick Action Chat suggestions
  const SUGGESTED_PROMPTS = [
    { label: "Analyze Bottom Stores", text: "Please review our bottom 3 performing stores by target achievement and suggest store-level adjustments." },
    { label: "Flagship Format Audit", text: "How are our Flagship format stores performing compared to Express locations in terms of average customer CSI and ATV?" },
    { label: "Northeast vs West", text: "Contrast our performance in the Northeast region with the West region. What can we replicate?" }
  ];

  return (
    <div id={id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[650px]">
      {/* Executive Header */}
      <div className="bg-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-base tracking-tight font-display flex items-center gap-2">
              Gemini Retail Advisory Hub
            </h3>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Generative strategic consulting trained on current store metrics
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/50 self-start sm:self-center">
          <button
            onClick={() => setActiveTab("reports")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all ${
              activeTab === "reports"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Strategic Reports
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all ${
              activeTab === "chat"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            AI Co-Pilot Chat
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/30">
        
        {/* Tab 1: Strategic Reports */}
        {activeTab === "reports" && (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Left selector menu (md devices and up) */}
            <div className="w-full md:w-60 bg-white border-b md:border-b-0 md:border-r border-slate-100 p-4 space-y-2 flex-shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-3 px-1 font-sans">
                Choose Report Format
              </span>

              {[
                { id: "executive", label: "Executive Performance Pulse", icon: Activity, desc: "Global status, major gaps, regional contrast" },
                { id: "optimization", label: "Underperforming Store Audit", icon: TrendingDown, desc: "Action plan for lagging stores/CSI issues" },
                { id: "merchandise", label: "Merchandise Allocation", icon: FileText, desc: "Format-specific stock and basket metrics" }
              ].map(rep => {
                const isSel = selectedReport === rep.id;
                const Icon = rep.icon;
                return (
                  <button
                    key={rep.id}
                    onClick={() => generateReport(rep.id as any)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                      isSel
                        ? "bg-indigo-50/50 border-indigo-200 text-slate-900 shadow-sm"
                        : "bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-600"
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 ${isSel ? "text-indigo-600" : "text-slate-400"}`} />
                    <div>
                      <div className="text-xs font-bold font-sans">{rep.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{rep.desc}</div>
                    </div>
                  </button>
                );
              })}

              {/* Secret/Config Status Info */}
              {reportError && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-800 font-sans">
                  <span className="font-bold block mb-1">Demo Mode Active</span>
                  {reportError}
                </div>
              )}
            </div>

            {/* Report Display Container */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 relative flex flex-col">
              <AnimatePresence mode="wait">
                {reportLoading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10"
                  >
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    <span className="text-xs font-semibold text-slate-600 font-sans">
                      Gemini is analyzing store sales matrices...
                    </span>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/60">
                <span className="text-xs font-semibold text-slate-500 font-mono flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-600" />
                  Format: MARKDOWN REPORT
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generateReport(selectedReport, true)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 transition-all flex items-center gap-1 text-[10px] font-semibold"
                    title="Re-generate Report"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Recalculate
                  </button>
                  {reportsCache[selectedReport] && (
                    <>
                      <button
                        onClick={() => handleCopyReport(reportsCache[selectedReport])}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 transition-all flex items-center gap-1 text-[10px] font-semibold"
                      >
                        {reportCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        {reportCopied ? "Copied!" : "Copy Markdown"}
                      </button>
                      <button
                        onClick={handleDownloadReport}
                        className="p-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 transition-all flex items-center gap-1 text-[10px] font-bold"
                        title="Download report as markdown brief file"
                      >
                        <Download className="w-3 h-3" />
                        Download Brief
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Content body */}
              <div className="flex-1 bg-white border border-slate-200/60 rounded-xl p-6 shadow-sm overflow-y-auto">
                {reportsCache[selectedReport] ? (
                  <div className="prose prose-sm prose-slate max-w-none text-slate-800 font-sans space-y-4">
                    <Markdown>{reportsCache[selectedReport]}</Markdown>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 py-12">
                    <FileText className="w-10 h-10 stroke-[1.5]" />
                    <span className="text-xs font-medium">Click a report type on the left to generate.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Interactive Chat */}
        {activeTab === "chat" && (
          <div className="flex-1 overflow-hidden flex flex-col h-full bg-white">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/20">
              {chatMessages.map((msg, index) => {
                const isAI = msg.role === "assistant";
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex gap-3 max-w-3xl ${isAI ? "mr-auto" : "ml-auto flex-row-reverse"}`}
                  >
                    {/* Icon Bubble */}
                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold border shadow-sm ${
                      isAI
                        ? "bg-slate-950 text-indigo-400 border-slate-800"
                        : "bg-indigo-600 text-white border-indigo-700"
                    }`}>
                      {isAI ? "AI" : "EX"}
                    </div>

                    {/* Chat Bubble */}
                    <div className={`p-4 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      isAI
                        ? "bg-white border border-slate-100 text-slate-800 rounded-tl-none"
                        : "bg-indigo-600 text-white rounded-tr-none"
                    }`}>
                      <div className={`prose prose-sm prose-slate ${isAI ? "text-slate-800" : "text-white prose-invert"}`}>
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {chatLoading && (
                <div className="flex gap-3 max-w-lg mr-auto">
                  <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-indigo-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="p-3.5 bg-white border border-slate-100 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-sans animate-pulse">
                      AI Co-Pilot is processing business query...
                    </span>
                  </div>
                </div>
              )}

              {/* Warning/Status banner inside chat list */}
              {chatError && (
                <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl text-xs font-sans max-w-lg mx-auto text-center">
                  <span className="font-bold">Advisor Status: </span> {chatError}
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Quick Prompts Panel */}
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
              <span className="text-[10px] font-bold text-slate-400 font-sans uppercase">Quick Ask:</span>
              {SUGGESTED_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.text)}
                  disabled={chatLoading}
                  className="bg-white hover:bg-indigo-50 hover:text-indigo-700 text-[10px] font-medium text-slate-600 px-3 py-1.5 rounded-full border border-slate-200 hover:border-indigo-200 transition-all cursor-pointer shadow-sm disabled:opacity-55"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-slate-100 flex items-center gap-2 bg-white">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendMessage()}
                placeholder="Ask your AI Co-Pilot any sales strategy questions..."
                className="flex-1 bg-slate-50 hover:bg-slate-100/55 focus:bg-white text-xs text-slate-900 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:outline-none p-3 rounded-xl transition-all"
                disabled={chatLoading}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!chatInput.trim() || chatLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl transition-all shadow-sm shadow-indigo-100 flex-shrink-0 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
