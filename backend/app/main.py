import os
import shutil
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

app = FastAPI(title="Personal Research Assistant API")

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
        
    try:
        graph_store = graphs_db.get(request.filename) if request.filename else None
        
        result = ask_question_hybrid(request.question, graph_store)
        
        # Extract the answer and source documents
        answer = result.get("result")
        sources = [doc.page_content for doc in result.get("source_documents", [])]
        
        return {
            "answer": answer,
            "sources": sources
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
