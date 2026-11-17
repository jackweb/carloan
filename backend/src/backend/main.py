from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.db import Base, engine
from backend.models import Bank, Order
from backend.routing import dictionaries, orders


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    # No migrations: create any missing tables on startup. Existing tables are
    # never altered, so a model change needs a fresh database (`docker compose down -v`).
    Base.metadata.create_all(engine, tables=[Bank.__table__, Order.__table__])
    yield


app = FastAPI(title="Car loan simulator", lifespan=lifespan)
app.include_router(dictionaries.router)
app.include_router(orders.router)
