# Pulling Goals

Goals provides functionality to help you manage and move incomplete tasks between different time periods. This helps you maintain continuity in your task management and ensures no important tasks are forgotten when transitioning between planning periods.

## Pulling from Previous Quarters

When starting a new quarter, you can pull incomplete goals from the previous quarter:

1. Navigate to the Quarterly Goals view
2. Click on "Pull from Previous Quarter"
3. Select which incomplete goals you want to bring forward
4. Click "Pull Selected Goals"

This will copy the selected goals to your current quarter, allowing you to continue working on them.

## Pull Incomplete Goals (weeks and past days)

Use **Pull Goals** from the daily/weekly focus toolbar (or the current week card) when you want to continue unfinished work.

### How it works

1. Click **Pull Goals**
2. A dialog opens with:
   - **From week** — defaults to the previous calendar week
   - **To week** — defaults to the current calendar week
   - **Jump** — sets From to the last earlier week in the **same quarter** that still has incomplete work (useful after a holiday gap)
   - A live preview of everything that will move for the selected range
3. Review the preview:
   - **Week N → Week M** — incomplete goals/adhoc tasks pulled from From → To (land on Monday of To)
   - **Past days → today** — when To is the current week and today is not Monday, incomplete tasks from earlier days this week also move to today
4. Click **Pull Goals** to confirm (or Cancel)

Goals are **moved**, not copied. The preview list is view-only — change From/To (or Jump) to control what is included.

### Defaults and stale weeks

- Defaults always use the **current calendar week**, not whichever week you happen to be browsing in the UI.
- If the default range is empty, the dialog still opens so you can pick another From/To.

### Limitations

- Jump only searches earlier weeks in the **same quarter** (it will not jump into the previous quarter).
- Past-days pull only runs when To is the current calendar week and today is not Monday.
- Only incomplete work is moved; completed items stay put.

### Tips

- After time away, open Pull Goals and use **Jump** to pick up from the last week that still has incomplete work.
- Continuing work is the main goal — prefer adjusting From/To over recreating tasks.

## Pulling from Previous Day

You can pull incomplete tasks from the previous day to the current day. This is useful when you have tasks that you didn't complete and want to move them forward.

### How It Works

1. Click on the day header (e.g., "Tuesday", "Wednesday") to open the day menu
2. Select "Pull Incomplete" from the menu
3. All incomplete tasks from the previous day will be moved to the current day

### Limitations

- You cannot pull tasks to Monday since it's the first day of the week
- Tasks can only be pulled from the immediately previous day
- Only incomplete tasks will be moved; completed tasks remain in their original day

### Tips

- Use this feature at the start of your day to bring forward any unfinished tasks
- Tasks maintain their association with their weekly and quarterly goals when moved
- The original task is moved (not copied), maintaining a single source of truth
