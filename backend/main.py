# =================================================================
# FILE: main.py (VERSI FULL CODE - FINAL RBAC & AI INTEGRATION)
# FUNGSI: Controller Pusat Sistem Manajemen Kinerja
# JUDUL: RANCANG BANGUN SISTEM MANAJEMEN KINERJA TIM MEDIA 
#        DENGAN INTEGRASI LARGE LANGUAGE MODEL SEBAGAI PENDUKUNG KEPUTUSAN
# =================================================================

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, SQLModel
from sqlalchemy.orm import joinedload
from typing import Optional, List
from datetime import datetime, date
import google.generativeai as genai
import json

# Impor konfigurasi lokal
from config import settings
from database import create_db_and_tables, get_session
from models import User, Task 

# // NOTES: [RBAC] Mengimpor 5 Fungsi Otorisasi Eksplisit dari auth.py //
from auth import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    get_current_user, 
    get_current_administrator, 
    get_current_team_lead, 
    get_current_staf_media, 
    get_current_kepala_pih, 
    Token
)

# --- [CLASS DIAGRAM] SKEMA DATA (Pydantic Models) ---
class UserRead(SQLModel):
    id: int
    nama: str
    email: str
    role: str # administrator, team lead, staf media, intern, kepala pih & koordinator
    divisi: str

class UserCreate(SQLModel):
    nama: str
    email: str
    password: str 
    role: str 
    divisi: str

class TaskDashboardRead(SQLModel):
    id: int
    title: str
    description: Optional[str] = None
    priority: str
    status: str
    due_date: Optional[date] = None
    created_at: datetime 
    completed_at: Optional[datetime] = None 
    submission_link: Optional[str] = None
    rating: Optional[int] = None
    feedback: Optional[str] = None
    assignee_id: int
    assignee: Optional[UserRead] = None

