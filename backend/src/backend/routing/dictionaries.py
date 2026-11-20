import uuid
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.car import MODEL_PRICES
from backend.db import get_session
from backend.models import Bank
from backend.slot import CATALOG

router = APIRouter()

SessionDep = Annotated[Session, Depends(get_session)]


class BankOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    apr: Decimal


@router.get("/bank", response_model=list[BankOut])
def list_banks(session: SessionDep) -> list[Bank]:
    return list(session.scalars(select(Bank).order_by(Bank.name)))


@router.get("/car-model")
def list_car_models() -> dict[str, int]:
    return MODEL_PRICES


class SlotOption(BaseModel):
    id: str
    price: int
    requires: dict[str, str] | None = None
    excludes: dict[str, str] | None = None


@router.get("/slot")
def list_slots() -> list[str]:
    return list(CATALOG)


@router.get(
    "/slot/{slot}",
    response_model=dict[str, list[SlotOption]],
    response_model_exclude_none=True,
)
def get_slot(slot: str) -> dict[str, list[dict]]:
    if slot not in CATALOG:
        raise HTTPException(status_code=404, detail=f"Unknown slot: {slot}")
    return {slot: CATALOG[slot]}
