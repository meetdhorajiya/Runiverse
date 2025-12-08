# Runiverse Backend Architecture & Schema

This document outlines the database schema, backend architecture, and aggregation pipelines for the Runiverse application.

## 1. Database Schema (ER Diagram)

This diagram represents the Mongoose schemas and their relationships.

```mermaid
erDiagram
    %% User & Core Relationships
    User ||--o{ Route : "creates"
    User ||--o{ Territory : "owns"
    User ||--o{ Notification : "receives"
    User ||--o{ Task : "assigned"
    User }|--|{ Badge : "earns"
    User }|--|{ Group : "member of"
    User }|--|{ Challenge : "participates in"

    User {
        ObjectId _id
        String username
        String email
        String password
        Number steps
        Number distance
        Number lifetimeSteps
        Number lifetimeDistance
        Date dailyResetAt
        Number territories "Count"
        Number streak
        Number multiplier
        String city
        Object location "GeoJSON Point"
        String avatarUrl
        String avatarPublicId
        String avatarProvider
    }

    Route {
        ObjectId _id
        ObjectId user FK
        Array rawPoints "Point Schema"
        Array processedPoints "Point Schema"
        String encodedPolyline
        Date startedAt
        Date endedAt
        Number distanceMeters
        Number durationSeconds
    }

    Territory {
        ObjectId _id
        ObjectId owner FK
        String name
        Object geometry "GeoJSON Polygon"
        String encodedPolyline
        Array processedPoints
        Array rawPoints
        Number area
        Number perimeter
        Date claimedOn
        Object deviceInfo
    }

    Challenge {
        ObjectId _id
        String title
        String description
        Number goal
        String type "steps|distance"
        Boolean isDaily
        Boolean isWeekly
        Date startDate
        Date endDate
        Array participants FK
        Array progress "Embedded Object"
    }

    Badge {
        ObjectId _id
        String name
        String description
        String iconUrl
    }

    Group {
        ObjectId _id
        String name
        String color
        Array members FK
    }

    Notification {
        ObjectId _id
        ObjectId user FK
        String message
        Boolean read
    }

    Task {
        ObjectId _id
        ObjectId userId FK
        String description
        String difficulty
        String type
        Number target
        Boolean completed
        Date expiresAt
        Boolean generatedByAI
    }
```

## 2. Backend Architecture & Connections

This diagram shows how Controllers interact with Services and Models.

```mermaid
graph TD
    subgraph Controllers
        AC[Auth Controller]
        AVC[Avatar Controller]
        CC[Challenge Controller]
        LC[Leaderboard Controller]
        RC[Route Controller]
        TC[Task Controller]
        TeC[Territory Controller]
        UC[User Controller]
    end

    subgraph Services
        CS[Cloudinary Service]
        IS[Image Service]
    end

    subgraph Models
        M_User[(User)]
        M_Route[(Route)]
        M_Territory[(Territory)]
        M_Challenge[(Challenge)]
        M_Badge[(Badge)]
        M_Group[(Group)]
        M_Notif[(Notification)]
        M_Task[(Task)]
    end

    %% Connections
    AC --> M_User
    
    AVC --> CS
    AVC --> M_User
    
    CC --> M_Challenge
    
    LC --> M_User
    LC --> M_Territory
    
    RC --> M_Route
    
    TC --> M_Task
    
    TeC --> M_Territory
    
    UC --> M_User
    
    %% Service Dependencies
    CS --> IS
```

## 3. MongoDB Aggregation Pipelines

This diagram details the complex aggregation logic found in `leaderboardController.js`.

```mermaid
flowchart TD
    subgraph Leaderboard_Logic [Leaderboard & Stats Aggregation]
        start([Request: getCityLeaderboard])
        
        subgraph Step1_UserQuery [1. Filter Users by City]
            q1[User.find]
            q1_filter[Filter: { city: regex }]
            q1_proj[Select: username, avatar, stats]
            q1_limit[Limit: 25]
            
            q1 --> q1_filter --> q1_proj --> q1_limit
        end

        subgraph Step2_TerritoryAgg [2. Aggregate Territory Stats]
            agg_start[Territory.aggregate]
            
            stage1[Stage 1: $match]
            stage1_desc[Match territories where owner is in the User list]
            
            stage2[Stage 2: $group]
            stage2_desc["_id: '$owner'<br/>totalArea: { $sum: '$metrics.area' }<br/>territoryCount: { $sum: 1 }"]
            
            agg_start --> stage1 --> stage1_desc --> stage2 --> stage2_desc
        end

        start --> Step1_UserQuery
        Step1_UserQuery -->|List of Users| Step2_TerritoryAgg
        Step2_TerritoryAgg -->|Stats Map| merge[Merge User Data + Territory Stats]
        merge --> finish([Return JSON Response])
    end
```
