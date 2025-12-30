import { useEffect, useMemo, useRef, useState } from "react";
import MapView from "./components/MapView";
import SidePanel from "./components/SidePanel";
import type { GeoJson, Point, ReadyState, TravelMode } from "./types";
import { MODE_TO_AXIS_TYPES } from "./presets";
import {
  addBlockage,
  changeValidRoadTypes,
  deleteBlockage,
  getBlockages,
  getReady,
  getRoute,
  getValidAxisTypes,
} from "./api";

type PickMode = "start" | "end" | "blockage" | null;

function stopLabel(index: number): string {
  const base = "A".charCodeAt(0);
  return String.fromCharCode(base + index);
}

function extractBlockageNames(blockages: any): string[] {
  // Expect FeatureCollection with features[*].properties.name (best guess)
  const features = blockages?.features;
  if (!Array.isArray(features)) return [];
  const names = features
    .map((f) => f?.properties?.name ?? f?.properties?.blockage_name ?? f?.properties?.id ?? null)
    .filter((x) => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim());

  // unique
  return Array.from(new Set(names));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isValidGeoJson(data: any): boolean {
  if (!data || typeof data !== "object") return false;
  const type = data.type;
  const geometryTypes = new Set([
    "Point",
    "MultiPoint",
    "LineString",
    "MultiLineString",
    "Polygon",
    "MultiPolygon",
    "GeometryCollection",
  ]);

  if (type === "FeatureCollection") {
    return Array.isArray(data.features);
  }

  if (type === "Feature") {
    return !!data.geometry && geometryTypes.has(data.geometry.type);
  }

  return geometryTypes.has(type);
}

function areBlockagesEqual(a: GeoJson | null, b: GeoJson | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function hasRouteGeometry(data: any): boolean {
  if (!data || typeof data !== "object") return false;
  const type = data.type;
  const hasLineOrPolygon = (geomType: string | undefined) =>
    geomType === "LineString" ||
    geomType === "MultiLineString" ||
    geomType === "Polygon" ||
    geomType === "MultiPolygon";

  if (type === "FeatureCollection" && Array.isArray(data.features)) {
    return data.features.some((f: any) => hasLineOrPolygon(f?.geometry?.type));
  }

  if (type === "Feature") {
    return hasLineOrPolygon(data?.geometry?.type);
  }

  return hasLineOrPolygon(type);
}

function parseBlockageRadiusMeters(props: any): number | null {
  const raw = props?.["distance (meters)"] ?? null;

  if (raw == null) return null;
  const radius = typeof raw === "string" ? Number(raw.replace(/[^0-9.]/g, "")) : Number(raw);
  return Number.isFinite(radius) ? radius : null;
}

function normalizeAxisTypes(value: unknown): string[] {
  return Array.isArray(value) ? value : [];
}

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const a = sinLat * sinLat + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * sinLng * sinLng;
  return 2 * r * Math.asin(Math.sqrt(a));
}

function isPointInsideBlockage(point: Point | null, blockages: GeoJson | null): boolean {
  if (!point || !blockages) return false;

  const asAny = blockages as any;
  const type = asAny?.type;
  const features = type === "FeatureCollection" && Array.isArray(asAny.features)
    ? asAny.features
    : type === "Feature"
      ? [asAny]
      : [];

  for (const feature of features) {
    const geomType = feature?.geometry?.type;
    if (geomType !== "Point") continue;
    const coords = feature?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const [lng, lat] = coords;
    const radius = parseBlockageRadiusMeters(feature?.properties);
    if (!radius) continue;
    const d = distanceMeters(point.lat, point.long, lat, lng);
    if (d <= radius) return true;
  }

  return false;
}

export default function App() {
  const [ready, setReady] = useState<ReadyState>("Unknown");

  const [mode, setMode] = useState<TravelMode>("car");
  const presetAxisTypes = useMemo(() => MODE_TO_AXIS_TYPES[mode], [mode]);

  const [activeAxisTypes, setActiveAxisTypes] = useState<string[]>([]);
  const [applyingPreset, setApplyingPreset] = useState(false);

  const [pickMode, setPickMode] = useState<PickMode>(null);
  const [pickStopIndex, setPickStopIndex] = useState<number | null>(null);

  const [stops, setStops] = useState<Array<Point | null>>([null, null]);

  const [routes, setRoutes] = useState<GeoJson[]>([]);
  const [routing, setRouting] = useState(false);

  const [showBlockages, setShowBlockages] = useState(true);
  const [blockages, setBlockages] = useState<GeoJson | null>(null);

  const [blockagePoint, setBlockagePoint] = useState<{ lat: number; long: number } | null>(null);
  const [blockageName, setBlockageName] = useState("");
  const [blockageDesc, setBlockageDesc] = useState("");
  const [blockageRadius, setBlockageRadius] = useState(200);
  const [deletingBlockageName, setDeletingBlockageName] = useState<string | null>(null);
  const [addingBlockage, setAddingBlockage] = useState(false);

  const blockageNames = useMemo(() => extractBlockageNames(blockages), [blockages]);
  const allStopsSet = stops.length >= 2 && stops.every(Boolean);
  const prevAllStopsSet = useRef(allStopsSet);

  const [error, setError] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const blockageError = useMemo(() => {
    for (let i = 0; i < stops.length; i += 1) {
      if (isPointInsideBlockage(stops[i], blockages)) {
        return `Stop ${stopLabel(i)} is inside a blockage.`;
      }
    }
    return null;
  }, [stops, blockages]);
  const panelError = [error, blockageError].filter(Boolean).join(" ") || null;

  // Poll /ready with Fibonacci backoff when not ready.
  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;
    let fibA = 1;
    let fibB = 1;
    const readyPollMs = 15000;

    function scheduleNext(ms: number) {
      if (cancelled) return;
      timeoutId = window.setTimeout(tick, ms);
    }

    async function tick() {
      try {
        const r = await getReady();
        if (cancelled) return;
        setReady(r);

        if (r === "Ready") {
          fibA = 1;
          fibB = 1;
          scheduleNext(readyPollMs);
          return;
        }
      } catch {
        if (cancelled) return;
        setReady("Unknown");
      }

      const nextDelaySec = fibA;
      const next = fibA + fibB;
      fibA = fibB;
      fibB = next;
      scheduleNext(nextDelaySec * 1000);
    }

    tick();
    return () => {
      cancelled = true;
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, []);

  // Load server axis types once (optional)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await getValidAxisTypes();
        if (!cancelled) setActiveAxisTypes(normalizeAxisTypes(v));
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Apply preset when ready + mode changes
  useEffect(() => {
    let cancelled = false;
    if (ready !== "Ready") return;

    (async () => {
      setApplyingPreset(true);
      setError(null);
      setRoutes([]); // clear stale routes when mode changes
      try {
        const v = await changeValidRoadTypes(presetAxisTypes);
        if (!cancelled) setActiveAxisTypes(normalizeAxisTypes(v));
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to apply travel mode preset.");
      } finally {
        if (!cancelled) setApplyingPreset(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, mode, presetAxisTypes]);

  useEffect(() => {
    if (!prevAllStopsSet.current && allStopsSet) {
      if (ready === "Ready" && !routing && !blockageError) {
        void onGetRoute();
      }
    }
    prevAllStopsSet.current = allStopsSet;
  }, [allStopsSet, ready, routing, blockageError, onGetRoute]);

  async function refreshBlockages() {
    const g = await getBlockages();
    setBlockages((prev: GeoJson | null) => {
      if (!isValidGeoJson(g)) return prev;
      return areBlockagesEqual(prev, g) ? prev : g;
    });
  }

  async function refreshBlockagesUntilUpdated(expectedName: string) {
    const maxAttempts = 10;
    const delayMs = 500;
    const trimmedName = expectedName.trim();

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const g = await getBlockages();
      if (!isValidGeoJson(g)) {
        await sleep(delayMs);
        continue;
      }

      const names = extractBlockageNames(g);
      const hasExpected = trimmedName.length > 0 && names.includes(trimmedName);
      const changed = !areBlockagesEqual(blockages, g);

      if (hasExpected || changed) {
        setBlockages(g);
        return true;
      }

      await sleep(delayMs);
    }

    return false;
  }

  // Fetch blockages on toggle to refresh overlay/list
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const g = await getBlockages();
        if (!cancelled) {
          setBlockages((prev: GeoJson | null) => {
            if (!isValidGeoJson(g)) return prev;
            return areBlockagesEqual(prev, g) ? prev : g;
          });
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load blockages.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showBlockages]);

  function onPick(lat: number, lng: number) {
    setError(null);

    if (pickStopIndex != null) {
      setStops((prev) => {
        const next = [...prev];
        next[pickStopIndex] = { lat, long: lng };
        return next;
      });
      setRoutes([]);
      setRouteError(null);
      setPickStopIndex(null);
      return;
    }

    if (pickMode === "blockage") {
      setBlockagePoint({ lat, long: lng });
      setPickMode(null);
      return;
    }

    const nextStopIndex = stops.findIndex((stop) => !stop);
    if (nextStopIndex !== -1) {
      setStops((prev) => {
        const next = [...prev];
        next[nextStopIndex] = { lat, long: lng };
        return next;
      });
      setRoutes([]);
      setRouteError(null);
    }
  }

  function onSetPickMode(next: PickMode) {
    setPickMode(next);
    if (next) setPickStopIndex(null);
  }

  function onPickStop(index: number) {
    if (pickStopIndex === index) {
      setPickStopIndex(null);
      return;
    }

    setPickStopIndex(index);
    setPickMode(null);
    setStops((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setRoutes([]);
    setRouteError(null);
  }

  function onAddStop() {
    setStops((prev) => [...prev, null]);
    setRoutes([]);
    setRouteError(null);
  }

  function onDeleteStop(index: number) {
    setStops((prev) => {
      if (prev.length <= 2) {
        const next = [...prev];
        next[index] = null;
        return next;
      }

      return prev.filter((_, i) => i !== index);
    });
    setRoutes([]);
    setRouteError(null);
    setPickStopIndex((prev) => {
      if (prev == null) return prev;
      if (prev === index) return null;
      return prev > index ? prev - 1 : prev;
    });
  }

  function onClearStops() {
    setStops([null, null]);
    setRoutes([]);
    setRouteError(null);
    setPickStopIndex(null);
  }

  async function onGetRoute() {
    const allStopsSet = stops.every(Boolean);
    if (!allStopsSet) return;
    if (ready !== "Ready") return;
    if (blockageError) return;

    setRouting(true);
    setError(null);
    setRouteError(null);
    setRoutes([]);
    try {
      // Ensure preset is applied (in case user clicked quickly)
      const activeAxisKey = normalizeAxisTypes(activeAxisTypes).join("|");
      if (activeAxisKey !== presetAxisTypes.join("|")) {
        setApplyingPreset(true);
        const v = await changeValidRoadTypes(presetAxisTypes);
        setActiveAxisTypes(normalizeAxisTypes(v));
        setApplyingPreset(false);
      }

      for (let i = 0; i < stops.length - 1; i += 1) {
        const startPt = stops[i];
        const endPt = stops[i + 1];
        if (!startPt || !endPt) continue;

        const geo = await getRoute({
          startPt,
          endPt,
        });
        if (!isValidGeoJson(geo)) {
          setRouteError(`Route segment ${stopLabel(i)} → ${stopLabel(i + 1)} is invalid.`);
          break;
        }
        if (!hasRouteGeometry(geo)) {
          setRouteError("Route not found.");
          break;
        }

        setRoutes((prev) => [...prev, geo]);
      }
    } catch (e: any) {
      setError(e?.message ?? "Routing failed.");
    } finally {
      setRouting(false);
    }
  }

  function onSwap() {
    setStops((prev) => {
      if (prev.length !== 2) return prev;
      return [prev[1], prev[0]];
    });
    setRoutes([]);
    setRouteError(null);
  }

  async function onAddBlockage() {
    if (!blockagePoint) return;
    if (ready !== "Ready") return;
    if (blockageName.trim().length === 0) return;

    setError(null);
    setAddingBlockage(true);
    try {
      const expectedName = blockageName.trim();
      await addBlockage({
        point: { lat: blockagePoint.lat, long: blockagePoint.long },
        radius: blockageRadius,
        name: expectedName,
        description: blockageDesc.trim(),
      });

      // refresh list + overlay
      const updated = await refreshBlockagesUntilUpdated(expectedName);
      if (!updated) {
        setError("Blockage added, but list did not update yet. Please try again.");
      }

      // reset
      setBlockagePoint(null);
      setBlockageName("");
      setBlockageDesc("");
      setBlockageRadius(200);
    } catch (e: any) {
      setError(e?.message ?? "Failed to add blockage.");
    } finally {
      setAddingBlockage(false);
    }
  }

  async function onDeleteBlockage(name: string) {
    if (ready !== "Ready") return;

    setError(null);
    setDeletingBlockageName(name);
    try {
      await deleteBlockage(name);
      await refreshBlockages();
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete blockage.");
    } finally {
      setDeletingBlockageName(null);
    }
  }

  return (
    <div className="layout">
      <SidePanel
        ready={ready}
        mode={mode}
        onModeChange={(m) => setMode(m)}
        stops={stops}
        pickStopIndex={pickStopIndex}
        onPickStop={onPickStop}
        onAddStop={onAddStop}
        onDeleteStop={onDeleteStop}
        onClearStops={onClearStops}
        onSwap={onSwap}
        pickMode={pickMode}
        setPickMode={onSetPickMode}
        applyingPreset={applyingPreset}
        routing={routing}
        onGetRoute={onGetRoute}
        routeBlocked={!!blockageError}
        routeBlockedReason={blockageError}
        routeError={routeError}
        showBlockages={showBlockages}
        onToggleBlockages={() => setShowBlockages((s) => !s)}
        blockagePoint={blockagePoint}
        blockageName={blockageName}
        blockageDesc={blockageDesc}
        blockageRadius={blockageRadius}
        addingBlockage={addingBlockage}
        setBlockageName={setBlockageName}
        setBlockageDesc={setBlockageDesc}
        setBlockageRadius={setBlockageRadius}
        clearBlockagePoint={() => setBlockagePoint(null)}
        onAddBlockage={onAddBlockage}
        blockageNames={blockageNames}
        deletingBlockageName={deletingBlockageName}
        onDeleteBlockage={onDeleteBlockage}
        error={panelError}
      />

      <main className="main">
        <MapView
          stops={stops}
          routes={routes}
          blockages={blockages}
          showBlockages={showBlockages}
          blockagePoint={blockagePoint}
          pickMode={pickMode ? "blockage" : pickStopIndex != null ? `stop ${stopLabel(pickStopIndex)}` : null}
          onPick={onPick}
        />
      </main>
    </div>
  );
}
