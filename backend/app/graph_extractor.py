import json
from pydantic import BaseModel, Field
from typing import List
from langchain_core.prompts import PromptTemplate
from langchain_nvidia_ai_endpoints import ChatNVIDIA

class GraphData(BaseModel):
    entities: list = Field(description="List of entities")
    relations: list = Field(description="List of relationships")

def extract_graph_from_text(text: str) -> dict:
    """
    Extracts entities and relationships from the provided text using ChatNVIDIA.
    """
    # 8B is incredibly fast for pure text generation but its tool-calling (with_structured_output) 
    # can be flaky on NVIDIA NIM. We bypass it by using manual JSON prompting.
    llm = ChatNVIDIA(model="meta/llama-3.1-8b-instruct", temperature=0.1, max_tokens=8192)
    
    prompt = PromptTemplate(
        input_variables=["text"],
        template="""Extract entities and relationships from this text.
Return ONLY a valid JSON object matching this exact schema, with no other text, markdown formatting, or preamble:
{{
  "entities": [
    {{"id": "E1", "name": "Entity Name", "type": "Concept"}}
  ],
  "relations": [
    {{"source": "E1", "target": "E2", "type": "RELATES_TO"}}
  ]
}}

TEXT TO ANALYZE:
{text}"""
    )
    
    chain = prompt | llm
    
    try:
        result = chain.invoke({"text": text})
        content = result.content.strip()
        
        # Clean markdown code blocks if the model insists on adding them
        if content.startswith("```json"):
            content = content.replace("```json", "", 1)
        if content.startswith("```"):
            content = content.replace("```", "", 1)
        if content.endswith("```"):
            content = content[:-3]
            
        data = json.loads(content.strip())
        return data
    except Exception as e:
        print(f"Error during graph extraction: {e}")
        return {"entities": [], "relations": []}
