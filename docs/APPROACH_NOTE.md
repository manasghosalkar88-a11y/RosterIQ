# RosterIQ — Approach Note & Engineering Methodology
### Technical Deep Dive for DataStraw AI Tech Internship Assessment

## 1. Problem Formulation & Operational Context

DataStraw operations present a distinctive operational topology that renders conventional workforce management software (e.g., standard Google Calendar or fixed-shift schedulers) inadequate:
1. **Asymmetric Brand Topologies**:
   - **80% Single-Resource Dedicated Accounts**: One employee is the sole domain expert across all processes (CS, ACC, Retention, NDR) for that client account.
   - **20% Multi-Resource Shared Accounts**: 2–3 employees collaborate, dividing or sharing process responsibilities.
2. **Decoupled Operating Demand vs. Personal Availability**:
   - Operating rules define **client demand** ($H_{req}$ headcount across 365 days, Sunday exclusions, or national holiday shutdowns).
   - Employee contracts define **headcount supply** (personal weekly-off preferences, approved leaves, and compensatory offs).
   - These two dimensions must never be blended into a single static schedule table.
3. **Strict Zero Silent Failures**:
   - In real-world enterprise operations, scheduling engines that silently ignore unstaffed shifts cause SLA breaches and lost revenue. Unresolvable demand must produce explicit, prioritized, actionable `SchedulingConflict` records.
4. **Surgical In-Place Change Management**:
   - When an unexpected absence occurs (e.g., Priya Sharma on GlowBotanics takes emergency leave on April 15), rebuilding the entire month's roster is unacceptable: it creates chaos by unpredictably reshuffling the weekly offs of 31 other uninvolved team members. The system must perform a single-date targeted mutation with intelligent candidate matching and audit logging.

---

## 2. Mathematical Modeling & Algorithmic Design

### A. The Two-Pass Scheduling Algorithm

RosterIQ implements a deterministic constraint satisfaction engine in `backend/app/engine/scheduler.py`:

#### Pass 1: Operating Rule Demand Computation
For every calendar day $d \in \{1, \dots, N\}$ and for each brand $b \in B$ and process $p \in P_b$:
$$D(b, p, d) = \begin{cases} 
H_{req}(b, p) & \text{if Rule } R(b, p) \text{ operates on day } d \\
0 & \text{otherwise}
\end{cases}$$
Where operation on day $d$ evaluates:
- `EVERY_DAY_365`: Always True.
- `EXCEPT_SUNDAYS_AND_HOLIDAYS`: $\text{weekday}(d) \neq 6 \land d \notin \text{Holidays}$.
- `EXCEPT_PUBLIC_HOLIDAYS`: $d \notin \text{Holidays}$.

#### Pass 2: Constraint-Satisfaction Assignment
For each slot $(b, p, d)$ where $D(b, p, d) > 0$:
1. **Eligibility Filter**: Candidate employee $e$ must satisfy:
   - $e \notin \text{ApprovedLeaves}(d)$
   - $e \notin \text{CompOffs}(d)$
   - $\text{ConsecutiveDays}(e, d) < 6$ (Statutory labor law compliance)
   - $\text{IsAssigned}(e, d) = \text{False}$ (No double-booking)
