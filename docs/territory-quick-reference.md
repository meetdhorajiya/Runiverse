# 📊 Territory & Route Constraints - Quick Reference

## 🔄 LOOP FORMATION CONSTRAINTS

| Constraint | Value | Reason |
|------------|-------|---------|
| **Minimum Time** | 30 seconds | Prevents accidental quick loops |
| **Minimum Perimeter** | 50 meters | Ensures meaningful path length |
| **Maximum Close Distance** | 20 meters | GPS accuracy tolerance for closing |
| **Minimum Area** | 100 m² | Prevents tiny/invalid territories |

### Loop Detection Formula:
```
Loop Closes When:
  ✓ distance(start, end) < 20m
  ✓ elapsed_time > 30s
  ✓ path_length > 50m
  ✓ area > 100m²
```

---

## 📍 LOCATION TRACKING CONSTRAINTS

| Parameter | Value | Purpose |
|-----------|-------|---------|
| **Max GPS Accuracy** | 25 meters | Filter inaccurate locations |
| **Min Distance Delta** | 3 meters | Reduce GPS jitter |
| **Min Speed** | 0.4 m/s (~1.4 km/h) | Ignore stationary drift |
| **Min Time Between Updates** | 750 ms | Battery optimization |
| **Smoothing Alpha** | 0.25 | Coordinate smoothing factor |

---

## 🎯 EXAMPLES

### ✅ VALID Territory
```
Scenario: User walks around a block
- Time: 45 seconds
- Perimeter: 120 meters  
- Close Distance: 12 meters (GPS drift)
- Area: 850 m²
Result: ✅ TERRITORY CREATED
```

### ❌ INVALID Territory - Too Small
```
Scenario: User walks in tight circle
- Time: 35 seconds
- Perimeter: 60 meters
- Close Distance: 8 meters
- Area: 75 m² ❌ (< 100m²)
Result: ❌ LOOP TOO SMALL - IGNORED
```

### ❌ INVALID Territory - Too Fast
```
Scenario: User runs quickly
- Time: 25 seconds ❌ (< 30s)
- Perimeter: 80 meters
- Close Distance: 15 meters
- Area: 350 m²
Result: ❌ LOOP NOT DETECTED (too fast)
```

### ❌ INVALID Territory - Doesn't Close
```
Scenario: User walks but doesn't return to start
- Time: 60 seconds
- Perimeter: 150 meters
- Close Distance: 35 meters ❌ (> 20m)
- Area: N/A
Result: ❌ LOOP NOT CLOSED - REMAINS AS ROUTE
```

---

## 📏 SIZE COMPARISONS

### Minimum Territory (100 m²)
- ≈ 10m × 10m square
- ≈ Small apartment
- ≈ 2 parking spaces

### Example Territory Sizes
- **Small**: 100-500 m² (house/parking lot)
- **Medium**: 500-2000 m² (block/park)
- **Large**: 2000+ m² (multiple blocks)

---

## 🚶 WALKING SPEEDS

| Activity | Speed | Notes |
|----------|-------|-------|
| Slow walk | 0.8 m/s | 2.9 km/h - Above minimum threshold |
| Normal walk | 1.4 m/s | 5.0 km/h - Comfortable pace |
| Fast walk | 2.0 m/s | 7.2 km/h - Brisk pace |
| Jog | 2.5+ m/s | 9+ km/h - Running speed |

**Min Speed Threshold:** 0.4 m/s (1.4 km/h) - filters stationary GPS drift

---

## ⏱️ TIME EXAMPLES

| Distance | Walking Speed | Estimated Time | Valid Loop? |
|----------|---------------|----------------|-------------|
| 30m perimeter | Slow (0.8 m/s) | ~37s | ❌ Too small |
| 50m perimeter | Slow (0.8 m/s) | ~62s | ✅ If area > 100m² |
| 100m perimeter | Normal (1.4 m/s) | ~71s | ✅ Likely valid |
| 200m perimeter | Normal (1.4 m/s) | ~143s | ✅ Definitely valid |

