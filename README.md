# Nexus Graph RAG

[![Python](https://img.shields.io/badge/Python-3.13-blue)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-green)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Nexus Graph RAG is a full-stack AI research assistant that combines Retrieval-Augmented Generation (RAG) with automated knowledge graph construction to enable semantic document understanding and interactive exploration of complex PDFs.

The system processes research papers, technical documents, and resumes, extracting structured entities and relationships while providing source-grounded conversational question answering. An interactive force-directed knowledge graph visualizes connections discovered within uploaded documents, allowing users to navigate information beyond traditional chat interfaces.

---

## Overview

Traditional document chat systems rely solely on vector retrieval, limiting users to conversational exploration. Nexus Graph RAG extends this paradigm by combining:

* Semantic retrieval through vector embeddings
* Knowledge graph extraction using large language models
* Interactive graph visualization
* Source-grounded conversational AI

The result is a research assistant capable of both answering questions and revealing relationships hidden within large documents.

---

## Project Highlights

* Built a full-stack Retrieval-Augmented Generation platform using FastAPI and Next.js
* Implemented semantic document search using vector embeddings and ChromaDB
* Designed an automated knowledge graph extraction pipeline powered by LLMs
* Developed an interactive force-directed graph visualization for entity exploration
* Optimized inference latency through lightweight model selection and efficient retrieval
* Deployed production-ready backend and frontend services on cloud infrastructure

---

## System Architecture

The application follows a modular architecture consisting of three primary components:

### Document Processing Layer

PDF documents are ingested and transformed into structured semantic representations.

Pipeline:

```text
PDF Upload
    ↓
Text Extraction
    ↓
Chunking
    ↓
Embedding Generation
    ↓
Vector Storage
```

Components:

* PDF Parsing
* Recursive Text Splitting
* Embedding Generation
* ChromaDB Indexing

---

## Backend Architecture

### FastAPI Service

The backend exposes asynchronous REST endpoints for:

| Endpoint  | Purpose                                |
| --------- | -------------------------------------- |
| `/upload` | Upload and process documents           |
| `/ask`    | Perform Retrieval-Augmented Generation |
| `/graph`  | Generate entity relationship graphs    |

The service is optimized for concurrent requests and efficient document processing workflows.

---

### Retrieval-Augmented Generation Pipeline

The RAG system follows the workflow:

```text
User Query
    ↓
Vector Search
    ↓
Relevant Context Retrieval
    ↓
LLM Synthesis
    ↓
Grounded Response
```

Retrieved document chunks are injected into the model prompt, enabling context-aware responses that remain grounded in source material.

---

### Vector Database

ChromaDB is used to store and retrieve document embeddings.

Benefits include:

* Fast semantic search
* Persistent vector storage
* Scalable retrieval workflows
* Low-latency similarity matching

---

### Knowledge Graph Extraction

An LLM-based extraction pipeline identifies:

#### Entities

Examples:

* People
* Organizations
* Technologies
* Concepts
* Research Topics

#### Relationships

Examples:

* USES
* CREATED
* DEVELOPED
* WORKED_AT
* RELATED_TO

Extracted entities and relationships are converted into a structured graph representation.

---

## Frontend Architecture

### Next.js Application

The frontend is built using:

* Next.js 15
* React
* TypeScript
* Tailwind CSS

The application provides:

* PDF upload workflows
* Conversational document interaction
* Interactive graph exploration
* Source inspection

---

### Interactive Knowledge Graph

The graph interface is powered by a force-directed physics engine.

Features include:

* Dynamic node repulsion
* Relationship edge visualization
* Entity-type highlighting
* Interactive graph navigation
* Real-time graph rendering

Users can visually explore relationships discovered within uploaded documents.

---

## Repository Structure

```text
nexus-graph-rag/
│
├── backend/
│   ├── app/
│   ├── vectorstore/
│   ├── graph/
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   └── package.json
│
└── README.md
```

---

## Technology Stack

### Backend

* Python
* FastAPI
* LangChain
* ChromaDB
* PyPDF
* NVIDIA NIM APIs

### Frontend

* Next.js 15
* React
* TypeScript
* Tailwind CSS
* React Force Graph

### AI & Retrieval

* Retrieval-Augmented Generation (RAG)
* Vector Embeddings
* Knowledge Graph Extraction
* Semantic Search
* Large Language Models

---

## Installation

### Backend Setup

Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file:

```env
NVIDIA_API_KEY=your_api_key
```

Start the API server:

```bash
uvicorn app.main:app --reload
```

---

### Frontend Setup

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Application URL:

```text
http://localhost:3000
```

---

## Deployment

### Backend

Deployed using cloud-hosted FastAPI services.

Responsibilities:

* Document ingestion
* Embedding generation
* Retrieval workflows
* Graph extraction
* LLM orchestration

### Frontend

Deployed globally through edge infrastructure for low-latency user experiences.

Responsibilities:

* User interaction
* Graph rendering
* Document uploads
* Conversational interface

---

## Design Decisions

### Lightweight Model Strategy

Rather than relying on large-scale models for every task, the system uses optimized smaller models for:

* Faster inference
* Reduced latency
* Lower operational cost
* Improved responsiveness

This reflects practical production engineering tradeoffs frequently encountered in enterprise AI systems.

---

### Knowledge Graph Augmentation

Most RAG applications expose information solely through chat interfaces.

This project augments retrieval with graph-based reasoning and visualization, enabling users to:

* Discover hidden relationships
* Navigate entities visually
* Explore document structure interactively

---

### Source-Grounded Responses

Every response is generated from retrieved document context.

Benefits include:

* Improved factual grounding
* Increased transparency
* Better research workflows
* Explainable AI outputs

---

## Future Improvements

Potential extensions include:

* Multi-document graph merging
* Cross-document relationship discovery
* GraphRAG integration
* Agentic research workflows
* Citation generation
* Multi-modal document support
* Neo4j graph persistence
* User authentication and document management

---

## Learning Outcomes

This project demonstrates experience with:

* Retrieval-Augmented Generation
* Semantic Search Systems
* Vector Databases
* Knowledge Graph Construction
* LLM Application Development
* Full-Stack Engineering
* Cloud Deployment
* AI System Design

---

## License

This project is licensed under the MIT License.

See the `LICENSE` file for additional information. 
