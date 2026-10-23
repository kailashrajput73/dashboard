from __future__ import annotations

from typing import Literal, TYPE_CHECKING

from app.errors import AuthenticationError

if TYPE_CHECKING:
    from app.deps.auth import AuthenticatedPrincipal

ModuleId = Literal[
    "dashboard",
    "product-management",
    "racks",
    "purchases",
    "inventory",
    "rfqs",
    "partners",
    "service-requests",
    "dispatches",
    "settings",
    "team",
]

AccessLevel = Literal["hidden", "read", "write"]

ALL_MODULES: tuple[ModuleId, ...] = (
    "dashboard",
    "product-management",
    "racks",
    "purchases",
    "inventory",
    "rfqs",
    "partners",
    "service-requests",
    "dispatches",
    "settings",
    "team",
)

DEFAULT_MODULE_ACCESS_BY_ROLE: dict[str, dict[ModuleId, AccessLevel]] = {
    "store_manager": {
        "dashboard": "read",
        "product-management": "read",
        "racks": "read",
        "purchases": "write",
        "inventory": "read",
        "rfqs": "write",
        "partners": "read",
        "service-requests": "read",
        "dispatches": "write",
        "settings": "hidden",
        "team": "hidden",
    },
    "staff": {
        "dashboard": "read",
        "product-management": "read",
        "racks": "hidden",
        "purchases": "hidden",
        "inventory": "read",
        "rfqs": "hidden",
        "partners": "hidden",
        "service-requests": "hidden",
        "dispatches": "hidden",
        "settings": "hidden",
        "team": "hidden",
    },
}


def _normalize_level(value: object) -> AccessLevel | None:
    if value in ("hidden", "read", "write"):
        return value  # type: ignore[return-value]
    return None


def resolved_module_access(
    role: str,
    module_access: dict[str, str] | None,
) -> dict[ModuleId, AccessLevel]:
    role_defaults = DEFAULT_MODULE_ACCESS_BY_ROLE.get(role, {})
    overrides = module_access or {}
    resolved: dict[ModuleId, AccessLevel] = {}
    for module in ALL_MODULES:
        override = _normalize_level(overrides.get(module))
        if override is not None:
            resolved[module] = override
            continue
        resolved[module] = role_defaults.get(module, "hidden")
    return resolved


def module_level(
    principal: AuthenticatedPrincipal,
    module: ModuleId,
) -> AccessLevel:
    if principal.role == "admin":
        return "write"
    policy = resolved_module_access(principal.role, principal.module_access)
    return policy.get(module, "hidden")


def assert_module_read(principal: AuthenticatedPrincipal, module: ModuleId) -> None:
    level = module_level(principal, module)
    if level == "hidden":
        raise AuthenticationError(403, "Insufficient permissions")


def assert_module_write(principal: AuthenticatedPrincipal, module: ModuleId) -> None:
    level = module_level(principal, module)
    if level != "write":
        raise AuthenticationError(403, "Insufficient permissions")


def assert_role_admin(principal: AuthenticatedPrincipal) -> None:
    if principal.role != "admin":
        raise AuthenticationError(403, "Insufficient permissions")


def public_module_access(
    role: str,
    module_access: dict[str, str] | None,
) -> dict[str, str]:
    if role == "admin":
        return {module: "write" for module in ALL_MODULES}
    resolved = resolved_module_access(role, module_access)
    return dict(resolved)
