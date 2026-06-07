# 🧠 Nexus Graph RAG (Research Assistant)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.13-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)

Nexus Graph RAG is an advanced, AI-powered research assistant designed to process complex PDF documents (like research papers and resumes). It uses a hybrid approach combining **Vector Retrieval-Augmented Generation (RAG)** for deep semantic Q&A and an **Obsidian-style Force-Directed Knowledge Graph** to visually map out entities and relationships.

This project was built to demonstrate modern full-stack AI engineering, utilizing highly-optimized local and API-driven language models to build an organic, physics-based UI and lightning-fast chat experience.

---

## 🏗️ Architecture Overview

The system is split into a highly-performant Python backend and a sleek, dynamic React frontend.

### 1. The Backend (FastAPI + Langchain)
- **Framework**: `FastAPI` handles the REST API routes (`/upload`, `/ask`, `/graph`) asynchronously.
- **Hosting**: Deployed on **Render** using a persistent web service blueprint.
- **Document Processing**: `PyPDFLoader` and `RecursiveCharacterTextSplitter` chunk PDFs into overlapping semantic blocks.
- **Vector Storage**: `ChromaDB` stores document embeddings locally.
- **AI Models (Powered by NVIDIA NIM API)**:
  - **Embeddings**: `nvidia/nv-embed-v1` generates high-quality semantic vectors.
  - **Graph Extraction**: `meta/llama-3.1-8b-instruct` parses the text into a strict JSON schema of Entities (Nodes) and Relationships (Edges) using an optimized manual parsing bypass.
  - **Chat / RAG**: `meta/llama-3.1-8b-instruct` acts as the conversational agent, synthesizing context retrieved from ChromaDB to answer complex queries.

### 2. The Frontend (Next.js + TailwindCSS)
- **Framework**: `Next.js 15` (App Router) built with `React`.
- **Hosting**: Deployed globally on **Vercel** for optimal edge performance.
- **Styling**: `Tailwind CSS` is used for modern, glass-morphism aesthetics and responsive layouts.
- **Graph UI**: `react-force-graph-2d` powers the Obsidian-style physics engine. Nodes repel each other, glow dynamically based on entity types, and feature animated energy particles traveling along relationship edges.

---

## ✨ Key Features

- **Semantic Document Q&A**: Upload any PDF and chat with it. The AI doesn't just keyword search; it understands the semantic context using vector embeddings.
- **Obsidian-Style Knowledge Graph**: The backend uses an LLM to autonomously extract "Entities" (e.g., people, concepts, technologies) and "Relationships" (e.g., "USES", "DEVELOPED", "WORKED_AT"). The frontend visualizes this as a living, breathing physics simulation.
- **Lightning Fast Response Times**: By utilizing the 8B parameter Llama 3.1 model running on NVIDIA's optimized NIM architecture, chat responses and graph extractions complete in seconds.
- **Contextual Sources**: Every answer the assistant provides includes the exact document excerpts (sources) it used to formulate its response.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- NVIDIA NIM API Key (`NVIDIA_API_KEY`)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```
Create a `.env` file in the `backend/` directory:
```env
NVIDIA_API_KEY=nvapi-your-key-here
```
Run the FastAPI server:
```bash
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The application will be running at `http://localhost:3000`.

---

## 💡 Why This Architecture?

1. **Hybrid LLM Routing**: Rather than relying on massive 70B+ models for everything (which causes timeout and latency issues), this project utilizes highly-optimized smaller models (Llama 3.1 8B). This demonstrates an understanding of **cost and latency optimization** in production AI systems.
2. **Bypassing Tool-Calling Limitations**: When Llama 8B struggled with strict Langchain `with_structured_output` JSON generation, the architecture was intentionally refactored to use manual prompt-engineering and regex-stripping. This shows resilience and problem-solving around API limitations.
3. **Immersive UX**: The use of a force-directed graph with HTML5 Canvas (instead of standard CSS grids) pushes the boundary of what a data dashboard feels like, taking inspiration from top-tier tools like Obsidian.

---
*Built as a demonstration of Agentic Coding, Advanced RAG, and Modern UI Engineering.*
