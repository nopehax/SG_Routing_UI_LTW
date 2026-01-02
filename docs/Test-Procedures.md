# Test Procedures

## TP-01 Server readiness indicator

Steps:
1. Load the app.
2. Observe the server status pill.

Expected:
- The pill shows Ready, Wait, or Unknown.
- When the server becomes ready, routing actions become available.

## TP-02 Travel mode switching

Steps:
1. Click Car, Bicycle, and Walk icons in sequence.

Expected:
- The selected mode is highlighted.
- Switching modes clears any previous route results.

## TP-03 Auto-pick stops by map click

Steps:
1. Click the map once.
2. Click the map again.

Expected:
- Stop A is set on the first click.
- Stop B is set on the second click.

## TP-04 Manual pick override

Steps:
1. Click Pick for Stop B.
2. Click a new point on the map.

Expected:
- Stop B updates to the new location.
- Other stops remain unchanged.

## TP-05 Auto-route on last stop set

Steps:
1. Clear all stops.
2. Click the map twice to set A and B.

Expected:
- The route appears automatically after setting the final stop.

## TP-06 Per-segment route colors

Steps:
1. Add 3 stops (A, B, C) and trigger routing.

Expected:
- Route A→B and B→C use different colors.

## TP-07 Map style toggle persistence

Steps:
1. Toggle the map style.
2. Refresh the page.

Expected:
- The chosen map style persists after refresh.

## TP-08 Add blockage

Steps:
1. Click Pick point under Blockages.
2. Click a point on the map.
3. Enter a name and radius.
4. Click Add blockage.

Expected:
- A temporary pin appears at the selected point before adding.
- The Add button shows a spinner while processing.
- A success toast appears when the blockage is added.
- The new blockage appears in the list and on the map.

## TP-09 Delete blockage

Steps:
1. Click the trash icon for a blockage in the list.

Expected:
- A success toast appears only after the blockage disappears from the list and map.

## TP-10 Blockage click details

Steps:
1. Click inside a blockage area on the map.

Expected:
- A details panel shows name, radius, and description.
- Clicking elsewhere closes the panel.

## TP-11 Show blockages toggle

Steps:
1. Uncheck Show blockages.
2. Check it again.

Expected:
- Blockages hide when unchecked and reappear when checked.

## TP-12 Route not found handling

Steps:
1. Set a blockage that cover most of Singapore
1. Set two stops that are on either side of the blockage.
2. Observe the result.

Expected:
- A toast appears with "Route not found."
- No route line is drawn.


## TP-13 Show path overlay

Steps:
1. Enable Show path.

Expected:
- A loading toast appears while paths load.
- Axis-type paths appear on the map.
- Disabling Show path hides the overlay.

## TP-14 Routing segment details

Steps:
1. Generate any route.
2. Click on a line segment of the route.

Expected:
- A panel shows road name, road type, and distance.
- The panel stays anchored to the map when panning/zooming.
- Clicking elsewhere closes the panel.

## TP-15 Toast behavior

Steps:
1. Trigger an error (e.g., invalid route or server failure).
2. Wait 5 seconds.
3. Trigger a success (e.g., add blockage).

Expected:
- Toasts appear at the bottom center.
- Toasts auto-dismiss after ~5 seconds or when the X is clicked.
