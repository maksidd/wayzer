# TravelBuddy REST API Documentation

## Overview

REST API for finding travel companions, with full authentication, trip management, and comments.

## Base URL

```
http://localhost:5000/api
```

## Authentication

API uses JWT tokens for authentication. The token must be sent in the `Authorization: Bearer <token>` header.

### Registration

```http
POST /auth/register
Content-Type: application/json

{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "User created successfully"
}
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Users

### Get Current User Profile

```http
GET /users/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "user-id",
  "name": "User Name",
  "email": "user@example.com",
  "createdAt": "2025-06-20T18:00:00.000Z"
}
```

## Trip Types

### Get All Trip Types

```http
GET /trip-types
```

**Response:**
```json
[
  { "id": "walk", "name": "Walk" },
  { "id": "bike", "name": "Bicycle" },
  { "id": "car", "name": "Car" },
  { "id": "public_transport", "name": "Public Transport" }
]
```

## Trips

### Get Trips List

```http
GET /trips?type=walk&city=Kyiv&page=1&limit=10
```

**Query parameters:**
- `type` (optional) - trip type
- `city` (optional) - city
- `page` (optional) - page number (default: 1)
- `limit` (optional) - items per page (default: 10)

**Response:**
```json
[
  {
    "id": "trip-id",
    "title": "Downtown Walk",
    "description": "Trip description",
    "type": "walk",
    "city": "Kyiv",
    "location": {
      "lat": 50.4501,
      "lng": 30.5234
    },
    "dateTime": "2025-06-25T10:00:00Z",
    "maxParticipants": 5,
    "createdAt": "2025-06-20T18:00:00.000Z",
    "creator": {
      "id": "user-id",
      "name": "Creator Name"
    },
    "participantsCount": 2
  }
]
```

### Get Trip by ID

```http
GET /trips/{id}
```

**Response:** Same as the trip object from the trips list.

### Create Trip

```http
POST /trips
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Downtown Walk",
  "description": "Trip description",
  "type": "walk",
  "city": "Kyiv",
  "location": { "lat": 50.4501, "lng": 30.5234 },
  "dateTime": "2025-06-25T10:00:00Z",
  "maxParticipants": 5
}
```

**Response:** Trip object created.

### Join Trip

```http
POST /trips/{id}/join
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Successfully joined the trip"
}
```

### Leave Trip

```http
DELETE /trips/{id}/leave
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Successfully left the trip"
}
```

## Comments

### Get Trip Comments

```http
GET /trips/{id}/comments
```

**Response:**
```json
[
  {
    "id": "comment-id",
    "text": "Comment text",
    "tripId": "trip-id",
    "userId": "user-id",
    "createdAt": "2025-06-20T18:00:00.000Z",
    "user": {
      "id": "user-id",
      "name": "User Name"
    }
  }
]
```

### Create Comment

```http
POST /trips/{id}/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Comment text"
}
```

**Response:** New comment object.

## Error Codes

- `400 Bad Request` – Validation error
- `401 Unauthorized` – Authentication required
- `404 Not Found` – Resource not found
- `409 Conflict` – Data conflict (e.g., email already exists)
- `500 Internal Server Error` – Server error

## Error Format

```json
{
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is already in use"
    }
  ]
}
```

## Testing

To run tests:

```bash
node test-simple.js
```

All 9 tests should pass:
- User registration
- User login
- Get user profile
- Get trip types
- Create trip
- Get trips list
- Get trip by ID
- Create comment
- Get trip comments