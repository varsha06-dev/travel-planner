## Voyage — AI Travel Planner

### What it does
Voyage is a conversational AI travel planning web app. Users chat with an AI agent to plan trips — the agent asks about their budget, destination, travel dates, group size and interests, then searches the web for real-time information and generates a detailed day-by-day itinerary. Each plan comes with place photos, an interactive map showing the route between stops, and flight/hotel cost estimates.

---

### Tech Stack

**Backend**
| Tool | Purpose |
|------|---------|
| Python 3.11 | Core language |
| FastAPI | REST API framework |
| LangChain | AI agent orchestration and tool calling |
| Claude Sonnet (Anthropic) | LLM powering the chat and data extraction |
| Tavily Search | Real-time web search tool for the agent |
| pg8000 | PostgreSQL database driver |
| Uvicorn | ASGI server |

**Frontend**
| Tool | Purpose |
|------|---------|
| React 18 | UI framework |
| Vite | Build tool |
| Mapbox GL JS | Interactive maps and geocoding |
| react-markdown | Rendering markdown in chat |
| Web Speech API | Voice input |

**Infrastructure**
| Tool | Purpose |
|------|---------|
| Supabase | Managed PostgreSQL database |
| Render | Backend hosting |
| Vercel | Frontend hosting |
| GitHub | Version control and CI/CD |
| Cloudflare | CDN (automatic via Render) |

**External APIs**
| API | Purpose |
|-----|---------|
| Anthropic API | Claude LLM |
| Tavily API | Web search |
| Mapbox API | Geocoding, directions, map tiles |
| Unsplash API | Place photography |

---

### Key Features Built

**AI Agent**
- LangChain agent with 5 tools: web search, activity finder, best-time-to-visit lookup, flight cost estimator, hotel cost estimator
- Multi-turn conversation with full history passed to the model on each turn
- Automatic trip info extraction (destination, dates, budget, travelers) using a secondary LLM call
- Named place extraction from responses for the photo gallery
- Day-by-day itinerary extraction for the route map

**Streaming**
- Server-Sent Events (SSE) via FastAPI `StreamingResponse`
- Claude's `astream()` for true token-level streaming — text appears word by word as the model generates it
- Real-time tool use indicators shown while the agent searches the web
- Blinking cursor while streaming, visuals appear after text completes

**Interactive Map**
- Mapbox geocoding with bbox and proximity constraints to keep stops within the destination region
- Haversine distance filtering (120km) to remove misplaced geocoding results
- Mapbox Directions API for driving routes between stops
- Day-by-day tab switching, clickable stops that fly the map to that location and open a popup

**Places Gallery**
- Unsplash API fetches photos for each named place in parallel using `ThreadPoolExecutor`
- Thumbnail strip with active state, main image with gradient overlay and photographer credit

**Session Persistence**
- PostgreSQL on Supabase stores all sessions with messages, trip info and visual data serialized as JSON
- History sidebar with trip cards, active session indicator, and delete with confirmation
- Sessions survive Render restarts and can be reloaded across browser sessions

**Mobile Layout**
- JavaScript-driven responsive design using a `useIsMobile` hook (breakpoint 768px)
- Sidebar becomes a fixed overlay drawer on mobile, toggled by a hamburger menu
- Mobile header with Voyage branding stays pinned at top while messages scroll
- Route map stacks vertically on mobile, message bubbles widen to 88-92% of screen
- `100dvh` used instead of `100vh` to handle mobile browser chrome resizing

**Voice Input**
- Web Speech API (`SpeechRecognition`) for microphone input
- Visual recording indicator, transcript appended to the text field

**CORS & Deployment**
- Dual CORS setup: FastAPI `CORSMiddleware` plus a custom `@app.middleware("http")` that injects headers on every response including errors and streaming responses
- Cloudflare sits in front of Render and was stripping headers — solved by the custom middleware injecting at the application layer
