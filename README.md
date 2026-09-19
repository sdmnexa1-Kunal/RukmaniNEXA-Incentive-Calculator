# Rukmani Motors NEXA Incentive Website

Premium NEXA-themed incentive calculator for Rukmani Motors.

## Correct September logic
- Model/variant incentive + Spot 1 + Spot 2
- Step-Up is calculated independently for each model:
  1st same-model sale ₹1,000
  2nd ₹1,200
  3rd ₹1,500
  4th ₹1,800
  5th+ ₹2,000

## Monthly Excel update
Open `/admin.html`, upload the new Excel, convert it, and download `data.js`.
Replace the old `data.js` in the GitHub repository. This keeps the calculator code/design unchanged.

The Excel importer looks for columns named Model, Variant, Incentive, Spot 1 and Spot 2 in the first worksheet.
