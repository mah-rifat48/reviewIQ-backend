# Socket.io Real-time Notifications Plan

We already have a `NotificationGateway` (Socket.IO) implemented in the backend, but it's not currently being used when resolving a support ticket. We will update the system to push a real-time event to the user when their ticket is resolved.

## Proposed Changes

### 1. Update `SupportTicketModule`
- Import the `NotificationModule` so the `SupportTicketService` can access the existing `NotificationGateway`.

### 2. Update `SupportTicketService`
- Inject the `NotificationGateway`.
- Inside the `update` method, after creating the notification in the database, we will trigger a real-time event:
  ```typescript
  this.notificationGateway.sendNotification(
    user.userId, 
    'newNotification', 
    createdNotification
  );
  ```

### 3. Update Frontend Documentation
- Update `frontend_api_updates.md` to explain how the frontend developer should connect to the Socket.io server.
- Document the `newNotification` event and the data payload they will receive when a ticket is resolved.

## Open Questions

> [!NOTE]
> Are you fine using the event name `newNotification` for the Socket.io event, or do you want a specific name like `ticketResolved`? 

Please approve this plan so I can start!
