from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
import app.models  # Register all models for create_all


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure all tables are created automatically on startup
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise Smart Roster Management System for DataStraw operations.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# Set CORS origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get(settings.API_V1_STR, tags=["System"])
def api_root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": f"{settings.API_V1_STR}/docs",
        "openapi": f"{settings.API_V1_STR}/openapi.json",
    }


from app.api.v1 import auth, employees, brands, processes, pods, seed, allocations, rules, leaves, holidays, roster, conflicts, changes, approvals, analytics, overview, notifications, settings as system_settings, simulator

# Mount API routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(employees.router, prefix=f"{settings.API_V1_STR}/employees", tags=["Employees"])
app.include_router(brands.router, prefix=f"{settings.API_V1_STR}/brands", tags=["Brands"])
app.include_router(processes.router, prefix=f"{settings.API_V1_STR}/processes", tags=["Processes"])
app.include_router(pods.router, prefix=f"{settings.API_V1_STR}/pods", tags=["Pods & Teams"])
app.include_router(allocations.router, prefix=f"{settings.API_V1_STR}/allocations", tags=["Resource Allocation"])
app.include_router(rules.router, prefix=f"{settings.API_V1_STR}/rules", tags=["Working Rules"])
app.include_router(leaves.router, prefix=f"{settings.API_V1_STR}/leaves", tags=["Leaves & Availability"])
app.include_router(holidays.router, prefix=f"{settings.API_V1_STR}/holidays", tags=["Holidays & Calendar"])
app.include_router(roster.router, prefix=f"{settings.API_V1_STR}", tags=["Roster Engine"])
app.include_router(conflicts.router, prefix=f"{settings.API_V1_STR}", tags=["Conflicts & Alerts"])
app.include_router(changes.router, prefix=f"{settings.API_V1_STR}", tags=["Change Management & Recommendations"])
app.include_router(approvals.router, prefix=f"{settings.API_V1_STR}", tags=["Approvals Workflow & Governance"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}", tags=["Analytics & Operational Reports"])
app.include_router(overview.router, prefix=f"{settings.API_V1_STR}", tags=["Overview Dashboard"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}", tags=["Notifications"])
app.include_router(simulator.router, prefix=f"{settings.API_V1_STR}", tags=["RosterIQ Impact Simulator"])
app.include_router(system_settings.router, prefix=f"{settings.API_V1_STR}", tags=["Settings & System Diagnostics"])
app.include_router(seed.router, prefix=f"{settings.API_V1_STR}/seed", tags=["Seed & Demo"])
