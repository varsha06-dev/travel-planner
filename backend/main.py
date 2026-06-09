from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uuid, json, os, urllib.request, urllib.parse, re, math
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
import pg8000
import pg8000.dbapi

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.tools import tool

load_dotenv()

MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN", "")
DATABASE_URL = os.getenv("DATABASE_URL")   # Set this in Render env vars

# ── App Setup ─────────────────────────────────────────────────────────────────

app = FastAPI(title="Travel Planner API")

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    os.getenv("ALLOWED_ORIGIN", ""),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in ALLOWED_ORIGINS if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Database ──────────────────────────────────────────────────────────────────

def get_db():
    """Open a new Supabase/Postgres connection using pg8000 (pure Python, no binary needed)."""
    import urllib.parse as up
    r = up.urlparse(DATABASE_URL)
    return pg8000.dbapi.connect(
        host=r.hostname,
        port=r.port or 5432,
        database=r.path.lstrip("/"),
        user=r.username,
        password=r.password,
        ssl_context=True,
    )

def init_db():
    """Create the sessions table if it doesn't exist yet."""
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id          TEXT PRIMARY KEY,
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL,
                trip_info   TEXT DEFAULT '{}',
                messages    TEXT DEFAULT '[]'
            )
        """)
    conn.commit()
    conn.close()

init_db()

# ── Message Serialization ─────────────────────────────────────────────────────

def serialize_messages(messages: list, visual_map: dict = None) -> str:
    out = []
    for i, m in enumerate(messages):
        if isinstance(m, HumanMessage):
            out.append({"role": "human", "content": m.content})
        elif isinstance(m, AIMessage):
            entry = {"role": "ai", "content": m.content}
            if visual_map and i in visual_map:
                vd = visual_map[i]
                if vd.get("places"):     entry["places"]     = vd["places"]
                if vd.get("route_data"): entry["route_data"] = vd["route_data"]
            out.append(entry)
    return json.dumps(out)

def deserialize_messages(raw: str):
    data       = json.loads(raw)
    messages   = []
    visual_map = {}
    for i, m in enumerate(data):
        if m["role"] == "human":
            messages.append(HumanMessage(content=m["content"]))
        elif m["role"] == "ai":
            messages.append(AIMessage(content=m["content"]))
            vd = {}
            if m.get("places"):     vd["places"]     = m["places"]
            if m.get("route_data"): vd["route_data"] = m["route_data"]
            if vd: visual_map[i] = vd
    return messages, visual_map

# ── DB Helpers ────────────────────────────────────────────────────────────────

def load_session(sid: str):
    conn = get_db()
    conn.row_factory = pg8000.dbapi.DictRowFactory
    with conn.cursor() as cur:
        cur.execute("SELECT messages FROM sessions WHERE id = %s", (sid,))
        row = cur.fetchone()
    conn.close()
    if not row: return [], {}
    return deserialize_messages(row["messages"])

def save_session(sid: str, messages: list, trip_info: dict, visual_map: dict = None):
    now  = datetime.utcnow().isoformat()
    data = serialize_messages(messages, visual_map or {})
    conn = get_db()
    with conn.cursor() as cur:
        # Upsert — insert if new, update if exists
        cur.execute("""
            INSERT INTO sessions (id, created_at, updated_at, trip_info, messages)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE
              SET messages   = EXCLUDED.messages,
                  trip_info  = EXCLUDED.trip_info,
                  updated_at = EXCLUDED.updated_at
        """, (sid, now, now, json.dumps(trip_info), data))
    conn.commit()
    conn.close()

def delete_session(sid: str):
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM sessions WHERE id = %s", (sid,))
    conn.commit()
    conn.close()

def list_sessions() -> list:
    conn = get_db()
    conn.row_factory = pg8000.dbapi.DictRowFactory
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, created_at, updated_at, trip_info FROM sessions ORDER BY updated_at DESC"
        )
        rows = cur.fetchall()
    conn.close()
    return [
        {"id":         r["id"],
         "created_at": r["created_at"],
         "updated_at": r["updated_at"],
         "trip_info":  json.loads(r["trip_info"] or "{}")}
        for r in rows
    ]

# ── Unsplash ──────────────────────────────────────────────────────────────────

def fetch_one_image(query: str) -> Optional[dict]:
    key = os.getenv("UNSPLASH_ACCESS_KEY")
    if not key: return None
    params = urllib.parse.urlencode({"query": query, "per_page": 1,
                                     "orientation": "landscape", "client_id": key})
    try:
        with urllib.request.urlopen(
            f"https://api.unsplash.com/search/photos?{params}", timeout=8
        ) as r:
            data = json.loads(r.read().decode())
        results = data.get("results", [])
        if not results: return None
        p = results[0]
        return {"url": p["urls"]["regular"], "alt": p.get("alt_description") or query,
                "credit": p["user"]["name"], "credit_url": p["user"]["links"]["html"]}
    except: return None

def fetch_place_images(places: list) -> list:
    if not places: return []
    def fetch(place):
        return {**place, "image": fetch_one_image(place["name"])}
    results = []
    with ThreadPoolExecutor(max_workers=5) as ex:
        futures = {ex.submit(fetch, p): p for p in places}
        for f in as_completed(futures):
            r = f.result()
            if r.get("image"): results.append(r)
    order = {p["name"]: i for i, p in enumerate(places)}
    results.sort(key=lambda r: order.get(r["name"], 99))
    return results

# ── Mapbox ────────────────────────────────────────────────────────────────────

def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Straight-line distance in km between two lat/lng points."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlng / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def bbox_from_center(lat: float, lng: float, radius_km: float = 80) -> list:
    """Return [west, south, east, north] bounding box around a point."""
    dlat = radius_km / 111.0
    dlng = radius_km / (111.0 * math.cos(math.radians(lat)))
    return [lng - dlng, lat - dlat, lng + dlng, lat + dlat]


def get_destination_center(destination: str) -> Optional[dict]:
    """
    Geocode the destination at region/place level to get its center and
    compute a bounding box. Used to constrain all stop lookups to the
    same island or city area — prevents "Maui" stops resolving to Molokai.
    """
    if not MAPBOX_TOKEN: return None
    query  = urllib.parse.quote(destination)
    url    = (f"https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json"
              f"?access_token={MAPBOX_TOKEN}&limit=1&types=place,region,locality")
    try:
        with urllib.request.urlopen(url, timeout=6) as r:
            data = json.loads(r.read().decode())
        feats = data.get("features", [])
        if not feats: return None
        feat      = feats[0]
        lng, lat  = feat["center"]
        # Use Mapbox's own bbox if available, else build one from the center
        mapbox_bb = feat.get("bbox")
        bbox      = mapbox_bb if mapbox_bb else bbox_from_center(lat, lng, radius_km=80)
        return {"lng": round(lng, 6), "lat": round(lat, 6), "bbox": bbox}
    except: return None


def geocode(place_name: str, context: str = "",
            proximity: dict = None,
            bbox: list = None) -> Optional[dict]:
    """
    Geocode a place name with optional proximity bias and bounding box.
    bbox   = [west, south, east, north] — hard-constrains results to this area,
             preventing cross-island or cross-country mismatches.
    proximity = {lng, lat} — soft bias toward this point within the bbox.
    """
    if not MAPBOX_TOKEN: return None
    query  = urllib.parse.quote(f"{place_name} {context}".strip())
    params = f"access_token={MAPBOX_TOKEN}&limit=1&types=poi,address,place"
    if proximity:
        params += f"&proximity={proximity['lng']},{proximity['lat']}"
    if bbox:
        params += f"&bbox={','.join(str(round(b, 4)) for b in bbox)}"
    url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json?{params}"
    try:
        with urllib.request.urlopen(url, timeout=6) as r:
            data = json.loads(r.read().decode())
        feats = data.get("features", [])
        if not feats: return None
        lng, lat = feats[0]["center"]
        return {"lng": round(lng, 6), "lat": round(lat, 6)}
    except: return None


def get_directions(coords: list, mode: str = "driving") -> Optional[dict]:
    if not MAPBOX_TOKEN or len(coords) < 2: return None
    coord_str = ";".join(f"{c['lng']},{c['lat']}" for c in coords)
    url = (f"https://api.mapbox.com/directions/v5/mapbox/{mode}/{coord_str}"
           f"?access_token={MAPBOX_TOKEN}&geometries=geojson&overview=full&steps=false")
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            data = json.loads(r.read().decode())
        routes = data.get("routes", [])
        if not routes: return None
        route = routes[0]
        return {
            "geometry": route["geometry"],
            "legs": [{"duration_min": max(1, round(leg["duration"] / 60)),
                      "distance_km":  round(leg["distance"] / 1000, 1)}
                     for leg in route.get("legs", [])],
        }
    except: return None


def build_day_map(day_data: dict, destination_context: str) -> Optional[dict]:
    stops = day_data.get("stops", [])
    if len(stops) < 2: return None

    # Step 1: get the destination's center + bounding box.
    # The bbox is passed to every stop geocode call so results are
    # constrained to the same island/region — no more cross-island routes.
    dest_info = get_destination_center(destination_context) if destination_context else None
    dest_bbox = dest_info["bbox"] if dest_info else None
    dest_prox = dest_info           # {lng, lat, bbox} — used as proximity too

    def geocode_stop(stop):
        coords = geocode(
            stop["name"], destination_context,
            proximity=dest_prox,
            bbox=dest_bbox,
        )
        return {**stop, **(coords or {})}

    geocoded = []
    with ThreadPoolExecutor(max_workers=6) as ex:
        futures = {ex.submit(geocode_stop, s): s for s in stops}
        for f in as_completed(futures): geocoded.append(f.result())

    order = {s["name"]: i for i, s in enumerate(stops)}
    geocoded.sort(key=lambda s: order.get(s["name"], 99))

    # Step 2: filter out stops that failed geocoding or landed impossibly
    # far from the destination center (catches offshore/ocean results).
    MAX_DIST_KM = 120
    valid = []
    for s in geocoded:
        if "lng" not in s or "lat" not in s:
            continue
        if dest_info:
            dist = haversine_km(dest_info["lat"], dest_info["lng"], s["lat"], s["lng"])
            if dist > MAX_DIST_KM:
                continue   # discard — wrong island or country
        valid.append(s)

    if len(valid) < 2: return None

    directions = get_directions(valid)
    if directions:
        for i, leg in enumerate(directions["legs"]):
            if i < len(valid) - 1:
                valid[i]["duration_to_next_min"] = leg["duration_min"]
                valid[i]["distance_to_next_km"]  = leg["distance_km"]

    return {
        "day":            day_data["day"],
        "title":          day_data.get("title", f"Day {day_data['day']}"),
        "stops":          valid,
        "route_geometry": directions["geometry"] if directions else None,
    }

# ── Tools ─────────────────────────────────────────────────────────────────────

search_tool = TavilySearchResults(max_results=5,
    description="Search the web for current travel information, best times to visit, "
                "local tips, visa requirements, and destination guides.")

@tool
def get_best_time_to_visit(destination: str) -> str:
    """Get the best time of year to visit a destination and current weather patterns."""
    return str(TavilySearchResults(max_results=3).invoke(
        f"best time to visit {destination} weather seasons travel"))

@tool
def find_activities(destination: str, interests: Optional[str] = None) -> str:
    """Find top activities, attractions, and places to visit at a destination."""
    q = f"top things to do in {destination}"
    if interests: q += f" for people who like {interests}"
    return str(TavilySearchResults(max_results=5).invoke(q))

@tool
def estimate_flight_costs(origin: str, destination: str, travel_dates: str) -> str:
    """Get a rough estimate of flight costs between two cities for given dates."""
    return str(TavilySearchResults(max_results=3).invoke(
        f"flight prices {origin} to {destination} {travel_dates} cost estimate"))

@tool
def estimate_hotel_costs(destination: str, budget_level: str = "mid-range") -> str:
    """Get hotel cost estimates for a destination at a given budget level."""
    return str(TavilySearchResults(max_results=3).invoke(
        f"{budget_level} hotels in {destination} price per night"))

ALL_TOOLS     = [search_tool, get_best_time_to_visit, find_activities,
                 estimate_flight_costs, estimate_hotel_costs]
TOOLS_BY_NAME = {t.name: t for t in ALL_TOOLS}

# ── Models & Prompts ──────────────────────────────────────────────────────────

model            = ChatAnthropic(model="claude-sonnet-4-6")
model_with_tools = model.bind_tools(ALL_TOOLS)
extractor        = ChatAnthropic(model="claude-sonnet-4-6")

SYSTEM_PROMPT = """You are an expert vacation planner with access to real-time travel data.

