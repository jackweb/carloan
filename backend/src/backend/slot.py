"""Hardcoded parts catalog: the source of truth for slots and their options.

Each option may carry compatibility rules, keyed by another slot:
- `requires`: the option can only be selected if that slot holds the given option.
- `excludes`: the option can't be selected together with the given option.
"""

CATALOG: dict[str, list[dict]] = {
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


# Price of the car before any part is added; every chosen option adds its own price.
BASE_PRICE = 3000


def missing_slots(slots: dict[str, str]) -> list[str]:
    return [slot for slot in CATALOG if slot not in slots]


def option_price(slot: str, option_id: str) -> int:
    option = find_option(slot, option_id)
    if option is None:
        raise KeyError(f"Unknown option for {slot}: {option_id}")
    return option["price"]


def find_option(slot: str, option_id: str) -> dict | None:
    return next((o for o in CATALOG.get(slot, []) if o["id"] == option_id), None)


def find_conflict(slots: dict[str, str]) -> str | None:
    """Returns the first compatibility rule broken by `slots`, or None.

    A rule is only checked once both slots it names are set, so parts can be
    chosen in any order; a `requires` on a still-empty slot is not a conflict yet.
    """
    for slot, option_id in slots.items():
        option = find_option(slot, option_id)
        if option is None:
            continue
        for other, needed in option.get("requires", {}).items():
            if other in slots and slots[other] != needed:
                return f"{slot}={option_id} requires {other}={needed}, but {other}={slots[other]}"
        for other, banned in option.get("excludes", {}).items():
            if slots.get(other) == banned:
                return f"{slot}={option_id} excludes {other}={banned}"
    return None
