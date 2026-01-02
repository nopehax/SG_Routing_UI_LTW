import type { TravelMode } from "./types";

export const TRAVEL_MODE_LABEL: Record<TravelMode, string> = {
    car: "Car",
    bicycle: "Bicycle",
    walk: "Walk",
};

// All Axis Types available
// [
//   "bridleway",
//   "construction",
//   "corridor",
//   "crossing",
//   "cycleway",
//   "elevator",
//   "footway",
//   "living_street",
//   "motorway",
//   "motorway_link",
//   "path",
//   "pedestrian",
//   "primary",
//   "primary_link",
//   "proposed",
//   "raceway",
//   "residential",
//   "road",
//   "secondary",
//   "secondary_link",
//   "service",
//   "steps",
//   "tertiary",
//   "tertiary_link",
//   "track",
//   "trunk",
//   "trunk_link",
//   "unclassified"
// ]

// Based on your validAxisTypes list.
// Goal: ensure connectivity (include residential/unclassified/road/service) while restricting where sensible.
export const MODE_TO_AXIS_TYPES: Record<TravelMode, string[]> = {
    car: [
        "motorway",
        "motorway_link",
        "trunk",
        "trunk_link",
        "primary",
        "primary_link",
        "secondary",
        "secondary_link",
        "tertiary",
        "tertiary_link",
        "unclassified",
        "residential",
        "living_street",
        "road",
    ],

    bicycle: [
        "cycleway",
        "path",
        "footway",
        "pedestrian",
        "crossing",
        "track",
        "bridleway",
        "tertiary",
        "tertiary_link",
        "secondary",
        "secondary_link",
        "primary",
        "primary_link",
        "unclassified",
        "residential",
        "living_street",
        "road",
        "service",
    ],

    walk: [
        "footway",
        "path",
        "pedestrian",
        "steps",
        "crossing",
        "corridor",
        "living_street",
        "residential",
        "service",
        "track",
        "road",
        "elevator",
    ],
};
