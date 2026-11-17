from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend import models  # noqa: F401  (registers models on Base.metadata)
from backend.db import Base, engine
from backend.routing import dictionaries


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    # No migrations: create any missing tables on startup.
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="Car loan simulator", lifespan=lifespan)
app.include_router(dictionaries.router)
