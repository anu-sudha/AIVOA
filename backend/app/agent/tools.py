import json
import datetime as dt
from typing import Optional
from langchain_core.tools import tool

from ..database import SessionLocal
from .. import models
from .llm import extraction_llm

CATALOG_MATERIALS = [
    "OncoBoost Phase III PDF", "CardioPlus Efficacy Deck", "Product X Brochure",
    "NeuroCare Clinical Study", "DiabeCare Dosage Guide",
]
CATALOG_SAMPLES = ["OncoBoost 10mg", "CardioPlus 5mg", "Product X Starter Pack"]


def _extract_fields_with_llm(raw_text: str) -> dict:
    """Use the Groq LLM (gemma2-9b-it) to turn a free-text chat message into
    structured interaction fields — entity extraction + summarization."""
    prompt = f"""You are a CRM assistant for pharma field reps. Extract structured
data from the interaction note below. Respond with ONLY valid JSON, no prose,
matching this schema exactly:

{{
  "hcp_name_raw": string or null,
  "interaction_type": one of ["Meeting","Call","Email","Conference"],
  "topics_discussed": string,
  "materials_shared": string (comma separated, empty string if none),
  "samples_distributed": string (comma separated, empty string if none),
  "sentiment": one of ["Positive","Neutral","Negative"],
  "outcomes": string
}}

Note: "{raw_text}"
"""
    resp = extraction_llm.invoke(prompt)
    text = resp.content.strip()
    text = text.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # graceful fallback if the model doesn't return clean JSON
        return {
            "hcp_name_raw": None,
            "interaction_type": "Meeting",
            "topics_discussed": raw_text,
            "materials_shared": "",
            "samples_distributed": "",
            "sentiment": "Neutral",
            "outcomes": "",
        }


@tool
def log_interaction(raw_text: str) -> str:
    """Log a new HCP interaction from a free-text description typed/spoken by
    the field rep (e.g. "Met Dr. Smith, discussed Product X efficacy, positive
    sentiment, shared brochure"). Uses the LLM to extract HCP name, topics,
    sentiment, materials and outcomes, then saves the interaction to the
    database. Returns the created interaction as JSON."""
    fields = _extract_fields_with_llm(raw_text)
    db = SessionLocal()
    try:
        hcp = None
        if fields.get("hcp_name_raw"):
            hcp = db.query(models.HCP).filter(
                models.HCP.name.ilike(f"%{fields['hcp_name_raw']}%")
            ).first()
            if not hcp:
                hcp = models.HCP(name=fields["hcp_name_raw"])
                db.add(hcp)
                db.commit()
                db.refresh(hcp)

        interaction = models.Interaction(
            hcp_id=hcp.id if hcp else None,
            hcp_name_raw=fields.get("hcp_name_raw"),
            interaction_type=fields.get("interaction_type") or "Meeting",
            date=dt.date.today().isoformat(),
            time=dt.datetime.now().strftime("%H:%M"),
            topics_discussed=fields.get("topics_discussed"),
            materials_shared=fields.get("materials_shared"),
            samples_distributed=fields.get("samples_distributed"),
            sentiment=fields.get("sentiment") or "Neutral",
            outcomes=fields.get("outcomes"),
            source="chat",
        )
        db.add(interaction)
        db.commit()
        db.refresh(interaction)
        return json.dumps({
            "id": interaction.id,
            "hcp_name_raw": interaction.hcp_name_raw,
            "interaction_type": interaction.interaction_type,
            "topics_discussed": interaction.topics_discussed,
            "sentiment": interaction.sentiment,
            "materials_shared": interaction.materials_shared,
            "outcomes": interaction.outcomes,
        })
    finally:
        db.close()


@tool
def edit_interaction(interaction_id: int, field: str, new_value: str) -> str:
    """Edit an already-logged interaction. `field` must be one of:
    topics_discussed, sentiment, outcomes, follow_up_actions,
    materials_shared, samples_distributed, interaction_type. Returns the
    updated interaction as JSON, or an error message if not found."""
    allowed = {
        "topics_discussed", "sentiment", "outcomes", "follow_up_actions",
        "materials_shared", "samples_distributed", "interaction_type",
    }
    if field not in allowed:
        return json.dumps({"error": f"field '{field}' is not editable"})

    db = SessionLocal()
    try:
        interaction = db.query(models.Interaction).get(interaction_id)
        if not interaction:
            return json.dumps({"error": f"interaction {interaction_id} not found"})
        setattr(interaction, field, new_value)
        db.commit()
        db.refresh(interaction)
        return json.dumps({
            "id": interaction.id,
            "field_updated": field,
            "new_value": new_value,
        })
    finally:
        db.close()


