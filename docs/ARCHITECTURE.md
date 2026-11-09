# RosterIQ — System Architecture & Implementation Blueprint

## 1. Executive Summary & Problem Formulation
RosterIQ is an enterprise-grade Smart Roster Management System designed for DataStraw's client experience and operations teams. 

### Core Constraints & Real-World Characteristics:
- **Team Size**: 30+ employees across 10 D2C brands, 5 operational pods, and 4–5 operational processes (Customer Support, Abandoned Cart Conversions, Retention, NDR).
- **Asymmetric Staffing Patterns**:
  - **80% Single-Resource Brands**: One dedicated employee manages all processes for that brand.
  - **20% Multi-Resource Brands**: 2–3 employees assigned to a brand, dividing or sharing processes.
- **Operating Calendar Separation**:
  - Brand/Process Operating Rules:
    1. `EVERY_DAY_365`: 365-day operations including Sundays and public holidays.
    2. `EXCEPT_PUBLIC_HOLIDAYS`: Daily operations with public holidays off.
    3. `EXCEPT_SUNDAYS_AND_HOLIDAYS`: Standard operations excluding Sundays and public holidays.
    4. `CUSTOM`: Specific weekly patterns or minimum headcounts.
  - Individual Working Schedules:
    - Weekly offs, public holidays, approved leaves, comp-offs, and availability windows.
- **Mandatory vs. Soft Constraints**:
  - *Hard*: No scheduling during approved leaves/comp-offs, strict adherence to operating rules, no double-booking across shifts, 100% required headcount met or explicitly reported as conflict.
  - *Soft*: Fair weekly-off distribution, honoring employee preferences, balanced workload.

---

## 2. Relational Schema Blueprint

```
+------------------+       +-------------------+       +----------------------+
|       Pods       |       |     Employees     |       |        Brands        |
+------------------+       +-------------------+       +----------------------+
| id (PK)          | <---+ | id (PK)           | +---> | id (PK)              |
| name             |       | full_name         | |     | name                 |
| lead_id (FK)     |       | pod_id (FK)       | |     | client_name          |
| is_active        |       | default_off_pref  | |     | pod_id (FK)          |
+------------------+       | status            | |     | status               |
                           +-------------------+ |     +----------------------+
                                     |           |                |
                                     v           v                v
                           +------------------------------------------+
                           |           Employee_Assignments           |
                           +------------------------------------------+
                           | id (PK)                                  |
                           | employee_id (FK)                         |
                           | brand_id (FK)                            |
                           | process_id (FK)                          |
                           | assignment_type (PRIMARY/BACKUP)         |
                           +------------------------------------------+
                                     |
                                     v
                           +-------------------+
                           |     Processes     |
                           +-------------------+
                           | id (PK)           |
                           | code (CS/ACC/...) |
                           | name              |
                           +-------------------+
```

---

## 3. Two-Pass Scheduling Algorithm

1. **Pass 1 — Demand Matrix Generation**:
   - For every day $d \in [1, N]$ and every $(Brand, Process)$:
     - Determine if the process is scheduled to operate on day $d$ using the operating calendar rule (365 days, Sunday filter, public holiday filter).
     - Determine the required headcount $R_{(b, p, d)}$.

2. **Pass 2 — Constraint-Satisfaction Assignment**:
   - Identify dedicated single-resource brand allocations.
   - Filter employee availability on day $d$:
     - Remove employees with approved leave or comp-offs.
     - Check default weekly off preferences.
   - Allocate primary assigned employees.
   - For understaffed slots, query the backup eligibility pool within the same pod or shared skill set.
   - In case of an unresolvable shortage, record a `CRITICAL` or `HIGH` `SchedulingConflict` entry detailing brand, process, date, shortage, and candidate recommendations.

---

## 4. Change Management Demonstration

- **Single-Resource Impact**: When the sole employee for a brand requests emergency leave on day $D$, the system immediately flags all processes of that brand as orphaned, triggers a smart backup recommendation matching available agents in the same pod, and allows the operations manager to assign the backup with single-click validation.
- **Multi-Resource Resilience**: When 1 of 3 employees assigned to a brand is absent, the system evaluates if remaining employees can cover the required minimum staffing before raising an alert.
