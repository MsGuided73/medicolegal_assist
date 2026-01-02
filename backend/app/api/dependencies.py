"""
API Dependencies
Authentication using Supabase JWT validation
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict
from app.config import settings
from supabase import create_client, Client

security = HTTPBearer()

# Initialize Supabase admin client
supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_KEY
)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict:
    """
    Validate Supabase JWT token and return current user
    """
    token = credentials.credentials
    
    try:
        # Verify JWT token with Supabase
        user_response = supabase.auth.get_user(token)
        
        if not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = user_response.user
        
        return {
            "id": user.id,
            "email": user.email,
            "role": user.user_metadata.get("role", "physician"),
            "full_name": user.user_metadata.get("full_name")
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_role(required_role: str):
    """
    Dependency to require specific user role
    Usage: Depends(require_role("admin"))
    """
    async def role_checker(
        current_user: Dict = Depends(get_current_user)
    ) -> Dict:
        if current_user["role"] != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This endpoint requires {required_role} role"
            )
        return current_user
    
    return role_checker
