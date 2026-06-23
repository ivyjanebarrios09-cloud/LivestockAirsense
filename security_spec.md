# Security Specification for Livestock AirSense

## Data Invariants
1. **User Ownership**: Every `Location` and `Device` must be associated with a `userId` that matches the authenticated user.
2. **Access Control**: A user can only read, write, or delete documents where `userId == request.auth.uid`.
3. **Profile Integrity**: Users can only modify their own profile in the `users` collection.
4. **Data Validation**: All incoming data must match the defined schema (types, sizes, required fields).
5. **Temporal Integrity**: `createdAt` and `updatedAt` fields must use server timestamps. `createdAt` is immutable.

## The Dirty Dozen Payloads (Targeting PERMISSION_DENIED)

1. **Identity Spoofing**: Attempt to create a location with a different `userId`.
   ```json
   { "id": "loc1", "name": "Barn 1", "userId": "attacker_uid" }
   ```
2. **Privilege Escalation**: Attempt to set an `isAdmin` flag in the user profile.
   ```json
   { "uid": "user123", "isAdmin": true }
   ```
3. **Resource Poisoning**: Attempt to send a 1MB string as a device name.
   ```json
   { "id": "dev1", "name": "A".repeat(1024 * 1024), "userId": "user123" }
   ```
4. **Orphaned Write**: Attempt to create a device for a non-existent location.
   ```json
   { "id": "dev1", "locationId": "non_existent_loc", "userId": "user123" }
   ```
5. **Cross-User Leak**: Attempt to read a location document belonging to another user.
   `get /locations/other_user_loc_id`
6. **Immutable Field Tampering**: Attempt to change the `createdAt` timestamp on an existing document.
   ```json
   { "createdAt": 0 }
   ```
7. **Future/Past Timestamp Injection**: Attempt to set an `updatedAt` field to a time other than `request.time`.
   ```json
   { "updatedAt": 1000000000 }
   ```
8. **Schema Bypass**: Attempt to create a sensor reading missing required fields like `temperature`.
   ```json
   { "timestamp": 123456789, "humidity": 50 }
   ```
9. **Status Shortcutting**: Attempt to update an alert's `isRead` status without owning the associated location.
10. **Shadow Field Injection**: Attempt to add an unrequested `debugMode: true` field to a location.
11. **Bulk Extraction Attempt**: Attempt to list all documents in `users` collection.
12. **Unauthorized Deletion**: Attempt to delete a device owned by another user.

## Test Runner (firestore.rules.test.ts)
*(To be implemented using the Firebase Rules Emulator)*
