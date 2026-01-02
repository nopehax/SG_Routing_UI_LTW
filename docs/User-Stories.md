# User Stories

## US-01 Server readiness status
As a route planner, I want to see when the server is ready so that I know when I can use the webapp.

Acceptance criteria:
- The server status indicator updates to show Ready, Wait, or Unknown.
- When the server becomes ready, I can route normally.

## US-02 Switch travel modes
As a route planner, I want to be able to switch travel modes so that I can plan for different travel types.

Acceptance criteria:
- I can switch between car, bicycle, and walking modes.
- The selected mode is visually highlighted.

## US-03 Get a route between stops
As a route planner, I want to set stops on the map so that I can generate a route.

Acceptance criteria:
- When I have set at least two stops, I can get a route between them.
- If a route cannot be found for a segment, I see a clear "Route not found" message.
- If a stop is inside a blocked area, I see a warning and routing does not proceed.

## US-04 View route segment details
As a route planner, I want to click a route segment so that I can see road details.

Acceptance criteria:
- Clicking a route line shows road name, road type, and distance when available.
- The details panel stays anchored to the map location while panning or zooming.
- Clicking elsewhere closes the panel.

## US-05 Auto-pick stops on map click
As a route planner, I want clicks to set the next unset stop automatically so that I can add stops quickly.

Acceptance criteria:
- When I click on the map, the next empty stop (A, then B, then C, etc.) is filled.
- If all stops are already set, clicking the map does not change them.
- I can still use the "Pick" button if I want to choose a specific stop.

## US-06 Auto-route when all stops are set
As a route planner, I want routing to start automatically when the last stop is set so that I can see results faster.

Acceptance criteria:
- When I set the last required stop, the route appears automatically.

## US-07 Manage stops
As a route planner, I want to add, delete, swap, and clear stops so that I can adjust my trip plan.

Acceptance criteria:
- I can add a new stop with the "Add Stop" button.
- I can remove a stop using the trash icon.
- I can swap the two stops when only 2 stops are set.
- I can clear all stops in one action.

## US-08 Toggle map style and keep preference
As a route planner, I want to toggle between detailed and simplified map styles and keep my choice so that I can view the map the way I prefer.

Acceptance criteria:
- The map style toggle is always visible.
- The button shows the current style.
- After refreshing the page, the same style is still selected.

## US-09 Show paths for a travel mode
As a route planner, I want to show paths for the current travel mode so that I can see the available network.

Acceptance criteria:
- A "Show path" checkbox appears under the travel mode buttons.
- When checked, the mode's paths appear on the map after a loading toast.
- When unchecked, the paths are hidden.

## US-10 Add a blockage
As a route planner, I want to add a blockage on the map so that I can avoid certain areas.

Acceptance criteria:
- I can pick a point on the map and see a temporary pin there.
- While the blockage is being added, the button shows a spinner and is disabled.
- After adding, the new blockage appears in the list and on the map.

## US-11 Show and delete blockages
As a route planner, I want to view and remove existing blockages so that I can maintain an accurate blockage list.

Acceptance criteria:
- The blockages list shows all available named blockages.
- I can delete a blockage and see it removed from the list and map.
- I can toggle blockage visibility on or off on the map.

## US-12 View blockage details
As a route planner, I want to click a blockage area to see details so that I can know additional information.

Acceptance criteria:
- Clicking within a blockage shows its name, radius, and description.
- Clicking elsewhere hides the details.

## US-13 Errors and success messages are visible and actionable
As a route planner, I want clear toast messages for errors and success so that I can understand what happened quickly.

Acceptance criteria:
- Error and success toasts appear at the bottom center of the screen.
- Blockage add/delete errors appear without clearing my current list.
- Messages use plain language and tell me what happened.
