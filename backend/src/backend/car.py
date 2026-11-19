"""Hardcoded car models and their prices: the source of truth for the model picker."""

# Price of each model; it is added to the base price in a quote.
MODEL_PRICES: dict[str, int] = {
    "Hatchback": 300,
    "Sedan": 600,
    "Estate": 700,
    "SUV": 1200,
    "Coupe": 1100,
}

MODELS = list(MODEL_PRICES)
