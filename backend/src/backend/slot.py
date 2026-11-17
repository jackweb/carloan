"""Hardcoded parts catalog: the source of truth for slots and their options.

Each option may carry compatibility rules, keyed by another slot:
- `requires`: the option can only be selected if that slot holds the given option.
- `excludes`: the option can't be selected together with the given option.
"""

CATALOG = {
    "engine": [
        {"id": "petrol15", "price": 0},
        {"id": "turbo20", "price": 3200, "requires": {"gearbox": "auto"}},
        {"id": "electric", "price": 9500, "excludes": {"gearbox": "manual"}},
    ],
    "gearbox": [
        {"id": "manual", "price": 0},
        {"id": "auto", "price": 1400},
    ],
    "wheels": [
        {"id": "17", "price": 0},
        {"id": "18", "price": 600},
        {"id": "19", "price": 1100, "requires": {"suspension": "sport"}},
    ],
    "suspension": [
        {"id": "comfort", "price": 0},
        {"id": "sport", "price": 700},
    ],
    "paint": [
        {"id": "white", "price": 0},
        {"id": "grey", "price": 0},
        {"id": "metallic_blue", "price": 800},
    ],
    "interior": [
        {"id": "cloth", "price": 0},
        {"id": "leather", "price": 1500},
    ],
    "extras": [
        {"id": "tow_bar", "price": 350},
        {"id": "roof_rails", "price": 280},
        {"id": "sunroof", "price": 1200, "excludes": {"extras": "roof_rails"}},
        {"id": "heated_seats", "price": 450, "requires": {"interior": "leather"}},
    ],
}
