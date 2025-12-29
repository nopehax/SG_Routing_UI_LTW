export type Point = {
    long: number;
    lat: number;
    description?: string;
};

export type TravelMode = "car" | "bicycle" | "walk";

export type ReadyState = "Ready" | "Wait" | "Unknown";

export type RouteRequestBody = {
    startPt: Point;
    endPt: Point;
};

export type GeoJson = any; // keep flexible; backend returns GeoJSON objects
