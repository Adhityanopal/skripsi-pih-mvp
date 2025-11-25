# main.py - FULL CODE FINAL (Versi Prompt Lengkap 5 Core Values)
# Mencakup: Auth, CRUD, Revisi, dan Prompt LLM yang sangat eksplisit.

# --- 1. IMPOR LIBRARY ---
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, SQLModel, Field
from typing import Optional, List
from datetime import datetime, timedelta, date
import google.generativeai as genai
import json
import re 

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
    Token
)

# --- 3. SKEMA PYDANTIC (Input/Output API) ---

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

class ProjectCreate(SQLModel):
    nama: str

class ProjectRead(SQLModel):
    id: int
    nama: str

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
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    feedback: str
    action: str

class ReportRequest(SQLModel):
    user_id: int
    start_date: str
    end_date: str

class DivisionReportRequest(SQLModel):
    divisi: str 
    start_date: str 
    end_date: str   

# --- 4. INISIALISASI APP & CORS ---

app = FastAPI(title="API Sistem Pelaporan Kinerja PIH")

# Konfigurasi CORS Sapu Jagat (Allow All)
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

try:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    print("INFO:     Konfigurasi Gemini API berhasil.")
except Exception as e:
    print(f"ERROR:   Konfigurasi Gemini API GAGAL: {e}")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# --- 5. ENDPOINT AUTH & USER ---
@app.post("/token", response_model=Token)
async def login_for_access_token(session: Session = Depends(get_session), form_data: OAuth2PasswordRequestForm = Depends()):
    statement = select(User).where(User.email == form_data.username)
    user = session.exec(statement).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email/Password salah", headers={"WWW-Authenticate": "Bearer"})
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/users", response_model=UserRead)
def create_user(*, session: Session = Depends(get_session), user_data: UserCreate):
    statement_check = select(User).where(User.email == user_data.email)
    if session.exec(statement_check).first():
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
async def read_users(session: Session = Depends(get_session), current_manager: User = Depends(get_current_active_manager)):
    return session.exec(select(User)).all()

@app.put("/users/{user_id}", response_model=UserRead)
def update_user(*, session: Session = Depends(get_session), user_id: int, user_update: UserUpdate, current_manager: User = Depends(get_current_active_manager)):
    db_user = session.get(User, user_id)
    if not db_user: raise HTTPException(404, "User not found")
    user_data = user_update.model_dump(exclude_unset=True)
    if "password" in user_data and user_data["password"]:
        user_data["hashed_password"] = get_password_hash(user_data["password"])
        del user_data["password"]
    for key, value in user_data.items(): setattr(db_user, key, value)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user

@app.delete("/users/{user_id}")
def delete_user(*, session: Session = Depends(get_session), user_id: int, current_manager: User = Depends(get_current_active_manager)):
    user = session.get(User, user_id)
    if not user: raise HTTPException(404, "User not found")
    if user.id == current_manager.id: raise HTTPException(400, "Tidak bisa hapus diri sendiri")
    session.delete(user)
    session.commit()
    return {"ok": True}

# --- 6. ENDPOINT PROJECT & TASK ---
@app.post("/projects", response_model=ProjectRead)
def create_project(*, session: Session = Depends(get_session), project_data: ProjectCreate, current_manager: User = Depends(get_current_active_manager)):
    db_project = Project.model_validate(project_data)
    session.add(db_project)
    session.commit()
    session.refresh(db_project)
    return db_project

@app.post("/tasks", response_model=TaskRead)
def create_task(*, session: Session = Depends(get_session), task_data: TaskCreate, current_manager: User = Depends(get_current_active_manager)):
    if not session.get(Project, task_data.project_id): raise HTTPException(404, "Project not found")
    if task_data.assignee_id and not session.get(User, task_data.assignee_id): raise HTTPException(404, "User not found")
    db_task = Task.model_validate(task_data)
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task

