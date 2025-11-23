# main.py - FULL CODE FINAL (MVP Opsi D)
# Termasuk perbaikan CORS, Auth, dan Logic Laporan

# --- 1. IMPOR LIBRARY ---
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, SQLModel, Field
from typing import Optional, List
from datetime import datetime, timedelta, date
import google.generativeai as genai
import json

# --- 2. IMPOR LOKAL ---
from config import settings
from database import create_db_and_tables, get_session, engine
from models import (
    User, Project, Task 
)
from auth import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    get_current_user,
    get_current_active_manager,
    Token # Diimpor dari auth.py
)

# --- 3. SKEMA PYDANTIC (Input/Output API) ---

# User Schemas
class UserRead(SQLModel):
    id: int
    nama: str
    email: str
    role: str
    divisi: str

class UserCreate(SQLModel):
    nama: str
    email: str
    password: str 
    role: str 
    divisi: str

class UserUpdate(SQLModel):
    nama: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    divisi: Optional[str] = None

# Project Schemas
class ProjectCreate(SQLModel):
    nama: str

class ProjectRead(SQLModel):
    id: int
    nama: str

# Task Schemas
class TaskCreate(SQLModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "Medium"
    due_date: Optional[date] = None
    assignee_id: int 
    project_id: int 

class TaskRead(SQLModel):
    id: int
    title: str
    description: Optional[str] = None
    priority: str
    status: str
    created_at: datetime
    due_date: Optional[date] = None
    completed_at: Optional[datetime] = None
    submission_link: Optional[str] = None
    rating: Optional[int] = None
    feedback: Optional[str] = None
    project_id: int
    assignee_id: int

class TaskSubmission(SQLModel):
    submission_link: str

class TaskReview(SQLModel):
    rating: int = Field(ge=1, le=5)
    feedback: str

# Report Schemas
class ReportRequest(SQLModel):
    user_id: int
    start_date: str # "YYYY-MM-DD"
    end_date: str   # "YYYY-MM-DD"

class DivisionReportRequest(SQLModel):
    divisi: str 
    start_date: str 
    end_date: str   

# --- 4. INISIALISASI APP & CORS ---

app = FastAPI(title="API Sistem Pelaporan Kinerja PIH (MVP Opsi D)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# Konfigurasi Google Gemini API
try:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    print("INFO:     Konfigurasi Gemini API berhasil.")
except Exception as e:
    print(f"ERROR:   Konfigurasi Gemini API GAGAL: {e}")

# --- 5. EVENT STARTUP ---
@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# --- 6. ENDPOINT AUTH & USER ---
@app.post("/token", response_model=Token)
async def login_for_access_token(
    session: Session = Depends(get_session), 
    form_data: OAuth2PasswordRequestForm = Depends() 
):
    statement = select(User).where(User.email == form_data.username)
    user = session.exec(statement).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password salah",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/users", response_model=UserRead)
def create_user(
    *,
    session: Session = Depends(get_session),
    user_data: UserCreate
):
    statement_check = select(User).where(User.email == user_data.email)
    existing_user = session.exec(statement_check).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
        
    hashed_password = get_password_hash(user_data.password)
    user_dict = user_data.model_dump()
    user_dict["hashed_password"] = hashed_password
    del user_dict["password"] 
    
    db_user = User(**user_dict)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user

@app.get("/users/me", response_model=UserRead)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.get("/users", response_model=List[UserRead])
async def read_users(
    session: Session = Depends(get_session),
    current_manager: User = Depends(get_current_active_manager) 
):
    statement = select(User)
    users = session.exec(statement).all()
    return users

# --- 7. ENDPOINT PROJECT & TASK ---
@app.post("/projects", response_model=ProjectRead)
def create_project(
    *,
    session: Session = Depends(get_session),
    project_data: ProjectCreate,
    current_manager: User = Depends(get_current_active_manager) 
):
    db_project = Project.model_validate(project_data)
    session.add(db_project)
    session.commit()
    session.refresh(db_project)
    return db_project

@app.post("/tasks", response_model=TaskRead)
def create_task(
    *,
    session: Session = Depends(get_session),
    task_data: TaskCreate,
    current_manager: User = Depends(get_current_active_manager) 
):
    project = session.get(Project, task_data.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project tidak ditemukan")
    if task_data.assignee_id:
        user = session.get(User, task_data.assignee_id)
        if not user:
            raise HTTPException(status_code=404, detail="User (Intern) tidak ditemukan")

    db_task = Task.model_validate(task_data)
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task

@app.get("/tasks/me", response_model=List[TaskRead])
def read_my_tasks(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user) 
):
    statement = select(Task).where(Task.assignee_id == current_user.id)
    tasks = session.exec(statement).all()
    return tasks

@app.get("/tasks", response_model=List[TaskRead])
def read_all_tasks(
    session: Session = Depends(get_session),
    current_manager: User = Depends(get_current_active_manager) 
):
    statement = select(Task)
    tasks = session.exec(statement).all()
    return tasks

@app.put("/tasks/{task_id}/complete", response_model=TaskRead)
def complete_task(
    *,
    session: Session = Depends(get_session),
    task_id: int,
    link: TaskSubmission,
    current_user: User = Depends(get_current_user)
):
    db_task = session.get(Task, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
    
    if db_task.assignee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Tidak diizinkan menyelesaikan tugas ini")
        
    if db_task.status == "Done" or db_task.status == "Reviewed":
         raise HTTPException(status_code=400, detail="Tugas sudah selesai")

    db_task.status = "Done"
    db_task.completed_at = datetime.utcnow()
    db_task.submission_link = link.submission_link

    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task

@app.put("/tasks/{task_id}/review", response_model=TaskRead)
def review_task(
    *,
    session: Session = Depends(get_session),
    task_id: int,
    review_data: TaskReview,
    current_manager: User = Depends(get_current_active_manager) 
):
    db_task = session.get(Task, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
    
    if db_task.status == "To Do":
        raise HTTPException(status_code=400, detail="Tugas belum selesai")

    db_task.rating = review_data.rating
    db_task.feedback = review_data.feedback
    db_task.status = "Reviewed"

    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task

# --- 8. ENDPOINT LAPORAN LLM ---
KPI_TARGETS = {
    "GD": 6, "JO": 2, "SMO": 6, "PH": 1, "EPM": 3, "CC": 3, "VO": 0,
    "FA": 0, "PR": 2, "Staf": 0, "Pimpinan": 0, "PM": 0, "Default": 5
}
CORE_VALUES = ["Creative", "Integrity", "Resilient", "Collaborative", "Innovative"]

def create_kpi_prompt(user_name: str, divisi: str, kpi_data: dict) -> str:
    prompt = f"""
    Anda adalah Manajer HR. Evaluasi {user_name} dari Divisi {divisi}.
    Values: {CORE_VALUES}.
    Data: {kpi_data}
    Jawab JSON: narrative_report, chart_data, value_scores.
    """
    return prompt

@app.post("/generate-report")
async def generate_report(
    request: ReportRequest,
    session: Session = Depends(get_session),
    current_manager: User = Depends(get_current_active_manager) 
):
    user_to_report = session.get(User, request.user_id)
    if not user_to_report:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    try:
        start_date_obj = date.fromisoformat(request.start_date)
        end_date_obj = date.fromisoformat(request.end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Format tanggal salah")

    statement = select(Task).where(
        Task.assignee_id == request.user_id,
        Task.status == "Reviewed", 
        Task.completed_at >= start_date_obj,
        Task.completed_at <= end_date_obj
    )
    completed_tasks = session.exec(statement).all()

    if not completed_tasks:
        raise HTTPException(status_code=404, detail="Tidak ada tugas Reviewed")

    total_tasks = len(completed_tasks)
    on_time_tasks = 0
    total_lead_time_seconds = 0
    total_rating = 0
    valid_ratings = 0
    feedbacks = []

    for task in completed_tasks:
        if task.completed_at and task.created_at:
            total_lead_time_seconds += (task.completed_at - task.created_at).total_seconds()
        if task.due_date and task.completed_at:
            if task.completed_at.date() <= task.due_date: on_time_tasks += 1
        if task.rating:
            total_rating += task.rating
            valid_ratings += 1
        if task.feedback: feedbacks.append(task.feedback)

    avg_lead_time_days = (total_lead_time_seconds / total_tasks / 86400) if total_tasks > 0 else 0
    avg_rating = (total_rating / valid_ratings) if valid_ratings > 0 else 0
    on_time_percentage = (on_time_tasks / total_tasks * 100) if total_tasks > 0 else 0
    kpi_target = KPI_TARGETS.get(user_to_report.divisi, 5)
    
    kpi_data = {
        "start_date": request.start_date, "end_date": request.end_date,
        "total_tasks": total_tasks, "kpi_target": kpi_target,
        "avg_lead_time_days": avg_lead_time_days, "avg_rating": avg_rating,
        "on_time_percentage": on_time_percentage, "feedbacks": feedbacks
    }

    prompt = create_kpi_prompt(user_to_report.nama, user_to_report.divisi, kpi_data)
    try:
        model = genai.GenerativeModel('models/gemini-2.5-flash-preview-09-2025')
        response = await model.generate_content_async(prompt, generation_config={"response_mime_type": "application/json"})
        return json.loads(response.text)
    except Exception as e:
        raise HTTPException(500, f"LLM Error: {str(e)}")

def create_division_kpi_prompt(divisi_name: str, kpi_data: dict) -> str:
    prompt = f"""
    Evaluasi Divisi {divisi_name}. Values: {CORE_VALUES}. Data: {kpi_data}.
    Jawab JSON: narrative_report, chart_data, value_scores.
    """
    return prompt

@app.post("/generate-report/division")
async def generate_division_report(
    request: DivisionReportRequest, 
    session: Session = Depends(get_session),
    current_manager: User = Depends(get_current_active_manager) 
):
    try:
        start_date_obj = date.fromisoformat(request.start_date)
        end_date_obj = date.fromisoformat(request.end_date)
    except ValueError:
        raise HTTPException(400, "Format tanggal salah")

    statement_users = select(User).where(User.divisi == request.divisi)
    users_in_division = session.exec(statement_users).all()
    if not users_in_division: raise HTTPException(404, "Divisi kosong")

    user_ids = [u.id for u in users_in_division]
    statement = select(Task).where(
        Task.assignee_id.in_(user_ids), 
        Task.status == "Reviewed",
        Task.completed_at >= start_date_obj,
        Task.completed_at <= end_date_obj
    )
    completed_tasks = session.exec(statement).all()
    
    if not completed_tasks: raise HTTPException(404, "Tidak ada tugas Reviewed")

    total_tasks = len(completed_tasks)
    on_time_tasks = 0
    total_lead_time_seconds = 0
    total_rating = 0
    valid_ratings = 0
    feedbacks = []

    for task in completed_tasks:
        if task.completed_at and task.created_at:
            total_lead_time_seconds += (task.completed_at - task.created_at).total_seconds()
        if task.due_date and task.completed_at:
            if task.completed_at.date() <= task.due_date: on_time_tasks += 1
        if task.rating:
            total_rating += task.rating
            valid_ratings += 1
        if task.feedback: feedbacks.append(task.feedback)

    avg_lead = (total_lead_time_seconds / total_tasks / 86400) if total_tasks > 0 else 0
    avg_rate = (total_rating / valid_ratings) if valid_ratings > 0 else 0
    on_time_pct = (on_time_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    interns_count = sum(1 for u in users_in_division if u.role == 'intern')
    target_total = KPI_TARGETS.get(request.divisi, 5) * interns_count
    
    kpi_data = {
        "start_date": request.start_date, "end_date": request.end_date,
        "total_members": interns_count, "total_tasks": total_tasks,
        "kpi_target_total": target_total, "avg_lead_time_days": avg_lead,
        "avg_rating": avg_rate, "on_time_percentage": on_time_pct, "feedbacks": feedbacks
    }

    prompt = create_division_kpi_prompt(request.divisi, kpi_data)
    try:
        model = genai.GenerativeModel('models/gemini-2.5-flash-preview-09-2025')
        response = await model.generate_content_async(prompt, generation_config={"response_mime_type": "application/json"})
        return json.loads(response.text)
    except Exception as e:
        raise HTTPException(500, f"LLM Error: {str(e)}")
    #tambah