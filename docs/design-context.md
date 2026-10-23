# StudyOS — Design Context (better-web-ui)

## Audience
University/high-school students using StudyOS daily for extended sessions,
on desktop primarily, mobile as companion. No secondary gatekeeper audience.

## Jobs to be done
1. Decide what to study next (today focus, deadlines).
2. Time and record real study sessions with minimal friction.
3. Review progress (time, streaks, goals) to stay motivated.

## Brand personality
Professional, focused, calm. Serious study tool, not playful. Language: plain,
concise, Italian UI. Dark-first interface.

## Design principles (durable)
1. Hierarchy first: one primary action per screen, visible within 2 seconds.
2. Feature before shell: timer countdown and today's focus dominate; chrome recedes.
3. Systems over tweaks: single spacing scale, single surface language, semantic color only.
4. No decoration: flat surfaces, no gradients/glow/glassmorphism, no cards-in-cards.
5. Honest data: empty states teach; never fabricate content.
6. Calm motion: 160ms ease transitions only, `prefers-reduced-motion` respected.

## Implementation defaults
React + TypeScript + Vite frontend, vanilla CSS with centralized tokens in
`frontend/src/styles/base/tokens.css`. No UI framework. Breakpoints: 900px
(grids collapse), 700px (nav compresses, single column).
