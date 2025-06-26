from pydantic import BaseModel, Field, validator
from typing import Optional, Any
from datetime import datetime, timezone
from bson import ObjectId
import uuid # For user_id which comes from auth-service (Postgres UUID)

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v: Any, _: Any) -> ObjectId:
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema): # Pydantic v1
        field_schema.update(type="string")

    # For Pydantic v2, use core_schema
    # @classmethod
    # def __get_pydantic_core_schema__(cls, source_type: Any, handler: Any) -> core_schema.CoreSchema:
    #     from pydantic_core import core_schema
    #     return core_schema.json_or_python_schema(
    #         json_schema=core_schema.str_schema(),
    #         python_schema=core_schema.union_schema([
    #             core_schema.is_instance_schema(ObjectId),
    #             core_schema.chain_schema([
    #                 core_schema.str_schema(),
    #                 core_schema.no_info_plain_validator_function(cls.validate),
    #             ])
    #         ]),
    #         serialization=core_schema.plain_serializer_function_ser_schema(lambda x: str(x)),
    #     )


class BaseDocumentModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        from_attributes = True # orm_mode = True for Pydantic v1
        populate_by_name = True # Allows using alias _id for id field
        json_encoders = {
            ObjectId: str,
            PyObjectId: str, # Ensure PyObjectId is also encoded as str
            datetime: lambda dt: dt.isoformat(),
            uuid.UUID: lambda u: str(u)
        }

    def BSONEncodable(self) -> dict:
        dumped = self.model_dump(by_alias=True, exclude_none=True)

        if "_id" in dumped and dumped["_id"] is None and self.id is not None :
             dumped["_id"] = self.id
        elif "_id" in dumped and isinstance(dumped["_id"], str) and ObjectId.is_valid(dumped["_id"]):
             dumped["_id"] = ObjectId(dumped["_id"])
        return dumped
