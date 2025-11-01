# 📊 Stats Reset Issue in Preview Build - Explanation & Fix

## 🔴 Problem Identified

When you logged into the **preview build**, your stats (steps, calories, graphs) were reset/empty because:

### **Root Cause: Dual Storage System**

Your app uses **TWO separate storage systems** for stats:

1. **AsyncStorage (Local Device)**
   - Stores: Today's pedometer data, hourly/daily calorie graphs
   - Scope: Device-specific, app-installation-specific
   - Key: `"runiverse:today-metrics"`
   - **Persists:** Only within same app installation

2. **Backend Database (MongoDB)**
   - Stores: Cumulative stats, lifetime steps/distance
   - Scope: User account (across all devices)
   - API: `/api/users/me`
   - **Persists:** Forever, across devices

### **What Happened:**

```
Development Build          →  Preview Build
└─ AsyncStorage A              └─ AsyncStorage B (empty!)
   └─ 5000 steps today             └─ 0 steps (fresh install)
   └─ Calorie graphs               └─ No graphs

Backend Database (shared)
└─ lifetimeSteps: 50,000
└─ lifetimeDistance: 40 km
└─ territories: 3
```

### **Why Stats Appeared Reset:**

1. ✅ **Backend data exists** (lifetime steps, distance, territories)
2. ❌ **Local AsyncStorage empty** in preview build
3. ❌ **Today's pedometer** starts from 0
4. ❌ **Calorie graphs** have no data

---

## 📊 What Stats Are Affected

### ❌ **Reset in Preview Build:**
- Today's steps (pedometer)
- Today's distance
- Calorie graphs (hourly/daily)
- Route history (if stored locally)

### ✅ **Preserved in Backend:**
- Lifetime steps
- Lifetime distance
- Territories claimed
- User profile data
- Email, username, city

---

## ✅ Solutions

### **Option 1: Continue Using Preview Build (Recommended)**

The preview build will start tracking fresh data now. This is **NORMAL** behavior:

**What to expect:**
- ✅ Old data on development build (still there)
- ✅ Fresh tracking on preview build (starts from 0)
- ✅ Backend lifetime stats still correct
- ✅ New steps will accumulate normally

**Testing:**
1. Walk around with preview build
2. Check if steps increase
3. Check if graphs populate
4. Check if territories work

This is **expected** - each app installation has independent local storage.

---

### **Option 2: Sync Backend Stats to Local (Enhancement)**

I can add a feature to **sync backend stats** to local storage on first login. This would:
- Download lifetime stats from backend
- Populate local graphs with historical data
- Make preview build show your cumulative data

**Implementation:**
- Fetch `/api/users/me` on app load
- Initialize local storage with backend values
- Continue tracking from there

**Trade-off:**
- More complex
- May not have hourly/daily breakdown
- Backend doesn't store detailed calorie graphs

---

### **Option 3: Backend Calorie History (Long-term)**

Store calorie graph data in backend:
- Create new endpoint: `/api/users/me/calorie-history`
- Store daily/hourly breakdowns in DB
- Sync across devices

**Trade-off:**
- Requires backend changes
- More storage needed
- Better cross-device experience

---

## 🎯 Recommended Approach

### **For Testing (Now):**

**Use Preview Build as-is:**
1. ✅ It's a fresh installation (expected)
2. ✅ Start tracking new data
3. ✅ Lifetime stats still preserved in backend
4. ✅ Test walking/territories (main feature)

**Why this is OK:**
- Your main goal: Test territories and walking
- Those features work with fresh data
- Lifetime stats are safe in backend
- Today's stats will accumulate as you walk

---

### **For Production (Later):**

**Add Backend Sync:**
1. Store calorie history in backend
2. Sync on app install/login
3. Consistent experience across devices

---

## 🔍 Verify Backend Data

Let me check if your backend data is intact:

### **Check Profile Data:**

The profile screen should still show:
- ✅ Lifetime Steps
- ✅ Lifetime Distance  
- ✅ Territories

These come from backend (`/api/users/me`).

### **Check Home Screen:**

The home screen shows:
- ❌ Today's Steps (local pedometer - will be 0)
- ❌ Calorie graphs (local AsyncStorage - empty)

This is expected!

---

## 🧪 Quick Test

### **Test in Preview Build:**

1. **Walk 100 steps** (or shake phone if using simulator)
2. **Check home screen** - steps should increase
3. **Close and reopen app** - steps should persist
4. **Go to profile** - lifetime stats should show backend data

If this works, your app is functioning correctly!

---

## 💡 Understanding the Behavior

### **This is NORMAL for Mobile Apps:**

```
WhatsApp Example:
├─ Phone A: Chat history in local storage
├─ Phone B: Fresh install, no chat history
└─ Backend: Messages exist, but not synced to Phone B
```

Same with your app:
```
Development Build:
├─ AsyncStorage: Today's steps = 5000
└─ Backend: Lifetime steps = 50,000

Preview Build (fresh install):
├─ AsyncStorage: Today's steps = 0 (fresh!)
└─ Backend: Lifetime steps = 50,000 (same!)
```

---

## 🚀 Quick Fix (Add Logging)

I've added logging to help you debug:

### **Console Logs to Watch:**

```
📊 No local snapshot found, will use backend data
📊 Local snapshot is from different day, clearing
📊 Hydrating from local snapshot: 5000 steps
⚠️ hydrate step snapshot failed: [error]
```

### **Profile Load Logs:**

```
📥 /api/users/me response: {...}
✅ mapped profile: {...}
```

These will help you see:
- ✅ If backend data is loading
- ✅ If local storage is working
- ✅ Where data comes from

---

## 📝 Summary

### **What's Happening:**
- ✅ Backend stats are safe
- ❌ Local stats (today's) are fresh in preview build
- ✅ This is NORMAL behavior
- ✅ Stats will accumulate as you use preview build

### **What You Should Do:**
1. ✅ Use preview build for walking tests
2. ✅ Ignore empty today's stats (expected)
3. ✅ Verify lifetime stats in profile (should have data)
4. ✅ Start fresh tracking in preview build

### **Long-term Solution:**
- Add backend sync for calorie graphs
- Store historical data in database
- Sync across devices/installations

---

## 🎯 Action Items

### **Immediate (Testing):**
1. Continue using preview build
2. Walk and test territory features
3. Verify stats accumulate
4. Check console logs

### **Future (Enhancement):**
1. Store calorie history in backend
2. Sync on app login
3. Cross-device consistency

---

**Bottom Line:** Your app is working correctly! The "reset" is because preview build is a fresh installation with empty local storage. Your backend data is safe. Just start using the preview build and stats will accumulate normally.

**Last Updated:** November 1, 2025  
**Status:** Expected Behavior  
**Action Required:** None (or add backend sync feature)
