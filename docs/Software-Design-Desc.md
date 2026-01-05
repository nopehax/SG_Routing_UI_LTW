# Software Design Description

## App Specs

- Frontend: React + TypeScript (Vite)
- Mapping: Leaflet via react-leaflet, GeoJSON for map data
- Styling: plain CSS
- API: `https://routing-web-service-ityenzhnyq-an.a.run.app`

## Decision Reasonings

### Stop routing on first invalid segment
If any segment fails validation, routing stops for subsequent segments. Users want a complete route, so the UI avoids showing partial paths that could be misleading. They can adjust inputs or refresh and try again.

### Axis-type path overlay on demand
Axis-type paths are fetched only when the user enables "Show path." This reduces unnecessary server load and avoids cluttering the map during normal routing. The data is not stored locally because the feature is rarely used, and rendering the full network introduces noticeable lag, so keeping it on-demand minimizes performance impact.

### Blockage updates with optimistic stability
When adding a blockage, the app validates that the new blockage is present in the response before updating the map. If the response is invalid or missing the new entry, an error toast is shown. This avoids extra fetches, prevents blank UI states, and keeps the list stable while still confirming the update.

### Toast-based feedback for actions
Errors, warnings, and success messages are shown as temporary toasts instead of inline panels. This keeps the side panel focused on primary controls while still surfacing feedback in a consistent, non-blocking way.

### Map style persistence
The detailed/simplified map choice is stored locally so users keep their preferred view across refreshes. This avoids forcing repeated toggles and improves perceived responsiveness.

## Sequence Diagrams

### Get route for multiple stops
```mermaid
sequenceDiagram
    participant User
    participant UI as Web UI
    participant API as Routing API
    User->>UI: Set stops A, B, C
    User->>UI: Get route
    activate UI
    UI->>API: POST /route (A->B)
    activate API
    API-->>UI: GeoJSON
    deactivate API
    UI-->>User: Render segment A->B
    UI->>API: POST /route (B->C)
    activate API
    API-->>UI: GeoJSON
    deactivate API
    UI-->>User: Render segment B->C
    deactivate UI
```

### Add blockage
```mermaid
sequenceDiagram
    participant User
    participant UI as Web UI
    participant API as Routing API
    User->>UI: Pick blockage point
    User->>UI: Add blockage
    activate UI
    UI->>API: POST /blockage
    activate API
    API-->>UI: Updated list
    deactivate API
    UI->>UI: Validate expected updated list
    UI-->>User: Render blockage and list
    deactivate UI
```

### Toggle axis path overlay
```mermaid
sequenceDiagram
    participant User
    participant UI as Web UI
    participant API as Routing API
    User->>UI: Enable "Show path"
    activate UI
    UI->>API: GET /axisType/{type1}
    activate API
    API-->>UI: GeoJSON
    deactivate API
    UI->>API: GET /axisType/{type2}
    activate API
    API-->>UI: GeoJSON
    deactivate API
    UI-->>User: Render axis paths
    deactivate UI
```