@app.get("/tasks/me", response_model=List[TaskRead])
def read_my_tasks(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    return session.exec(select(Task).where(Task.assignee_id == current_user.id)).all()

@app.get("/tasks", response_model=List[TaskRead])
def read_all_tasks(session: Session = Depends(get_session), current_manager: User = Depends(get_current_active_manager)):
    return session.exec(select(Task)).all()

@app.put("/tasks/{task_id}/complete", response_model=TaskRead)
def complete_task(*, session: Session = Depends(get_session), task_id: int, link: TaskSubmission, current_user: User = Depends(get_current_user)):
    db_task = session.get(Task, task_id)
    if not db_task: raise HTTPException(404, "Task not found")
    if db_task.assignee_id != current_user.id: raise HTTPException(403, "Bukan tugas Anda")
    if db_task.status in ["Done", "Reviewed"]: raise HTTPException(400, "Sudah selesai")
    
    db_task.status = "Done"
    db_task.completed_at = datetime.utcnow()
    db_task.submission_link = link.submission_link
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task

@app.put("/tasks/{task_id}/review", response_model=TaskRead)
def review_task(*, session: Session = Depends(get_session), task_id: int, review_data: TaskReview, current_manager: User = Depends(get_current_active_manager)):
    db_task = session.get(Task, task_id)
    if not db_task: raise HTTPException(404, "Task not found")
    if db_task.status == "To Do": raise HTTPException(400, "Tugas belum selesai")
    
    if review_data.action == "revise":
        db_task.status = "Need Revision"
        db_task.feedback = review_data.feedback
        db_task.rating = None 
    elif review_data.action == "approve":
        if review_data.rating is None: raise HTTPException(400, "Rating wajib diisi untuk ACC")
        db_task.status = "Reviewed"
        db_task.rating = review_data.rating
        db_task.feedback = review_data.feedback
    else:
        raise HTTPException(400, "Action tidak valid")

    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task

# --- 7. LLM REPORTING ---
KPI_TARGETS = {
    "GD": 6, "JO": 2, "SMO": 6, "PH": 1, "EPM": 3, "CC": 3, "VO": 0,
    "FA": 0, "PR": 2, "Staf": 0, "Pimpinan": 0, "PM": 0, "Default": 5
}

# Fungsi pembersih JSON
def clean_json_string(json_str: str) -> str:
    json_str = json_str.strip()
    if json_str.startswith("```json"):
        json_str = json_str[7:]
    elif json_str.startswith("```"):
        json_str = json_str[3:]
    if json_str.endswith("```"):
        json_str = json_str[:-3]
    return json_str.strip()

# --- PROMPT INDIVIDU LENGKAP & JELAS ---
def create_kpi_prompt(user_name: str, divisi: str, kpi_data: dict) -> str:
    return f"""
    Anda adalah Manajer HR. Evaluasi kinerja: {user_name} (Divisi: {divisi}).
    
    DATA KINERJA:
    - Target KPI: {kpi_data['kpi_target']}
    - Aktual Selesai: {kpi_data['total_tasks']}
    - Deadline Tepat: {kpi_data['on_time_percentage']}%
    - Rating: {kpi_data['avg_rating']} / 5
    - Feedback: {kpi_data['feedbacks']}
    
    INSTRUKSI NARASI (WAJIB 3 Bagian):
    1. Paragraf 1: Evaluasi General (Ringkasan).
    2. Paragraf 2: Evaluasi Keberhasilan (Kekuatan).
    3. Paragraf 3: Evaluasi Kekurangan & Saran.
    
    OUTPUT WAJIB JSON MURNI:
    {{
        "narrative_report": "Tulis narasi 3 paragraf di sini...",
        "chart_data": {{
            "label": "Total Tugas Selesai",
            "actual": {kpi_data['total_tasks']}, 
            "target": {kpi_data['kpi_target']}
        }},
        "value_scores": [
            {{ 
                "value_name": "Creative", 
                "score": 0, 
                "justification": "Berikan analisis skor 1-5 berdasarkan rating kualitas dan feedback kreatif." 
            }},
            {{ 
                "value_name": "Integrity", 
                "score": 0, 
                "justification": "Berikan analisis skor 1-5 berdasarkan kepatuhan deadline dan kejujuran." 
            }},
            {{ 
                "value_name": "Resilient", 
                "score": 0, 
                "justification": "Berikan analisis skor 1-5 berdasarkan lead time dan ketahanan kerja." 
            }},
            {{ 
                "value_name": "Collaborative", 
                "score": 0, 
                "justification": "Berikan analisis skor 1-5 berdasarkan feedback komunikasi tim." 
            }},
            {{ 
                "value_name": "Innovative", 
                "score": 0, 
                "justification": "Berikan analisis skor 1-5 berdasarkan inisiatif baru dalam feedback." 
            }}
        ]
    }}
    """

@app.post("/generate-report")
async def generate_report(request: ReportRequest, session: Session = Depends(get_session), current_manager: User = Depends(get_current_active_manager)):
    user = session.get(User, request.user_id)
    if not user: raise HTTPException(404, "User not found")
    try:
        start = date.fromisoformat(request.start_date)
        end = date.fromisoformat(request.end_date)
    except: raise HTTPException(400, "Format tanggal salah")

    tasks = session.exec(select(Task).where(
        Task.assignee_id == request.user_id, Task.status == "Reviewed",
        Task.completed_at >= start, Task.completed_at <= end
    )).all()

    if not tasks: raise HTTPException(404, "Tidak ada tugas Reviewed")

    total = len(tasks)
    on_time = 0
    lead_secs = 0
    ratings = []
    feedbacks = []

    for t in tasks:
        comp_date = t.completed_at.date() if isinstance(t.completed_at, datetime) else t.completed_at
        if t.completed_at and t.created_at:
            c_at = t.created_at if isinstance(t.created_at, datetime) else datetime.combine(t.created_at, datetime.min.time())
            cmp_at = t.completed_at if isinstance(t.completed_at, datetime) else datetime.combine(t.completed_at, datetime.min.time())
            lead_secs += (cmp_at - c_at).total_seconds()
        if t.due_date:
            due = t.due_date.date() if isinstance(t.due_date, datetime) else t.due_date
            if comp_date and due and comp_date <= due: on_time += 1
        if t.rating: ratings.append(t.rating)
        if t.feedback: feedbacks.append(t.feedback)

    avg_lead = (lead_secs / total / 86400) if total > 0 else 0
    avg_rate = (sum(ratings) / len(ratings)) if ratings else 0
    on_time_pct = (on_time / total * 100) if total > 0 else 0
    target = KPI_TARGETS.get(user.divisi, 5)

    kpi_data = { "start_date": request.start_date, "end_date": request.end_date, "total_tasks": total, "kpi_target": target, "avg_lead_time_days": avg_lead, "avg_rating": avg_rate, "on_time_percentage": on_time_pct, "feedbacks": feedbacks }

    try:
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        response = await model.generate_content_async(create_kpi_prompt(user.nama, user.divisi, kpi_data), generation_config={"response_mime_type": "application/json"})
        return json.loads(clean_json_string(response.text))
    except Exception as e:
        raise HTTPException(500, f"LLM Error: {str(e)}")

# --- PROMPT DIVISI LENGKAP & JELAS ---
def create_division_kpi_prompt(divisi: str, kpi_data: dict) -> str:
    return f"""
    Evaluasi Divisi: {divisi}. Data: {kpi_data}.
    
    OUTPUT WAJIB JSON MURNI:
    {{
        "narrative_report": "Tulis 3 paragraf (General, Keberhasilan, Saran).",
        "chart_data": {{ 
            "label": "Total Tugas Divisi", 
            "actual": {kpi_data['total_tasks']}, 
            "target": {kpi_data['kpi_target_total']} 
        }},
        "value_scores": [
            {{ 
                "value_name": "Creative", 
                "score": 0, 
                "justification": "Analisis skor kolektif divisi untuk Kreativitas." 
            }},
            {{ 
                "value_name": "Integrity", 
                "score": 0, 
                "justification": "Analisis skor kolektif divisi untuk Integritas/Deadline." 
            }},
            {{ 
                "value_name": "Resilient", 
                "score": 0, 
                "justification": "Analisis skor kolektif divisi untuk Ketahanan/Lead Time." 
            }},
            {{ 
                "value_name": "Collaborative", 
                "score": 0, 
                "justification": "Analisis skor kolektif divisi untuk Kolaborasi Tim." 
            }},
            {{ 
                "value_name": "Innovative", 
                "score": 0, 
                "justification": "Analisis skor kolektif divisi untuk Inovasi." 
            }}
        ]
    }}
    """

@app.post("/generate-report/division")
async def generate_division_report(request: DivisionReportRequest, session: Session = Depends(get_session), current_manager: User = Depends(get_current_active_manager)):
    try:
        start = date.fromisoformat(request.start_date)
        end = date.fromisoformat(request.end_date)
    except: raise HTTPException(400, "Format tanggal salah")

    users = session.exec(select(User).where(User.divisi == request.divisi)).all()
    if not users: raise HTTPException(404, "Divisi kosong")
    u_ids = [u.id for u in users]
    tasks = session.exec(select(Task).where(Task.assignee_id.in_(u_ids), Task.status == "Reviewed", Task.completed_at >= start, Task.completed_at <= end)).all()
    if not tasks: raise HTTPException(404, "Tidak ada tugas Reviewed")

    total = len(tasks)
    on_time = 0
    lead_secs = 0
    ratings = []
    feedbacks = []

    for t in tasks:
        comp_date = t.completed_at.date() if isinstance(t.completed_at, datetime) else t.completed_at
        if t.completed_at and t.created_at:
            c_at = t.created_at if isinstance(t.created_at, datetime) else datetime.combine(t.created_at, datetime.min.time())
            cmp_at = t.completed_at if isinstance(t.completed_at, datetime) else datetime.combine(t.completed_at, datetime.min.time())
            lead_secs += (cmp_at - c_at).total_seconds()
        if t.due_date:
            due = t.due_date.date() if isinstance(t.due_date, datetime) else t.due_date
            if comp_date and due and comp_date <= due: on_time += 1
        if t.rating: ratings.append(t.rating)
        if t.feedback: feedbacks.append(t.feedback)

    avg_lead = (lead_secs / total / 86400) if total > 0 else 0
    avg_rate = (sum(ratings) / len(ratings)) if ratings else 0
    on_time_pct = (on_time / total * 100) if total > 0 else 0
    interns = sum(1 for u in users if u.role == 'intern')
    target_total = KPI_TARGETS.get(request.divisi, 5) * interns

    kpi_data = { "start_date": request.start_date, "end_date": request.end_date, "total_members": interns, "total_tasks": total, "kpi_target_total": target_total, "avg_lead_time_days": avg_lead, "avg_rating": avg_rate, "on_time_percentage": on_time_pct, "feedbacks": feedbacks }

    try:
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        response = await model.generate_content_async(create_division_kpi_prompt(request.divisi, kpi_data), generation_config={"response_mime_type": "application/json"})
        return json.loads(clean_json_string(response.text))
    except Exception as e:
        raise HTTPException(500, f"LLM Error: {str(e)}")
