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
4. Minimal decoration: flat surfaces, at most one soft accent glow on a hero card, no glassmorphism, no cards-in-cards.
5. Honest data: empty states teach; never fabricate content.
6. Calm motion (tasteskill numbers): 150ms in, 120ms out, buttons step up 1px on hover and press to .985, `prefers-reduced-motion` respected.

## Implementation defaults
React + TypeScript + Vite frontend, Tailwind CSS v4 + shadcn/ui (Radix), theme
tokens in `frontend/src/index.css`. No hand-written CSS. Dark futuristic minimal:
neutral black, electric-lime accent, bright signal colours only. Breakpoints: md 768px (sidebar vs bottom tab bar), lg 1024px (two-column layouts).
