# Territory & Route Tracking Constraints

## 📍 Location Tracking Parameters

### GPS Accuracy & Filtering
- **MIN_ACCURACY_METERS**: `25 meters`
  - Location updates with accuracy worse than 25m are rejected
  - Ensures high-quality GPS data for territory mapping

### Movement Detection
- **MIN_DISTANCE_DELTA_METERS**: `3 meters`
  - Minimum distance between consecutive points
  - Prevents GPS jitter from creating noisy paths

- **MIN_SPEED_MS**: `0.4 m/s` (≈ 1.4 km/h)
  - Minimum speed to register movement
  - Filters out stationary GPS drift

- **MIN_TIME_BETWEEN_UPDATES_MS**: `750 milliseconds`
  - Minimum time between location updates
  - Prevents too frequent updates that drain battery

### Coordinate Smoothing
- **SMOOTHING_ALPHA**: `0.25`
  - Exponential moving average factor
  - Smooths GPS coordinates to reduce jitter
  - Formula: `newCoord = prevCoord + alpha * (rawCoord - prevCoord)`

---

## 🔄 Loop Detection Constraints

### Minimum Requirements for Valid Loop
1. **MIN_TIME**: `30,000 milliseconds` (30 seconds)
   - Prevents accidental quick loops
   - Ensures intentional territory claiming

2. **MIN_PATH_LENGTH**: `50 meters`
   - Minimum perimeter length of the path
   - Prevents tiny/invalid loops

3. **MAX_CLOSE_DISTANCE**: `20 meters`
   - Maximum distance between start and end points to consider loop closed
   - Accounts for GPS accuracy tolerance

### Territory Area Constraint
- **MIN_AREA**: `100 square meters`
  - Minimum area for a valid territory
  - Loops smaller than this are rejected even if they close

### Loop Closure Logic
A loop is considered closed when **ALL** of the following are true:
```
✅ Distance from start to end < 20m
✅ Time elapsed > 30 seconds
✅ Total path length > 50 meters
✅ Area > 100 square meters (checked after loop detection)
```

---

## 📏 Route (Non-Loop) Tracking

### Route Persistence
- Routes are saved to `AsyncStorage` under key: `"runiverse:map:last-route"`
- Routes are saved **per day** - old routes from previous days are auto-deleted
- Routes persist across app reloads on the same day

### Route Storage Format
```typescript
{
  date: "2025-11-01",  // ISO date string (YYYY-MM-DD)
  route: [[lon, lat], [lon, lat], ...],  // Array of coordinates
  startedAt: 1730419200000  // Timestamp when route started
}
```

### Route Distance Calculation
- Calculated using Haversine formula
- Accounts for Earth's curvature
- Formula: 
  ```
  a = sin²(Δφ/2) + cos(φ1) × cos(φ2) × sin²(Δλ/2)
  c = 2 × atan2(√a, √(1-a))
  distance = R × c  (R = 6,371,000m)
  ```

---

## 🏆 Territory Submission

### Territory Data Structure
```typescript
{
  name: "Territory 2025-11-01T10:30:00.000Z",
  coordinates: [[lon, lat], ...],  // Closed polygon (first = last)
  area: 1234.56,  // Square meters
  length: 150.23  // Perimeter in meters
}
```

### Backend Storage
- Stored in MongoDB with GeoJSON Polygon format
- Schema:
  ```javascript
  {
    name: String,
    owner: ObjectId (ref: User),
    location: {
      type: "Polygon",
      coordinates: [[[Number]]]  // Array of rings, first ring is outer boundary
    },
    metrics: {
      area: Number,   // m²
      length: Number  // meters
    },
    claimedOn: Date,
    createdAt: Date,
    updatedAt: Date
  }
  ```

### Territory Retrieval
- Authenticated users see **only their own territories**
- Unauthenticated requests see all territories (public view)
- Sorted by creation date (newest first)

---

## 🔄 Optimistic UI Updates

When a loop is closed:
1. ✅ **Optimistic territory** is immediately added to UI with `localId`
2. 📤 **Backend request** is sent to save territory
3. 🔄 On **success**: 
   - Replace optimistic territory with server response
   - Reload all territories to ensure sync
4. ❌ On **failure**:
   - Remove optimistic territory from UI
   - Show error alert to user

---

## ⚡ Calorie Estimation

- **Formula**: `calories ≈ distance_meters × 0.05`
- Rough approximation for walking/running
- Example: 1000m walk ≈ 50 calories

---

## 🐛 Common Issues & Solutions

### Issue: Territory disappears after closing loop
**Causes:**
1. Backend save failed but no error was shown
2. `loadTerritories()` was called before backend save completed
3. User not authenticated (no token sent)

**Solutions:**
- ✅ Added error alerts when save fails
- ✅ Reload territories after successful save
- ✅ Added authentication token to `fetchTerritories()`
- ✅ Added logging to track territory operations

### Issue: Loop not detected
**Possible causes:**
- Loop closed in < 30 seconds
- Path length < 50 meters
- End point > 20m from start
- Area < 100 m²

**Check logs for:**
```
🔄 Loop detected! Area: XXXm², Min required: 100m²
✅ Valid territory formed - Area: XXXm², Length: XXXm
❌ Loop too small (XXXm² < 100m²) - ignoring
```

### Issue: Routes not persisting
**Possible causes:**
- AsyncStorage write failure
- Different date (routes are per-day)
- Route cleared due to loop detection

---

## 📊 Performance Considerations

### Battery Optimization
- Location updates throttled to 750ms minimum
- High accuracy mode only when tracking
- Background location not used (foreground only)

### Memory Management
- Routes cleared when loops are formed
- Only current user's territories loaded
- Old routes auto-deleted daily

### Network Optimization
- Territories fetched once on mount
- Refetched on screen focus
- Optimistic UI prevents unnecessary loading states

---

## 🔐 Authentication

### Token Handling
- Token stored via `authService`
- Sent in `Authorization: Bearer <token>` header
- Required for:
  - ✅ `/api/territories/claim` (POST)
  - ⚠️ `/api/territories` (GET) - optional but recommended

### User Filtering
- Backend filters territories by `owner` field
- If no token: returns all territories
- If token provided: returns only user's territories

---

## 📝 Logging

### Territory Operations
```
📍 Loaded X territories from backend
🔄 Loop detected! Area: XXXm², Min required: 100m²
✅ Valid territory formed - Area: XXXm², Length: XXXm
❌ Loop too small (XXXm² < 100m²) - ignoring
✅ Territory saved successfully
❌ Territory save failed: [error message]
```

### Location Tracking
- No logs by default (too noisy)
- Enable for debugging GPS issues
