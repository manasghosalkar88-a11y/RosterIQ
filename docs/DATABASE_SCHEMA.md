# RosterIQ — Relational Database Schema & Domain Model

This document outlines the 16 normalized relational tables powering the **RosterIQ Smart Roster Management System**.

---

## 1. Entity-Relationship Overview

| Table Name | Description | Key Relationships |
| :--- | :--- | :--- |
| **`users`** | Authentication credentials & system roles (`SUPER_ADMIN`, `OPS_MANAGER`, `POD_LEAD`, `EMPLOYEE`). | Linked 1:1 with `employees`, 1:N with `audit_logs`, 1:N with `notifications`. |
| **`pods`** | Operational units grouping teams and client brands. | 1:N with `employees`, 1:N with `brands`, 1:1 with lead `Employee`. |
| **`employees`** | Operational workforce (30+ staff members) with preferences, status, and constraints. | Belongs to `Pod`, 1:N with `assignments`, `leave_requests`, `comp_offs`, `roster_entries`. |
| **`brands`** | D2C client brands managed by DataStraw. | Belongs to `Pod`, 1:N with `assignments`, `process_rules`, `roster_entries`, `conflicts`. |
| **`processes`** | Operational services offered (Customer Support, Abandoned Cart Conversions, Retention, NDR). | 1:N with `assignments`, `brand_process_rules`, `roster_entries`. |
| **`brand_process_rules`** | Client operating calendars (365 days, Public Holidays off, Sundays off, headcount). | Belongs to `Brand` and `Process`. |
| **`employee_assignments`** | Matrix binding an Employee to a Brand and Process (`PRIMARY`, `SECONDARY`, `BACKUP`). | Junction table with unique constraint on `(employee_id, brand_id, process_id)`. |
| **`leave_requests`** | Planned, sick, and casual leaves with approval state. | Belongs to `Employee`, reviewed by `User`. |
| **`comp_offs`** | Compensatory off balances earned by working holidays/weekends. | Belongs to `Employee`, reviewed by `User`. |
| **`public_holidays`** | National/regional holidays, optionally scoped to specific brand calendars. | Standalone or brand-specific. |
| **`rosters`** | Monthly schedule instances (Month, Year, Status, Coverage %, Fairness Score). | 1:N with `roster_entries`, `scheduling_conflicts`, `roster_versions`. |
| **`roster_entries`** | Daily atomic schedule cell mapping an Employee to a Status (`WORKING`, `WEEKLY_OFF`, `LEAVE`, `COMP_OFF`, `HOLIDAY`). | Belongs to `Roster`, `Employee`, and optionally `Brand` & `Process`. |
| **`roster_versions`** | Snapshot history of roster states for auditing and rollbacks. | Belongs to `Roster`, authored by `User`. |
| **`scheduling_conflicts`** | Detected violations, coverage gaps, and recommended actions. | Belongs to `Roster`, `Brand`, `Process`, and `Employee`. |
| **`audit_logs`** | Immutably tracks administrative actions and overrides. | Authored by `User`. |
| **`notifications`** | Alert queue for roster changes, leave approvals, and critical gaps. | Belongs to `User`. |

---

## 2. Core Business Logic Modeled in Schema

### 1. Single-Resource vs. Multi-Resource Allocation
- **Single-Resource Brand**: A brand has one `EmployeeAssignment` record with `assignment_type = PRIMARY` mapped to all of that brand's active processes.
- **Multi-Resource Brand**: Multiple employees each have `EmployeeAssignment` records mapped to different processes (e.g. Employee A $\rightarrow$ CS, Employee B $\rightarrow$ ACC) or shared processes.

### 2. Separation of Operating Calendar from Employee Schedule
- `brand_process_rules` dictates whether a brand requires operational coverage on a given date (e.g., `EVERY_DAY_365` requires 1 agent even on Diwali and Sundays).
- `roster_entries` records the individual agent's daily status (`WORKING` vs `WEEKLY_OFF`). The scheduler uses this distinction to rotate coverage or flag a conflict if no backup is eligible.
