from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime

class User(SQLModel, table=True):
    __tablename__ = "tbl_user"
    
    # Primary Key otomatis ter-index oleh database
    user_id: str = Field(primary_key=True, max_length=7)
    nama: str = Field(max_length=30)
    # Email butuh index karena dipakai untuk pencarian saat Login
    email: str = Field(unique=True, index=True, max_length=30)
    password: str = Field(max_length=255)
    role: str
    divisi: str 
    
    tasks: List["Task"] = Relationship(back_populates="user")


class Task(SQLModel, table=True):
    __tablename__ = "tbl_task"
    
    # Primary Key otomatis ter-index oleh database
    task_id: str = Field(primary_key=True, max_length=7)
    
    # Foreign Key ini KITA INDEX karena sangat sering dicari saat Generate Laporan
    user_id: str = Field(foreign_key="tbl_user.user_id", index=True, max_length=7) 
    
    title: str = Field(max_length=50)
    description: Optional[str] = None 
    status: str = Field(default="To Do") 
    priority: str = Field(default="Medium")
    
    due_date: Optional[datetime] = None 
    completed_at: Optional[datetime] = None 
    
    submission_link: Optional[str] = Field(default=None, max_length=255)
    
    rating: Optional[int] = None 
    feedback: Optional[str] = None 
    
    user: Optional[User] = Relationship(back_populates="tasks")