Your process:
1. COLLECT INFO — Through friendly conversation, gather budget, number of travelers and ages,
   trip duration, destination preferences, interests/dislikes, departure city, travel dates.
2. RESEARCH — Use your tools to look up best times to visit, activities, flight/hotel costs.
3. GENERATE PLAN — Create a detailed day-by-day itinerary with specific named places,
   estimated costs, hotel recommendations, and practical travel tips.
4. REFINE — Accept feedback and update the plan accordingly.

Don't ask all questions at once. Use search tools before generating the final plan.
Always be specific — use real named places, hotels, restaurants, and attractions.
Format plans using markdown: ## headers, bullet points, **bold** for place names."""

EXTRACTION_PROMPT = """Extract the CURRENT trip details. Use the most recent info if changed.
Return ONLY JSON (null for anything not mentioned):
{{"destination":null,"travelers":null,"duration":null,"budget":null,"when":null,"departure_city":null}}
Conversation: {conversation}"""

PLACES_PROMPT = """Extract specific named places from this response (max 6, most interesting first).
Return ONLY a JSON array: [{{"name":"...","description":"under 10 words"}}]
Return [] if fewer than 2 named places. Response: {reply}"""

ITINERARY_PROMPT = """If this response contains a day-by-day itinerary with specific named locations,
extract the stops for each day in visit order.
Return ONLY a JSON array (max 3 days, 5 stops each):
[{{"day":1,"title":"Short title","stops":[{{"name":"Exact place name","type":"hotel|attraction|restaurant|viewpoint|beach|market|museum|other"}}]}}]
Rules: only SPECIFIC named places, stops in ORDER visited, first stop usually the hotel.
Return [] if no day-by-day plan with named places. Response: {reply}"""

