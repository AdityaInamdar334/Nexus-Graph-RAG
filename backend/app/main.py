import os
import shutil
import uuid
import time
from dotenv import load_dotenv
load_dotenv(override=True)

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .pdf_processing import extract_and_chunk_pdf
from .vector_store import add_chunks_to_vector_store
from .rag_chain import ask_question_hybrid
from .graph_extractor import extract_graph_from_text
from .graph_store import GraphStore
from .metrics import init_db, log_request, submit_feedback, get_dashboard_metrics, update_settings

app = FastAPI(title="Personal Research Assistant API")

# Initialize SQLite database on startup
@app.on_event("startup")
def startup_event():
    init_db()

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# In-memory dictionary to hold graph stores per filename
graphs_db = {}

class QuestionRequest(BaseModel):
    question: str
    filename: str = None

class FeedbackRequest(BaseModel):
    request_id: str
    feedback: int # 1 for thumbs up, -1 for thumbs down

class SettingsRequest(BaseModel):
    latency_threshold: float
    error_rate_threshold: float
    slack_webhook: str = ""
    email_notifications: str = ""

@app.get("/")
def read_root():
    return {"message": "Welcome to the Personal Research Assistant API"}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    # Save the file locally
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # Process PDF and add to vector store
        chunks = extract_and_chunk_pdf(file_path)
        
        if not chunks:
            raise HTTPException(status_code=400, detail="Could not extract any text from the PDF. It might be an image-only scan.")
            
        add_chunks_to_vector_store(chunks)
        
        # Graph Extraction on the first 5000 characters
        full_text = " ".join([chunk.page_content for chunk in chunks])
        demo_text = full_text[:5000]
        
        graph_data = extract_graph_from_text(demo_text)
        
        store = GraphStore()
        store.add_entities_and_relations(graph_data)
        graphs_db[file.filename] = store
        
        return {
            "message": f"Successfully processed {file.filename}.",
            "chunks_added": len(chunks),
            "graph_entities": len(graph_data.get("entities", [])),
            "graph_relations": len(graph_data.get("relations", []))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/graph/{filename}")
async def get_graph(filename: str):
    if filename not in graphs_db:
        raise HTTPException(status_code=404, detail="Graph not found for this file.")
        
    store = graphs_db[filename]
    return store.to_json()

@app.post("/ask")
async def ask_question(request: QuestionRequest):
    if not request.question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")
        
    request_id = uuid.uuid4().hex
    start_time = time.time()
    
    try:
        graph_store = graphs_db.get(request.filename) if request.filename else None
        
        result = ask_question_hybrid(request.question, filename=request.filename, graph_store=graph_store)
        
        # Calculate total latency
        total_latency = time.time() - start_time
        
        # Extract the answer, source documents and specific sub-latencies
        answer = result.get("result")
        sources = [doc.page_content for doc in result.get("source_documents", [])]
        metrics_data = result.get("metrics", {})
        
        retrieval_latency = metrics_data.get("retrieval_latency", 0.0)
        llm_latency = metrics_data.get("llm_latency", 0.0)
        relevance_score = metrics_data.get("relevance_score", 0.0)
        
        # Log successful request
        log_request(
            request_id=request_id,
            query=request.question,
            answer=answer,
            retrieval_latency=retrieval_latency,
            llm_latency=llm_latency,
            total_latency=total_latency,
            relevance_score=relevance_score,
            status="success"
        )
        
        return {
            "request_id": request_id,
            "answer": answer,
            "sources": sources,
            "metrics": {
                "total_latency": total_latency,
                "retrieval_latency": retrieval_latency,
                "llm_latency": llm_latency,
                "relevance_score": relevance_score
            }
        }
    except Exception as e:
        total_latency = time.time() - start_time
        # Log failed request
        log_request(
            request_id=request_id,
            query=request.question,
            answer=None,
            retrieval_latency=0.0,
            llm_latency=0.0,
            total_latency=total_latency,
            relevance_score=None,
            status="error",
            error_message=str(e)
        )
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/feedback")
async def receive_feedback(request: FeedbackRequest):
    try:
        submit_feedback(request.request_id, request.feedback)
        return {"status": "success", "message": "Feedback submitted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics")
async def get_metrics():
    try:
        return get_dashboard_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/metrics/settings")
async def update_metrics_settings(request: SettingsRequest):
    try:
        update_settings({
            "latency_threshold": request.latency_threshold,
            "error_rate_threshold": request.error_rate_threshold,
            "slack_webhook": request.slack_webhook,
            "email_notifications": request.email_notifications
        })
        return {"status": "success", "message": "Settings updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

