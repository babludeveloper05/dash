"""
Database Backup Script for Project Delta
Creates automated backups of SQLite databases with compression
"""
import os
import shutil
import sqlite3
import gzip
import hashlib
from datetime import datetime
from pathlib import Path

class DatabaseBackup:
    def __init__(self, db_path: str, backup_dir: str = "backups"):
        self.db_path = db_path
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
    
    def create_backup(self) -> str:
        """Create a compressed backup of the database"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        db_name = Path(self.db_path).stem
        
        # Create backup filename
        backup_filename = f"{db_name}_{timestamp}.db"
        backup_path = self.backup_dir / backup_filename
        compressed_path = self.backup_dir / f"{backup_filename}.gz"
        
        # Step 1: Create a copy of the database using SQLite backup API
        # This ensures consistency even if the database is in use
        try:
            source_conn = sqlite3.connect(self.db_path)
            backup_conn = sqlite3.connect(str(backup_path))
            
            with backup_conn:
                source_conn.backup(backup_conn)
            
            source_conn.close()
            backup_conn.close()
            
            print(f"✓ Database copied to {backup_path}")
            
        except Exception as e:
            print(f"✗ Failed to copy database: {e}")
            raise
        
        # Step 2: Compress the backup
        try:
            with open(backup_path, 'rb') as f_in:
                with gzip.open(compressed_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            # Remove uncompressed copy
            os.remove(backup_path)
            
            print(f"✓ Backup compressed to {compressed_path}")
            
        except Exception as e:
            print(f"✗ Failed to compress backup: {e}")
            raise
        
        # Step 3: Calculate checksum
        checksum = self._calculate_checksum(compressed_path)
        checksum_path = self.backup_dir / f"{backup_filename}.gz.sha256"
        
        with open(checksum_path, 'w') as f:
            f.write(f"{checksum}  {compressed_path.name}\n")
        
        print(f"✓ Checksum saved to {checksum_path}")
        
        return str(compressed_path)
    
    def _calculate_checksum(self, file_path: Path) -> str:
        """Calculate SHA256 checksum of a file"""
        sha256_hash = hashlib.sha256()
        
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        
        return sha256_hash.hexdigest()
    
    def list_backups(self) -> list:
        """List all available backups"""
        backups = []
        
        for file in self.backup_dir.glob("*.gz"):
            if file.suffix == ".gz" and ".sha256" not in file.name:
                stat = file.stat()
                backups.append({
                    "filename": file.name,
                    "size_bytes": stat.st_size,
                    "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "path": str(file)
                })
        
        return sorted(backups, key=lambda x: x["created_at"], reverse=True)
    
    def restore_backup(self, backup_path: str, target_path: str = None):
        """Restore database from a backup"""
        backup_file = Path(backup_path)
        
        if not backup_file.exists():
            raise FileNotFoundError(f"Backup file not found: {backup_path}")
        
        # Determine target path
        if target_path is None:
            target_path = self.db_path
        
        target_file = Path(target_path)
        
        # If backup is compressed, decompress first
        if backup_file.suffix == ".gz":
            print(f"Decompressing {backup_file}...")
            with gzip.open(backup_file, 'rb') as f_in:
                with open(target_file, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
        else:
            # Direct copy
            shutil.copy2(backup_file, target_file)
        
        print(f"✓ Database restored to {target_path}")
        return target_path
    
    def cleanup_old_backups(self, keep_days: int = 7, keep_count: int = 5):
        """Remove old backups, keeping only recent ones"""
        backups = self.list_backups()
        
        # Keep at least keep_count backups
        if len(backups) <= keep_count:
            print(f"Only {len(backups)} backups found, nothing to clean up")
            return
        
        # Calculate cutoff date
        cutoff_date = datetime.utcnow()
        cutoff_date = cutoff_date.replace(
            day=cutoff_date.day - keep_days
        )
        
        removed_count = 0
        
        for i, backup in enumerate(backups):
            # Always keep the most recent keep_count backups
            if i < keep_count:
                continue
            
            backup_date = datetime.fromisoformat(backup["created_at"])
            
            # Remove if older than cutoff
            if backup_date < cutoff_date:
                backup_file = Path(backup["path"])
                checksum_file = self.backup_dir / f"{backup_file.name}.sha256"
                
                try:
                    os.remove(backup_file)
                    if checksum_file.exists():
                        os.remove(checksum_file)
                    
                    print(f"✓ Removed old backup: {backup['filename']}")
                    removed_count += 1
                    
                except Exception as e:
                    print(f"✗ Failed to remove {backup['filename']}: {e}")
        
        print(f"Cleaned up {removed_count} old backup(s)")
        return removed_count


# CLI interface
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Database Backup Utility")
    parser.add_argument("--db", default="project_delta.db", help="Database path")
    parser.add_argument("--backup-dir", default="backups", help="Backup directory")
    parser.add_argument("--action", choices=["backup", "list", "restore", "cleanup"], required=True)
    parser.add_argument("--restore-file", help="Backup file to restore")
    parser.add_argument("--keep-days", type=int, default=7, help="Days to keep backups")
    parser.add_argument("--keep-count", type=int, default=5, help="Number of backups to keep")
    
    args = parser.parse_args()
    
    backup_util = DatabaseBackup(args.db, args.backup_dir)
    
    if args.action == "backup":
        backup_path = backup_util.create_backup()
        print(f"\n✓ Backup created successfully: {backup_path}")
    
    elif args.action == "list":
        backups = backup_util.list_backups()
        if not backups:
            print("No backups found")
        else:
            print(f"\nFound {len(backups)} backup(s):\n")
            for backup in backups:
                size_mb = backup["size_bytes"] / (1024 * 1024)
                print(f"  {backup['filename']} ({size_mb:.2f} MB) - {backup['created_at']}")
    
    elif args.action == "restore":
        if not args.restore_file:
            print("Error: --restore-file is required for restore action")
            exit(1)
        
        backup_util.restore_backup(args.restore_file)
        print("\n✓ Restore completed successfully")
    
    elif args.action == "cleanup":
        removed = backup_util.cleanup_old_backups(
            keep_days=args.keep_days,
            keep_count=args.keep_count
        )
        print(f"\n✓ Cleanup completed, removed {removed} backup(s)")
