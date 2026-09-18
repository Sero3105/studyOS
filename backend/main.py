from fastapi import FastAPI

from routers.userRegister_router import router as user_register_router


app = FastAPI()

app.include_router(user_register_router)