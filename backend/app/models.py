import datetime as dt
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Enum
)
from sqlalchemy.orm import relationship
from .database import Base


class HCP(Base):
    __tablename__ = "hcps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    specialty = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)

    interactions = relationship("Interaction", back_populates="hcp")


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    hcp_id = Column(Integer, ForeignKey("hcps.id"), nullable=True)
    hcp_name_raw = Column(String(255), nullable=True)  # used when HCP not yet in DB
    interaction_type = Column(
        Enum("Meeting", "Call", "Email", "Conference", name="interaction_type_enum"),
        default="Meeting",
    )
    date = Column(String(20), nullable=True)
    time = Column(String(20), nullable=True)
    attendees = Column(String(500), nullable=True)
    topics_discussed = Column(Text, nullable=True)
    materials_shared = Column(Text, nullable=True)     # comma separated
    samples_distributed = Column(Text, nullable=True)  # comma separated
    sentiment = Column(
        Enum("Positive", "Neutral", "Negative", name="sentiment_enum"),
        default="Neutral",
    )
    outcomes = Column(Text, nullable=True)
    follow_up_actions = Column(Text, nullable=True)
    source = Column(String(20), default="form")  # "form" or "chat"
    created_at = Column(DateTime, default=dt.datetime.utcnow)
    updated_at = Column(DateTime, default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)

    hcp = relationship("HCP", back_populates="interactions")


class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)  # "material" or "sample"


class FollowUp(Base):
    __tablename__ = "follow_ups"

    id = Column(Integer, primary_key=True, index=True)
    interaction_id = Column(Integer, ForeignKey("interactions.id"))
    description = Column(String(500), nullable=False)
    due_date = Column(String(20), nullable=True)
    status = Column(Enum("Pending", "Done", name="followup_status_enum"), default="Pending")
