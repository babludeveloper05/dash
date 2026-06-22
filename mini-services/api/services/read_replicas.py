"""
Read Replicas Configuration and Service
Supports read/write splitting for database scalability
"""
import os
from typing import Optional, List
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager

class ReadReplicaConfig:
    """Configuration for database read replicas"""
    
    def __init__(self):
        # Primary (write) database URL
        self.primary_url = os.getenv("DATABASE_URL", "sqlite:///./data/project_delta.db")
        
        # Read replica URLs (optional, for scaling reads)
        self.replica_urls = self._parse_replica_urls()
        
        # Engine instances
        self.primary_engine = None
        self.replica_engines = []
        
        # Session factories
        self.primary_session_factory = None
        self.replica_session_factories = []
        
    def _parse_replica_urls(self) -> List[str]:
        """Parse replica URLs from environment variable"""
        replica_str = os.getenv("READ_REPLICA_URLS", "")
        if not replica_str:
            return []
        
        return [url.strip() for url in replica_str.split(",") if url.strip()]
    
    def initialize(self):
        """Initialize database engines and session factories"""
        # Initialize primary engine
        if self.primary_url.startswith("sqlite"):
            self.primary_engine = create_engine(
                self.primary_url,
                connect_args={"check_same_thread": False},
                pool_pre_ping=True
            )
        else:
            self.primary_engine = create_engine(
                self.primary_url,
                pool_size=20,
                max_overflow=40,
                pool_pre_ping=True
            )
        
        self.primary_session_factory = sessionmaker(
            bind=self.primary_engine,
            autocommit=False,
            autoflush=False,
            expire_on_commit=False
        )
        
        # Initialize replica engines
        for replica_url in self.replica_urls:
            if replica_url.startswith("sqlite"):
                engine = create_engine(
                    replica_url,
                    connect_args={"check_same_thread": False}
                )
            else:
                engine = create_engine(
                    replica_url,
                    pool_size=10,
                    max_overflow=20,
                    pool_pre_ping=True
                )
            
            self.replica_engines.append(engine)
            self.replica_session_factories.append(
                sessionmaker(bind=engine, autocommit=False, autoflush=False)
            )
    
    def get_primary_session(self) -> Session:
        """Get a session connected to the primary (write) database"""
        if not self.primary_session_factory:
            self.initialize()
        return self.primary_session_factory()
    
    def get_replica_session(self, index: int = 0) -> Optional[Session]:
        """Get a session connected to a read replica"""
        if not self.replica_session_factories:
            # No replicas configured, fall back to primary
            return self.get_primary_session()
        
        # Round-robin or random selection
        idx = index % len(self.replica_session_factories)
        return self.replica_session_factories[idx]()
    
    def get_any_replica_session(self) -> Session:
        """Get any available replica session (or primary if no replicas)"""
        if not self.replica_session_factories:
            return self.get_primary_session()
        
        # Simple round-robin - in production, use health checks
        import random
        idx = random.randint(0, len(self.replica_session_factories) - 1)
        return self.get_replica_session(idx)
    
    @contextmanager
    def write_session(self):
        """Context manager for write operations (primary DB)"""
        session = self.get_primary_session()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            raise
        finally:
            session.close()
    
    @contextmanager
    def read_session(self, use_replica: bool = True):
        """Context manager for read operations (replica or primary)"""
        if use_replica and self.replica_session_factories:
            session = self.get_any_replica_session()
        else:
            session = self.get_primary_session()
        
        try:
            yield session
        finally:
            session.close()
    
    def check_replica_health(self) -> List[dict]:
        """Check health of all replicas"""
        results = []
        
        # Check primary
        try:
            with self.write_session() as session:
                session.execute(text("SELECT 1"))
            results.append({
                "type": "primary",
                "url": self.primary_url,
                "healthy": True
            })
        except Exception as e:
            results.append({
                "type": "primary",
                "url": self.primary_url,
                "healthy": False,
                "error": str(e)
            })
        
        # Check replicas
        for i, engine in enumerate(self.replica_engines):
            try:
                with engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                results.append({
                    "type": "replica",
                    "index": i,
                    "url": self.replica_urls[i],
                    "healthy": True
                })
            except Exception as e:
                results.append({
                    "type": "replica",
                    "index": i,
                    "url": self.replica_urls[i],
                    "healthy": False,
                    "error": str(e)
                })
        
        return results
    
    def is_replica_configured(self) -> bool:
        """Check if read replicas are configured"""
        return len(self.replica_urls) > 0

# Global configuration instance
db_config = ReadReplicaConfig()

def get_write_db() -> Session:
    """Dependency for write operations"""
    return db_config.get_primary_session()

def get_read_db(use_replica: bool = True) -> Session:
    """Dependency for read operations"""
    return db_config.get_any_replica_session() if use_replica else db_config.get_primary_session()
