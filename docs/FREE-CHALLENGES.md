# Free challenge rules (draft v1)

Free challenges move no money. They test the scoring, divisions and screens before any cash challenge exists.
Numbers are starting values to tune after the first round. The same rules are written to carry over to paid challenges later.

## The two types

### 1. Goal challenge: "Show Up"
- **Goal:** check in and finish a workout on enough days. Default: **16 of 30 days**.
- **Win:** everyone who reaches the goal wins. There is no ranking.
- **Shown to the player:** "Hit 16 of 30 days and you win."
- **Progress:** days done, days left, days still needed. Players can see if the goal is still reachable.
- Sponsor prizes or badges can be attached later. Nothing is paid in a free challenge.

### 2. Leaderboard challenge: "Points"
- **Goal:** earn the most points in the round.
- **Win:** rank in your division. Top 3 are shown as winners.
- **Length:** 1 week, 2 weeks or 1 month. A round always has a fixed start and end date.
- **Shown to the player:** "Top 3 in your division win."

Every challenge states its type in plain words before you join.

## What counts as a day (Show Up)
A day counts when the player does **both**:
1. Checks in, and
2. Completes a workout (all required exercises logged, or a logged cardio session of 20+ minutes).

One counted day per calendar day. The day uses the player's own time zone.

## Points (Points challenge)
| Action | Points | Per day |
|---|---|---|
| Check in | 10 | once |
| Complete the workout | 10 | once |
| Hit a progressive-overload target (beat your last weight or reps on a lift) | 5 | up to 1 |
| Hit the day's Fuel goal | 5 | once |

- **Daily cap: 30 points.** No farming, and no rewarding overtraining.
- Crew bonus (whole crew checks in the same day, +5 each) is **not** in v1.
- Imported history and edited past logs never count.

## Divisions
- Three divisions: **Beginner, Intermediate, Advanced.**
- The player picks one at join, based on training history. We show a one-line description of each.
- Each division has its own leaderboard.
- A division needs at least 5 players to show a leaderboard. Smaller divisions are merged into the nearest one, and the player is told.
- A player can move up a division between rounds, never down during a round.

## Staying in play
- No buying points, ever.
- A missed day is a missed day. Players earn their way back with real workouts in later days.
- If a player falls out of contention, they can join the next round. A new round is a fresh start, not points added to the current one.
- Premium perks (make-up days, streak shields) are **not** in v1. When added, they apply in free challenges only.

## Ties
Tie-break order: more days completed, then more workouts completed, then the earlier time of the last point earned.

## Who can join
- Any signed-in member. Joining is free and can be undone with Leave.
- Joining opens until 48 hours after the round starts. Joining late does not give extra days.
- Leaving removes the player from the leaderboard.

## Fair play
- Check-ins must be real workouts. The app records a workout start time and an end time, and rejects check-ins with no logged sets or an impossible duration.
- Photo proof or a gym check-in is **not** required in free challenges.
- Reports: any player can report a result. A member of the Will Power team reviews it.
- Cheating (fake logs, duplicate accounts) removes the player from the round.

## Privacy
- Leaderboards show name, division and score only.
- No location is stored for challenges. A future gym check-in saves a yes or no, never coordinates.

## What the app needs to build this
- New metrics: `points` and `daysDone`, built on the existing check-ins, logs and Fuel data.
- A division on each joined challenge (cohort).
- A goal-based result (reached or not) next to the existing rank-based results.
- A Show Up round (30 days, minimum 16) and a Points round (monthly) as the first two challenges.
- Daily cap and dedupe rules enforced in scoring, not just in the display.

## Open questions
- Are 16 of 30 days and a 30-point cap right? Tune after the first round.
- Should Show Up allow one "rest day" per week from the start?
- Round start dates: the 1st of every month, or rolling starts?
