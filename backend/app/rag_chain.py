from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_core.prompts import PromptTemplate
from .hybrid_retriever import hybrid_retrieve
from .vector_store import get_vector_store

def ask_question_hybrid(question: str, graph_store=None):
    """
    Answers a question using hybrid context (vector + graph) instead of simple RetrievalQA.
    """
    vector_store = get_vector_store()
    
    # Get combined hybrid context
    combined_context, source_docs = hybrid_retrieve(question, vector_store, graph_store, k=4)
    
    llm = ChatNVIDIA(model="meta/llama-3.1-8b-instruct", temperature=0.2, top_p=0.7, max_tokens=1024)
    
    prompt_template = """Use the following pieces of context to answer the question at the end. 
The context includes both text chunks and extracted graph relationships.
If you don't know the answer based on the context, just say that you don't know, don't try to make up an answer.

Context:
{context}

Question: {question}
Helpful Answer:"""
    
    prompt = PromptTemplate(
        template=prompt_template, input_variables=["context", "question"]
    )
    
    formatted_prompt = prompt.format(context=combined_context, question=question)
    response = llm.invoke(formatted_prompt)
    
    return {
        "result": response.content,
        "source_documents": source_docs,
        "hybrid_context": combined_context
    }
