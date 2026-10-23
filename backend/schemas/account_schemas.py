from pydantic import BaseModel, Field

class PasswordChange(BaseModel):
    current_password: str = Field(max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

class AccountDelete(BaseModel):
    password: str = Field(max_length=128)
