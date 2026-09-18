from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import DeclarativeBase
import os
from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env file


class Base(DeclarativeBase):
    pass


engine = create_engine(os.getenv("DATABASE_URL"))


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    full_name = Column(String)
    age = Column(Integer)

Base.metadata.create_all(engine)