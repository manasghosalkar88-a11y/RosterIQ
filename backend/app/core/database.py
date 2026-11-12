import json
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Determine connect args based on database dialect
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Create engine
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=False,  # Set to True if SQL query debugging is needed
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base model class
Base = declarative_base()


def ensure_schema_columns() -> None:
    """
    Idempotently adds newly introduced columns to existing tables so local SQLite
    and persistent databases stay synchronized with ORM models without destructive rebuilds,
    and hydrates empty process/employee skills & certifications from existing allocations.
    """
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    alterations = {
        "employees": [
            ("max_weekly_hours", "INTEGER NOT NULL DEFAULT 48"),
            ("min_rest_hours", "INTEGER NOT NULL DEFAULT 12"),
            ("skills_json", "TEXT NOT NULL DEFAULT '[]'"),
            ("certifications_json", "TEXT NOT NULL DEFAULT '[]'"),
        ],
        "processes": [
            ("required_skills_json", "TEXT NOT NULL DEFAULT '[]'"),
            ("mandatory_certifications_json", "TEXT NOT NULL DEFAULT '[]'"),
        ],
        "brands": [
            ("allow_cross_pod_backup", "BOOLEAN NOT NULL DEFAULT 1"),
        ],
        "simulation_scenarios": [
            ("candidate_ranking_json", "TEXT"),
            ("selected_backup_employee_id", "INTEGER"),
            ("roster_snapshot_hash", "VARCHAR(128)"),
            ("requires_approval", "BOOLEAN NOT NULL DEFAULT 0"),
            ("required_approver_role", "VARCHAR(50)"),
            ("reviewed_by_id", "INTEGER"),
            ("review_comments", "VARCHAR(500)"),
            ("reviewed_at", "DATETIME"),
            ("applied_by_id", "INTEGER"),
        ],
    }

    with engine.begin() as conn:
        for table_name, cols in alterations.items():
            if table_name not in existing_tables:
                continue
            existing_cols = {c["name"]
                             for c in inspector.get_columns(table_name)}
            for col_name, col_def in cols:
                if col_name not in existing_cols:
                    pg_def = col_def

                if engine.dialect.name == "postgresql":
                    pg_def = (
                        pg_def
                        .replace("BOOLEAN NOT NULL DEFAULT 1", "BOOLEAN NOT NULL DEFAULT TRUE")
                        .replace("BOOLEAN NOT NULL DEFAULT 0", "BOOLEAN NOT NULL DEFAULT FALSE")
                        .replace("DATETIME", "TIMESTAMP")
                    )
                    conn.execute(
                        text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {pg_def}"))

        if engine.dialect.name == "postgresql" and "simulation_scenarios" in existing_tables:
            for val in ("PENDING_APPROVAL", "APPROVED", "REJECTED"):
                conn.execute(
                    text(f"ALTER TYPE scenariostatus ADD VALUE IF NOT EXISTS '{val}'"))

    hydrate_process_and_employee_qualifications()


def hydrate_process_and_employee_qualifications() -> None:
    """
    Populates process required skills/certifications and employee skills/certifications
    from existing relational Process & EmployeeAssignment records when not yet populated.
    """
    from app.models.process import Process
    from app.models.employee import Employee
    from app.models.allocation import EmployeeAssignment

    process_defaults = {
        "CS": (["CS", "OMNICHANNEL_SUPPORT"], ["CERT-CS-CORE"]),
        "ACC": (["ACC", "OUTBOUND_SALES"], ["CERT-ACC-CONV"]),
        "RET": (["RET", "VIP_RETENTION"], ["CERT-RET-PRO"]),
        "NDR": (["NDR", "LOGISTICS_OPS"], ["CERT-NDR-OPS"]),
    }

    db = SessionLocal()
    try:
        processes = db.query(Process).all()
        proc_map = {p.id: p for p in processes}
        for p in processes:
            req_skills, mand_certs = process_defaults.get(
                p.code,
                ([p.code], [f"CERT-{p.code}-CORE"]),
            )
            changed = False
            if not p.required_skills:
                p.required_skills_json = json.dumps(req_skills)
                changed = True
            if not p.mandatory_certifications:
                p.mandatory_certifications_json = json.dumps(mand_certs)
                changed = True
            if changed:
                db.add(p)
        db.flush()

        employees = db.query(Employee).all()
        assigns = db.query(EmployeeAssignment).filter(
            EmployeeAssignment.is_active == True).all()
        emp_proc_ids = {}
        for a in assigns:
            emp_proc_ids.setdefault(a.employee_id, set()).add(a.process_id)

        for idx, emp in enumerate(employees):
            if emp.skills and emp.certifications:
                continue

            skills_set = set(emp.skills)
            certs_set = set(emp.certifications)

            # Derive from active brand-process assignments
            for pid in emp_proc_ids.get(emp.id, set()):
                proc = proc_map.get(pid)
                if proc:
                    skills_set.update(proc.required_skills)
                    certs_set.update(proc.mandatory_certifications)

            desig = (emp.designation or "").lower()
            # Pod leads and senior specialists carry full multi-process certifications
            if "lead" in desig:
                for p in processes:
                    skills_set.update(p.required_skills)
                    certs_set.update(p.mandatory_certifications)
            elif "floater" in desig or "associate" in desig or "support" in desig or not skills_set:
                # Cross-trained pod associates hold CS & ACC universally; half hold RET/NDR too
                for p in processes:
                    if p.code in ("CS", "ACC") or (p.code == "RET" and emp.id % 2 == 0) or (p.code == "NDR" and emp.id % 3 == 0):
                        skills_set.update(p.required_skills)
                        certs_set.update(p.mandatory_certifications)

            if not emp.skills:
                emp.skills_json = json.dumps(sorted(skills_set))
            if not emp.certifications:
                emp.certifications_json = json.dumps(sorted(certs_set))
            db.add(emp)

        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


# Dependency for FastAPI endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