---

## 🗺️ ROUTE (Non-Loop) BEHAVIOR

### Route Persistence
- ✅ Saved to AsyncStorage automatically
- ✅ Persists across app reloads (same day)
- ❌ Cleared when new day starts
- ❌ Cleared when loop is formed

### Route Storage Key
```
AsyncStorage Key: "runiverse:map:last-route"
Format: {
  date: "YYYY-MM-DD",
  route: [[lon, lat], ...],
  startedAt: timestamp
}
```

---

## 🎨 VISUAL INDICATORS

### On Map
| Element | Color | Style |
|---------|-------|-------|
| Active Route | Green (`#00FF00`) | Solid line, 4px width |
| Territory Fill | Red (40% opacity) | Filled polygon |
| Territory Border | Red (`red`) | Solid line, 3px width |
| User Location | Blue | Pulsing dot + heading indicator |

---

## 🔍 DEBUGGING TIPS

### Console Logs to Watch For:

#### ✅ Success Logs
```
📍 Loaded X territories from backend
🔄 Loop detected! Area: XXXm², Min required: 100m²
✅ Valid territory formed - Area: XXXm², Length: XXXm
✅ Territory saved successfully: {...}
```

#### ❌ Error/Warning Logs
```
❌ Loop too small (XXXm² < 100m²) - ignoring
❌ Territory save failed: [error]
⚠️ Failed to reload territories: [error]
```

### Common Issues:
1. **Loop not detecting**: Check time (>30s), distance to start (<20m)
2. **Territory disappears**: Check console for save errors
3. **Route not persisting**: Check date, verify AsyncStorage
4. **No location updates**: Check GPS permissions, accuracy

---

## 📱 TESTING CHECKLIST

### Before Walking:
- ✅ GPS enabled & high accuracy mode
- ✅ Location permissions granted
- ✅ App in foreground
- ✅ User authenticated (logged in)
- ✅ Network connection available

### During Walk:
- ✅ Check green route line is drawing
- ✅ User location dot is updating
- ✅ Console shows location updates (if debugging enabled)

### After Closing Loop:
- ✅ Check for "Loop detected" log
- ✅ Territory should appear with red fill
- ✅ Check for "Territory saved successfully" log
- ✅ Territory count should increment

### After App Reload:
- ✅ Territories should still be visible
- ✅ Check "Loaded X territories" log

---

## 🏆 ACHIEVEMENTS (Ideas for Future)

Based on these constraints, you could implement:
- 🥉 **First Territory**: Close your first loop
- 🥈 **Marathon Mapper**: Territory > 10,000 m²
- 🥇 **Speed Demon**: Close loop in < 60 seconds
- 🏃 **Long Distance**: Route > 5km in one session
- 🎯 **Perfect Loop**: Close within 5m of start point

---

## 📞 QUICK DIAGNOSIS

| Symptom | Likely Cause | Check |
|---------|--------------|-------|
| Loop doesn't close | Too far from start (>20m) | Walk closer to start |
| Loop rejected | Area < 100m² | Walk bigger loop |
| Territory disappears | Backend save failed | Check network/auth |
| Route not saving | Different day | Routes are per-day |
| No location updates | GPS accuracy low | Wait for better signal |
| Territory count wrong | Not reloading properly | Check console logs |

---

## 💡 PRO TIPS

1. **For Consistent Loops**: Walk at steady pace (~1.4 m/s)
2. **For Territory Creation**: Aim for 10m × 10m minimum area
3. **For Reliable GPS**: Walk in open areas, avoid tall buildings
4. **For Debugging**: Check console logs with timestamps
5. **For Testing**: Use simulator/emulator with GPX file

---

**Last Updated**: November 1, 2025  
**Version**: 1.0 (Post-Fix)
