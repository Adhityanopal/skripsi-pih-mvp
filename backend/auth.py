# =================================================================
# FILE: auth.py (VERSI FINAL - RBAC 5 ROLE EKSPLISIT)
# FUNGSI: Logika Keamanan, JWT Token, dan Otorisasi
# =================================================================

import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session, select, SQLModel 

from config import settings 
from database import get_session 
from models import User

class Token(SQLModel):
    access_token: str
    token_type: str

# --- 1. Konfigurasi Keamanan ---
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token") 

# --- 2. Fungsi Utilitas Keamanan ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

# --- 3. Validasi Identitas (Authentication) ---
async def get_current_user(session: Session = Depends(get_session), token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Skenario Gagal: Sesi berakhir atau token tidak valid.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None: raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = session.exec(select(User).where(User.email == email)).first()
    if user is None: raise credentials_exception
        
    return user

# =================================================================
# --- 4. Fungsi Hak Akses Aktor (Role-Based Access Control) ---
# Mengunci endpoint API sesuai Use Case Diagram
# =================================================================

async def get_current_administrator(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "administrator":
        raise HTTPException(status_code=403, detail="Skenario Gagal: Akses ditolak. Khusus Administrator.")
    return current_user

async def get_current_team_lead(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "team lead":
        raise HTTPException(status_code=403, detail="Skenario Gagal: Akses ditolak. Khusus Team Lead.")
    return current_user

async def get_current_staf_media(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "staf media":
        raise HTTPException(status_code=403, detail="Skenario Gagal: Akses ditolak. Khusus Staf Media.")
    return current_user

async def get_current_kepala_pih(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "kepala pih & koordinator":
        raise HTTPException(status_code=403, detail="Skenario Gagal: Akses ditolak. Khusus Pimpinan.")
    return current_user

# (Untuk Intern, kita cukup pakai get_current_user biasa, lalu validasi id task-nya seperti yang sudah ada di main.py)