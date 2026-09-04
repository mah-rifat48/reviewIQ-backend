# Frontend API Integration Guide

This document outlines the recent API updates for the frontend development team. It covers the new Plan Settings endpoints (Starter & Professional) and the updates to the Support Ticket system.

> [!NOTE]
> All endpoints assume the base API prefix (e.g., `/api/v1`). Please prepend your base URL to the routes listed below.

---

## 1. Plan Settings API

Two separate tables have been created to manage the default settings for the **Starter** and **Professional** plans. The following endpoints allow you to view and update these settings.

> [!IMPORTANT]
> These endpoints are protected and require a valid JWT token. The `PATCH` endpoints require the user to have an `ADMIN` or `SUPER_ADMIN` role.

### A. Starter Plan Settings

**Fetch Starter Plan Settings**
- **Method:** `GET`
- **Route:** `/plan-settings/starter`
- **Response:**
  ```json
  {
    "id": "uuid",
    "review": 100,
    "location": 10,
    "balance": 0.0,
    "business": 1,
    "reportPlan": [],
    "competitor": false,
    "createdAt": "2026-06-20T...",
    "updatedAt": "2026-06-20T..."
  }
  ```

**Update Starter Plan Settings**
- **Method:** `PATCH`
- **Route:** `/plan-settings/starter`
- **Body:** (All fields are optional)
  ```json
  {
    "review": 150,
    "location": 20,
    "balance": 0.0,
    "business": 1,
    "reportPlan": ["Monthly"],
    "competitor": false
  }
  ```

### B. Professional Plan Settings

**Fetch Professional Plan Settings**
- **Method:** `GET`
- **Route:** `/plan-settings/professional`
- **Response:**
  ```json
  {
    "id": "uuid",
    "review": 1000,
    "location": 100,
    "balance": 100.0,
    "business": 1,
    "reportPlan": ["Monthly", "Weekly"],
    "competitor": false,
    "createdAt": "2026-06-20T...",
    "updatedAt": "2026-06-20T..."
  }
  ```

**Update Professional Plan Settings**
- **Method:** `PATCH`
- **Route:** `/plan-settings/professional`
- **Body:** (All fields are optional)
  ```json
  {
    "review": 2000,
    "location": 150
  }
  ```

---

## 2. Support Ticket API Updates

The Support Ticket system has been updated to support resolution feedback, automated notifications, and a dedicated view for resolved tickets.

### A. Updating a Ticket (Resolving with Feedback)

When an admin resolves a ticket, they can now provide feedback. When the status is changed to `RESOLVED`, the backend automatically generates an `INFORMATION` notification for the user(s) attached to the ticket.

- **Method:** `PATCH`
- **Route:** `/support-ticket/:id`
- **Body:**
  ```json
  {
    "status": "RESOLVED",
    "feedback": "We have fixed the billing issue. Thank you for your patience."
  }
  ```
> [!TIP]
> The `feedback` string is entirely optional. However, if provided during a status change to `RESOLVED`, it will be included in the automated notification sent to the user.

### B. Fetching Resolved Tickets

A new endpoint has been added so users can easily view their past, resolved tickets without needing to filter through all tickets on the frontend.

- **Method:** `GET`
- **Route:** `/support-ticket/resolved`
- **Description:** Returns a list of support tickets where the status is exactly `RESOLVED` for the currently authenticated user.
- **Response:**
  ```json
  [
    {
      "supportTicketId": "uuid",
      "status": "RESOLVED",
      "priority": "HIGH",
      "category": "BILLING",
      "subject": "Overcharged this month",
      "description": "...",
      "property": "...",
      "feedback": "We have fixed the billing issue. Thank you for your patience.",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
  ```

### C. Receiving the Resolution Notification
When a ticket is updated to `RESOLVED`, the system creates a `Notification` record in the database. The frontend can retrieve this by polling the existing notification endpoints or listening to real-time events (if implemented).
- **Notification Title:** "Support Ticket Resolved"
- **Notification Description:** "Your support ticket \"{subject}\" has been resolved. Feedback: {feedback}"
- **Notification Status:** `INFORMATION`
