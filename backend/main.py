from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, SQLModel, Field
from typing import Optional, List
from datetime import datetime, timedelta, date
import google.generativeai as genai
import json
from config import settings
from database import create_db_and_tables, get_session, engine
from models import User, Project, Task 
from auth import (
    get_password_hash, verify_password, create_access_token, 
    get_current_user, get_current_active_manager, Token
)

# --- SKEMA PYDANTIC ---
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
    revision_count: int
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

# --- INISIALISASI APP ---
app = FastAPI(title="API Sistem Pelaporan Kinerja PIH")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

try:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    print("INFO: Konfigurasi Gemini API berhasil.")
except Exception as e:
    print(f"ERROR: Konfigurasi Gemini API GAGAL: {e}")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# --- ENDPOINT AUTH & USER ---
@app.post("/token", response_model=Token)
async def login_for_access_token(session: Session = Depends(get_session), form_data: OAuth2PasswordRequestForm = Depends()):
    user = session.exec(select(User).where(User.email == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email/Password salah")
    token = create_access_token(data={"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

@app.post("/users", response_model=UserRead)
def create_user(*, session: Session = Depends(get_session), user_data: UserCreate):
    if session.exec(select(User).where(User.email == user_data.email)).first():
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    user_dict = user_data.model_dump()
    user_dict["hashed_password"] = get_password_hash(user_data.password)
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
async def read_users(session: Session = Depends(get_session), manager: User = Depends(get_current_active_manager)):
    return session.exec(select(User)).all()

@app.put("/users/{user_id}", response_model=UserRead)
def update_user(*, session: Session = Depends(get_session), user_id: int, user_update: UserUpdate, manager: User = Depends(get_current_active_manager)):
    db_user = session.get(User, user_id)
    if not db_user: raise HTTPException(404, "User not found")
    data = user_update.model_dump(exclude_unset=True)
    if "password" in data:
        data["hashed_password"] = get_password_hash(data.pop("password"))
    for k, v in data.items(): setattr(db_user, k, v)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user

@app.delete("/users/{user_id}")
def delete_user(*, session: Session = Depends(get_session), user_id: int, manager: User = Depends(get_current_active_manager)):
    user = session.get(User, user_id)
    if not user: raise HTTPException(404, "User not found")
    if user.id == manager.id: raise HTTPException(400, "Tidak bisa hapus diri sendiri")
    session.delete(user)
    session.commit()
    return {"ok": True}

# --- TASK MANAGEMENT ---
@app.post("/tasks", response_model=TaskRead)
def create_task(*, session: Session = Depends(get_session), task_data: TaskCreate, manager: User = Depends(get_current_active_manager)):
    if not session.get(Project, task_data.project_id): raise HTTPException(404, "Project not found")
    if not session.get(User, task_data.assignee_id): raise HTTPException(404, "User not found")
    db_task = Task.model_validate(task_data)
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task

@app.get("/tasks/me", response_model=List[TaskRead])
def read_my_tasks(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    return session.exec(select(Task).where(Task.assignee_id == user.id)).all()

@app.get("/tasks", response_model=List[TaskRead])
def read_all_tasks(session: Session = Depends(get_session), manager: User = Depends(get_current_active_manager)):
    return session.exec(select(Task)).all()

@app.put("/tasks/{task_id}/complete", response_model=TaskRead)
def complete_task(*, session: Session = Depends(get_session), task_id: int, link: TaskSubmission, user: User = Depends(get_current_user)):
    task = session.get(Task, task_id)
    if not task or task.assignee_id != user.id: raise HTTPException(404, "Tugas tidak valid")
    task.status = "Done"
    task.completed_at = datetime.utcnow()
    task.submission_link = link.submission_link
    session.add(task)
    session.commit()
    session.refresh(task)
    return task

@app.put("/tasks/{task_id}/review", response_model=TaskRead)
def review_task(*, session: Session = Depends(get_session), task_id: int, review: TaskReview, manager: User = Depends(get_current_active_manager)):
    task = session.get(Task, task_id)
    if not task: raise HTTPException(404, "Task not found")
    
    if review.action == "revise":
        task.status = "Need Revision"
        task.feedback = review.feedback
        task.rating = None
        task.revision_count += 1 
    elif review.action == "approve":
        if review.rating is None: raise HTTPException(400, "Rating wajib diisi")
        task.status = "Reviewed"
        task.rating = review.rating
        task.feedback = review.feedback
    
    session.add(task)
    session.commit()
    session.refresh(task)
    return task

# --- PROJECT ---
@app.post("/projects", response_model=ProjectRead)
def create_project(*, session: Session = Depends(get_session), p: ProjectCreate, manager: User = Depends(get_current_active_manager)):
    project = Project.model_validate(p)
    session.add(project)
    session.commit()
    session.refresh(project)
    return project

# --- AI GENERATION ---

KPI_TARGETS = {
    "GD": 6, "JO": 2, "SMO": 6, "PH": 1, "EPM": 3, "CC": 3, "VO": 0, "FA": 0, "PR": 2, "Default": 5
}

def clean_json_string(json_str: str) -> str:
    json_str = json_str.strip()
    if json_str.startswith("```json"): json_str = json_str[7:]
    elif json_str.startswith("```"): json_str = json_str[3:]
    if json_str.endswith("```"): json_str = json_str[:-3]
    return json_str.strip()

# --- PROMPT INDIVIDU ---
def create_kpi_prompt_advanced(user_name: str, divisi: str, kpi_data: dict) -> str:
    prompt_structure = {
        "system_instruction": {
            "role_definition": f"Anda adalah Analis Kinerja Senior untuk Tim Media PIH. Evaluasi: {user_name} ({divisi}). Gunakan gaya bahasa profesional, objektif, dan bernada membimbing (mentorship-oriented).",
            "scoring_guideline": {
                "rubric": {
                    "1": "Sangat Buruk: Terlambat parah atau feedback negatif keras.",
                    "3": "Cukup/Standar: Memenuhi ekspektasi dasar.",
                    "5": "Sempurna (Exceed Expectations): Inovatif, tanpa revisi, dipuji eksplisit."
                }
            },
            "input_context": {
                "task_data": kpi_data,
                "core_values_logic": {
                    "Integrity": "Cek 'on_time_percentage'. Tinggi = Skor Tinggi.",
                    "Resilient": "Cek 'revision_history'. Jika ada revisi TAPI akhirnya selesai = Skor 4 (Apresiasi). Jika 0 revisi = Skor 5.",
                    "Creative": "Analisis sentimen pada 'feedbacks'. Kata kunci: bagus, estetik, rapi.",
                    "Collaborative": "Cek feedback untuk responsivitas komunikasi.",
                    "Innovative": "Hanya beri Skor 5 jika ada kata 'ide baru', 'inisiatif'."
                }
            },
            "response_requirement": {
                "format_constraint": "HANYA KEMBALIKAN JSON VALID. JANGAN ADA TEKS LAIN.",
                "output_schema": {
                    "narrative_report": "3 paragraf (General, Kekuatan, Saran)",
                    "chart_data": {
                        "label": "Total Tugas Selesai",
                        "actual": kpi_data['total_tasks'],
                        "target": kpi_data['kpi_target']
                    },
                    "value_scores": [
                        {"value_name": "Creative", "score": 0, "justification": "..."},
                        {"value_name": "Integrity", "score": 0, "justification": "..."},
                        {"value_name": "Resilient", "score": 0, "justification": "..."},
                        {"value_name": "Collaborative", "score": 0, "justification": "..."},
                        {"value_name": "Innovative", "score": 0, "justification": "..."}
                    ]
                }
            }
        }
    }
    return json.dumps(prompt_structure, indent=2)

# --- PROMPT DIVISI ---
def create_division_kpi_prompt_advanced(divisi: str, kpi_data: dict) -> str:
    prompt_structure = {
        "system_instruction": {
            "role_definition": f"Anda adalah Kepala Divisi Strategi. Evaluasi Kinerja Kolektif Divisi: {divisi}.",
            "scoring_guideline": {
                "rubric": "Analisis berdasarkan rata-rata performa seluruh anggota divisi."
            },
            "input_context": {
                "division_data": kpi_data,
                "logic": "Bandingkan 'total_tasks' vs 'kpi_target_total'. Analisis tren dari 'feedbacks' kolektif."
            },
            "response_requirement": {
                "format_constraint": "HANYA KEMBALIKAN JSON VALID.",
                "output_schema": {
                    "narrative_report": "3 paragraf (Performa Tim, Dinamika Kolaborasi, Rekomendasi Strategis)",
                    "chart_data": {
                        "label": "Total Tugas Divisi",
                        "actual": kpi_data['total_tasks'],
                        "target": kpi_data['kpi_target_total']
                    },
                    "value_scores": [
                        {"value_name": "Creative", "score": 0, "justification": "Analisis rata-rata kreativitas tim."},
                        {"value_name": "Integrity", "score": 0, "justification": "Analisis kedisiplinan tim secara umum."},
                        {"value_name": "Resilient", "score": 0, "justification": "Ketahanan tim menghadapi beban kerja."},
                        {"value_name": "Collaborative", "score": 0, "justification": "Kualitas kerjasama internal tim."},
                        {"value_name": "Innovative", "score": 0, "justification": "Terobosan yang dihasilkan divisi ini."}
                    ]
                }
            }
        }
    }
    return json.dumps(prompt_structure, indent=2)

# --- ENDPOINT LAPORAN INDIVIDU ---
@app.post("/generate-report")
async def generate_report(request: ReportRequest, session: Session = Depends(get_session), manager: User = Depends(get_current_active_manager)):
    user = session.get(User, request.user_id)
    if not user: raise HTTPException(404, "User not found")
    
    try:
        start = date.fromisoformat(request.start_date)
        end = date.fromisoformat(request.end_date)
    except: raise HTTPException(400, "Format tanggal salah")

    tasks = session.exec(select(Task).where(
        Task.assignee_id == request.user_id, 
        Task.status == "Reviewed",
        Task.completed_at >= start, 
        Task.completed_at <= end
    )).all()

    if not tasks: raise HTTPException(404, "Tidak ada data tugas (Reviewed) pada periode ini")

    total = len(tasks)
    on_time = 0
    lead_secs = 0
    ratings = []
    feedbacks = []
    revision_counts = []

    for t in tasks:
        if t.completed_at and t.created_at:
            c_at = t.created_at if isinstance(t.created_at, datetime) else datetime.combine(t.created_at, datetime.min.time())
            cmp_at = t.completed_at if isinstance(t.completed_at, datetime) else datetime.combine(t.completed_at, datetime.min.time())
            lead_secs += (cmp_at - c_at).total_seconds()
        
        if t.due_date:
            due = t.due_date.date() if isinstance(t.due_date, datetime) else t.due_date
            comp = t.completed_at.date() if isinstance(t.completed_at, datetime) else t.completed_at
            if comp <= due: on_time += 1
            
        if t.rating: ratings.append(t.rating)
        if t.feedback: feedbacks.append(t.feedback)
        revision_counts.append(t.revision_count)

    avg_lead = (lead_secs / total / 86400) if total > 0 else 0
    avg_rate = (sum(ratings) / len(ratings)) if ratings else 0
    on_time_pct = (on_time / total * 100) if total > 0 else 0
    target = KPI_TARGETS.get(user.divisi, 5)

    kpi_data = { 
        "total_tasks": total, 
        "kpi_target": target, 
        "avg_rating": round(avg_rate, 1), 
        "on_time_percentage": round(on_time_pct, 1), 
        "feedbacks": feedbacks,
        "revision_history": revision_counts 
    }

    try:
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        response = await model.generate_content_async(
            create_kpi_prompt_advanced(user.nama, user.divisi, kpi_data), 
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(clean_json_string(response.text))
    except Exception as e:
        raise HTTPException(500, f"AI Error: {str(e)}")

# --- ENDPOINT LAPORAN DIVISI ---
@app.post("/generate-report/division")
async def generate_division_report(request: DivisionReportRequest, session: Session = Depends(get_session), manager: User = Depends(get_current_active_manager)):
    try:
        start = date.fromisoformat(request.start_date)
        end = date.fromisoformat(request.end_date)
    except: raise HTTPException(400, "Format tanggal salah")

    users = session.exec(select(User).where(User.divisi == request.divisi)).all()
    if not users: raise HTTPException(404, "Divisi kosong")
    
    u_ids = [u.id for u in users]
    tasks = session.exec(select(Task).where(
        Task.assignee_id.in_(u_ids), 
        Task.status == "Reviewed", 
        Task.completed_at >= start, 
        Task.completed_at <= end
    )).all()
    
    if not tasks: raise HTTPException(404, "Tidak ada tugas Reviewed di divisi ini")

    total = len(tasks)
    on_time = 0
    lead_secs = 0
    ratings = []
    feedbacks = []
    total_revisions = 0 

    for t in tasks:
        if t.completed_at and t.created_at:
            c_at = t.created_at if isinstance(t.created_at, datetime) else datetime.combine(t.created_at, datetime.min.time())
            cmp_at = t.completed_at if isinstance(t.completed_at, datetime) else datetime.combine(t.completed_at, datetime.min.time())
            lead_secs += (cmp_at - c_at).total_seconds()
        if t.due_date:
            due = t.due_date.date() if isinstance(t.due_date, datetime) else t.due_date
            comp = t.completed_at.date() if isinstance(t.completed_at, datetime) else t.completed_at
            if comp <= due: on_time += 1
        if t.rating: ratings.append(t.rating)
        if t.feedback: feedbacks.append(t.feedback)
        total_revisions += t.revision_count

    avg_lead = (lead_secs / total / 86400) if total > 0 else 0
    avg_rate = (sum(ratings) / len(ratings)) if ratings else 0
    on_time_pct = (on_time / total * 100) if total > 0 else 0
    interns = sum(1 for u in users if u.role == 'intern')
    target_total = KPI_TARGETS.get(request.divisi, 5) * interns

    kpi_data = { 
        "start_date": request.start_date, 
        "end_date": request.end_date, 
        "total_members": interns, 
        "total_tasks": total, 
        "kpi_target_total": target_total, 
        "avg_lead_time_days": round(avg_lead, 1), 
        "avg_rating": round(avg_rate, 1), 
        "on_time_percentage": round(on_time_pct, 1), 
        "feedbacks": feedbacks,
        "total_revisions": total_revisions 
    }

    try:
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        response = await model.generate_content_async(
            create_division_kpi_prompt_advanced(request.divisi, kpi_data), 
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(clean_json_string(response.text))
    except Exception as e:
        raise HTTPException(500, f"LLM Error: {str(e)}")