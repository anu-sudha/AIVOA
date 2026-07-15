from fastapi import APIRouter
from pydantic import BaseModel

from ..agent.tools import search_materials_impl, summarize_voice_note_impl

router = APIRouter(prefix="/api", tags=["materials"])


@router.get("/materials/search")
def search_materials(q: str = ""):
    """Backs the 'Search/Add' (materials) and 'Add Sample' buttons on the form."""
    return search_materials_impl(q)


class VoiceNoteRequest(BaseModel):
    transcript: str


@router.post("/interactions/summarize-voice-note")
def summarize_voice_note(payload: VoiceNoteRequest):
    """Backs the 'Summarize from Voice Note (Requires Consent)' button.
    The frontend captures audio via the browser's Speech Recognition API
    (with an explicit consent prompt) and posts the transcript here."""
    summary = summarize_voice_note_impl(payload.transcript)
    return {"summary": summary}
