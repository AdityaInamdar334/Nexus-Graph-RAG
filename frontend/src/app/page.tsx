"use client";

import React, { useState } from "react";
import GraphViewer from "@/components/GraphViewer";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string; sources?: string[] }[]>([]);
  const [asking, setAsking] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "graph" | "architecture">("chat");
  const [graphData, setGraphData] = useState<any>(null);

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
      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setUploadResult(data);
      
      // Fetch Graph Data
      const graphRes = await fetch(`http://localhost:8000/graph/${file.name}`);
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
      const res = await fetch("http://localhost:8000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQ, filename: file ? file.name : null }),
      });
      const data = await res.json();
      setChat((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, sources: data.sources },
      ]);
    } catch (err) {
      console.error(err);
      setChat((prev) => [
        ...prev,
        { role: "assistant", content: "Error fetching response." },
      ]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-emerald-500/30">
      <div className="max-w-6xl mx-auto p-6 flex flex-col md:flex-row gap-8 h-[95vh] pt-12">
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

        {/* Right Panel - Chat / Graph View */}
        <div className="w-full md:w-2/3 flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
          {/* Tabs */}
          <div className="flex border-b border-white/10 bg-white/5">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === "chat" ? "text-emerald-400 border-b-2 border-emerald-500" : "text-gray-400 hover:text-gray-200"}`}
            >
              Research Chat
            </button>
            <button
              onClick={() => setActiveTab("graph")}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === "graph" ? "text-emerald-400 border-b-2 border-emerald-500" : "text-gray-400 hover:text-gray-200"}`}
            >
              Knowledge Graph Data
            </button>
            <button
              onClick={() => setActiveTab("architecture")}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === "architecture" ? "text-emerald-400 border-b-2 border-emerald-500" : "text-gray-400 hover:text-gray-200"}`}
            >
              System Architecture
            </button>
          </div>

          {activeTab === "chat" ? (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {chat.length === 0 && (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Upload a document and ask a question to begin.
                  </div>
                )}
                {chat.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === "user" ? "bg-emerald-600 text-white rounded-br-none" : "bg-white/10 text-gray-200 rounded-bl-none border border-white/5"}`}>
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
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No graph data available. Process a document first.
                  </div>
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