class TaskCreate(SQLModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "Medium"
    due_date: Optional[date] = None
    assignee_id: int 

class TaskSubmission(SQLModel):
    submission_link: str

class TaskReview(SQLModel):
    rating: int
    feedback: str

# --- INISIALISASI APLIKASI ---
app = FastAPI(title="API Sistem Manajemen Kinerja Tim Media PIH")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

genai.configure(api_key=settings.GEMINI_API_KEY)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# =================================================================
# [UC-01] USE CASE: LOGIN (AUTENTIKASI)
# =================================================================
@app.post("/token", response_model=Token)
async def login(session: Session = Depends(get_session), form_data: OAuth2PasswordRequestForm = Depends()):
    # // NOTES: [SEQUENCE] Alt: Pengecekan Eksistensi User di Database //
    user = session.exec(select(User).where(User.email == form_data.username)).first()
    
    # // NOTES: [ALT-SCENARIO] Pesan Error jika akun tidak ditemukan //
    if not user:
        raise HTTPException(status_code=401, detail="Skenario Gagal: Akun tidak ditemukan.")
    
    # // NOTES: [ALT-SCENARIO] Pesan Error jika password salah //
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Skenario Gagal: Password yang Anda masukkan salah.")
    
    return {"access_token": create_access_token(data={"sub": user.email}), "token_type": "bearer"}

# =================================================================
# [UC-02] USE CASE: KELOLA DATA TIM (ADMINISTRATOR)
# =================================================================
# // NOTES: Endpoint ini dikunci HANYA untuk Administrator //
@app.post("/users", response_model=UserRead)
def addUser(user_data: UserCreate, session: Session = Depends(get_session), admin: User = Depends(get_current_administrator)):
    # // NOTES: [ACTIVITY] Diamond Decision: Pengecekan Email Unik //
    existing = session.exec(select(User).where(User.email == user_data.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Skenario Gagal: Email sudah terdaftar dalam sistem.")
    
    user_dict = user_data.model_dump()
    user_dict["hashed_password"] = get_password_hash(user_data.password)
    del user_dict["password"] 
    db_user = User(**user_dict)
    
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user

@app.get("/users", response_model=List[UserRead])
def getAllUsers(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()

# // NOTES: Endpoint ini dikunci HANYA untuk Administrator //
@app.delete("/users/{user_id}")
def deleteUser(user_id: int, session: Session = Depends(get_session), admin: User = Depends(get_current_administrator)):
    user = session.get(User, user_id)
    if not user: 
        raise HTTPException(status_code=404, detail="Skenario Gagal: User tidak ditemukan.")
    session.delete(user)
    session.commit()
    return {"status": "Skenario Sukses: User berhasil dihapus"}

# =================================================================
# [UC-03] USE CASE: MENGINPUT TUGAS (TEAM LEAD)
# =================================================================
# // NOTES: Endpoint ini dikunci HANYA untuk Team Lead //
@app.post("/tasks", response_model=TaskDashboardRead)
def addTask(*, session: Session = Depends(get_session), task_data: TaskCreate, lead: User = Depends(get_current_team_lead)):
    db_task = Task.model_validate(task_data)
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task

# =================================================================
# [UC-04] USE CASE: SUBMIT TUGAS (INTERN)
# =================================================================
# // NOTES: Menggunakan get_current_user biasa karena validasi kepemilikan ada di dalam logika //
@app.put("/tasks/{task_id}/submit", response_model=TaskDashboardRead)
def submitTask(task_id: int, submission: TaskSubmission, session: Session = Depends(get_session), intern: User = Depends(get_current_user)):
    task = session.get(Task, task_id)
    
    # // NOTES: [ALT-SCENARIO] Pengecekan otoritas kepemilikan tugas //
    if not task or task.assignee_id != intern.id:
        raise HTTPException(status_code=403, detail="Skenario Gagal: Anda tidak memiliki akses ke tugas ini.")
    
    # // NOTES: [OPT] Pencatatan waktu selesai untuk hitung efisiensi Due Date //
    task.status = "Done"
    task.submission_link = submission.submission_link
    task.completed_at = datetime.utcnow() 
    
    session.add(task)
    session.commit()
    session.refresh(task)
    return task

# =================================================================
# [UC-05] USE CASE: REVIEW & FEEDBACK (STAF MEDIA)
# =================================================================
# // NOTES: Endpoint ini dikunci HANYA untuk Staf Media //
@app.put("/tasks/{task_id}/review", response_model=TaskDashboardRead)
def reviewTask(task_id: int, review: TaskReview, session: Session = Depends(get_session), staf: User = Depends(get_current_staf_media)):
    task = session.get(Task, task_id)
    if not task: 
        raise HTTPException(status_code=404, detail="Skenario Gagal: Tugas tidak ditemukan.")
    
    # // NOTES: [ALT-SCENARIO] Validasi Rating Wajib (1-5) //
    if review.rating < 1 or review.rating > 5:
        raise HTTPException(status_code=400, detail="Skenario Gagal: Rating harus berada pada skala 1 sampai 5.")
        
    task.status = "Reviewed"
    task.rating = review.rating
    task.feedback = review.feedback
    
    session.add(task)
    session.commit()
    session.refresh(task)
    return task

# =================================================================
# [UC-06] USE CASE: GENERATE LAPORAN KINERJA (KEPALA PIH & KOORDINATOR)
# =================================================================
# // NOTES: Endpoint ini dikunci HANYA untuk Kepala PIH & Koordinator //
@app.post("/generate-report")
async def generateReport(user_id: int, session: Session = Depends(get_session), pimpinan: User = Depends(get_current_kepala_pih)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Skenario Gagal: Anggota tim tidak ditemukan.")

    # // NOTES: [ALT-SCENARIO] Cek ketersediaan data sebelum dikirim ke AI //
    tasks = session.exec(select(Task).where(Task.assignee_id == user_id, Task.status == "Reviewed")).all()
    if not tasks:
        raise HTTPException(status_code=404, detail="Skenario Gagal: Data kinerja belum mencukupi untuk dianalisis AI.")
    
    # // NOTES: Sistem menyatukan data metrik waktu dan kualitas //
    prompt = f"""
    Evaluasi kinerja {user.nama} dari divisi {user.divisi}.
    Data: {len(tasks)} tugas diselesaikan. Detail data tugas: {str(tasks)}.
    Analisislah kedisiplinan (selisih completed_at vs due_date) dan kualitas (rating).
    Berikan skor (1-5) untuk Core Values (Creative, Integrity, Resilient, Collaborative, Innovative). 
    Berikan narasi evaluasi secara profesional. Output harus berformat JSON VALID tanpa markdown.
    """
    
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = await model.generate_content_async(prompt)
        # Membersihkan format markdown jika AI merespon dengan blok kode
        clean_response = response.text.strip().replace('```json', '').replace('```', '')
        return json.loads(clean_response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Skenario Gagal: Terjadi gangguan pada sistem AI. Detail: {str(e)}")

# =================================================================
# API BACA SELURUH TUGAS (DASHBOARD)
# =================================================================
@app.get("/tasks", response_model=List[TaskDashboardRead])
def getDashboardTasks(session: Session = Depends(get_session)):
    # // NOTES: [UI-SYNC] Menarik seluruh tabel tugas dengan relasi assigneenya //
    return session.exec(select(Task).options(joinedload(Task.assignee))).all()