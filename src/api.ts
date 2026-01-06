import type { GeoJson, ReadyState, RouteRequestBody } from "./types";

const API_BASE =
    (import.meta as any).env?.BASE_API ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...(init?.headers ?? {}),
        },
        ...init,
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`);
    }

    const text = await res.text().catch(() => "");
    if (!text) return undefined as T;

    // Some servers forget to set application/json. Try to parse anyway.
    const trimmed = text.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
            return JSON.parse(trimmed) as T;
        } catch {
            // fall through to return as text
        }
    }

    return trimmed as unknown as T;
}


export async function getReady(): Promise<ReadyState> {
    const raw = await fetch(`${API_BASE}/ready`).then((r) => r.text());

    try {
        const parsed = JSON.parse(raw);
        const v = (parsed?.status ?? parsed?.satus ?? parsed) as string;
        if (typeof v === "string" && v.toLowerCase().includes("ready")) return "Ready";
        if (typeof v === "string" && v.toLowerCase().includes("wait")) return "Wait";
        return "Unknown";
    } catch {
        const v = raw.trim();
        if (v.toLowerCase().includes("ready")) return "Ready";
        if (v.toLowerCase().includes("wait")) return "Wait";
        return "Unknown";
    }
}

export async function getValidAxisTypes(): Promise<string[]> {
    return request<string[]>("/validAxisTypes");
}

export async function changeValidRoadTypes(axisTypes: string[]): Promise<string[]> {
    const base = "https://nyc-bus-routing-k3q4yvzczq-an.a.run.app";
    return request<string[]>(`${base}/changeValidRoadTypes`, {
        method: "POST",
        body: JSON.stringify(axisTypes),
    });
}

export async function getRoute(body: RouteRequestBody): Promise<GeoJson> {
    return request<GeoJson>("/route", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export async function getBlockages(): Promise<GeoJson> {
    return request<GeoJson>("/blockage");
}

export async function addBlockage(payload: {
    point: { long: number; lat: number };
    radius: number;
    name: string;
    description: string;
}): Promise<GeoJson> {
    return request<GeoJson>("/blockage", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function deleteBlockage(name: string): Promise<void> {
    await request<void>(`/blockage/${encodeURIComponent(name)}`, {
        method: "DELETE",
    });
}

export async function getAxisType(axisType: string): Promise<GeoJson> {
    return request<GeoJson>(`/axisType/${encodeURIComponent(axisType)}`);
}
