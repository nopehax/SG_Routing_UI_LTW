import { GeoJSON, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import type { GeoJson, Point } from "../types";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import L from "leaflet";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

type PickMode = string | null;

function ClickHandler(props: {
    pickMode: PickMode;
    onPick: (lat: number, lng: number, point: L.Point) => void;
    onMapClick?: () => void;
}) {
    useMapEvents({
        click(e) {
            props.onMapClick?.();
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

function MapAnchoredPanel(props: {
    lat: number;
    lng: number;
    className: string;
    children: ReactNode;
}) {
    const map = useMap();
    const [, setTick] = useState(0);

    useMapEvents({
        move() {
            setTick((v) => v + 1);
        },
        zoom() {
            setTick((v) => v + 1);
        },
    });

    const point = map.latLngToContainerPoint([props.lat, props.lng]);
    return (
        <div className={props.className} style={{ left: point.x, top: point.y }}>
            {props.children}
        </div>
    );
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

function createColoredMarkerIcon(color: string): L.Icon {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"><path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 24 12.5 41 12.5 41S25 24 25 12.5C25 5.6 19.4 0 12.5 0Z" fill="${color}" stroke="#2a2a2a" stroke-width="1"/><circle cx="12.5" cy="13" r="4.5" fill="#ffffff"/></svg>`;
    const iconUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;

    return L.icon({
        iconUrl,
        shadowUrl: markerShadow,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
        shadowAnchor: [12, 41],
    });
}

export default function MapView(props: {
    stops: Array<Point | null>;
    routes: GeoJson[];
    axisPaths: GeoJson[];
    blockages: GeoJson | null;
    showBlockages: boolean;
    blockagePoint: { lat: number; long: number } | null;
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
    } | null>(null);
    const [selectedRouteSegment, setSelectedRouteSegment] = useState<{
        roadName: string | null;
        roadType: string | null;
        distance: number | null;
        lat: number;
        lng: number;
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
    const markerIcons = useMemo(
        () => routeColors.map((color) => createColoredMarkerIcon(color)),
        [routeColors]
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
    const axisPathDisplays = useMemo(
        () => props.axisPaths.map((r) => stripPointFeatures(r)).filter(Boolean) as GeoJson[],
        [props.axisPaths]
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
        if (props.pickMode) setSelectedRouteSegment(null);
    }, [props.pickMode]);

    const routeOnEachFeature = useMemo(() => {
        return (feature: any, layer: L.Layer) => {
            if ("on" in layer && typeof (layer as any).on === "function") {
                (layer as any).on("click", (e: L.LeafletMouseEvent) => {
                    L.DomEvent.stopPropagation(e);
                    const props = feature?.properties ?? {};
                    const roadName = typeof props["road name"] === "string" ? props["road name"] : null;
                    const roadType = typeof props["road type"] === "string" ? props["road type"] : null;
                    const distance = typeof props.distance === "number" ? props.distance : null;
                    setSelectedRouteSegment({
                        roadName,
                        roadType,
                        distance,
                        lat: e.latlng.lat,
                        lng: e.latlng.lng,
                    });
                });
            }
        };
    }, []);

    useEffect(() => {
        try {
            window.localStorage.setItem("sg-routing-map-style", mapStyle);
        } catch {
            // ignore storage errors
        }
    }, [mapStyle]);

    return (
        <div className="mapWrap">
            {props.pickMode && (
                <div className="mapHint">
                    Click on the map to set <b>{props.pickMode}</b>.
                </div>
            )}

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
                    onMapClick={() => setSelectedRouteSegment(null)}
                    onPick={(lat, lng, point) => {
                        props.onPick(lat, lng);
                        if (props.pickMode) return;

                        setSelectedRouteSegment(null);
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
                                    lat,
                                    lng,
                                });
                                return;
                            }
                        }

                        setSelectedBlockage(null);
                    }}
                />

                {props.stops.map((stop, index) =>
                    stop ? (
                        <Marker
                            key={`stop-${index}`}
                            position={[stop.lat, stop.long]}
                            icon={
                                markerIcons[
                                    index < props.stops.length - 1
                                        ? index % markerIcons.length
                                        : Math.max(0, index - 1) % markerIcons.length
                                ]
                            }
                        >
                            <Tooltip permanent direction="top" offset={[0, -14]}>
                                {String.fromCharCode("A".charCodeAt(0) + index)}
                            </Tooltip>
                        </Marker>
                    ) : null
                )}

                {props.blockagePoint && (
                    <Marker
                        key="blockage-preview"
                        position={[props.blockagePoint.lat, props.blockagePoint.long]}
                    />
                )}

                {routeDisplays.length > 0 && <FitBoundsOnGeoJson data={routeDisplays[routeDisplays.length - 1]} />}
                {routeDisplays.map((route, index) => (
                    <GeoJSON
                        key={`route-${index}`}
                        data={route as any}
                        style={{ ...routeStyle, color: routeColors[index % routeColors.length] } as any}
                        onEachFeature={routeOnEachFeature as any}
                    />
                ))}

                {axisPathDisplays.map((route, index) => (
                    <GeoJSON
                        key={`axis-${index}`}
                        data={route as any}
                        style={{ weight: 2, opacity: 0.35, color: "#394b59" } as any}
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

                {selectedBlockage && !props.pickMode && (
                    <MapAnchoredPanel
                        className="blockageDetail"
                        lat={selectedBlockage.lat}
                        lng={selectedBlockage.lng}
                    >
                        <div className="blockageTitle">{selectedBlockage.name}</div>
                        <div className="muted">
                            {selectedBlockage.radius != null ? `Radius: ${selectedBlockage.radius} m` : "Radius: unknown"}
                        </div>
                        {selectedBlockage.description.trim().toLowerCase() !== "null" &&
                            selectedBlockage.description.trim() !== "" && (
                                <div className="blockageDesc">{selectedBlockage.description}</div>
                            )}
                    </MapAnchoredPanel>
                )}

                {selectedRouteSegment && !props.pickMode && (
                    <MapAnchoredPanel
                        className="routeDetail"
                        lat={selectedRouteSegment.lat}
                        lng={selectedRouteSegment.lng}
                    >
                        <div className="routeTitle">Road segment</div>
                        <div className="muted">
                            {selectedRouteSegment.roadName ? `Name: ${selectedRouteSegment.roadName}` : "Name: unknown"}
                        </div>
                        <div className="muted">
                            {selectedRouteSegment.roadType ? `Type: ${selectedRouteSegment.roadType}` : "Type: unknown"}
                        </div>
                        <div className="muted">
                            {selectedRouteSegment.distance != null
                                ? `Distance: ${selectedRouteSegment.distance} m`
                                : "Distance: unknown"}
                        </div>
                    </MapAnchoredPanel>
                )}
            </MapContainer>

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
