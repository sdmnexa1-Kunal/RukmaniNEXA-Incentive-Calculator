# Rukmani Motors — September 2026 Incentive Calculator

Anonymous mobile-friendly incentive calculator based on `Sep Incentive Calculator.xlsx`.

## Files
- `index.html` — app layout
- `style.css` — appearance
- `app.js` — calculator logic
- `data.js` — incentive master data

## Important data note
The supplied September workbook contains columns for Incentive, Spot 1 and Spot 2, but no separate Step-Up column. The calculator therefore sets Step-Up to ₹0 for all entries until you provide a Step-Up amount.

Blank incentive cells in the supplied workbook are treated as ₹0.

## Publish on GitHub Pages
1. Create a new GitHub repository.
2. Upload all four files to the repository root.
3. Open Settings → Pages.
4. Under Build and deployment, choose "Deploy from a branch".
5. Select the `main` branch and `/ (root)`.
6. Save and wait for GitHub Pages to publish.
7. Open the generated Pages URL on a phone to test.

The calculator is anonymous: it does not ask for or store an RM name, and sales are kept only in the current browser session.