# ── Helpers ───────────────────────────────────────────────────────────────────

def run_agent(user_input: str, history: list) -> str:
    messages = [SystemMessage(content=SYSTEM_PROMPT)] + history + [HumanMessage(content=user_input)]
    while True:
        response = model_with_tools.invoke(messages)
        messages.append(response)
        if not response.tool_calls: break
        for tc in response.tool_calls:
            fn = TOOLS_BY_NAME.get(tc["name"])
            if fn: messages.append(ToolMessage(content=str(fn.invoke(tc["args"])),
                                               tool_call_id=tc["id"]))
    return response.content

def llm_extract(prompt_template: str, **kwargs):
    try:
        raw = extractor.invoke([HumanMessage(
            content=prompt_template.format(**kwargs))]).content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
        return json.loads(raw.strip())
    except: return None

def extract_trip_info(history, latest_user, latest_reply):
    conv = "".join(
        f"{'User' if isinstance(m, HumanMessage) else 'Assistant'}: {m.content}\n"
        for m in history
    ) + f"User: {latest_user}\nAssistant: {latest_reply}\n"
    data = llm_extract(EXTRACTION_PROMPT, conversation=conv)
    if not isinstance(data, dict): return {}
    return {k: v for k, v in data.items() if v is not None}

def extract_places(reply: str) -> list:
    data = llm_extract(PLACES_PROMPT, reply=reply)
    return data[:6] if isinstance(data, list) else []

