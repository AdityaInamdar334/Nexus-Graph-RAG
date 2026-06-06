from langchain_nvidia_ai_endpoints import NVIDIAEmbeddings
from langchain_community.vectorstores import Chroma

# Persist it in a local 'chroma_db' folder for simple retrieval between sessions
CHROMA_PERSIST_DIR = "./chroma_db"
COLLECTION_NAME = "rag_collection"

def get_vector_store():
    """
    Retrieves the existing vector store or creates a new one.
    """
    embeddings = NVIDIAEmbeddings(model="nvidia/nv-embed-v1")
    vector_store = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=CHROMA_PERSIST_DIR
    )
    return vector_store

def add_chunks_to_vector_store(chunks):
    """
    Adds chunks to the Chroma vector store.
    """
    vector_store = get_vector_store()
    vector_store.add_documents(chunks)
    return vector_store
