"""
Database Initialization Script
Creates all tables in the target database using SQLAlchemy metadata.
"""
from app.core.database import engine, Base
import app.models  # Ensures all models are registered with Base.metadata
from sqlalchemy import inspect


def init_db():
    print(f"Connecting to database via URL: {engine.url.render_as_string(hide_password=True)}...")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Inspect generated tables
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    
    print("\nSuccessfully initialized RosterIQ database schema!")
    print(f"Total Tables Created: {len(table_names)}")
    print("-" * 50)
    for idx, table in enumerate(sorted(table_names), 1):
        columns = inspector.get_columns(table)
        print(f"{idx:2d}. {table:<25} ({len(columns)} columns)")
    print("-" * 50)


if __name__ == "__main__":
    init_db()
