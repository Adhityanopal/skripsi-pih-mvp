# main.py
# File server utama FastAPI untuk MVP Opsi D
# Versi ini berisi SEMUA endpoint (Login, User, Proyek, Tugas, Laporan)
# DAN perbaikan bug TypeError (date vs datetime).

# --- 1. IMPOR LIBRARY STANDAR & PIHAK KETIGA ---
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, SQLModel, Field
from typing import Optional, List
from datetime import datetime, timedelta, date
import google.generativeai as genai
import json

# --- 2. IMPOR DARI FILE LOKAL KITA ---
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
    Token # Skema token dari auth.py
)

# --- 3. SKEMA PYDANTIC (Input/Output Model untuk API) ---

# Skema untuk User
class UserRead(SQLModel):
    id: int
    nama: str
    email: str
    role: str
    divisi: str

class UserCreate(SQLModel):
    nama: str
    email: str
    password: str # Password polos saat input
    role: str # 'pimpinan', 'staf_media', 'pm', 'intern'
    divisi: str # 'GD', 'JO', 'Staf', 'Pimpinan', dll

class UserUpdate(SQLModel):
    nama: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    divisi: Optional[str] = None

# Skema untuk Project
class ProjectCreate(SQLModel):
    nama: str

class ProjectRead(SQLModel):
    id: int
    nama: str

