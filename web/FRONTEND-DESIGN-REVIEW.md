# Frontend design review

Source: [Anthropic frontend-design skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md).

## Brief

UniMatch is a dating/friendship app for adult students at Unilins. The user rejected template-looking gradients, floating hearts, slogan-heavy landing pages and identical rounded cards. Preserve the existing logo, a direct entry and restrained controls. Real profiles, photos and shared interests carry the identity.

## Pass 1: design plan

- Palette: canvas `#F7F7F5`, surface `#FFFFFF`, text `#242724`, control `#353247`, secondary text `#666B65`, separator `#E1E3DD`. Keep the violet logo; do not introduce another decorative accent.
- Type: locally hosted Instrument Sans, one variable family. A compact 12/14/16/24/34 px scale gives names and readable profile text priority. Use the same family in Clerk. Maintain the font's license in source.
- Layout: the entry remains a single viewport; discovery places photos and identity first, followed by real common interests and profile text. The desktop side panel exposes the user's own preferences. Left-align functional content.

```text
Entry                    Profile
logo                     photo
                         name, age / course
short introduction       shared interests
login / create account   bio / other interests
                         pass / like
```

- Distinctive point: shared interests are the app's recommendation feature. Show the actual overlap clearly; use no invented compatibility percentage, stock portrait or community counter.
- Interaction: keep the 180 ms user-triggered transition, keyboard focus and reduced-motion support. Main actions stay reachable on a narrow phone.

## Pass 2: critique before implementation

The previous pass removed decoration but retained the default system font and a sentence listing interests. It also left older CSS declaring different fonts, card shadows, active scales and hover animations under newer overrides. That made the visual system less deliberate and the code harder to maintain.

Use Instrument Sans because its compact proportions fit student names, course names and hobby labels while remaining readable. Spend the visual emphasis on the common-interest section, not the entry page. Remove duplicate shared tags from the rest of the profile. Remove obsolete CSS rather than overriding it again. Review screenshots at narrow phone and desktop sizes; remove any element that duplicates information.
