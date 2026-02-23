# auth.py
# File ini berisi semua logika keamanan, autentikasi, dan otorisasi.
# Versi ini sudah DIPERBAIKI:
# 1. Mengimpor 'settings' dari 'config.py' (bukan mendefinisikan AuthSettings)
# 2. Menambahkan definisi 'class Token' yang hilang

import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
# --- PERBAIKAN: Impor SQLModel ---
from sqlmodel import Session, select, SQLModel 

# Impor dari file lokal
from config import settings 
from database import get_session 
from models import User

# --- PERBAIKAN: Pindahkan definisi 'class Token' ke sini ---
class Token(SQLModel):
    access_token: str
    token_type: str

# --- 1. Konfigurasi Keamanan ---
# (Kita tidak perlu class AuthSettings lagi, karena kita impor 'settings' dari config.py)

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token") # Endpoint login

# --- 2. Fungsi Utilitas Keamanan ---

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Mengecek apakah password polos cocok dengan hash di database."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Menghasilkan hash dari password polos."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Membuat Token JWT (tiket login)."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        # Ambil durasi token default dari .env via 'settings'
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        
    to_encode.update({"exp": expire})
    
    # Buat token menggunakan Secret Key dan Algoritma dari 'settings'
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt

# --- 3. Fungsi Dependensi (Dependency Functions) ---

async def get_current_user(
    session: Session = Depends(get_session), 
    token: str = Depends(oauth2_scheme)
) -> User:
    """
    Fungsi ini akan memvalidasi token dan mengembalikan data User.
    """
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Coba decode token menggunakan 'settings'
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
            
    except JWTError:
        # Jika token salah format atau kadaluarsa
        raise credentials_exception
    
    # Ambil user dari database
    statement = select(User).where(User.email == email)
    user = session.exec(statement).first()
    
    if user is None:
        # Jika user di token tidak ada lagi di database
        raise credentials_exception
        
    return user # Kembalikan objek User yang utuh

# --- 4. Fungsi Otorisasi ---

async def get_current_active_manager(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Mengecek apakah user yang sedang login memiliki peran 'manager' 
    (staf_media, pm, pimpinan).
    """
    # Berdasarkan hierarki Anda, 'intern' adalah satu-satunya peran non-manajerial
    if current_user.role == "intern":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operasi ini tidak diizinkan untuk peran Anda",
        )
    return current_user