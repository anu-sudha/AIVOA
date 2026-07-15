from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/interactions", tags=["interactions"])


@router.get("/", response_model=list[schemas.InteractionOut])
def list_interactions(db: Session = Depends(get_db)):
    return db.query(models.Interaction).order_by(models.Interaction.created_at.desc()).all()


@router.post("/", response_model=schemas.InteractionOut)
def create_interaction(payload: schemas.InteractionCreate, db: Session = Depends(get_db)):
    hcp = None
    if payload.hcp_name_raw:
        hcp = db.query(models.HCP).filter(
            models.HCP.name.ilike(f"%{payload.hcp_name_raw}%")
        ).first()
        if not hcp:
            hcp = models.HCP(name=payload.hcp_name_raw)
            db.add(hcp)
            db.commit()
            db.refresh(hcp)

    interaction = models.Interaction(hcp_id=hcp.id if hcp else None, source="form", **payload.model_dump())
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction


@router.put("/{interaction_id}", response_model=schemas.InteractionOut)
def update_interaction(interaction_id: int, payload: schemas.InteractionUpdate, db: Session = Depends(get_db)):
    interaction = db.query(models.Interaction).get(interaction_id)
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(interaction, field, value)
    db.commit()
    db.refresh(interaction)
    return interaction


@router.get("/{interaction_id}", response_model=schemas.InteractionOut)
def get_interaction(interaction_id: int, db: Session = Depends(get_db)):
    interaction = db.query(models.Interaction).get(interaction_id)
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return interaction
