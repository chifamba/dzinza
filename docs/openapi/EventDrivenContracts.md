# Event-Driven API Contracts

This document defines key domain events, their payloads, topics, and subscription endpoints for the genealogy platform.

---

## 1. Event Topics & Payloads

### user.banned

**Topic:** user.banned  
**Payload:**

```json
{
  "user_id": "uuid",
  "banned_by": "uuid",
  "reason": "string",
  "banned_at": "datetime"
}
```

### media.uploaded

**Topic:** media.uploaded  
**Payload:**

```json
{
  "media_id": "uuid",
  "user_id": "uuid",
  "person_id": "uuid|null",
  "filename": "string",
  "url": "string",
  "uploaded_at": "datetime",
  "type": "IMAGE|DOCUMENT|VIDEO|AUDIO"
}
```

### relationship.verified

**Topic:** relationship.verified  
**Payload:**

```json
{
  "relationship_id": "uuid",
  "verified_by": "uuid",
  "verified_at": "datetime",
  "status": "CONFIRMED|REJECTED"
}
```

### audit.log.created

**Topic:** audit.log.created  
**Payload:**

```json
{
  "log_id": "uuid",
  "entity_type": "string",
  "entity_id": "uuid",
  "user_id": "uuid",
  "action": "CREATE|UPDATE|DELETE",
  "timestamp": "datetime",
  "details": {}
}
```

### analytics.updated

**Topic:** analytics.updated  
**Payload:**

```json
{
  "date": "date",
  "active_users": "int",
  "new_persons": "int",
  "new_relationships": "int",
  "verification_events": "int"
}
```

---

## 2. Subscription Endpoints

- **WebSocket:** `wss://api.dzinza.org/events`
- **REST Polling:** `GET /events?topic={topic}&since={timestamp}`

---

## 3. Data Model Expansions

- **AuditLogEntry:** See AuditHistoryService.yml
- **MediaMetadata:** See MediaStorageService.yml
- **Localization:** See LocalizationService.yml
- **Analytics:** See AnalyticsService.yml
- **BanAction, AbuseReport:** See AdminModerationService.yml

---

## 4. Integration Notes

- All events are published in JSON format.
- Services may subscribe to topics via WebSocket or REST polling.
- Event payloads are versioned for backward compatibility.
