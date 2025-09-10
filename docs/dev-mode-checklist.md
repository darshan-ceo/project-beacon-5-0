# Dev Mode Verification Checklist

## Quick Verification Steps

### 1. Dev Mode Active
- [ ] "DEV MODE" badge visible in header (red/pulsing)
- [ ] Environment shows: API: MISSING or Mock: ON or QA: ON
- [ ] No external network calls being made (check Network tab in DevTools)

### 2. Mock Data Working
- [ ] Cases list loads with sample GST cases (12 items)
- [ ] Tasks show with various due dates and priorities (20 items)
- [ ] Documents display properly (15 items)
- [ ] Employee roles include complete hierarchy
- [ ] Courts and judges data populated

### 3. Stage Simulator (DevTools)
- [ ] Can select any case from dropdown
- [ ] GST stages available (Intake & KYC through Closed)
- [ ] Stage change simulation works
- [ ] Results show transition details
- [ ] Case stage actually updates in app

### 4. Network Isolation
- [ ] All API calls intercepted and blocked
- [ ] Toast warnings shown for blocked external calls
- [ ] Network tab in DevTools shows 0 external calls
- [ ] Everything works offline

### 5. Feature Flags
- [ ] GST integration shows as enabled/disabled correctly
- [ ] Task automation flags visible
- [ ] QA mode controls working
- [ ] All flags reflect environment settings

### 6. Data Persistence
- [ ] Changes survive browser refresh
- [ ] IndexedDB storing data locally
- [ ] localStorage migration working if needed
- [ ] No data loss during dev work

## URL Override Testing
Test these URL parameters work:
- `?mock=on` - Forces mock mode
- `?qa=on` - Enables QA mode  
- `?gst=off` - Disables GST features
- `?api=https://dev-api.example.com` - Sets API endpoint

## Sample Test Flows

### Test 1: Stage Transition
1. Go to DevTools → Stage Simulator
2. Select case "GST-2025-001"  
3. Change stage to "ASMT-10 Reply Drafting"
4. Verify stage updates in Cases view
5. Check for any task suggestions/automation

### Test 2: Task Management
1. Navigate to Tasks page
2. Create new task
3. Verify it appears in board/list
4. Change status via drag/drop
5. Confirm persistence after refresh

### Test 3: Document Generation
1. Go to AI Assistant in any case
2. Generate a draft document
3. Save to DMS
4. Verify it appears in Documents immediately
5. Download mock PDF works

## Common Issues

**"DEV MODE" badge not showing**
- Check environment variables in DevTools → Feature Flags
- Verify envConfig.ts picking up settings correctly

**External calls getting through**
- Check networkInterceptor.ts is initialized
- Look for bypassed domains in allowlist
- Verify fetch override is working

**Mock data not loading**
- Check MockDataProvider.ts initialization
- Verify JSON files in /src/mocks/ exist
- Look for parsing errors in console

**Stage simulator not working**
- Ensure GST_STAGES imported correctly
- Check useAppState context is available
- Verify updateCase function working

## Debug Commands (Browser Console)
```javascript
// Check network interceptor status
window.networkInterceptor.getCallStats()

// View blocked calls
window.networkInterceptor.getBlockedCalls()

// Check environment config
console.log(window.envConfig || 'envConfig not available')

// View app state
console.log('App State:', window.appState || 'not available')
```