def extract_route_maps(reply: str, trip_info: dict) -> Optional[dict]:
    if not MAPBOX_TOKEN: return None
    if not re.search(r'\bday\s*[1-9]\b', reply, re.IGNORECASE): return None
    days = llm_extract(ITINERARY_PROMPT, reply=reply)
    if not isinstance(days, list) or not days: return None
    destination = trip_info.get("destination", "")
    built = [build_day_map(d, destination) for d in days[:3]]
    built = [d for d in built if d]
    return {"days": built} if built else None

# ── Request / Response Models ──────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message:    str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    reply:      str
    session_id: str
    trip_info:  Optional[dict] = None
    places:     Optional[list] = None
    route_data: Optional[dict] = None

class SessionSummary(BaseModel):
    id: str; created_at: str; updated_at: str; trip_info: dict

class LoadResponse(BaseModel):
    session_id: str; trip_info: dict; messages: list

# ── Routes ────────────────────────────────────────────────────────────────────

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    sid                 = req.session_id or str(uuid.uuid4())
    history, visual_map = load_session(sid)
    try:
        reply      = run_agent(req.message, history)
        trip_info  = extract_trip_info(history, req.message, reply)
        raw_places = extract_places(reply)
        places     = fetch_place_images(raw_places) if raw_places else []
        route_data = extract_route_maps(reply, trip_info)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    history.append(HumanMessage(content=req.message))
    history.append(AIMessage(content=reply))
    new_ai_idx = len(history) - 1
    if places or route_data:
        visual_map[new_ai_idx] = {
            **({"places":     places}     if places     else {}),
            **({"route_data": route_data} if route_data else {}),
        }
    save_session(sid, history, trip_info, visual_map)
    return ChatResponse(reply=reply, session_id=sid, trip_info=trip_info,
                        places=places or None, route_data=route_data)

@app.get("/sessions", response_model=list[SessionSummary])
async def get_sessions(): return list_sessions()

@app.get("/sessions/{sid}", response_model=LoadResponse)
async def get_session(sid: str):
    conn = get_db()
    conn.row_factory = pg8000.dbapi.DictRowFactory
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM sessions WHERE id = %s", (sid,))
        row = cur.fetchone()
    conn.close()
    if not row: raise HTTPException(status_code=404, detail="Session not found")
    data = json.loads(row["messages"])
    frontend_messages = []
    for m in data:
        entry = {"role": "human" if m["role"] == "human" else "ai", "content": m["content"]}
        if m.get("places"):     entry["places"]     = m["places"]
        if m.get("route_data"): entry["route_data"] = m["route_data"]
        frontend_messages.append(entry)
    return LoadResponse(session_id=sid, trip_info=json.loads(row["trip_info"] or "{}"),
                        messages=frontend_messages)

@app.delete("/sessions/{sid}")
async def remove_session(sid: str):
    delete_session(sid); return {"status": "deleted"}

@app.get("/health")
async def health(): return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=False)