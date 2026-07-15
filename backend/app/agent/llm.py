import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Primary model requested by the assignment: gemma2-9b-it (fast, cheap, good enough
# for extraction/summarization). We fall back to llama-3.3-70b-versatile for
# tasks that need stronger reasoning (e.g. deciding which tool to call next).
extraction_llm = ChatGroq(
    model="gemma2-9b-it",
    temperature=0,
    api_key=GROQ_API_KEY,
)

reasoning_llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0,
    api_key=GROQ_API_KEY,
)
