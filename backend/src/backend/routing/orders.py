import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from backend.db import get_session
from backend.models import Order, OrderState

router = APIRouter()

SessionDep = Annotated[Session, Depends(get_session)]


class OrderCreated(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    state: OrderState


@router.post("/order", status_code=201, response_model=OrderCreated)
def create_order(session: SessionDep) -> Order:
    order = Order()
    session.add(order)
    session.commit()
    return order
