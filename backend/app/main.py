import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from . import models  # noqa: F401  (ensures models are registered before create_all)
from .routers import interactions, hcps, chat, materials

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI-First HCP CRM API")

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interactions.router)
app.include_router(hcps.router)
app.include_router(chat.router)
app.include_router(materials.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "hcp-crm-backend"}
