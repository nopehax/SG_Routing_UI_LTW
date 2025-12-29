import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import type { GeoJson, Point } from "../types";
import { useEffect, useMemo, useState } from "react";
import L from "leaflet";

type PickMode = string | null;

function ClickHandler(props: {
    pickMode: PickMode;
    onPick: (lat: number, lng: number, point: L.Point) => void;
}) {
    useMapEvents({
        click(e) {
            props.onPick(e.latlng.lat, e.latlng.lng, e.containerPoint);
        },
    });
    return null;
}

function FitBoundsOnGeoJson({ data }: { data: GeoJson | null }) {
    const map = useMap();

    useEffect(() => {
        if (!data) return;

        try {
            const layer = L.geoJSON(data as any);
            const bounds = layer.getBounds();
            if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
        } catch {
            // ignore
        }
    }, [data, map]);

    return null;
}

function stripPointFeatures(data: GeoJson | null): GeoJson | null {
    if (!data) return null;

    const asAny = data as any;
    const type = asAny?.type;

    if (type === "FeatureCollection") {
        const originalFeatures = Array.isArray(asAny.features) ? asAny.features : [];
        const filtered = originalFeatures.filter((f: any) => {
            const geomType = f?.geometry?.type;
            return geomType !== "Point" && geomType !== "MultiPoint";
        });

        if (filtered.length === 0) return asAny;
        return { ...asAny, features: filtered };
    }

    if (type === "Feature") {
        const geomType = asAny?.geometry?.type;
        if (geomType === "Point" || geomType === "MultiPoint") return null;
        return asAny;
    }

    if (type === "Point" || type === "MultiPoint") return null;

    return asAny;
}

function parseBlockageRadiusMeters(props: any): number | null {
    const raw = props?.["distance (meters)"] ?? null;
    if (raw == null) return null;
    const radius = typeof raw === "string" ? Number(raw.replace(/[^0-9.]/g, "")) : Number(raw);
    return Number.isFinite(radius) ? radius : null;
}

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
    const r = 6371000;
    const dLat = ((bLat - aLat) * Math.PI) / 180;
    const dLng = ((bLng - aLng) * Math.PI) / 180;
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const a =
        sinLat * sinLat +
        Math.cos((aLat * Math.PI) / 180) *
            Math.cos((bLat * Math.PI) / 180) *
            sinLng *
            sinLng;
    return 2 * r * Math.asin(Math.sqrt(a));
}

