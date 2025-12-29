import type { Point, ReadyState, TravelMode } from "../types";
import { TRAVEL_MODE_LABEL } from "../presets";

type PickMode = "start" | "end" | "blockage" | null;

export default function SidePanel(props: {
    ready: ReadyState;
    mode: TravelMode;
    onModeChange: (m: TravelMode) => void;

    stops: Array<Point | null>;
    pickStopIndex: number | null;
    onPickStop: (index: number) => void;
    onAddStop: () => void;
    onDeleteStop: (index: number) => void;
    onClearStops: () => void;
    onSwap: () => void;

    pickMode: PickMode;
    setPickMode: (m: PickMode) => void;

    applyingPreset: boolean;
    routing: boolean;
    routeBlocked: boolean;
    routeBlockedReason: string | null;
    routeError: string | null;

    onGetRoute: () => void;

    showBlockages: boolean;
    onToggleBlockages: () => void;

    // Blockage creation + list
    blockagePoint: { lat: number; long: number } | null;
    blockageName: string;
    blockageDesc: string;
    blockageRadius: number;
    setBlockageName: (v: string) => void;
    setBlockageDesc: (v: string) => void;
    setBlockageRadius: (v: number) => void;
    clearBlockagePoint: () => void;
    onAddBlockage: () => void;

    blockageNames: string[];
    deletingBlockageName: string | null;
    onDeleteBlockage: (name: string) => void;

    error: string | null;
}) {
    const allStopsSet = props.stops.length >= 2 && props.stops.every(Boolean);
    const canRoute =
        props.ready === "Ready" && allStopsSet && !props.routing && !props.routeBlocked;

    const canAddBlockage =
        props.ready === "Ready" && !!props.blockagePoint && props.blockageName.trim().length > 0;

    return (
        <aside className="panel">
            <div className="panelHeader">
                <div className="title">SG Routing Explorer</div>
                <div
                    className={`pill ${props.ready === "Ready" ? "ok" : props.ready === "Wait" ? "warn" : "error"
                        }`}
                >
                    Server: {props.ready}
                </div>
            </div>

            <section className="card">
                <div className="cardTitle">Travel mode</div>
                <div className="modeButtons" role="group" aria-label="Travel mode">
                    <button
                        type="button"
                        className={props.mode === "car" ? "active" : ""}
                        onClick={() => props.onModeChange("car")}
                        disabled={props.applyingPreset}
                        aria-label={TRAVEL_MODE_LABEL.car}
                        title={TRAVEL_MODE_LABEL.car}
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 13l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v6h-2v-2H5v2H3v-6Zm2 0h14M7 16h0M17 16h0"
                            />
                        </svg>
                    </button>
                    <button
                        type="button"
                        className={props.mode === "bicycle" ? "active" : ""}
                        onClick={() => props.onModeChange("bicycle")}
                        disabled={props.applyingPreset}
                        aria-label={TRAVEL_MODE_LABEL.bicycle}
                        title={TRAVEL_MODE_LABEL.bicycle}
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M10 17a4 4 0 1 0-8 0a4 4 0 1 0 8 0M22 17a4 4 0 1 0-8 0a4 4 0 1 0 8 0M6 17L10 11L14 11L18 17M10 11L6 17M14 11L11 17M11 17L6 17M14 11L18 17M10 11L11 17M9 9.5L10.8 9.5M10 11L10 9.5M14 11L16 9M15.5 9L18 9M12 17a1 1 0 1 0-2 0a1 1 0 1 0 2 0M11 17L12.5 18.5M11 17L9.5 15.5"
                            />
                        </svg>

                    </button>
                    <button
                        type="button"
                        className={props.mode === "walk" ? "active" : ""}
                        onClick={() => props.onModeChange("walk")}
                        disabled={props.applyingPreset}
                        aria-label={TRAVEL_MODE_LABEL.walk}
                        title={TRAVEL_MODE_LABEL.walk}
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 4a2 2 0 1 0 0.001 0M12 6v5M12 8l-3 3M12 9l3 3M12 11l-3 7M12 11l3 7"
                            />
                        </svg>

                    </button>
                </div>

                <div className="subtle">Select one.</div>
            </section>

            <section className="card">
                <div className="cardTitle">Route</div>

                <div className="ptRow">
                    <button onClick={props.onSwap} disabled={props.stops.length !== 2 || !allStopsSet}>
                        Swap
                    </button>
                    <button
                        onClick={props.onClearStops}
                        disabled={!props.stops.some(Boolean)}
                    >
                        Clear
                    </button>
                    <button onClick={props.onAddStop} type="button">
                        Add Stop
                    </button>
                </div>

                {props.stops.map((stop, index) => {
                    const label = String.fromCharCode("A".charCodeAt(0) + index);
                    return (
                        <div key={`stop-${index}`} className="ptBlock">
                            <div className="ptRow">
                                <b>Stop {label}</b>
                                <div className="ptActions">
                                    <button
                                        className={props.pickStopIndex === index ? "active" : ""}
                                        onClick={() => props.onPickStop(index)}
                                    >
                                        Pick
                                    </button>
                                    <button
                                        className="danger"
                                        onClick={() => props.onDeleteStop(index)}
                                        aria-label={`Delete stop ${label}`}
                                        title={`Delete stop ${label}`}
                                    >
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                            <path
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="muted">
                                {stop ? `${stop.lat.toFixed(5)}, ${stop.long.toFixed(5)}` : "Not set"}
                            </div>
                        </div>
                    );
                })}

                <button className="primary" onClick={props.onGetRoute} disabled={!canRoute || props.applyingPreset}>
                    {props.routing ? "Routing…" : "Get route"}
                </button>

                {(props.routeError || !canRoute) && (
                    <div className="subtle">
                        {props.routeError
                            ? props.routeError
                            : props.ready !== "Ready"
                                ? "Waiting for server to be ready."
                                : !allStopsSet
                                    ? "Pick all stops on the map."
                                    : null}
                    </div>
                )}
                {props.error && <div className="errorBox">{props.error}</div>}
            </section>

            <section className="card">
                <div className="cardTitle">Blockages</div>


                <div className="ptBlock">
                    <div className="ptRow">
                        <b>New blockage</b>
                        <div className="ptActions">
                            <button
                                className={props.pickMode === "blockage" ? "active" : ""}
                                onClick={() => props.setPickMode(props.pickMode === "blockage" ? null : "blockage")}
                            >
                                Pick point
                            </button>
                            <button onClick={props.clearBlockagePoint} disabled={!props.blockagePoint}>
                                Clear
                            </button>
                        </div>
                    </div>

                    <div className="muted">
                        {props.blockagePoint
                            ? `${props.blockagePoint.lat.toFixed(5)}, ${props.blockagePoint.long.toFixed(5)}`
                            : "No point selected"}
                    </div>

                    <input
                        placeholder="Name (required, used for delete)"
                        value={props.blockageName}
                        onChange={(e) => props.setBlockageName(e.target.value)}
                    />
                    <input
                        placeholder="Description (optional)"
                        value={props.blockageDesc}
                        onChange={(e) => props.setBlockageDesc(e.target.value)}
                    />

                    <div className="subtle">Radius (metres): {props.blockageRadius}</div>
                    <input
                        type="range"
                        min={50}
                        max={2000}
                        step={50}
                        value={props.blockageRadius}
                        onChange={(e) => props.setBlockageRadius(Number(e.target.value))}
                    />

                    <button className="primary" disabled={!canAddBlockage} onClick={props.onAddBlockage}>
                        Add blockage
                    </button>
                </div>

                <div className="ptBlock">
                    <b>Existing</b>

                    {props.blockageNames.length === 0 ? (
                        <div className="muted">No blockages detected.</div>
                    ) : (
                        <div className="smallList">
                            <div className="chips">
                                {props.blockageNames.map((name) => (
                                    <span key={name} className="chip" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                        {name}
                                        <button
                                            className="iconButton danger"
                                            onClick={() => props.onDeleteBlockage(name)}
                                            disabled={props.deletingBlockageName === name}
                                            aria-label={`Delete blockage ${name}`}
                                            title={`Delete ${name}`}
                                        >
                                            {props.deletingBlockageName === name ? (
                                                "..."
                                            ) : (
                                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                                    <path
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6"
                                                    />
                                                </svg>
                                            )}
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <label className="toggleRow" style={{ marginTop: 10 }}>
                        <input type="checkbox" checked={props.showBlockages} onChange={props.onToggleBlockages} />
                        Show blockages
                    </label>
                </div>
            </section>

            <div className="footerNote">Tip: click “Pick” then click on the map.</div>
        </aside>
    );
}
