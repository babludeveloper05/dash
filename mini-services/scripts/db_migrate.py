"""
Database Migration Script for Project Delta
Manages database schema migrations using Alembic
"""
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from alembic.config import Config
from alembic import command
from alembic.script import ScriptDirectory

class DatabaseMigration:
    """Database migration manager using Alembic"""
    
    def __init__(self, config_path: str = "alembic.ini"):
        self.config_path = config_path
        self.alembic_cfg = Config(config_path)
        
        # Set script location dynamically if needed
        script_location = Path(__file__).parent / "alembic"
        if script_location.exists():
            self.alembic_cfg.set_main_option("script_location", str(script_location))
    
    def upgrade(self, revision: str = "head"):
        """Upgrade database to specified revision"""
        print(f"Upgrading database to revision: {revision}")
        command.upgrade(self.alembic_cfg, revision)
        print("✓ Database upgraded successfully")
    
    def downgrade(self, revision: str = "-1"):
        """Downgrade database to specified revision"""
        print(f"Downgrading database to revision: {revision}")
        command.downgrade(self.alembic_cfg, revision)
        print("✓ Database downgraded successfully")
    
    def migrate(self):
        """Generate a new migration file"""
        print("Generating new migration...")
        command.revision(self.alembic_cfg, autogenerate=True)
        print("✓ Migration file generated")
    
    def history(self):
        """Show migration history"""
        print("\nMigration History:\n")
        script = ScriptDirectory.from_config(self.alembic_cfg)
        
        for revision in script.walk_revisions():
            print(f"  {revision.revision} -> {revision.rev_id}")
            print(f"    {revision.doc}")
            print()
    
    def current(self):
        """Show current database revision"""
        from alembic.runtime.migration import MigrationContext
        from alembic.script import ScriptDirectory
        import sqlite3
        
        script_dir = ScriptDirectory.from_config(self.alembic_cfg)
        
        # Get database URL from config
        db_url = self.alembic_cfg.get_main_option("sqlalchemy.url")
        
        if db_url.startswith("sqlite:///"):
            db_path = db_url.replace("sqlite:///", "")
            conn = sqlite3.connect(db_path)
            
            context = MigrationContext.configure(conn)
            current_rev = context.get_current_revision()
            
            if current_rev:
                print(f"Current revision: {current_rev}")
            else:
                print("Database is not migrated (no current revision)")
            
            conn.close()
        else:
            print("Only SQLite databases are supported for this operation")
    
    def stamp(self, revision: str = "head"):
        """Stamp the database with a specific revision without running migrations"""
        print(f"Stamping database with revision: {revision}")
        command.stamp(self.alembic_cfg, revision)
        print("✓ Database stamped successfully")


def run_migrations():
    """Run all pending migrations"""
    migrator = DatabaseMigration()
    migrator.upgrade()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Database Migration Utility")
    parser.add_argument("--config", default="alembic.ini", help="Alembic config file")
    parser.add_argument("action", choices=["upgrade", "downgrade", "migrate", "history", "current", "stamp"])
    parser.add_argument("--revision", default="head", help="Target revision (for upgrade/downgrade/stamp)")
    
    args = parser.parse_args()
    
    migrator = DatabaseMigration(args.config)
    
    if args.action == "upgrade":
        migrator.upgrade(args.revision)
    elif args.action == "downgrade":
        migrator.downgrade(args.revision)
    elif args.action == "migrate":
        migrator.migrate()
    elif args.action == "history":
        migrator.history()
    elif args.action == "current":
        migrator.current()
    elif args.action == "stamp":
        migrator.stamp(args.revision)
