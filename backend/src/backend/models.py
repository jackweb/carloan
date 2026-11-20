import uuid
from decimal import Decimal
from typing import Literal, get_args

from sqlalchemy import Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from backend.db import Base

OrderState = Literal["draft", "model_set", "configuring", "quoted", "funded", "confirmed"]


class Bank(Base):
    __tablename__ = "banks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255))
    # Annual percentage rate in percent, e.g. 7.4900 means 7.49%.
    apr: Mapped[Decimal] = mapped_column(Numeric(7, 4))


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # One of backend.car.MODELS; None until the "pick model" step.
    model: Mapped[str | None] = mapped_column(String(50), default=None)
    # Chosen option per slot, e.g. {"engine": "turbo20", "gearbox": "auto"}.
    slots: Mapped[dict[str, str]] = mapped_column(JSONB, default=dict)
    # Stored as varchar with a CHECK constraint limiting it to OrderState values.
    state: Mapped[OrderState] = mapped_column(
        Enum(
            *get_args(OrderState),
            name="order_state",
            native_enum=False,
            create_constraint=True,
            length=20,
        ),
        default="draft",
    )
    # Bank chosen at the "funding" step; None until then.
    selected_bank: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("banks.id"), default=None)
    # Loan term in years; None until the "funding" step.
    loan_years: Mapped[int | None] = mapped_column(default=None)
