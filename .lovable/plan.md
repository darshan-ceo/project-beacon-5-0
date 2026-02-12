

# Allow Past Dates for Hearing Scheduling

## Problem
The "Schedule New Hearing" form blocks past dates with a "Hearing date cannot be in the past" validation error. Users need to enter historical hearing data (back-dated entries) when migrating or recording past hearings.

## Solution
Remove the past-date validation check from both hearing form locations. Past dates are legitimate for data entry of historical records.

## Changes

### 1. `src/components/modals/HearingModal.tsx` (lines 306-314)
Remove the past-date validation block that prevents saving when `selectedLocalDate < todayLocalDate`. The surrounding date parsing code (lines 295-304) can also be cleaned up since it only served the removed validation.

### 2. `src/components/hearings/QuickEditHearing.tsx` (lines 52-60)
Remove the identical past-date validation block that prevents quick-edit saves with past dates.

Both files will retain all other validation (required fields, time format, etc.) -- only the date-in-past restriction is removed.

## Result
Users can schedule hearings with any date, enabling historical data entry while all other validations remain intact.

