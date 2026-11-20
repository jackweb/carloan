# Car Purchase Simulator API

A purchase runs as a series of ordered steps. Each step is an endpoint that moves the order to its next state, ending in a confirmed order with a chosen funding option.

## Order lifecycle

```
draft ──► model_set ──► configuring ──► quoted ──► funded ──► confirmed
                            ▲              │
                            └──────────────┘
                       (change parts after a quote)
```

| # | Step            | Endpoint                          | Resulting state |
|---|-----------------|-----------------------------------|-----------------|
| 1 | Start           | `POST /order`                     | `draft`         |
| 2 | Pick model      | `PUT /order/{id}/model`           | `model_set`     |
| 3 | Configure parts | `PUT /order/{id}/parts`           | `configuring`   |
| 4 | Quote           | `POST /order/{id}/quote`          | `quoted`        |
| 5 | Funding (loan)  | `/order/{id}/funding/...` (below) | `funded`        |
| 6 | Confirm         | `POST /order/{id}/confirm`        | `confirmed`     |

`POST /order` takes no body and returns **201** with `{id, state}`; `id` is a UUID and `state` is `"draft"`.

`PUT /order/{id}/model` takes `{"model": "<name>"}`, where the name is one of `GET /car-model`, and returns `{id, state, model}`. A draft order moves to `model_set`; an order further along keeps its state, so the model can still be changed after going back. It returns **404** for an unknown order, **422** for an unknown model and **409** once the order is `funded` or `confirmed`.

`PUT /order/{id}/parts` takes a `{"<slot>": "<option>", ...}` map naming every slot and returns `{id, state, slots}`; it replaces the order's parts and moves the order to `configuring`. It needs a model to be set first, and returns **409** while the order is `draft`, `funded` or `confirmed`, or when the parts break a compatibility rule. It returns **404** for an unknown order and **422** for a missing or unknown slot or an unknown option.

`POST /order/{id}/quote` takes no body and returns `{id, state, base_price, model, model_price, parts: [{slot, id, price}], total}`. The price starts at a base of **3,000**, the model adds its price (Hatchback 300, Sedan 600, Estate 700, SUV 1,200, Coupe 1,100), and every chosen option adds its catalog price: `total = base_price + model_price + Σ parts.price`. Changing the model of a `quoted` order moves it back to `configuring`. Every slot must be set; otherwise it returns **409** naming the missing slots. It also returns **409** if a compatibility rule is broken (a `requires` on a slot that was still empty while configuring is checked now). A `configuring` order moves to `quoted`; a `quoted`, `funded` or `confirmed` order keeps its state. It returns **404** for an unknown order.

After a quote, the client can go back to step 3 and change parts. The order then needs a new quote.

`POST /order/{id}/confirm` returns **409** until a funding option has been chosen. A cash purchase is a funding option where `down_payment` equals the quote total.

## Utility endpoints

| Endpoint           | Returns                                                       |
|--------------------|---------------------------------------------------------------|
| `GET /slot`        | slot names: `["engine", "gearbox", ...]`                      |
| `GET /slot/{slot}` | `{"<slot>": [{id, price, requires?, excludes?}]}`; **404** for an unknown slot |
| `GET /bank`        | `[{id, name, apr}]`, sorted by name; `id` is a UUID, `apr` a decimal string in percent (e.g. `"7.4900"`) |

## Parts catalog

The catalog is hardcoded in [`backend/src/backend/slot.py`](backend/src/backend/slot.py), which is the source of truth. `GET /slot` and `GET /slot/{slot}` serve it.

| Slot         | Options                                   | Price effect            | Compatibility rule                                     |
|--------------|-------------------------------------------|-------------------------|--------------------------------------------------------|
| `engine`     | 1.5 petrol, 2.0 turbo, electric           | base + 0 / 3,200 / 9,500 | electric excludes manual gearbox                       |
| `gearbox`    | manual, automatic                         | 0 / 1,400               | turbo requires automatic                               |
| `wheels`     | 17in, 18in, 19in alloy                    | 0 / 600 / 1,100         | 19in needs sport suspension                            |
| `paint`      | white, grey, metallic blue                | 0 / 0 / 800             | none                                                   |
| `interior`   | cloth, leather                            | 0 / 1,500               | none                                                   |
| `extras`     | tow bar, roof rails, sunroof, heated seats | 350 / 280 / 1,200 / 450 | sunroof excludes roof rails; heated seats need leather |
| `suspension` | comfort, sport                            | 0 / 700                 | none                                                   |

