"""
Database connection and utilities
"""
from supabase import create_client, Client
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Supabase client instances
supabase: Client = None
supabase_admin: Client = None


async def init_db():
    """Initialize database connections"""
    global supabase, supabase_admin
    
    try:
        # Public client (with anon key)
        supabase = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_ANON_KEY
        )
        logger.info("Supabase client initialized")
        
        # Admin client (with service role key)
        supabase_admin = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_KEY
        )
        logger.info("Supabase admin client initialized")
        
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise


def get_supabase() -> Client:
    """Get Supabase client"""
    return supabase


def get_supabase_admin() -> Client:
    """Get Supabase admin client"""
    return supabase_admin
