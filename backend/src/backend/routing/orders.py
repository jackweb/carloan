import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy.orm import Session

from backend.car import MODELS
from backend.db import get_session
from backend.models import Order, OrderState

router = APIRouter()

SessionDep = Annotated[Session, Depends(get_session)]

# The model can't change once funding is chosen: the offer was calculated for the car as it was.
MODEL_LOCKED_STATES: set[OrderState] = {"funded", "confirmed"}


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