export default function MapView(props: {
    stops: Array<Point | null>;
    routes: GeoJson[];
    blockages: GeoJson | null;
    showBlockages: boolean;
    pickMode: PickMode;
    onPick: (lat: number, lng: number) => void;
}) {
    const sgCenter: [number, number] = [1.3521, 103.8198];
    const [mapStyle, setMapStyle] = useState<"detailed" | "simplified">(() => {
        try {
            const stored = window.localStorage.getItem("sg-routing-map-style");
            return stored === "simplified" ? "simplified" : "detailed";
        } catch {
            return "detailed";
        }
    });
    const [selectedBlockage, setSelectedBlockage] = useState<{
        name: string;
        description: string;
        radius: number | null;
        lat: number;
        lng: number;
        x: number;
        y: number;
    } | null>(null);

    const routeStyle = useMemo(
        () => ({
            weight: 6,
            opacity: 0.9,
        }),
        []
    );

    const routeColors = useMemo(
        () => ["#1f78b4", "#33a02c", "#ff7f00", "#6a3d9a", "#e31a1c", "#b15928"],
        []
    );

    const blockagePolygonStyle = useMemo(
        () => ({
            weight: 2,
            opacity: 0.9,
            fillOpacity: 0.2,
        }),
        []
    );

    const blockagePointToLayer = useMemo(() => {
        return (feature: any, latlng: L.LatLng) => {
            const radius = parseBlockageRadiusMeters(feature?.properties);
            const safeRadius = radius ?? 200;

            // Draw actual radius in metres + small center dot
            const circle = L.circle(latlng, { radius: safeRadius });
            const centerDot = L.circleMarker(latlng, { radius: 4 });

            return L.layerGroup([circle, centerDot]);
        };
    }, []);

    const blockageOnEachFeature = useMemo(() => {
        return (feature: any, layer: L.Layer) => {
            const name = feature?.properties?.name ?? "Blockage";
            const desc = feature?.properties?.description ?? "";
            const safeRadius = parseBlockageRadiusMeters(feature?.properties);

            const lines = [
                String(name),
                safeRadius != null ? `Radius: ${safeRadius} m` : null,
                desc && String(desc).trim().toLowerCase() !== "null" ? String(desc) : null,
            ].filter(Boolean);

            if ("bindPopup" in layer && typeof (layer as any).bindPopup === "function") {
                (layer as any).bindPopup(lines.join("<br/>"));
            }
        };
    }, []);

    const routeDisplays = useMemo(
        () => props.routes.map((r) => stripPointFeatures(r)).filter(Boolean) as GeoJson[],
        [props.routes]
    );
    const blockagesKey = useMemo(
        () => (props.blockages ? JSON.stringify(props.blockages) : "none"),
        [props.blockages]
    );
    const safeBlockages = useMemo(() => {
        if (!props.blockages) return null;
        try {
            L.geoJSON(props.blockages as any);
            return props.blockages;
        } catch {
            return null;
        }
    }, [props.blockages]);
    const pointBlockages = useMemo(() => {
        const data = safeBlockages as any;
        if (!data || data.type !== "FeatureCollection" || !Array.isArray(data.features)) return [];
        return data.features.filter((f: any) => f?.geometry?.type === "Point");
    }, [safeBlockages]);

    useEffect(() => {
        if (props.pickMode) setSelectedBlockage(null);
    }, [props.pickMode]);

    useEffect(() => {
        try {
            window.localStorage.setItem("sg-routing-map-style", mapStyle);
        } catch {
            // ignore storage errors
        }
    }, [mapStyle]);

    return (
        <div className="mapWrap">
            <MapContainer center={sgCenter} zoom={12} className="map">
                <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url={
                        mapStyle === "detailed"
                            ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            : "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
                    }
                />

                <ClickHandler
                    pickMode={props.pickMode}
                    onPick={(lat, lng, point) => {
                        props.onPick(lat, lng);
                        if (props.pickMode) return;

                        if (!props.showBlockages || pointBlockages.length === 0) {
                            setSelectedBlockage(null);
                            return;
                        }

                        for (const feature of pointBlockages) {
                            const coords = feature?.geometry?.coordinates;
                            if (!Array.isArray(coords) || coords.length < 2) continue;
                            const [bLng, bLat] = coords;
                            const radius = parseBlockageRadiusMeters(feature?.properties);
                            if (!radius) continue;
                            const d = distanceMeters(lat, lng, bLat, bLng);
                            if (d <= radius) {
                                const name = feature?.properties?.name ?? "Blockage";
                                const desc = feature?.properties?.description ?? "";
                                setSelectedBlockage({
                                    name: String(name),
                                    description: String(desc),
                                    radius,
                                    lat: bLat,
                                    lng: bLng,
                                    x: point.x,
                                    y: point.y,
                                });
                                return;
                            }
                        }

                        setSelectedBlockage(null);
                    }}
                />

                {props.stops.map((stop, index) =>
                    stop ? (
                        <CircleMarker
                            key={`stop-${index}`}
                            center={[stop.lat, stop.long]}
                            radius={8}
                            pathOptions={{
                                color: routeColors[index % routeColors.length],
                                fillColor: routeColors[index % routeColors.length],
                                fillOpacity: 0.9,
                                weight: 2,
                            }}
                        >
                            <Tooltip permanent direction="top" offset={[0, -10]}>
                                {String.fromCharCode("A".charCodeAt(0) + index)}
                            </Tooltip>
                        </CircleMarker>
                    ) : null
                )}

                {routeDisplays.length > 0 && <FitBoundsOnGeoJson data={routeDisplays[routeDisplays.length - 1]} />}
                {routeDisplays.map((route, index) => (
                    <GeoJSON
                        key={`route-${index}`}
                        data={route as any}
                        style={{ ...routeStyle, color: routeColors[index % routeColors.length] } as any}
                    />
                ))}

                {props.showBlockages && safeBlockages && (
                    <GeoJSON
                        key={blockagesKey}
                        data={safeBlockages as any}
                        // For non-point geometries (polygons/lines), apply a style
                        style={blockagePolygonStyle as any}
                        // For Point features, render as circle (metres) instead of a pin
                        pointToLayer={blockagePointToLayer as any}
                        onEachFeature={blockageOnEachFeature as any}
                    />
                )}
            </MapContainer>

            {props.pickMode && (
                <div className="mapHint">
                    Click on the map to set <b>{props.pickMode}</b>.
                </div>
            )}

            {selectedBlockage && !props.pickMode && (
                <div
                    className="blockageDetail"
                    style={{ left: selectedBlockage.x, top: selectedBlockage.y }}
                >
                    <div className="blockageTitle">{selectedBlockage.name}</div>
                    <div className="muted">
                        {selectedBlockage.radius != null ? `Radius: ${selectedBlockage.radius} m` : "Radius: unknown"}
                    </div>
                    {selectedBlockage.description.trim().toLowerCase() !== "null" &&
                        selectedBlockage.description.trim() !== "" && (
                            <div className="blockageDesc">{selectedBlockage.description}</div>
                        )}
                </div>
            )}

            <button
                className="mapStyleToggle"
                type="button"
                onClick={() =>
                    setMapStyle((v) => (v === "detailed" ? "simplified" : "detailed"))
                }
                aria-label="Toggle map style"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 12a8 8 0 0 1 13.66-5.66M20 12a8 8 0 0 1-13.66 5.66M16 4h3v3M8 20H5v-3"
                    />
                </svg>
                {mapStyle === "detailed" ? "Detailed map" : "Simplified map"}
            </button>
        </div>
    );
}
