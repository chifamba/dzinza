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

    # Automatically update `updated_at` timestamp on modification
    # This is more of a convention for saving, Pydantic itself doesn't enforce this on set.
    # You'd typically set this in your CRUD update methods.
    # def model_post_init(self, __context: Any) -> None:
    #     # This is for Pydantic v2. For v1, you might use a root_validator with pre=False
    #     # or handle it in CRUD.
    #     super().model_post_init(__context)

    # @validator("updated_at", pre=True, always=True) # Pydantic v1 style
    # def set_updated_at_on_modification(cls, v, values):
    #     # This is tricky because validator runs on instantiation.
    #     # Better to handle in CRUD: before updating, set updated_at = datetime.now()
    #     return v or datetime.now(timezone.utc)

    def BSONEncodable(self) -> dict:
        """
        Returns a BSON-encodable version of the model.
        Handles ObjectId and datetime for MongoDB.
        Pydantic's model_dump(mode='json') with custom encoders also works well.
        """
        dumped = self.model_dump(by_alias=True, exclude_none=True) # Pydantic v2
        # dumped = self.dict(by_alias=True, exclude_none=True) # Pydantic v1

        # Ensure `id` is an ObjectId if present and not None
        if "_id" in dumped and dumped["_id"] is None and self.id is not None : # if default_factory was used
             dumped["_id"] = self.id
        elif "_id" in dumped and isinstance(dumped["_id"], str) and ObjectId.is_valid(dumped["_id"]):
             dumped["_id"] = ObjectId(dumped["_id"])

        # Convert datetimes to BSON UTC datetime if not already (usually handled by Motor)
        # for key, value in dumped.items():
        #     if isinstance(value, datetime):
        #         dumped[key] = value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
        return dumped
