# Car loan simulator

A web app that walks through buying a car on a loan: pick a model, configure its parts, get a price quote, then compare bank loans by monthly payment.

- **Backend:** FastAPI + SQLAlchemy on PostgreSQL ([`backend/`](backend/)), run with Docker Compose.
- **Frontend:** React + TypeScript + Vite + Tailwind CSS ([`frontend/`](frontend/)).

## Running it

Requirements: Docker with Compose, and Node.js with npm.

```sh
cp .env.example .env   # then set a real POSTGRES_PASSWORD
make                   # starts the backend (Docker) and the frontend (Vite)
```

Open http://localhost:5173.

| Command         | What it does                                                                              |
|-----------------|-------------------------------------------------------------------------------------------|
| `make`          | Runs `make backend` and `make frontend`                                                   |
| `make backend`  | `docker compose up -d --build`: PostgreSQL on port 5432 and the API on http://localhost:8000 |
| `make frontend` | Installs npm packages if needed, then starts Vite on port 5173 in the background (log: `run/frontend.log`) |
| `make stop`     | Stops the frontend and runs `docker compose down`                                         |

- **Live reload:** in development, [`docker-compose.override.yml`](docker-compose.override.yml) mounts `backend/src` into the container and runs uvicorn with `--reload`, so backend code changes apply without a rebuild.
- **Same origin:** the Vite dev server forwards `/api/*` to the backend with the `/api` prefix removed, so `GET /api/bank` in the browser reaches `GET /bank` on the API.
- **API docs:** FastAPI serves interactive docs at http://localhost:8000/docs.

### Database

There are no migrations. On startup the backend creates any missing tables and adds the default banks if the `banks` table is empty. Existing tables are never altered, so after changing a model in [`models.py`](backend/src/backend/models.py), reset the database with `docker compose down -v`.

## Order lifecycle

A purchase is an order that moves through a series of states:

```
draft ──► model_set ──► configuring ──► quoted ──► funded ──► confirmed
                            ▲              │         │  ▲
                            └──────────────┘         └──┘
              (change model or parts after a quote)  (change the loan)
```

| # | Step            | Endpoint                 | Resulting state |
|---|-----------------|--------------------------|-----------------|
| 1 | Start           | `POST /order`            | `draft`         |
| 2 | Pick model      | `PUT /order/{id}/model`  | `model_set`     |
| 3 | Configure parts | `PUT /order/{id}/parts`  | `configuring`   |
| 4 | Quote           | `POST /order/{id}/quote` | `quoted`        |
| 5 | Funding (loan)  | `POST /order/{id}/loan`  | `funded`        |
| 6 | Confirm         | not implemented yet      | `confirmed`     |

Once an order is `funded`, its model and parts are locked; only the loan can still change. The `confirmed` state exists and locks the loan too, but no endpoint moves an order into it yet.

### Endpoints

`POST /order` takes no body and returns **201** with `{id, state}`; `id` is a UUID and `state` is `"draft"`.

`PUT /order/{id}/model` takes `{"model": "<name>"}`, where the name is one of `GET /car-model`, and returns `{id, state, model}`.
- A `draft` order moves to `model_set`; an order further along keeps its state, so the model can still be changed after going back.
- Changing the model of a `quoted` order moves it back to `configuring`, because the model is part of the price.
- Returns **404** for an unknown order, **422** for an unknown model and **409** once the order is `funded` or `confirmed`.

