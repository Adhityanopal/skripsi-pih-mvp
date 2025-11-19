# config.py
# File ini akan menjadi SATU-SATUNYA file yang membaca .env

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Variabel Database
    DATABASE_URL: str
    
    # Variabel Gemini
    GEMINI_API_KEY: str
    
    # Variabel Auth (JWT)
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    class Config:
        env_file = ".env"

# Buat SATU instance settings untuk diimpor oleh file lain
settings = Settings()