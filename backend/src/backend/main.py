from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from decimal import Decimal

from fastapi import FastAPI
from sqlalchemy import select

from backend.db import Base, SessionLocal, engine
from backend.models import Bank, Order
from backend.routing import dictionaries, orders


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    # No migrations: create any missing tables on startup. Existing tables are
    # never altered, so a model change needs a fresh database (`docker compose down -v`).
    Base.metadata.create_all(engine, tables=[Bank.__table__, Order.__table__])
    seed_banks()
    yield


BANKS = [
    ("Bank A", Decimal("6.9900")),
    ("Bank B", Decimal("7.4900")),
    ("Bank C", Decimal("8.2500")),
    ("Bank D", Decimal("5.7500")),
]


def seed_banks() -> None:
    """Insert the default banks, but only into an empty table."""
    with SessionLocal.begin() as session:
        if session.scalar(select(Bank.id).limit(1)) is not None:
            return
        session.add_all(Bank(name=name, apr=apr) for name, apr in BANKS)


app = FastAPI(title="Car loan simulator", lifespan=lifespan)
app.include_router(dictionaries.router)
app.include_router(orders.router)
