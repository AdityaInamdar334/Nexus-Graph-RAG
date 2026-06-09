"use client";

import React, { useState, useEffect } from "react";
import GraphViewer from "@/components/GraphViewer";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  request_id?: string;
  feedback?: number; // 1 = positive, -1 = negative
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<Message[]>([]);
  const [asking, setAsking] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "graph" | "architecture" | "metrics">("chat");
  const [graphData, setGraphData] = useState<any>(null);

  // Metrics Dashboard State
  const [metricsData, setMetricsData] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Settings Form State
  const [latencyThreshold, setLatencyThreshold] = useState("3.0");
  const [errorThreshold, setErrorThreshold] = useState("10.0");
  const [slackWebhook, setSlackWebhook] = useState("");
  const [emailAlerts, setEmailAlerts] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://nexus-rag-backend-poa5.onrender.com";

  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const res = await fetch(`${API_URL}/metrics`);
      if (res.ok) {
        const data = await res.json();
        setMetricsData(data);
        // Sync setting form
        if (data.settings) {
          setLatencyThreshold(data.settings.latency_threshold || "3.0");
          setErrorThreshold(data.settings.error_rate_threshold || "10.0");
          setSlackWebhook(data.settings.slack_webhook || "");
          setEmailAlerts(data.settings.email_notifications || "");
        }
      }
    } catch (err) {
      console.error("Failed to fetch dashboard metrics:", err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Poll metrics occasionally when active
  useEffect(() => {
    fetchMetrics();
    // Auto-refresh metrics every 15 seconds if tab is active
    const interval = setInterval(() => {
      if (activeTab === "metrics") {
        fetchMetrics();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setUploadResult(data);
      
      // Fetch Graph Data
      const graphRes = await fetch(`${API_URL}/graph/${file.name}`);
      if (graphRes.ok) {
         const gData = await graphRes.json();
         setGraphData(gData);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to upload file. Make sure the backend is running.");
    } finally {
      setUploading(false);
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    const currentQ = question;
    setChat((prev) => [...prev, { role: "user", content: currentQ }]);
    setQuestion("");
    setAsking(true);

    try {
      const res = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQ, filename: file ? file.name : null }),
      });
      
      if (!res.ok) {
        throw new Error("Backend response error");
      }
      
      const data = await res.json();
      setChat((prev) => [
        ...prev,
        { 
          role: "assistant", 
          content: data.answer, 
          sources: data.sources,
          request_id: data.request_id 
        },
      ]);
      // Refresh dashboard metrics in the background
      fetchMetrics();
    } catch (err) {
      console.error(err);
      setChat((prev) => [
        ...prev,
        { role: "assistant", content: "Error fetching response from backend. Verify model key and backend logs." },
      ]);
    } finally {
      setAsking(false);
    }
  };

  const handleFeedback = async (requestId: string, value: number, index: number) => {
    try {
      const res = await fetch(`${API_URL}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, feedback: value }),
      });
      
      if (res.ok) {
        setChat((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], feedback: value };
          return updated;
        });
        fetchMetrics();
      }
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch(`${API_URL}/metrics/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latency_threshold: parseFloat(latencyThreshold) || 3.0,
          error_rate_threshold: parseFloat(errorThreshold) || 10.0,
          slack_webhook: slackWebhook,
          email_notifications: emailAlerts,
        }),
      });
      if (res.ok) {
        alert("Alert settings updated successfully!");
        fetchMetrics();
      } else {
        alert("Failed to update settings.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Custom Interactive SVG Charts
  const renderLatencyChart = () => {
    const data = metricsData?.charts || [];
    if (data.length === 0) {
      return <div className="text-gray-500 text-xs h-32 flex items-center justify-center">No RAG requests captured yet.</div>;
    }

    const maxVal = Math.max(...data.map((d: any) => d.total_latency || 0), 1.5) * 1.15;
    const w = 450;
    const h = 140;
    const p = 20;
    const cw = w - p * 2;
    const ch = h - p * 2;

    const scaleX = (idx: number) => p + (idx / (data.length - 1 || 1)) * cw;
    const scaleY = (val: number) => p + ch - (val / maxVal) * ch;

    const pointsTotal = data.map((d: any, i: number) => `${scaleX(i)},${scaleY(d.total_latency || 0)}`).join(" ");
    const pointsLLM = data.map((d: any, i: number) => `${scaleX(i)},${scaleY(d.llm_latency || 0)}`).join(" ");
    const pointsRet = data.map((d: any, i: number) => `${scaleX(i)},${scaleY(d.retrieval_latency || 0)}`).join(" ");

    return (
      <div className="relative">
        <svg className="w-full h-36" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
          <line x1={p} y1={p} x2={w-p} y2={p} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
          <line x1={p} y1={p + ch/2} x2={w-p} y2={p + ch/2} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
          <line x1={p} y1={p + ch} x2={w-p} y2={p + ch} stroke="rgba(255,255,255,0.15)" />
          
          <text x={p - 5} y={p + 3} fill="#888" fontSize="7" textAnchor="end">{maxVal.toFixed(1)}s</text>
          <text x={p - 5} y={p + ch/2 + 3} fill="#888" fontSize="7" textAnchor="end">{(maxVal/2).toFixed(1)}s</text>
          <text x={p - 5} y={p + ch + 3} fill="#888" fontSize="7" textAnchor="end">0s</text>

          {data.length > 1 && (
            <>
              <polyline fill="none" stroke="#3b82f6" strokeWidth="1.5" points={pointsRet} opacity="0.6" strokeDasharray="1,1" />
              <polyline fill="none" stroke="#10b981" strokeWidth="1.5" points={pointsLLM} opacity="0.6" />
              <polyline fill="none" stroke="#a78bfa" strokeWidth="2.5" points={pointsTotal} />
            </>
          )}

          {data.map((d: any, i: number) => (
            <circle key={i} cx={scaleX(i)} cy={scaleY(d.total_latency)} r="3" fill="#a78bfa" className="cursor-pointer hover:r-4 transition-all" />
          ))}
        </svg>
        <div className="flex gap-4 justify-center text-[10px] text-gray-400 mt-1">
          <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-[#a78bfa]" /> Total Latency</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-[#10b981]" /> LLM Latency</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-[#3b82f6] border-dashed" /> Retrieval Latency</span>
        </div>
      </div>
    );
  };

  const renderRelevanceChart = () => {
    const data = (metricsData?.charts || []).filter((d: any) => d.status === "success" && d.relevance_score !== null);
    if (data.length === 0) {
      return <div className="text-gray-500 text-xs h-32 flex items-center justify-center">No successful queries yet.</div>;
    }

    const w = 450;
    const h = 140;
    const p = 20;
    const cw = w - p * 2;
    const ch = h - p * 2;

    const scaleX = (idx: number) => p + (idx / (data.length - 1 || 1)) * cw;
    const scaleY = (val: number) => p + ch - (val * ch); // score is 0 to 1

    const pointsRel = data.map((d: any, i: number) => `${scaleX(i)},${scaleY(d.relevance_score)}`).join(" ");
    const pointsDrift = data.map((d: any, i: number) => `${scaleX(i)},${scaleY(Math.max(0, Math.min(1, 0.5 + d.relevance_drift)))}`).join(" ");

    return (
      <div className="relative">
        <svg className="w-full h-36" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
          <line x1={p} y1={p} x2={w-p} y2={p} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
          <line x1={p} y1={p + ch/2} x2={w-p} y2={p + ch/2} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
          <line x1={p} y1={p + ch} x2={w-p} y2={p + ch} stroke="rgba(255,255,255,0.15)" />
          
          <text x={p - 5} y={p + 3} fill="#888" fontSize="7" textAnchor="end">1.0</text>
          <text x={p - 5} y={p + ch/2 + 3} fill="#888" fontSize="7" textAnchor="end">0.5</text>
          <text x={p - 5} y={p + ch + 3} fill="#888" fontSize="7" textAnchor="end">0.0</text>

          {data.length > 1 && (
            <>
              <polyline fill="none" stroke="#f59e0b" strokeWidth="1.5" points={pointsDrift} opacity="0.6" strokeDasharray="2,2" />
              <polyline fill="none" stroke="#06b6d4" strokeWidth="2.5" points={pointsRel} />
            </>
          )}

          {data.map((d: any, i: number) => (
            <circle key={i} cx={scaleX(i)} cy={scaleY(d.relevance_score)} r="3" fill="#06b6d4" />
          ))}
        </svg>
        <div className="flex gap-4 justify-center text-[10px] text-gray-400 mt-1">
          <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-[#06b6d4]" /> Context Relevance</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-[#f59e0b] border-dashed" /> Drift Indicator (+/-)</span>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-emerald-500/30">
      <div className="max-w-6xl mx-auto p-4 md:p-6 flex flex-col md:flex-row gap-6 md:gap-8 min-h-screen md:h-[95vh] pt-6 md:pt-12">
        {/* Left Panel - Upload & Info */}
        <div className="w-full md:w-1/3 flex flex-col gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-2xl transition-all hover:border-white/20">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent mb-2">
              Nexus Graph RAG
            </h1>
            <p className="text-gray-400 text-sm mb-6">
              Upload a research paper to extract entities, relationships, and answer complex queries.
            </p>

            <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:bg-white/5 transition-colors cursor-pointer group">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-300">
                  {file ? file.name : "Select a PDF file"}
                </span>
              </label>
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="mt-4 w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              {uploading ? "Processing & Extracting..." : "Process Document"}
            </button>
            
            {uploadResult && (
              <div className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                <p className="font-semibold mb-1">Processing Complete</p>
                <p>Extracted {uploadResult.chunks_added} chunks</p>
                <p>Found {uploadResult.graph_entities} entities and {uploadResult.graph_relations} relations</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Chat / Graph / Metrics View */}
        <div className="w-full md:w-2/3 flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm h-[600px] md:h-auto md:min-h-0">
          {/* Tabs */}
          <div className="flex border-b border-white/10 bg-white/5 overflow-x-auto whitespace-nowrap hide-scrollbar">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 px-4 py-3 md:py-4 text-xs md:text-sm font-medium transition-colors ${activeTab === "chat" ? "text-emerald-400 border-b-2 border-emerald-500" : "text-gray-400 hover:text-gray-200"}`}
            >
              Research Chat
            </button>
            <button
              onClick={() => setActiveTab("graph")}
              className={`flex-1 px-4 py-3 md:py-4 text-xs md:text-sm font-medium transition-colors ${activeTab === "graph" ? "text-emerald-400 border-b-2 border-emerald-500" : "text-gray-400 hover:text-gray-200"}`}
            >
              Knowledge Graph Data
            </button>
            <button
              onClick={() => setActiveTab("metrics")}
              className={`flex-1 px-4 py-3 md:py-4 text-xs md:text-sm font-medium transition-colors ${activeTab === "metrics" ? "text-emerald-400 border-b-2 border-emerald-500" : "text-gray-400 hover:text-gray-200"}`}
            >
              Monitoring Dashboard
            </button>
            <button
              onClick={() => setActiveTab("architecture")}
              className={`flex-1 px-4 py-3 md:py-4 text-xs md:text-sm font-medium transition-colors ${activeTab === "architecture" ? "text-emerald-400 border-b-2 border-emerald-500" : "text-gray-400 hover:text-gray-200"}`}
            >
              System Architecture
            </button>
          </div>

          {activeTab === "chat" ? (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {chat.length === 0 && (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                    Upload a document and ask a question to begin.
                  </div>
                )}
                {chat.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === "user" ? "bg-emerald-600 text-white rounded-br-none" : "bg-white/10 text-gray-200 rounded-bl-none border border-white/5"}`}>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <p className="text-xs text-gray-400 font-semibold mb-2">Sources:</p>
                          <div className="space-y-2">
                            {msg.sources.map((s, i) => (
                              <div key={i} className="text-xs text-gray-500 bg-black/20 p-2 rounded">
                                {s.substring(0, 150)}...
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Thumbs Feedback System */}
                      {msg.role === "assistant" && msg.request_id && (
                        <div className="flex items-center gap-3 mt-3 pt-2 border-t border-white/5">
                          <span className="text-[10px] text-gray-500 font-mono">ID: {msg.request_id.substring(0, 8)}...</span>
                          <div className="flex gap-2 ml-auto">
                            <button
                              onClick={() => handleFeedback(msg.request_id!, 1, idx)}
                              className={`p-1 rounded hover:bg-white/10 transition-colors ${msg.feedback === 1 ? "text-emerald-400 bg-emerald-500/10" : "text-gray-400"}`}
                              title="Thumbs Up"
                            >
                              <svg className="w-4 h-4" fill={msg.feedback === 1 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5v2.25m-9 3.75h9M3.75 20.25h16.5A2.25 2.25 0 0022.5 18V9.75A2.25 2.25 0 0020.25 7.5H16.5m-9 12.75v-12.75A2.25 2.25 0 005.25 7.5H3.75A2.25 2.25 0 001.5 9.75v8.25A2.25 2.25 0 003.75 20.25z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleFeedback(msg.request_id!, -1, idx)}
                              className={`p-1 rounded hover:bg-white/10 transition-colors ${msg.feedback === -1 ? "text-rose-400 bg-rose-500/10" : "text-gray-400"}`}
                              title="Thumbs Down"
                            >
                              <svg className="w-4 h-4" fill={msg.feedback === -1 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.367 13.5c-.806 0-1.533.446-2.031 1.08a9.041 9.041 0 01-2.861 2.4c-.723.384-1.35.956-1.653 1.715a4.498 4.498 0 00-.322 1.672v.678a.75.75 0 01-.75.75A2.25 2.25 0 017.5 19.5v-2.25m9-3.75H7.5M20.25 3.75H3.75A2.25 2.25 0 001.5 6v8.25A2.25 2.25 0 003.75 16.5h3.75m9-12.75v12.75a2.25 2.25 0 002.25 2.25h1.5A2.25 2.25 0 0022.5 14.25v-8.25A2.25 2.25 0 0020.25 3.75z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {asking && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 rounded-2xl p-4 rounded-bl-none flex gap-2 items-center">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-white/10 bg-black/20">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                    placeholder="Ask about the document..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    onClick={handleAsk}
                    disabled={asking || !question.trim()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 rounded-xl font-medium transition-colors disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === "graph" ? (
             <div className="flex-1 p-6 h-full min-h-[400px]">
                {graphData ? (
                   <div className="h-full w-full rounded-xl overflow-hidden border border-white/10 relative">
                      <GraphViewer 
                         graphData={graphData} 
                         onNodeClick={(name) => {
                            setQuestion(`Tell me about ${name}`);
                            setActiveTab("chat");
                         }} 
                      />
                   </div>
                ) : (
                   <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                     No graph data available. Process a document first.
                   </div>
                  )}
             </div>
          ) : activeTab === "metrics" ? (
            <div className="flex-1 p-6 h-full overflow-y-auto custom-scrollbar space-y-6">
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">Evaluation & Performance Dashboard</h2>
                  <p className="text-xs text-gray-400">Real-time metrics, semantic relevance scores, and system health monitors.</p>
                </div>
                <div className="flex gap-2">
                  <a 
                    href="/dashboard" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 text-xs transition-colors flex items-center gap-1.5"
                  >
                    Open in New Tab &nearr;
                  </a>
                  <button 
                    onClick={fetchMetrics}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs transition-colors flex items-center gap-1.5"
                    disabled={loadingMetrics}
                  >
                    <svg className={`w-3.5 h-3.5 ${loadingMetrics ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Sync
                  </button>
                </div>
              </div>

              {metricsData ? (
                <>
                  {/* KPI Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between hover:border-white/20 transition-all">
                      <span className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">Total Queries</span>
                      <span className="text-2xl font-bold mt-1 text-white">{metricsData.stats.total_requests}</span>
                      <span className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                        Success Rate: {metricsData.stats.success_rate}%
                      </span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between hover:border-white/20 transition-all">
                      <span className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">Avg Latency</span>
                      <span className="text-2xl font-bold mt-1 text-white">{metricsData.stats.avg_total_latency}s</span>
                      <span className="text-[10px] text-gray-500 mt-1">
                        Retrieval: {metricsData.stats.avg_retrieval_latency}s | LLM: {metricsData.stats.avg_llm_latency}s
                      </span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between hover:border-white/20 transition-all">
                      <span className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">Semantic Relevance</span>
                      <span className="text-2xl font-bold mt-1 text-cyan-400">{metricsData.stats.avg_relevance}</span>
                      <span className={`text-[10px] mt-1 flex items-center gap-1 ${metricsData.stats.avg_drift >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        Drift: {metricsData.stats.avg_drift >= 0 ? "+" : ""}{metricsData.stats.avg_drift}
                      </span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between hover:border-white/20 transition-all">
                      <span className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">User Satisfaction</span>
                      <span className="text-2xl font-bold mt-1 text-purple-400">{metricsData.stats.feedback_score}</span>
                      <span className="text-[10px] text-gray-500 mt-1">
                        👍 {metricsData.stats.thumbs_up} | 👎 {metricsData.stats.thumbs_down}
                      </span>
                    </div>
                  </div>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <h3 className="text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">RAG Pipeline Latencies (Last 25 requests)</h3>
                      {renderLatencyChart()}
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <h3 className="text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">Context Relevance & Drift Profile</h3>
                      {renderRelevanceChart()}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Active Alerts Panel */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 lg:col-span-1 flex flex-col h-72">
                      <h3 className="text-xs font-semibold text-rose-400 mb-3 uppercase tracking-wide flex items-center gap-1">
                        <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Incidents & Alerts Log
                      </h3>
                      <div className="flex-1 overflow-y-auto space-y-2 text-xs pr-1">
                        {metricsData.alerts.length === 0 ? (
                          <div className="text-gray-500 h-full flex items-center justify-center">No alert thresholds breached.</div>
                        ) : (
                          metricsData.alerts.map((alert: any) => (
                            <div key={alert.id} className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300">
                              <div className="flex justify-between font-medium">
                                <span>{alert.type.toUpperCase()} SPIKE</span>
                                <span className="text-[10px] text-rose-400/80">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                              </div>
                              <p className="text-[11px] text-gray-400 mt-0.5">{alert.message}</p>
                              <div className="mt-1 text-[10px] font-mono flex justify-between opacity-80">
                                <span>Value: {alert.value}</span>
                                <span>Limit: {alert.threshold}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Alert Thresholds Settings */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 lg:col-span-2 flex flex-col h-72">
                      <h3 className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wide">Configure Alert Integrations</h3>
                      <form onSubmit={handleSaveSettings} className="flex-1 flex flex-col justify-between text-xs">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-gray-400 mb-1">Latency Limit (sec)</label>
                            <input 
                              type="number" 
                              step="0.1" 
                              value={latencyThreshold} 
                              onChange={(e) => setLatencyThreshold(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-400 mb-1">Error Threshold (%)</label>
                            <input 
                              type="number" 
                              step="1" 
                              value={errorThreshold} 
                              onChange={(e) => setErrorThreshold(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="mt-3">
                          <label className="block text-gray-400 mb-1">Slack Webhook URL</label>
                          <input 
                            type="text" 
                            placeholder="https://hooks.slack.com/services/..."
                            value={slackWebhook} 
                            onChange={(e) => setSlackWebhook(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 focus:border-emerald-500 focus:outline-none text-[11px]"
                          />
                        </div>
                        <div className="mt-3">
                          <label className="block text-gray-400 mb-1">Alert Receiver Emails (SMTP Log)</label>
                          <input 
                            type="email" 
                            placeholder="admin@myorg.com"
                            value={emailAlerts} 
                            onChange={(e) => setEmailAlerts(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 focus:border-emerald-500 focus:outline-none text-[11px]"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={savingSettings}
                          className="mt-4 w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium py-2 rounded transition-all hover:opacity-95 text-xs"
                        >
                          {savingSettings ? "Updating Thresholds..." : "Save Configuration"}
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Recent Request Logs */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h3 className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wide">Request Audit Logs (Last 20)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-gray-400">
                            <th className="pb-2">Timestamp</th>
                            <th className="pb-2">Query</th>
                            <th className="pb-2">Total Latency</th>
                            <th className="pb-2">Relevance</th>
                            <th className="pb-2">Feedback</th>
                            <th className="pb-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metricsData.logs.map((log: any) => (
                            <tr key={log.request_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="py-2.5 text-gray-500 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</td>
                              <td className="py-2.5 text-gray-300 truncate max-w-xs" title={log.query}>{log.query}</td>
                              <td className="py-2.5 text-gray-300 font-mono">{log.total_latency?.toFixed(2)}s</td>
                              <td className="py-2.5 text-cyan-400 font-mono">{log.relevance_score !== null ? log.relevance_score.toFixed(2) : "-"}</td>
                              <td className="py-2.5">
                                {log.feedback === 1 ? "👍" : log.feedback === -1 ? "👎" : "-"}
                              </td>
                              <td className="py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${log.status === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
                                  {log.status.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-gray-500 h-40 flex items-center justify-center text-sm">Failed to connect to backend server. Make sure the FastAPI application is running.</div>
              )}
            </div>
          ) : (
            <div className="flex-1 p-8 h-full overflow-y-auto custom-scrollbar">
              <div className="max-w-3xl mx-auto space-y-8 pb-12">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent mb-4">How It Works</h2>
                  <p className="text-gray-300 leading-relaxed">
                    Nexus Graph RAG is an advanced AI research assistant. It uses a hybrid approach combining <strong>Vector Retrieval-Augmented Generation (RAG)</strong> for deep semantic Q&A and an <strong>Obsidian-style Force-Directed Knowledge Graph</strong> to visually map out entities and relationships.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-black/20 border border-white/5 p-6 rounded-xl hover:bg-white/5 transition-colors">
                    <h3 className="text-lg font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
                      The Backend
                    </h3>
                    <ul className="text-sm text-gray-400 space-y-3">
                      <li><strong className="text-gray-200">Framework:</strong> FastAPI (Python) handles the async REST API routes.</li>
                      <li><strong className="text-gray-200">Hosting:</strong> Deployed as a web service on <strong>Render</strong>.</li>
                      <li><strong className="text-gray-200">Vector Storage:</strong> ChromaDB stores document embeddings locally.</li>
                      <li><strong className="text-gray-200">AI Models:</strong> Powered by Llama 3.1 8B via NVIDIA NIM API for ultra-fast execution.</li>
                    </ul>
                  </div>
                  <div className="bg-black/20 border border-white/5 p-6 rounded-xl hover:bg-white/5 transition-colors">
                    <h3 className="text-lg font-semibold text-teal-400 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      The Frontend
                    </h3>
                    <ul className="text-sm text-gray-400 space-y-3">
                      <li><strong className="text-gray-200">Framework:</strong> Next.js 15 App Router built with React.</li>
                      <li><strong className="text-gray-200">Hosting:</strong> Deployed globally on <strong>Vercel</strong>.</li>
                      <li><strong className="text-gray-200">Styling:</strong> Tailwind CSS for a modern, glass-morphism aesthetic.</li>
                      <li><strong className="text-gray-200">Physics Engine:</strong> react-force-graph-2d powers the organic, interactive graph UI.</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Engineering Highlights</h3>
                  <div className="space-y-4">
                    <div className="border-l-2 border-emerald-500 pl-4 py-1">
                      <h4 className="text-white font-medium">Bypassing Tool-Calling Limitations</h4>
                      <p className="text-sm text-gray-400 mt-1">When Llama 8B struggled with strict Langchain structured JSON generation, the architecture was intentionally refactored to use manual prompt-engineering and regex-stripping. This ensures high reliability without needing massive, slower 70B models.</p>
                    </div>
                    <div className="border-l-2 border-teal-500 pl-4 py-1">
                      <h4 className="text-white font-medium">Immersive Data Visualization</h4>
                      <p className="text-sm text-gray-400 mt-1">The use of an HTML5 Canvas-based force-directed graph (instead of standard CSS grids) pushes the boundary of what a data dashboard feels like, providing an organic way to explore complex relationships.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

