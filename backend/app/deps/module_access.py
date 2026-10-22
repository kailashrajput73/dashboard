from __future__ import annotations

from typing import Annotated

from fastapi import Depends

from app.access_modules import ModuleId, assert_module_read, assert_module_write, assert_role_admin
from app.deps.auth import AuthenticatedPrincipal, get_current_admin


def module_read(module: ModuleId):
    def _dependency(
        admin: Annotated[AuthenticatedPrincipal, Depends(get_current_admin)],
    ) -> AuthenticatedPrincipal:
        assert_module_read(admin, module)
        return admin

    return _dependency


def module_write(module: ModuleId):
    def _dependency(
        admin: Annotated[AuthenticatedPrincipal, Depends(get_current_admin)],
    ) -> AuthenticatedPrincipal:
        assert_module_write(admin, module)
        return admin

    return _dependency


def admin_role_only(
    admin: Annotated[AuthenticatedPrincipal, Depends(get_current_admin)],
) -> AuthenticatedPrincipal:
    assert_role_admin(admin)
    return admin


AdminRolePrincipal = Annotated[AuthenticatedPrincipal, Depends(admin_role_only)]
