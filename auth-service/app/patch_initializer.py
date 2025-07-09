"""
Initialization file for the auth service patches.

This file imports and applies all patches to fix issues with the auth service.
"""

# Import the patches
from app.patches import TokenPayload, TokenRefreshPatch
from app.model_patches import apply_refresh_token_patches
from app.register_patches import apply_register_request_patch
from app.register_endpoint_patch import apply_register_endpoint_patch
from app.refresh_patches import apply_refresh_token_patches as apply_token_refresh_patches
from app.refresh_endpoint_patch import apply_refresh_endpoint_patch
from app.jwt_utils_patch import apply_jwt_utils_patch

# Apply the patches
apply_jwt_utils_patch()
apply_refresh_token_patches()
apply_register_request_patch()
apply_register_endpoint_patch()
apply_token_refresh_patches()
apply_refresh_endpoint_patch()

# Replace the original TokenPayload with our patched version
import app.schemas as schemas
schemas.TokenPayload = TokenPayload

# Replace the create_refresh_token function with our patched version
import app.crud as crud
crud.create_refresh_token = TokenRefreshPatch.create_refresh_token_fix
