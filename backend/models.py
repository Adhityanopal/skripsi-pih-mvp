# models.py - Representasi Database (ERD)
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime, date

# --- [ERD-01] ENTITAS TBL_USER ---
class User(SQLModel, table=True):
    __tablename__ = "tbl_user"
    id: Optional[int] = Field(default=None, primary_key=True)
    nama: str = Field(index=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str 
    # Role: administrator, team lead, staf media, intern, kepala pih & koordinator
    role: str = Field(index=True) 
    divisi: str = Field(index=True) 
    tasks_assigned: List["Task"] = Relationship(back_populates="assignee")

# --- [ERD-02] ENTITAS TBL_TASK ---
class Task(SQLModel, table=True):
    __tablename__ = "tbl_task"
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None 
    status: str = Field(default="To Do", index=True) 
    priority: str = Field(default="Medium")
    
    # // NOTES: Atribut Waktu untuk Validasi Logika Due Date //
    created_at: datetime = Field(default_factory=datetime.utcnow) 
    due_date: Optional[date] = None 
    completed_at: Optional[datetime] = None 
    
    submission_link: Optional[str] = None 
    rating: Optional[int] = None 
    feedback: Optional[str] = None 
    
    # Relasi ke User (Assignee)
    assignee_id: int = Field(foreign_key="tbl_user.id")
    assignee: Optional[User] = Relationship(back_populates="tasks_assigned")