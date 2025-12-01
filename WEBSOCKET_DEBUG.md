# WebSocket Real-Time Messaging Debug Guide

## Current Status
✅ WebSocket connection is working
✅ Subscription is happening after connection
❌ Messages aren't arriving in real-time

## Debugging Steps

### 1. Check Backend Logs When Sending a Message
When you send a message, you should see:
```
📤 Message created, queued for broadcast: match=xxx, sender=xxx
Broadcasting message to match xxx (founder: xxx, investor: xxx)
Sending message to profile xxx (1 connection(s)): {...}
✅ Message broadcasted via WebSocket for match xxx
```

**If you DON'T see these logs:**
- The broadcast isn't happening
- Check for errors in backend logs

### 2. Check Browser Console When Sending a Message
When a message is sent, you should see:
```
WebSocket received raw message: {"type":"new_message","message":{...}}
WebSocket parsed message: {type: 'new_message', message: {...}}
Handling WebSocket message type: new_message
WebSocket received new message: {...}
Received new message via WebSocket: {...}
Adding new message to state
```

**If you DON'T see these logs:**
- Messages aren't being received via WebSocket
- Check WebSocket connection status
- Check if broadcast is actually happening

### 3. Test with Two Browsers
1. Open browser 1 → Login as User A
2. Open browser 2 → Login as User B  
3. Both should show "Subscribing to messages for match..."
4. Send message from User A
5. Check console logs in BOTH browsers

## Common Issues

### Issue 1: Backend Not Broadcasting
**Symptoms:** No backend logs when sending message
**Fix:** Check if broadcast function is being called

### Issue 2: WebSocket Not Receiving
**Symptoms:** Backend logs show broadcast, but no browser logs
**Fix:** Check WebSocket connection and active_connections

### Issue 3: Messages Received But Not Displayed
**Symptoms:** Browser logs show messages received, but UI doesn't update
**Fix:** Check React state updates and subscription callbacks

## Next Steps
1. Send a message
2. Share backend logs
3. Share browser console logs
4. We'll identify the exact issue from the logs!
