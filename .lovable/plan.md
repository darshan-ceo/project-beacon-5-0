

# Remove Follow-Up System Tutorial Popup

## What's happening
The "New Follow-Up System" tutorial dialog (`FollowUpSystemTutorial`) is mounted at the root level in `App.tsx` (line 136), outside of any authentication check. This causes it to appear on the login page before the user has even signed in.

## Fix
Remove the `FollowUpSystemTutorial` component entirely from the application:

1. **`src/App.tsx`** -- Remove the import (line 12) and the component usage (line 136)
2. **`src/components/tasks/FollowUpSystemTutorial.tsx`** -- Delete this file entirely, as it will no longer be used anywhere

This is a straightforward removal with no side effects, since the component is self-contained and not referenced by any other module.

