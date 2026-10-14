"""Pydantic <-> Neo4j property serialization.

Neo4j node properties are flat (str/int/float/bool/lists thereof). Nested
Pydantic models and lists-of-models are JSON-encoded into string properties.
UUIDs become strings, Enums become their values.
"""

import json
from enum import Enum
from typing import Any, Type, TypeVar
from uuid import UUID

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

# Fields stored as native Neo4j properties (not JSON). Everything else that is
# a nested model / list-of-models goes to JSON.
_NATIVE_TYPES = (str, int, float, bool)


def _encode_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (list, tuple)):
        if not value:
            return []
        # List of dicts (from nested models) -> JSON string;
        # list of scalars -> native Neo4j list.
        if isinstance(value[0], dict):
            return json.dumps(value)
        return list(value)
    if isinstance(value, dict):
        return json.dumps(value)
    return value


def to_properties(model: BaseModel) -> dict[str, Any]:
    """Flatten a Pydantic model into Neo4j-safe properties.

    Uses mode="json" so UUIDs/Enums/dates become JSON-safe primitives first;
    nested structures are then JSON-encoded into string properties.
    """
    props: dict[str, Any] = {}
    for name, value in model.model_dump(mode="json").items():
        encoded = _encode_value(value)
        # Skip None to keep nodes tidy (missing prop == null in Cypher)
        if encoded is not None:
            props[name] = encoded
    return props


def _decode_value(value: Any, field_type: Any) -> Any:
    """Best-effort decode of a Neo4j property back to a Python value.

    We don't try to be clever: Pydantic will coerce strings/JSON on
    model_validate. This just unwraps JSON strings for known-complex fields.
    """
    return value


def from_record(model_cls: Type[T], record: dict[str, Any]) -> T:
    """Build a Pydantic model from a Neo4j node property dict.

    JSON-encoded fields are parsed back; Pydantic handles the rest
    (UUID strings, enum values, nested models from dicts).
    """
    data: dict[str, Any] = {}
    for key, value in record.items():
        if isinstance(value, str) and value.startswith(("{", "[")):
            try:
                data[key] = json.loads(value)
                continue
            except (json.JSONDecodeError, ValueError):
                pass
        data[key] = value
    return model_cls.model_validate(data)
