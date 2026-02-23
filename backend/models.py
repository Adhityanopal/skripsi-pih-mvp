from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nama: str = Field(index=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str 
    role: str = Field(index=True) 
    divisi: str = Field(index=True) 
    tasks_assigned: List["Task"] = Relationship(back_populates="assignee")

class Project(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nama: str = Field(index=True)
    tasks: List["Task"] = Relationship(back_populates="project")

class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None 
    status: str = Field(default="To Do", index=True) 
    priority: str = Field(default="Medium")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    due_date: Optional[datetime] = None 
    completed_at: Optional[datetime] = None 
    submission_link: Optional[str] = None 
    
    # Input Review
    rating: Optional[int] = None 
    feedback: Optional[str] = None 
    
    # Menghitung revisi untuk nilai Resilient
    revision_count: int = Field(default=0) 
    
    # Foreign Keys
    project_id: int = Field(foreign_key="project.id")
    assignee_id: int = Field(foreign_key="user.id") 
    
    # Relationships
    project: Project = Relationship(back_populates="tasks")
    assignee: User = Relationship(back_populates="tasks_assigned")