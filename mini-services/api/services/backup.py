"""
Database Backup Service
Handles automated backups and restoration of SQLite databases
"""
import sqlite3
import shutil
import os
from datetime import datetime
from pathlib import Path
from typing import Optional
import gzip
import json

class BackupService:
    def __init__(self, db_path: str, backup_dir: str = "data/backups"):
        self.db_path = db_path
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
    def create_backup(self, compressed: bool = True) -> str:
        """Create a backup of the database"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"backup_{timestamp}.db"
        backup_path = self.backup_dir / backup_name
        
        # Ensure database connection is closed before copying
        if os.path.exists(self.db_path):
            if compressed:
                # Create compressed backup
                compressed_path = self.backup_dir / f"{backup_name}.gz"
                with open(self.db_path, 'rb') as f_in:
                    with gzip.open(compressed_path, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                return str(compressed_path)
            else:
                # Create uncompressed backup
                shutil.copy2(self.db_path, backup_path)
                return str(backup_path)
        
        raise FileNotFoundError(f"Database file not found: {self.db_path}")
    
    def restore_backup(self, backup_path: str) -> bool:
        """Restore database from backup"""
        backup_file = Path(backup_path)
        
        if not backup_file.exists():
            raise FileNotFoundError(f"Backup file not found: {backup_path}")
        
        # If backup is compressed, decompress first
        if backup_path.endswith('.gz'):
            temp_path = self.backup_dir / "temp_restore.db"
            with gzip.open(backup_file, 'rb') as f_in:
                with open(temp_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            source_path = temp_path
        else:
            source_path = backup_file
        
        # Restore backup
        shutil.copy2(source_path, self.db_path)
        
        # Clean up temp file if created
        if backup_path.endswith('.gz') and os.path.exists(temp_path):
            os.remove(temp_path)
        
        return True
    
    def list_backups(self) -> list[dict]:
        """List all available backups"""
        backups = []
        for file in self.backup_dir.glob("backup_*"):
            if file.suffix in ['.db', '.gz']:
                stat = file.stat()
                backups.append({
                    "filename": file.name,
                    "path": str(file),
                    "size": stat.st_size,
                    "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    "compressed": file.suffix == '.gz'
                })
        
        return sorted(backups, key=lambda x: x["created"], reverse=True)
    
    def delete_old_backups(self, keep_count: int = 5) -> list[str]:
        """Delete old backups, keeping only the most recent ones"""
        backups = self.list_backups()
        deleted = []
        
        if len(backups) > keep_count:
            for backup in backups[keep_count:]:
                os.remove(backup["path"])
                deleted.append(backup["filename"])
        
        return deleted
    
    def get_backup_stats(self) -> dict:
        """Get statistics about backups"""
        backups = self.list_backups()
        total_size = sum(b["size"] for b in backups)
        compressed_count = sum(1 for b in backups if b["compressed"])
        
        return {
            "total_backups": len(backups),
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "compressed_count": compressed_count,
            "uncompressed_count": len(backups) - compressed_count,
            "oldest_backup": backups[-1]["created"] if backups else None,
            "newest_backup": backups[0]["created"] if backups else None
        }

# Global instance
backup_service = BackupService("data/project_delta.db")
