export interface BAATemplate {
  id: string
  version: string
  content: string
}

export const StandardBAATemplate: BAATemplate = {
  id: 'baa_standard_v1',
  version: '1.0.0',
  content: `
BUSINESS ASSOCIATE AGREEMENT

This Business Associate Agreement ("Agreement") is entered into by and between MediCase ("Business Associate") and the Healthcare Provider ("Covered Entity").

1. Definitions
"ePHI" shall mean electronic protected health information as defined in 45 CFR § 160.103.

2. Obligations of Business Associate
Business Associate agrees to:
a. Not use or disclose PHI other than as permitted or required by this Agreement.
b. Use appropriate safeguards to prevent use or disclosure of PHI.
c. Report to Covered Entity any use or disclosure of PHI not provided for by this Agreement.

3. Term and Termination
This Agreement shall terminate when all PHI provided by Covered Entity is destroyed or returned.
...
  `
}