<details>
<summary>Catalog data (JSON, mirrors <code>slot.py</code>)</summary>

```json
{
  "engine": [
    {"id": "petrol15", "price": 0},
    {"id": "turbo20",  "price": 3200, "requires": {"gearbox": "auto"}},
    {"id": "electric", "price": 9500, "excludes": {"gearbox": "manual"}}
  ],
  "gearbox": [
    {"id": "manual", "price": 0},
    {"id": "auto",   "price": 1400}
  ],
  "wheels": [
    {"id": "17", "price": 0},
    {"id": "18", "price": 600},
    {"id": "19", "price": 1100, "requires": {"suspension": "sport"}}
  ],
  "suspension": [
    {"id": "comfort", "price": 0},
    {"id": "sport",   "price": 700}
  ],
  "paint": [
    {"id": "white",         "price": 0},
    {"id": "grey",          "price": 0},
    {"id": "metallic_blue", "price": 800}
  ],
  "interior": [
    {"id": "cloth",   "price": 0},
    {"id": "leather", "price": 1500}
  ],
  "extras": [
    {"id": "tow_bar",      "price": 350},
    {"id": "roof_rails",   "price": 280},
    {"id": "sunroof",      "price": 1200, "excludes": {"extras": "roof_rails"}},
    {"id": "heated_seats", "price": 450,  "requires": {"interior": "leather"}}
  ]
}
```

</details>

### Compatibility rules

- `requires`: the option can only be selected if the named slot holds the given option.
- `excludes`: the option can't be selected together with the named option.

An invalid combination returns **409 Conflict** with the rule that failed. A client can learn the constraints from these responses.

## Funding (loan)

Funding is set in four sub-steps:

| # | Sub-step         | Endpoint                                | Body / result                                  |
|---|------------------|-----------------------------------------|------------------------------------------------|
| 1 | Max payment      | `PUT /order/{id}/funding/budget`        | `{max_monthly_payment, down_payment}`          |
| 2 | Select bank      | `GET /bank`, then `PUT /order/{id}/funding/bank` | `{bank_id}`                           |
| 3 | Calculate months | `GET /order/{id}/funding/terms`         | returns the terms that fit the budget          |
| 4 | Choose option    | `PUT /order/{id}/funding/offer`         | `{term_months}` → state `funded`               |

If no term fits the budget in step 3, the client goes back to step 2 and selects a different bank (or changes the budget).

### Terms calculation

1. **Amount financed** = quote total − `down_payment`
2. For each allowed term (**24 / 36 / 48 / 60 months**), the monthly payment is a standard annuity at the selected bank's APR:

   ```
   r       = APR / 12
   payment = P · r / (1 − (1 + r)^(−n))
   ```

   where `P` is the amount financed and `n` is the term in months.
3. Only terms where `payment ≤ max_monthly_payment` are returned.

### Banks (example data)

These banks and APRs are placeholder values.

| Bank   | APR  |
|--------|------|
| Bank A | 4.9% |
| Bank B | 6.2% |
| Bank C | 7.9% |

## Example flow

```http
POST /order                                  → {id, state}    # draft
PUT  /order/{id}/model           {"model": "Sedan"}           # model_set
GET  /slot
GET  /slot/engine
PUT  /order/{id}/parts           {"engine": "turbo20", "gearbox": "auto", ...}  # configuring
POST /order/{id}/quote                                        # quoted
PUT  /order/{id}/funding/budget  {"max_monthly_payment": 600, "down_payment": 5000}
GET  /bank
PUT  /order/{id}/funding/bank    {"bank_id": "<uuid>"}
GET  /order/{id}/funding/terms
PUT  /order/{id}/funding/offer   {"term_months": 48}          # funded
POST /order/{id}/confirm                                      # confirmed
```

## Error codes

| Status | When                                                                 |
|--------|----------------------------------------------------------------------|
| 409    | Part selection breaks a compatibility rule (response names the rule) |
| 409    | `confirm` called before a funding option is chosen                   |
| 409    | Model changed after the order is `funded` or `confirmed`             |