# Skema untuk Task
class TaskCreate(SQLModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "Medium"
    due_date: Optional[date] = None # Menggunakan 'date' bukan 'datetime'
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

# Skema BARU untuk submit link (Opsi C)
class TaskSubmission(SQLModel):
    submission_link: str

class TaskReview(SQLModel):
    rating: int = Field(ge=1, le=5) # ge=greater than or equal, le=less than or equal
    feedback: str

# Skema untuk Laporan Individu
class ReportRequest(SQLModel):
    user_id: int
    start_date: str # "YYYY-MM-DD"
    end_date: str   # "YYYY-MM-DD"

# Skema untuk Laporan Divisi (BARU)
class DivisionReportRequest(SQLModel):
    divisi: str # "GD", "JO", "SMO", dll.
    start_date: str # "YYYY-MM-DD"
    end_date: str   # "YYYY-MM-DD"


# --- 4. INISIALISASI APLIKASI DAN KONFIGURASI ---
app = FastAPI(title="API Sistem Pelaporan Kinerja PIH (MVP Opsi D)")

# Konfigurasi CORS (SANGAT PENTING UNTUK DEPLOYMENT)
origins = ["*"] # Izinkan semua origin (paling mudah untuk skripsi)
# -------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Sekarang mengizinkan semua
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# Konfigurasi Google Gemini API (dibaca dari .env)
try:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    print("INFO:     Konfigurasi Gemini API berhasil.")
except Exception as e:
    print(f"ERROR:   Konfigurasi Gemini API GAGAL: {e}")

# --- 5. EVENT STARTUP ---
@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# --- 6. ENDPOINT OTENTIKASI & MANAJEMEN PENGGUNA ---

@app.post("/token", response_model=Token)
async def login_for_access_token(
    session: Session = Depends(get_session), 
    form_data: OAuth2PasswordRequestForm = Depends() 
):
    """
    Endpoint Login. Menerima email (sebagai 'username') dan password.
    Mengembalikan Access Token (JWT).
    """
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
    """
    Endpoint Kelola Akun: Membuat user baru (Intern, PM, Staf, dll).
    """
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
async def read_users_me(
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint terproteksi: Mengambil data user yang sedang login.
    """
    return current_user

@app.get("/users", response_model=List[UserRead])
async def read_users(
    session: Session = Depends(get_session),
    current_manager: User = Depends(get_current_active_manager) 
):
    """
    Endpoint terproteksi (Hanya Manajer): Mengambil SEMUA user.
    """
    statement = select(User)
    users = session.exec(statement).all()
    return users

# --- 7. ENDPOINT PROYEK & TUGAS (Semua Terproteksi) ---

@app.post("/projects", response_model=ProjectRead)
def create_project(
    *,
    session: Session = Depends(get_session),
    project_data: ProjectCreate,
    current_manager: User = Depends(get_current_active_manager) 
):
    """
    Membuat Proyek baru (Hanya Manajer).
    """
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
    """
    Membuat Tugas baru (Hanya Manajer).
    """
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
    """
    Mengambil daftar tugas yang ditugaskan ke SAYA (user yang sedang login).
    """
    statement = select(Task).where(Task.assignee_id == current_user.id)
    tasks = session.exec(statement).all()
    return tasks

@app.get("/tasks", response_model=List[TaskRead])
def read_all_tasks(
    session: Session = Depends(get_session),
    current_manager: User = Depends(get_current_active_manager) 
):
    """
    Mengambil SEMUA daftar tugas (untuk tampilan Manajer).
    """
    statement = select(Task)
    tasks = session.exec(statement).all()
    return tasks

@app.put("/tasks/{task_id}/complete", response_model=TaskRead)
def complete_task(
    *,
    session: Session = Depends(get_session),
    task_id: int,
    link: TaskSubmission, # Menggunakan skema baru TaskSubmission
    current_user: User = Depends(get_current_user) 
):
    """
    Menandai tugas sebagai 'Done' dan mencatat waktu selesai + link.
    """
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
    """
    Menambahkan rating dan feedback dari manajer ke tugas yang sudah 'Done'.
    """
    db_task = session.get(Task, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
    
    if db_task.status == "To Do":
        raise HTTPException(status_code=400, detail="Tugas belum selesai")

    db_task.rating = review_data.rating
    db_task.feedback = review_data.feedback
    db_task.status = "Reviewed" # Status baru setelah direview

    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task

# --- 8. ENDPOINT LAPORAN LLM (OTAK SISTEM) ---

KPI_TARGETS = {
    "GD": 6, "JO": 2, "SMO": 6, "PH": 1, "EPM": 3, "CC": 3, "VO": 0,
    "FA": 0, "PR": 2, "Staf": 0, "Pimpinan": 0, "PM": 0, "Default": 5
}
CORE_VALUES = ["Creative", "Integrity", "Resilient", "Collaborative", "Innovative"]

# --- 8A. FUNGSI DAN ENDPOINT LAPORAN (PER INDIVIDU) ---

def create_kpi_prompt(user_name: str, divisi: str, kpi_data: dict) -> str:
    """Fungsi Prompt Engineering (Opsi C - Individu)"""
    prompt = f"""
    Anda adalah seorang Manajer HR yang adil dan analitis.
    Tugas Anda adalah mengevaluasi kinerja pekerja media bernama {user_name} dari Divisi {divisi}.
    Evaluasi harus didasarkan pada 5 Core Values PIH: {CORE_VALUES}.

    Berikut adalah data kinerja objektif dan kualitatif untuk periode {kpi_data['start_date']} s/d {kpi_data['end_date']}:
    
    DATA KUANTITATIF (Objektif):
    - Divisi: {divisi}
    - Target KPI Divisi (Tugas Selesai): {kpi_data['kpi_target']} tugas
    - Aktual Selesai: {kpi_data['total_tasks']} tugas
    - Kepatuhan Deadline (Metrik 'Integrity'): {kpi_data['on_time_percentage']:.0f}%
    - Rata-rata Lead Time (Metrik 'Resilient'): {kpi_data['avg_lead_time_days']:.2f} hari
    
    DATA KUALITATIF (Penilaian Manajer):
    - Rata-rata Rating Kualitas (Metrik 'Creative'): {kpi_data['avg_rating']:.1f} / 5
    - Kumpulan Feedback Teks (Metrik 'Collaborative'/'Innovative'): {kpi_data['feedbacks']}

    TUGAS ANDA:
    Berikan jawaban HANYA dalam format JSON yang valid.
    JSON harus memiliki 3 kunci utama: 'narrative_report', 'chart_data', dan 'value_scores'.

    1. 'narrative_report': Tulis laporan narasi (maksimal 3 paragraf) sebagai Ringkasan Umum kinerja.
    2. 'chart_data': Buat JSON object untuk grafik batang perbandingan KPI. Format: {{"label": "Total Tugas Selesai", "actual": {kpi_data['total_tasks']}, "target": {kpi_data['kpi_target']}}}
    3. 'value_scores': Buat sebuah array berisi 5 JSON object, satu untuk setiap Core Value.
       - Berikan 'value_name' (nama nilainya, misal: "Integrity").
       - Berikan 'score' (skor 1-5) berdasarkan interpretasi Anda terhadap data.
       - Berikan 'justification' (justifikasi 1 kalimat).
       - Contoh: {{"value_name": "Integrity", "score": 4, "justification": "Kepatuhan deadline 90%, hanya 1 tugas terlambat."}}

    Berikan HANYA JSON.
    """
    return prompt

@app.post("/generate-report")
async def generate_report(
    request: ReportRequest,
    session: Session = Depends(get_session),
    current_manager: User = Depends(get_current_active_manager) 
):
    """
    Menghasilkan laporan kinerja naratif per INDIVIDU menggunakan LLM.
    """
    user_to_report = session.get(User, request.user_id)
    if not user_to_report:
        raise HTTPException(status_code=404, detail="User yang akan dilaporkan tidak ditemukan")

    try:
        start_date_obj = date.fromisoformat(request.start_date)
        end_date_obj = date.fromisoformat(request.end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Format tanggal salah. Gunakan YYYY-MM-DD")

    statement = select(Task).where(
        Task.assignee_id == request.user_id,
        Task.status == "Reviewed", 
        Task.completed_at >= start_date_obj,
        Task.completed_at <= end_date_obj
    )
    completed_tasks = session.exec(statement).all()

    if not completed_tasks:
        raise HTTPException(status_code=404, detail="Tidak ada tugas yang sudah 'Reviewed' ditemukan untuk pengguna dan periode ini.")

    total_tasks = len(completed_tasks)
    total_lead_time_seconds = 0
    total_rating = 0
    valid_ratings = 0
    on_time_tasks = 0
    feedbacks = []

    for task in completed_tasks:
        if task.completed_at and task.created_at:
            lead_time = task.completed_at - task.created_at
            total_lead_time_seconds += lead_time.total_seconds()
        
        # --- PERBAIKAN BUG TypeError (datetime vs date) ---
        if task.due_date and task.completed_at:
            # Bandingkan .date() dengan .date()
            if task.completed_at.date() <= task.due_date.date(): 
                on_time_tasks += 1
        # --------------------------------------------------
                
        if task.rating is not None:
            total_rating += task.rating
            valid_ratings += 1
        if task.feedback:
            feedbacks.append(task.feedback)

    avg_lead_time_days = (total_lead_time_seconds / total_tasks / (60*60*24)) if total_tasks > 0 else 0
    avg_rating = (total_rating / valid_ratings) if valid_ratings > 0 else 0
    on_time_percentage = (on_time_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    user_divisi = user_to_report.divisi
    kpi_target = KPI_TARGETS.get(user_divisi, 5) 
    
    kpi_data = {
        "start_date": request.start_date, "end_date": request.end_date,
        "total_tasks": total_tasks, "kpi_target": kpi_target,
        "avg_lead_time_days": avg_lead_time_days, "avg_rating": avg_rating,
        "on_time_percentage": on_time_percentage,
        "feedbacks": feedbacks if feedbacks else ["Tidak ada feedback tekstual."]
    }

    prompt = create_kpi_prompt(user_to_report.nama, user_divisi, kpi_data)
    
    try:
        model_name = 'models/gemini-2.5-flash-preview-09-2025' 
        print(f"INFO:     Memanggil model LLM: {model_name}")
        model = genai.GenerativeModel(model_name)
        
        response = await model.generate_content_async(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        
        report_json_str = ""
        if response.parts:
            report_json_str = response.parts[0].text
        else:
            report_json_str = response.text
            
        report_data = json.loads(report_json_str)
        return report_data
        
    except json.JSONDecodeError:
        print(f"ERROR:    LLM Individu tidak mengembalikan JSON valid. Output: {report_json_str}")
        raise HTTPException(status_code=500, detail="Gagal mem-parsing respons dari LLM.")
    except Exception as e:
        print(f"ERROR:    Error memanggil Gemini API (Individu): {type(e).__name__} - {e}")
        if hasattr(response, 'prompt_feedback'):
             print(f"         Prompt Feedback: {response.prompt_feedback}")
        raise HTTPException(status_code=500, detail=f"Gagal menghasilkan laporan Individu dari LLM. Error: {str(e)}")

# --- 8B. FUNGSI DAN ENDPOINT LAPORAN (PER DIVISI) ---

def create_division_kpi_prompt(divisi_name: str, kpi_data: dict) -> str:
    """Fungsi Prompt Engineering (Opsi B - Divisi)"""
    
    prompt = f"""
    Anda adalah seorang Analis Kinerja Manajerial Senior.
    Tugas Anda adalah mengevaluasi kinerja KOLEKTIF dari satu divisi bernama: {divisi_name}.
    Evaluasi harus didasarkan pada 5 Core Values PIH: {CORE_VALUES}.

    Berikut adalah data kinerja AGREGRAT (gabungan) untuk seluruh divisi {divisi_name}
    selama periode {kpi_data['start_date']} s/d {kpi_data['end_date']}:
    
    DATA KUANTITATIF (Objektif):
    - Divisi: {divisi_name}
    - Total Anggota Intern: {kpi_data['total_members']} orang
    - Target KPI Divisi (Total): {kpi_data['kpi_target_total']} tugas
    - Aktual Selesai (Total): {kpi_data['total_tasks']} tugas
    - Kepatuhan Deadline Rata-Rata (Metrik 'Integrity'): {kpi_data['on_time_percentage']:.0f}%
    - Rata-rata Lead Time per Tugas (Metrik 'Resilient'): {kpi_data['avg_lead_time_days']:.2f} hari
    
    DATA KUALITATIF (Penilaian Manajer):
    - Rata-rata Rating Kualitas (Metrik 'Creative'): {kpi_data['avg_rating']:.1f} / 5
    - Kumpulan Feedback Teks (Contoh): {kpi_data['feedbacks']}

    TUGAS ANDA:
    Berikan jawaban HANYA dalam format JSON yang valid.
    JSON harus memiliki 3 kunci utama: 'narrative_report', 'chart_data', dan 'value_scores'.

    1. 'narrative_report': Tulis laporan narasi (maksimal 3 paragraf) sebagai Ringkasan Umum kinerja DIVISI ini.
    2. 'chart_data': Buat JSON object untuk grafik batang perbandingan KPI Divisi. Format: {{"label": "Total Tugas Divisi", "actual": {kpi_data['total_tasks']}, "target": {kpi_data['kpi_target_total']}}}
    3. 'value_scores': Buat sebuah array berisi 5 JSON object, satu untuk setiap Core Value.
       - Berikan 'value_name' (nama nilainya).
       - Berikan 'score' (skor 1-5) yang merefleksikan kinerja DIVISI.
       - Berikan 'justification' (justifikasi 1 kalimat) berdasarkan data agregat.

    Berikan HANYA JSON.
    """
    return prompt

@app.post("/generate-report/division")
async def generate_division_report(
    request: DivisionReportRequest, # Menggunakan skema baru
    session: Session = Depends(get_session),
    current_manager: User = Depends(get_current_active_manager) # Proteksi Manajer
):
    """
    Menghasilkan laporan kinerja AGREGAT per DIVISI menggunakan LLM.
    """
    
    try:
        start_date_obj = date.fromisoformat(request.start_date)
        end_date_obj = date.fromisoformat(request.end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Format tanggal salah. Gunakan YYYY-MM-DD")

    # 1a. Cari semua user di divisi ini
    statement_users = select(User).where(User.divisi == request.divisi)
    users_in_division = session.exec(statement_users).all()
    
    if not users_in_division:
        raise HTTPException(status_code=404, detail=f"Tidak ada user ditemukan untuk divisi: {request.divisi}")

    # 1b. Ambil SEMUA tugas yang sudah 'Reviewed' dari SEMUA user di divisi tsb
    user_ids_in_division = [user.id for user in users_in_division]
    statement_tasks = select(Task).where(
        Task.assignee_id.in_(user_ids_in_division), 
        Task.status == "Reviewed",
        Task.completed_at >= start_date_obj,
        Task.completed_at <= end_date_obj
    )
    completed_tasks = session.exec(statement_tasks).all()

    if not completed_tasks:
        raise HTTPException(status_code=404, detail=f"Tidak ada tugas 'Reviewed' ditemukan untuk divisi {request.divisi} pada periode ini.")

    # --- 2. Hitung Metrik Agregat (Divisi) ---
    total_tasks = len(completed_tasks)
    total_lead_time_seconds = 0
    total_rating = 0
    valid_ratings = 0
    on_time_tasks = 0
    feedbacks = [] 

    for task in completed_tasks:
        if task.completed_at and task.created_at:
            lead_time = task.completed_at - task.created_at
            total_lead_time_seconds += lead_time.total_seconds()
        
        # --- PERBAIKAN BUG TypeError (datetime vs date) ---
        if task.due_date and task.completed_at:
            # Bandingkan .date() dengan .date()
            if task.completed_at.date() <= task.due_date.date():
                on_time_tasks += 1
        # --------------------------------------------------
                
        if task.rating is not None:
            total_rating += task.rating
            valid_ratings += 1
        if task.feedback and len(feedbacks) < 5:
            feedbacks.append(task.feedback)

    avg_lead_time_days = (total_lead_time_seconds / total_tasks / (60*60*24)) if total_tasks > 0 else 0
    avg_rating = (total_rating / valid_ratings) if valid_ratings > 0 else 0
    on_time_percentage = (on_time_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    # Hitung anggota intern saja untuk KPI
    intern_members_count = sum(1 for user in users_in_division if user.role == 'intern')
    
    base_kpi_target = KPI_TARGETS.get(request.divisi, 5) # Default 5
    kpi_target_total = base_kpi_target * intern_members_count 
    
    kpi_data = {
        "start_date": request.start_date, "end_date": request.end_date,
        "total_members": intern_members_count, "total_tasks": total_tasks,
        "kpi_target_total": kpi_target_total,
        "avg_lead_time_days": avg_lead_time_days, "avg_rating": avg_rating,
        "on_time_percentage": on_time_percentage,
        "feedbacks": feedbacks if feedbacks else ["Tidak ada feedback tekstual."]
    }

    # --- 3. Buat Prompt dan Panggil LLM ---
    prompt = create_division_kpi_prompt(request.divisi, kpi_data)
    
    try:
        model_name = 'models/gemini-2.5-flash-preview-09-2025'
        print(f"INFO:     Memanggil model LLM untuk Laporan DIVISI: {model_name}")
        model = genai.GenerativeModel(model_name)
        
        response = await model.generate_content_async(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        
        # --- 4. Parsing dan Kembalikan Hasil ---
        report_json_str = ""
        if response.parts:
            report_json_str = response.parts[0].text
        else:
            report_json_str = response.text
            
        report_data = json.loads(report_json_str)
        return report_data
        
    except json.JSONDecodeError:
        print(f"ERROR:    LLM Divisi tidak mengembalikan JSON valid. Output: {report_json_str}")
        raise HTTPException(status_code=500, detail="Gagal mem-parsing respons dari LLM.")
    except Exception as e:
        print(f"ERROR:    Error memanggil Gemini API (Divisi): {type(e).__name__} - {e}")
        if hasattr(response, 'prompt_feedback'):
             print(f"         Prompt Feedback: {response.prompt_feedback}")
        raise HTTPException(status_code=500, detail=f"Gagal menghasilkan laporan Divisi dari LLM. Error: {str(e)}")

# Update deploy fix routing