`PUT /order/{id}/parts` takes a `{"<slot>": "<option>", ...}` map naming every slot and returns `{id, state, slots}`. It replaces all of the order's parts at once and moves the order to `configuring`, which invalidates any earlier quote.
- Returns **404** for an unknown order and **422** for a missing or unknown slot or an unknown option.
- Returns **409** when the order is not in `model_set`, `configuring` or `quoted` (so a model must be set first), or when the parts break a [compatibility rule](#compatibility-rules).

`POST /order/{id}/quote` takes no body and returns `{id, state, base_price, model, model_price, parts: [{slot, id, price}], total}`.
- The price starts at a base of **3,000**, the model adds its price, and every chosen option adds its catalog price: `total = base_price + model_price + Σ parts.price`. The `parts` lines follow catalog order.
- A `configuring` order moves to `quoted`; a `quoted`, `funded` or `confirmed` order keeps its state.
- Returns **404** for an unknown order, and **409** when no model is set, when a slot is still empty (naming the missing slots), or when a compatibility rule is broken.

`POST /order/{id}/loan` takes `{"bank_id": "<uuid>", "years": <int>}`, where `bank_id` is one of `GET /bank` and `years` is at least 1, and returns `{id, state, selected_bank, loan_years}`.
- Saves the bank and term on the order and moves it to `funded`. A `funded` order can be sent a new loan, which replaces the old one.
- Returns **404** for an unknown order, **422** for an unknown bank or `years` below 1, and **409** when the order is not `quoted` or `funded`.
- Only the bank and term are stored; the monthly payment is calculated in the frontend (see [Loan calculation](#loan-calculation)).

### Reference data

| Endpoint           | Returns                                                                                       |
|--------------------|-----------------------------------------------------------------------------------------------|
| `GET /car-model`   | model names: `["Hatchback", "Sedan", "Estate", "SUV", "Coupe"]`                               |
| `GET /slot`        | slot names: `["engine", "gearbox", ...]`                                                      |
| `GET /slot/{slot}` | `{"<slot>": [{id, price, requires?, excludes?}]}`; **404** for an unknown slot                |
| `GET /bank`        | `[{id, name, apr}]`, sorted by name; `id` is a UUID, `apr` a decimal string in percent (e.g. `"7.4900"`) |

### Error codes

| Status | When                                                                                   |
|--------|----------------------------------------------------------------------------------------|
| 404    | Unknown order or slot                                                                  |
| 409    | Parts break a compatibility rule (the response names the rule)                         |
| 409    | Parts set before a model, or a quote requested before a model and every part are set   |
| 409    | Model or parts changed after the order is `funded` or `confirmed`                      |
| 409    | Loan chosen before the order is `quoted`, or after it is `confirmed`                   |
| 422    | Unknown model, slot, option or bank, a parts map that leaves a slot out, or `years` below 1 |

Errors carry a human-readable `detail` message, which the frontend shows to the user.

## Car models

The models and their prices are hardcoded in [`backend/src/backend/car.py`](backend/src/backend/car.py).

| Model     | Price |
|-----------|-------|
| Hatchback | 300   |
| Sedan     | 600   |
| Estate    | 700   |
| SUV       | 1,200 |
| Coupe     | 1,100 |

## Parts catalog

The catalog is hardcoded in [`backend/src/backend/slot.py`](backend/src/backend/slot.py), which is the source of truth. `GET /slot` and `GET /slot/{slot}` serve it.

| Slot         | Options                                    | Price                   | Compatibility rule                                      |
|--------------|--------------------------------------------|-------------------------|---------------------------------------------------------|
| `engine`     | 1.5 petrol, 2.0 turbo, electric            | 0 / 3,200 / 9,500       | turbo requires automatic; electric excludes manual      |
| `gearbox`    | manual, automatic                          | 0 / 1,400               | none                                                    |
| `wheels`     | 17in, 18in, 19in alloy                     | 0 / 600 / 1,100         | 19in requires sport suspension                          |
| `suspension` | comfort, sport                             | 0 / 700                 | none                                                    |
| `paint`      | white, grey, metallic blue                 | 0 / 0 / 800             | none                                                    |
| `interior`   | cloth, leather                             | 0 / 1,500               | none                                                    |
| `extras`     | tow bar, roof rails, sunroof, heated seats | 350 / 280 / 1,200 / 450 | sunroof excludes roof rails; heated seats require leather |

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

A rule is checked only once both slots it names are set, so parts can be chosen in any order. An invalid combination returns **409 Conflict** naming the rule that failed, e.g. `engine=turbo20 requires gearbox=auto, but gearbox=manual`.

## Banks

On first start the backend adds these banks to an empty `banks` table (see [`backend/src/backend/main.py`](backend/src/backend/main.py)). They are example values.

| Bank   | APR   |
|--------|-------|
| Bank A | 6.99% |
| Bank B | 7.49% |
| Bank C | 8.25% |
| Bank D | 5.75% |

## Frontend

The app is a single page that steps through the order lifecycle, with breadcrumbs showing the current step and Back/Next buttons:

1. **Start:** Next creates the order (`POST /order`).
2. **Pick model:** the models come from `GET /car-model`; Next saves the choice (`PUT /order/{id}/model`).
3. **Configure parts:** pick a part, then its setting; the form moves on to the next part still unset and highlights a setting that still needs a choice. Next saves all parts (`PUT /order/{id}/parts`) and requests a quote, so a broken compatibility rule keeps you on this step with the backend's error message.
4. **Quote:** shows the quote broken down into base price, model and parts.
5. **Funding (loan):** pick a bank (from `GET /bank`) and a loan length of 1–10 years to see the monthly payment, the interest and the total to repay. Next saves the loan (`POST /order/{id}/loan`).
6. **Confirm:** a placeholder, as the backend has no confirm step yet.

Back only goes to a step whose data the order can still change. The frontend keeps the `state` from each order response, and [`steps.ts`](frontend/src/steps.ts) applies the same rules as the backend:
- Once an order is created, Back can't return to Start.
- Back is disabled on the Funding step, so choosing a loan commits to the configured car.
- Once the order is `funded`, Back from Confirm can still return to Funding to change the loan, but no further.

These rules are a copy of the ones in [`orders.py`](backend/src/backend/routing/orders.py), so a change there needs the same change in `steps.ts`.

The part options come from [`frontend/src/parts.ts`](frontend/src/parts.ts), a copy of the catalog's option ids, rather than from `GET /slot`.

### Loan calculation

The funding step finances the full quote total (there is no down payment). The monthly payment is a standard annuity at the bank's APR, calculated in [`PickBank.tsx`](frontend/src/components/PickBank.tsx):

```
r       = APR / 12
n       = years · 12
payment = P · r / (1 − (1 + r)^(−n))      (payment = P / n when the APR is 0)
```

where `P` is the quote total. The total to repay is `payment · n`, and the interest is that total minus `P`. The order stores only the chosen bank and term; the payment, interest and total are not saved.

## Example flow

```http
POST /order                                                   # draft
GET  /car-model
PUT  /order/{id}/model           {"model": "Sedan"}           # model_set
GET  /slot
GET  /slot/engine
PUT  /order/{id}/parts           {"engine": "turbo20", "gearbox": "auto", ...}  # configuring
POST /order/{id}/quote                                        # quoted
GET  /bank
POST /order/{id}/loan            {"bank_id": "<uuid>", "years": 5}  # funded
```