@tool
def get_hcp_history(hcp_name: str) -> str:
    """Fetch the past logged interactions for a given HCP by name, most
    recent first. Useful for giving the rep context before a new visit."""
    db = SessionLocal()
    try:
        hcp = db.query(models.HCP).filter(models.HCP.name.ilike(f"%{hcp_name}%")).first()
        if not hcp:
            return json.dumps({"error": f"No HCP found matching '{hcp_name}'"})
        rows = (
            db.query(models.Interaction)
            .filter(models.Interaction.hcp_id == hcp.id)
            .order_by(models.Interaction.created_at.desc())
            .limit(5)
            .all()
        )
        history = [
            {
                "id": r.id, "date": r.date, "type": r.interaction_type,
                "topics": r.topics_discussed, "sentiment": r.sentiment,
                "outcomes": r.outcomes,
            } for r in rows
        ]
        return json.dumps({"hcp": hcp.name, "history": history})
    finally:
        db.close()


@tool
def suggest_followups(interaction_summary: str) -> str:
    """Given a summary of what happened in an interaction, ask the LLM to
    suggest 2-4 concrete, actionable follow-up steps for the field rep
    (e.g. scheduling a meeting, sending a document, adding to an advisory
    board list). Returns a JSON list of suggestion strings."""
    prompt = f"""You are a pharma sales strategy assistant. Based on this
interaction summary, suggest 2 to 4 short, concrete follow-up actions for
the field rep. Respond with ONLY a JSON array of strings, nothing else.

Interaction summary: "{interaction_summary}"
"""
    resp = extraction_llm.invoke(prompt)
    text = resp.content.strip().replace("```json", "").replace("```", "").strip()
    try:
        suggestions = json.loads(text)
    except json.JSONDecodeError:
        suggestions = [text]
    return json.dumps(suggestions)


def search_materials_impl(query: str) -> dict:
    """Plain (non-tool) implementation shared by the LangGraph tool below and
    the REST endpoint used by the form's Search/Add and Add Sample buttons."""
    q = (query or "").lower()
    materials = [m for m in CATALOG_MATERIALS if q in m.lower()] or CATALOG_MATERIALS
    samples = [s for s in CATALOG_SAMPLES if q in s.lower()] or CATALOG_SAMPLES
    return {"materials": materials, "samples": samples}


@tool
def search_materials(query: str) -> str:
    """Search the catalog of marketing materials and drug samples available
    to share with HCPs. Returns matching materials and samples as JSON."""
    return json.dumps(search_materials_impl(query))


def summarize_voice_note_impl(transcript: str) -> str:
    """Used by the "Summarize from Voice Note (Requires Consent)" button.
    Takes a raw speech-to-text transcript and asks gemma2-9b-it to condense
    it into clean discussion-point bullets for the Topics Discussed field."""
    prompt = f"""Condense this raw voice-note transcript from a pharma field
rep into 2-4 short bullet points of key discussion points. Respond with
ONLY the bullet points, no preamble.

Transcript: "{transcript}"
"""
    resp = extraction_llm.invoke(prompt)
    return resp.content.strip()


@tool
def schedule_followup(interaction_id: int, description: str, due_date: str) -> str:
    """Create a follow-up task tied to a logged interaction, with a
    description and a due date (YYYY-MM-DD). Returns the created follow-up
    as JSON."""
    db = SessionLocal()
    try:
        fu = models.FollowUp(
            interaction_id=interaction_id, description=description, due_date=due_date
        )
        db.add(fu)
        db.commit()
        db.refresh(fu)
        return json.dumps({
            "id": fu.id, "interaction_id": interaction_id,
            "description": description, "due_date": due_date, "status": fu.status,
        })
    finally:
        db.close()


ALL_TOOLS = [
    log_interaction,
    edit_interaction,
    get_hcp_history,
    suggest_followups,
    search_materials,
    schedule_followup,
]
