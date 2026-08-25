# UI Baseline Policy

1. Reference screenshots are source material.
2. A baseline can only be created after human visual review.
3. Baselines must be generated in the pinned Playwright environment.
4. Dynamic content must be frozen or masked.
5. A UI change that intentionally changes the design requires explicit baseline review and documentation.
6. Baselines must never be regenerated merely to make CI pass.

## Trust Level Distinction

This project contains **36 logical baselines** (18 states × 2 breakpoints). These baselines have different trust requirements before they can be approved and committed:

### Reference-Backed Baselines (30)
These baselines have external ground truth in the form of design contact sheets.
**Approval Requirement:** The generated Playwright snapshot must be visually diffed against the actual design source screenshot by a human.

### Derived Baselines (6)
These baselines represent desktop registration states that have *no desktop design reference* in the source material.
**Approval Requirement:** Because there is no external ground truth, these baselines must be manually reviewed for **internal consistency**. They must correctly use the shared components, typography, and spacing defined by the overarching SecureID design system.

- These states are tracked in code with the `data-derived="true"` attribute.
- See `ui-reference-map.md` for the explicit list of derived states.
