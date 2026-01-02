"""
API Dependencies
Shared dependencies for authentication, etc.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict
import jwt
import os

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict:
    """
    Validate JWT token and return current user
    
    This is a simplified version - you should implement proper JWT validation
    """
    token = credentials.credentials
    
    try:
        # TODO: Implement actual JWT validation with Supabase
        # For now, return a mock user
        # In production, decode and validate the JWT token from Supabase
        
        # Placeholder - replace with actual token validation
        user = {
            "id": "00000000-0000-0000-0000-000000000000",
            "email": "user@example.com",
            "role": "physician"
        }
        
        return user
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
