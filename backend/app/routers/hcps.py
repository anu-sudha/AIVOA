from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import models
from ..database import get_db

router = APIRouter(prefix="/api/hcps", tags=["hcps"])


@router.get("/search")
def search_hcps(q: str = "", db: Session = Depends(get_db)):
    query = db.query(models.HCP)
    if q:
        query = query.filter(models.HCP.name.ilike(f"%{q}%"))
    results = query.limit(10).all()
    return [{"id": h.id, "name": h.name, "specialty": h.specialty} for h in results]
