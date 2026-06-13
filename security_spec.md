# Security Specification - EduFlow Firestore Integration

## 1. Data Invariants
* **Workspace Invariants**: A workspace must have valid currentSemester (integer), simulationDate (string), and semesterGPAs (matching a structured map). Only valid workspace IDs are allowed as workspace selectors.
* **Course Invariants**: A course must reside under a valid workspace, have a populated non-empty code, name, valid day and non-empty lecturers/color configurations.
* **Task Invariants**: A task must reference an existing course ID under the same workspace path, with a valid status, deadline format matching YYYY-MM-DD, title, and priority.

## 2. The "Dirty Dozen" Payloads (Anti-Vulnerability Test Cases)
1. **Workspace Type Spoofing**: Attempt to set `currentSemester` to a 10MB string.
2. **Workspace GPAs Injection**: Attempt to inject unapproved property fields into `semesterGPAs`.
3. **Course Spoofing without Code**: Attempt to create a course with an empty code field.
4. **Course Over-sized Strings**: Attempt to set `name` to a 50KB string.
5. **Course Orphan Injection**: Attempt to create a course with a day field containing an invalid name like "HariKiamat".
6. **Task Course-ID Hijacking**: Attempt to create a task with a courseId that is not standard or belongs to another workspace.
7. **Task Priority Value Poisoning**: Attempt to set `priority` to "SangatTinggi".
8. **Task Long Description Denial of Wallet**: Attempt to set `description` to a 1MB string.
9. **Direct Write Bypass**: Attempting to delete a workspace of another user (though workspaces are public with validation constraints, dropping the full DB remains denied).
10. **Shadow Key Update on Course**: Attempting to set an undefined key `isVerified: true` during update.
11. **Immortal Field Alteration**: Attempting to alter `createdAt` (or initial parameters) during update.
12. **Malicious ID Character Poisoning**: Writing a resource collection with documentId characters, e.g., `/workspaces/default/courses/hack%20me`.

## 3. Test Cases Draft
All the above payloads MUST return `PERMISSION_DENIED` upon request targeting the Firebase ruleset.
