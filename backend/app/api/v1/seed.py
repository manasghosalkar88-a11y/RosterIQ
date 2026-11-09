from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.seeds.seed_data import seed_database
from app.models.pod import Pod
from app.models.employee import Employee
from app.models.brand import Brand
from app.models.process import Process
from app.models.allocation import EmployeeAssignment

router = APIRouter()


@router.post("/all", summary="Seed master dataset (32 employees, 10 brands, 5 pods, operating rules)")
def seed_all_data(db: Session = Depends(get_db)):
    seed_database(db)
    return {
        "message": "Database seeded successfully with DataStraw master dataset!",
        "stats": {
            "pods": db.query(Pod).count(),
            "employees": db.query(Employee).count(),
            "brands": db.query(Brand).count(),
            "processes": db.query(Process).count(),
            "assignments": db.query(EmployeeAssignment).count(),
        }
    }
