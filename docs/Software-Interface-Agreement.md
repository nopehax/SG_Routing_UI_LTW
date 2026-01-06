# Software Interface Agreement

Base URL: `/api`
Content type: `application/json` unless noted.

## 1) GET /ready
Purpose: Check server readiness status.

Parameters: None.

Response format: Plain text

Response schema: (`"Ready" | "Wait"`), may be wrapped in JSON with a `status` field.

Example response: `"Ready"`

## 2) GET /validAxisTypes
Purpose: Retrieve the list of axis types currently being used by the routing algorithm.

Parameters: None.

Response format: `string[]`, JSON array

Response schema: List of axis types.

Notes: Used to compare against mode presets.

Example response:
```JSON
["primary_link","pedestrian","tertiary","secondary","tertiary_link","path","bridleway","cycleway","track","service","primary","crossing","secondary_link","footway","unclassified","residential","living_street","road"]
```

## 3) GET /allAxisTypes
Purpose: Retrieve the full list of axis types supported by the server.

Parameters: None.

Response format: `string[]`, JSON array.

Response schema/type: list of all axis types.

Notes: Present in the API but not currently used by the client.

Example response:

```JSON
["bridleway","construction","corridor","crossing","cycleway","elevator","footway","living_street","motorway","motorway_link","path","pedestrian","primary","primary_link","proposed","raceway","residential","road","secondary","secondary_link","service","steps","tertiary","tertiary_link","track","trunk","trunk_link","unclassified"]
```

## 4) POST /changeValidRoadTypes
Purpose: Apply a set of axis types for routing.

Body Parameters:
```JSON
[<axisType>, <axisType>, <axisType>, ...]
```

Response format: `string[]`, JSON array.

Response schema/type: List of axis types.

Notes: The returned list is stored as the active axis types.

Example response: (same as payload)

## 5) POST /route
Purpose: Get a route between two points.

Body Parameters:
```JSON
{
    "startPt": { "lat": <number>, "long": <number> },
    "endPt": { "lat": <number>, "long": <number> }
}
```

Response format: GeoJSON.

Response schema: Feature, FeatureCollection, or Geometry.

Notes: If the response contains only points, it is treated as "Route not found."

Example response:
```json
{
    "app_name": "MY_ROUTING (time taken : 125ms)",
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [
                    103.837456,
                    1.351473
                ]
            },
            "properties": {
                "point type": "start"
            }
        },
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [
                    103.837532,
                    1.350198
                ]
            },
            "properties": {
                "point type": "goal"
            }
        },
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [
                    103.837410,
                    1.351420
                ]
            },
            "properties": {
                "point type": "closest start"
            }
        },
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [
                    103.837440,
                    1.350226
                ]
            },
            "properties": {
                "point type": "closest goal"
            }
        },
        {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [
                        103.837410,
                        1.351420
                    ],
                    [
                        103.837379,
                        1.351412
                    ],
                    [
                        103.837227,
                        1.351287
                    ],
                    [
                        103.836929,
                        1.351081
                    ],
                    [
                        103.837151,
                        1.350668
                    ],
                    [
                        103.837265,
                        1.350461
                    ],
                    [
                        103.837440,
                        1.350226
                    ]
                ]
            },
            "properties": {
                "road name": "NULL",
                "road type": "service",
                "distance": 174
            }
        }
    ]
}
```

## 6) GET /blockage
Purpose: Retrieve current blockages.

Parameters: None.

Response format: GeoJSON.

Response schema: FeatureCollection.

Notes: Names are read from `properties.name` when present.

Example response:
```json
{
  "items": "blockages",
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [103.756859, 1.34536]
      },
      "properties": {
        "name": "random name",
        "description": "random desc",
        "distance (meters)": 3050
      }
    }
  ]
}
```

## 7) POST /blockage
Purpose: Add a blockage.

Body Parameters:
```JSON
{
    "point": {"lat": <number>, "long": <number>},
    "radius": <number (metres)>,
    "name": <name>,
    "description": <text>
}
```

Response format: JSON.

Response schema/type: GeoJson FeatureCollection.

Example response:
```json
{
  "items": "blockages",
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [103.756859, 1.34536]
      },
      "properties": {
        "name": "random name",
        "description": "random desc",
        "distance (meters)": 3050
      }
    }
  ]
}
```

## 8) DELETE /blockage/{name}
Purpose: Delete a blockage by name.

Parameters: None.

Response format: JSON.

Response schema/type: GeoJson FeatureCollection.

Example response:
```json
{
    "items": "blockages",
    "type": "FeatureCollection",
    "features": []
}
```

## 9) GET /axisType/{axisType}
Purpose: Fetch the path network for a specific axis type.

Parameters: None.

Response format: GeoJSON.

Response schema: FeatureCollection.

Notes: The client fetches multiple axis types for the selected travel mode when "Show path" is enabled.

Example response:
```json
{
  "axis_type": "elevator",
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [103.779816, 1.286884],
          [103.78022, 1.287122]
        ]
      },
      "properties": {
        "road name": "NULL",
        "road type": "elevator",
        "distance": 52
      }
    }
  ]
}
```
