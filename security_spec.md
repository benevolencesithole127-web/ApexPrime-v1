# ApexPrime Security Specification

## Data Invariants
1. **User Accounts**: A user account must be owned by the authenticated UID. Subscription tier must be one of 'basic', 'standard', 'premium'.
2. **Viewer Profiles**: Profiles are child resources of a User Account. Only the account owner can read/write profiles.
3. **Watchlist/History**: These are personal sub-collections of a profile. Access is restricted to the Account Owner.
4. **Watch Parties**: 
    - Anyone signed in can read (list) active parties.
    - Only the host can update the state (playing/paused/finished) or delete the party.
    - Any participant can update the `participantCount`.
5. **Chat Messages**: Messages belong to a party. Can only be created if the party exists.
6. **Community Chat**: Global channel. Anyone signed in can read/write. Writes must be validated.

## The "Dirty Dozen" Payloads (Targeting Rejection)
1. **Identity Spoofing**: Attempting to create a `/users/attacker-uid` document with `uid: "victim-uid"`.
2. **Profile Hijacking**: Non-owner trying to list `/users/victim-uid/profiles`.
3. **Admin Escalation**: User trying to set `subscriptionTier: "premium"` without proper logic (handled by pricing modal, but rules must guard).
4. **Party Poisoning**: Creating a party with a very long `movieId` or invalid characters.
5. **Chat Spam**: Message exceeding 500 characters.
6. **Watchlist Leak**: User A trying to get User B's watchlist.
7. **Phantom Message**: Creating a chat message for a party ID that doesn't exist.
8. **State Shortcut**: Changing a party status from `playing` directly to `finished` by a non-host.
9. **Shadow Field**: Adding `isVerified: true` to a profile document.
10. **History Influx**: Writing millions of tiny history items to exhaust resources (enforced by size limits).
11. **Negative Count**: Updating `participantCount` to a negative number.
12. **Future Time**: Setting `createdAt` to a future timestamp (guarded by `request.time`).

## Security Assertions
- `isValidUser(data)`: Validates account fields.
- `isValidProfile(data)`: Validates profile fields including name length.
- `isValidParty(data)`: Validates status and relations.
- `isValidMessage(data)`: Validates text length and userId.
- `isOwner(userId)`: Mandatory for all personal resources.
