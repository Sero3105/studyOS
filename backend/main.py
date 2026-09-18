from fastapi import FastAPI
from pydantic import BaseModel
import database

class User(BaseModel):
    username: str
    email: str
    full_name: str | None = None
    age: int | None = None

app = FastAPI()