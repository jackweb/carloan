import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.orm import Session

from backend.car import MODEL_PRICES, MODELS
from backend.db import get_session
from backend.models import Bank, Order, OrderState
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
# A loan can be chosen once the order is quoted, and changed until the order is confirmed.
LOAN_EDITABLE_STATES: set[OrderState] = {"quoted", "funded"}


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
    changed = order.model != body.model
    order.model = body.model
    # Only a draft advances; a later order keeps its progress (e.g. the user went Back to change model).
    if order.state == "draft":
        order.state = "model_set"
    # The model is priced, so a different model invalidates an existing quote.
    elif order.state == "quoted" and changed:
        order.state = "configuring"
    session.commit()
    return order


class OrderPartsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    state: OrderState
    slots: dict[str, str]


@router.put("/order/{order_id}/parts", response_model=OrderPartsOut)
def set_parts(order_id: uuid.UUID, body: dict[str, str], session: SessionDep) -> Order:
    """Replaces the order's parts with a `{slot: option}` map naming every slot.

    The whole body is applied or nothing is, so a valid combination never clashes
    with what the order held before.
    """
    order = get_order(session, order_id)
    missing = missing_slots(body)
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Every part must be chosen. Missing: {', '.join(missing)}",
        )
    for slot, option_id in body.items():
        if slot not in CATALOG:
            raise HTTPException(
                status_code=422,
                detail=f"Unknown slot: {slot}. Expected one of: {', '.join(CATALOG)}",
            )
        if find_option(slot, option_id) is None:
            options = ", ".join(o["id"] for o in CATALOG[slot])
            raise HTTPException(
                status_code=422,
                detail=f"Unknown option for {slot}: {option_id}. Expected one of: {options}",
            )
    if order.state not in PARTS_EDITABLE_STATES:
        raise HTTPException(
            status_code=409,
            detail=f"Parts can't be changed while the order is {order.state}",
        )

    conflict = find_conflict(body)
    if conflict:
        raise HTTPException(status_code=409, detail=conflict)

    order.slots = body
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
    model: str
    model_price: int
    parts: list[QuoteLine]
    total: int


@router.post("/order/{order_id}/quote", response_model=QuoteOut)
def create_quote(order_id: uuid.UUID, session: SessionDep) -> QuoteOut:
    order = get_order(session, order_id)
    if order.model is None:
        raise HTTPException(status_code=409, detail="A model must be chosen before a quote")
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
    model_price = MODEL_PRICES[order.model]
    return QuoteOut(
        id=order.id,
        state=order.state,
        base_price=BASE_PRICE,
        model=order.model,
        model_price=model_price,
        parts=parts,
        total=BASE_PRICE + model_price + sum(line.price for line in parts),
    )


class LoanIn(BaseModel):
    bank_id: uuid.UUID
    years: int = Field(ge=1)


class OrderLoanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    state: OrderState
    selected_bank: uuid.UUID | None
    loan_years: int | None


@router.post("/order/{order_id}/loan", response_model=OrderLoanOut)
def set_loan(order_id: uuid.UUID, body: LoanIn, session: SessionDep) -> Order:
    order = get_order(session, order_id)
    if session.get(Bank, body.bank_id) is None:
        raise HTTPException(status_code=422, detail=f"Unknown bank: {body.bank_id}")
    if order.state not in LOAN_EDITABLE_STATES:
        raise HTTPException(
            status_code=409,
            detail=f"A loan can't be chosen while the order is {order.state}",
        )

    order.selected_bank = body.bank_id
    order.loan_years = body.years
    order.state = "funded"
    session.commit()
    return order