2. **Preference Evaluation**:
   - Primary specialist for brand $b$ is placed first.
   - If the primary specialist's personal weekly off falls on day $d$, or if they are unavailable, the engine evaluates the **Pod Floater Pool**:
     $$\mathcal{F}(b) = \{ e' \mid \text{Pod}(e') = \text{Pod}(b) \land p \in \text{Skills}(e') \}$$
3. **Conflict Generation**:
   If $|\text{Eligible}| < D(b, p, d)$, the system logs a `SchedulingConflict` with severity:
   - `CRITICAL` if $b$ is a single-resource brand.
   - `HIGH` if multi-resource headcount shortage.

---

### B. Multi-Factor Backup Recommendation Formulation

When an override is required (`backend/app/engine/change_manager.py`), candidate agents are scored on a 0–100% scale using a multi-factor linear evaluation function:

$$\text{SuitabilityScore}(e, b, p, d) = w_1 S_{\text{pod}} + w_2 S_{\text{brand}} + w_3 S_{\text{process}} + w_4 S_{\text{streak}} + w_5 S_{\text{compoff}}$$

Where:
- $w_1 = 25$: **Pod Affinity** ($S_{\text{pod}} = 1$ if $e$ shares pod with $b$, else $0$). Members of the same pod share communication channels and team context.
- $w_2 = 20$: **Brand Familiarity** ($S_{\text{brand}} = 1$ if $e$ holds primary or backup assignment on $b$, else $0$).
- $w_3 = 20$: **Process Competency** ($S_{\text{process}} = 1$ if $e$ is certified in process $p$, else $0$).
- $w_4 = 20$: **Streak Labor Compliance** ($S_{\text{streak}} = 1$ if rolling streak $< 6$, else disqualification / 0).
- $w_5 = 15$: **Comp-Off Credit** ($S_{\text{compoff}} = 1$ if $e$ has unused compensatory off days, else $0$).

---

## 3. Database Schema Normalization (16 Relational Tables)

To guarantee ACID consistency and prevent data duplication, the schema is normalized to Third Normal Form (3NF):

1. **`users`**: Authentication credentials, BCrypt password hashes, and system roles (`SUPER_ADMIN`, `OPS_MANAGER`, `POD_LEAD`, `EMPLOYEE`).
2. **`pods`**: 5 operational teams with designated lead employee references.
3. **`employees`**: 32 operational staff profiles, pod linkages, contract streak rules, and weekly-off preferences.
4. **`brands`**: 10 D2C brand clients mapped to operational pods.
5. **`processes`**: 4 core process types with SLA codes.
6. **`employee_assignments`**: M:N bridge mapping employees to brand/process pairs with `PRIMARY` or `BACKUP` assignment designations.
7. **`brand_process_rules`**: Calendar demand operating rules decoupled from personnel schedules.
8. **`rosters`**: Monthly roster headers with metadata, coverage metrics, and lifecycle status (`DRAFT`, `PUBLISHED`, `ARCHIVED`).
9. **`roster_entries`**: Daily shift work orders with shift status (`WORKING`, `OFF`, `LEAVE`, `COMP_OFF`, `HOLIDAY`), timing, and `is_manual_override` tracking.
10. **`scheduling_conflicts`**: Granular unstaffed slot records with severity tracking, conflict types, and resolution notes.
11. **`leave_requests`**: Vacation, sick, and emergency leave requests with date ranges and review workflow.
12. **`comp_offs`**: Compensatory off ledger tracking earned vs. redeemed overtime credits.
13. **`public_holidays`**: National calendar gazetted holidays.
14. **`audit_logs`**: Immutable security and change log with serialized before/after JSON diffs.
15. **`notifications`**: User alerting inbox for system and roster events.
16. **`system_settings`**: Runtime operational settings and table count telemetry.

---

## 4. Architectural Boundaries & Role-Based Access Control (RBAC)

RosterIQ implements strict role-based access control with scoped data boundaries:
- **`SUPER_ADMIN`**: Full platform authority, database re-seeding, configuration updates, and user role management.
- **`OPS_MANAGER`**: Cross-pod operational authority, roster generation, global conflict resolution, and streaming CSV export.
- **`POD_LEAD`**: **Scoped Pod Boundary**. Can view only employees, brands, and pending leave requests belonging to their assigned Pod. They cannot approve leaves or view private personnel details of rival pods.
- **`EMPLOYEE`**: Self-service portal. Can view their own monthly working shifts, personal weekly-off schedule, and submit leave/comp-off requests.

---

## 5. Verification & Testing Methodology

Every phase of development was verified using dedicated, automated integration test scripts that exercise the FastAPI endpoints and SQLAlchemy models:
- Automated test runner executes all 12 phase test scripts in sequence.
- End-to-end tests validate that zero unhandled exceptions occur during roster generation, in-place reassignments, or batch approval processing.
- The React TypeScript frontend compiles cleanly with 0 type errors via `npm run build`.
