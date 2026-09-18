from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str | None = None

    model_config = ConfigDict(from_attributes=True)