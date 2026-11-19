import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy.orm import Session

from backend.car import MODELS
from backend.db import get_session
from backend.models import Order, OrderState
from backend.slot import (
    BASE_PRICE,
    CATALOG,
    find_conflict,
    find_option,
    missing_slots,
    option_price,
)

router = APIRouter()

SessionDep = Annotated[Session, Depends(get_session)]

# The model can't change once funding is chosen: the offer was calculated for the car as it was.
MODEL_LOCKED_STATES: set[OrderState] = {"funded", "confirmed"}
# Parts can be chosen once a model is set and until funding is chosen.
PARTS_EDITABLE_STATES: set[OrderState] = {"model_set", "configuring", "quoted"}


class OrderCreated(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    state: OrderState


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    state: OrderState
    model: str | None


class ModelIn(BaseModel):
    model: str

    @field_validator("model")
    @classmethod
    def known_model(cls, value: str) -> str:
        if value not in MODELS:
            raise ValueError(f"Unknown model: {value}. Expected one of: {', '.join(MODELS)}")
        return value


def get_order(session: Session, order_id: uuid.UUID) -> Order:
    order = session.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail=f"Order not found: {order_id}")
    return order


@router.post("/order", status_code=201, response_model=OrderCreated)
def create_order(session: SessionDep) -> Order:
    order = Order()
    session.add(order)
    session.commit()
    return order


@router.put("/order/{order_id}/model", response_model=OrderOut)
def set_model(order_id: uuid.UUID, body: ModelIn, session: SessionDep) -> Order:
    order = get_order(session, order_id)
    if order.state in MODEL_LOCKED_STATES:
        raise HTTPException(
            status_code=409,
            detail=f"Model can't be changed once the order is {order.state}",
        )
    order.model = body.model
    # Only a draft advances; a later order keeps its progress (e.g. the user went Back to change model).
    if order.state == "draft":
        order.state = "model_set"
    session.commit()
    return order


class PartIn(BaseModel):
    id: str


class OrderPartsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    state: OrderState
    slots: dict[str, str]


@router.put("/order/{order_id}/parts/{slot}", response_model=OrderPartsOut)
def set_part(order_id: uuid.UUID, slot: str, body: PartIn, session: SessionDep) -> Order:
    order = get_order(session, order_id)
    if slot not in CATALOG:
        raise HTTPException(status_code=404, detail=f"Unknown slot: {slot}")
    if find_option(slot, body.id) is None:
        options = ", ".join(o["id"] for o in CATALOG[slot])
        raise HTTPException(
            status_code=422,
            detail=f"Unknown option for {slot}: {body.id}. Expected one of: {options}",
        )
    if order.state not in PARTS_EDITABLE_STATES:
        raise HTTPException(
            status_code=409,
            detail=f"Parts can't be changed while the order is {order.state}",
        )

    slots = {**order.slots, slot: body.id}
    conflict = find_conflict(slots)
    if conflict:
        raise HTTPException(status_code=409, detail=conflict)

    # Reassign (not mutate) so SQLAlchemy notices the JSONB change.
    order.slots = slots
    # Any part change invalidates an existing quote.
    order.state = "configuring"
    session.commit()
    return order


class QuoteLine(BaseModel):
    slot: str
    id: str
    price: int


class QuoteOut(BaseModel):
    id: uuid.UUID
    state: OrderState
    base_price: int
    parts: list[QuoteLine]
    total: int


@router.get("/order/{order_id}/quote", response_model=QuoteOut)
def get_quote(order_id: uuid.UUID, session: SessionDep) -> QuoteOut:
    order = get_order(session, order_id)
    missing = missing_slots(order.slots)
    if missing:
        raise HTTPException(
            status_code=409,
            detail=f"Every part must be chosen before a quote. Missing: {', '.join(missing)}",
        )
    # With every slot set, `requires` rules that were deferred while configuring are now checked too.
    conflict = find_conflict(order.slots)
    if conflict:
        raise HTTPException(status_code=409, detail=conflict)

    # Lines follow catalog order so the quote reads the same regardless of choice order.
    parts = [
        QuoteLine(slot=slot, id=order.slots[slot], price=option_price(slot, order.slots[slot]))
        for slot in CATALOG
    ]
    # Only a configured order advances; a funded or confirmed order just shows its (frozen) quote.
    if order.state == "configuring":
        order.state = "quoted"
        session.commit()
    return QuoteOut(
        id=order.id,
        state=order.state,
        base_price=BASE_PRICE,
        parts=parts,
        total=BASE_PRICE + sum(line.price for line in parts),
    )
