# models.py
# File ini adalah cetak biru untuk tabel database Anda.
# Ini adalah versi final untuk MVP Opsi D.

from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime

# --- Model untuk Pengguna ---
# Ini akan menjadi tabel 'user' di database Anda
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nama: str = Field(index=True)
    email: str = Field(unique=True, index=True)
    
    # Field BARU untuk Opsi D (Login & Keamanan)
    hashed_password: str 
    
    # Field BARU untuk Opsi C/D (Peran & KPI)
    # Peran: 'pimpinan', 'staf_media', 'pm', 'intern'
    role: str = Field(index=True) 
    # Divisi: 'GD', 'JO', 'SMO', 'Staf', 'Pimpinan', dll.
    divisi: str = Field(index=True) 

    # Hubungan: Satu User (intern) bisa ditugaskan banyak Task
    # "tasks_assigned" adalah nama variabel di Python
    # "assignee" adalah nama variabel di class Task
    tasks_assigned: List["Task"] = Relationship(back_populates="assignee")

# --- Model untuk Proyek ---
# Ini akan menjadi tabel 'project' di database Anda
class Project(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nama: str = Field(index=True)

    # Hubungan: Satu Project memiliki banyak Task
    tasks: List["Task"] = Relationship(back_populates="project")

# --- Model Inti: TUGAS (TASK) ---
# Ini adalah tabel 'task', 'bahan bakar' utama untuk LLM
class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    
    # Field BARU untuk Opsi C (Detail Tugas)
    description: Optional[str] = None 
    
    # Status: "To Do", "Done", "Reviewed"
    status: str = Field(default="To Do", index=True) 
    priority: str = Field(default="Medium")
    
    # --- Timestamps (Untuk metrik Integrity & Resilient) ---
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Field BARU untuk Opsi C (Kepatuhan Deadline)
    due_date: Optional[datetime] = None 
    
    completed_at: Optional[datetime] = None # Diisi saat status -> "Done"
    
    # --- Submission & Review (Bahan Bakar LLM) ---
    
    # Field BARU untuk Opsi C (Link Hasil Kerja)
    submission_link: Optional[str] = None 
    
    # Input dari Staf Media (Core Value: Creative, Collaborative, Innovative)
    rating: Optional[int] = None 
    feedback: Optional[str] = None 
    
    # --- Kunci Relasi (Foreign Keys) ---
    project_id: int = Field(foreign_key="project.id")
    assignee_id: int = Field(foreign_key="user.id") # Siapa yang mengerjakan (Intern)
    
    # --- Relationship Links ---
    # Menghubungkan ke class di atas
    project: Project = Relationship(back_populates="tasks")
    assignee: User = Relationship(back_populates="tasks_assigned")