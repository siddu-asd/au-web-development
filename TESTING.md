# ProjectHub test cases

These checks should be run against a non-production Supabase project before production launch:

1. A student cannot open admin routes or call admin methods.
2. Faculty cannot manage unassigned subjects or projects.
3. A student cannot allocate an already allocated project.
4. Concurrent allocation calls allow exactly one student to receive a project.
5. A student with an active allocation cannot allocate a second project.
6. Students cannot read other students' private records.
7. Frontend role metadata cannot promote a student.
8. Students cannot modify deadline or progress fields.
9. Progress percentage is derived only from completed checklist items.
10. Submission rejects missing or invalid Vercel/GitHub URLs.
11. Deadline expiry marks projects overdue.
12. Faculty approvals and correction requests preserve submission history.
13. Project requirement changes do not modify existing allocation snapshots.
