import uuid
from decimal import Decimal

from sqlalchemy import Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.db import Base


class Bank(Base):
    __tablename__ = "banks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255))
    # Annual percentage rate in percent, e.g. 7.4900 means 7.49%.
    apr: Mapped[Decimal] = mapped_column(Numeric(7, 4))
