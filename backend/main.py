from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, SQLModel, Field
from sqlalchemy.orm import joinedload
from typing import Optional, List
from datetime import datetime, timedelta, date
import google.generativeai as genai
import json
from config import settings
from database import create_db_and_tables, get_session, engine
from models import User, Task 
from auth import (
    get_password_hash, verify_password, create_access_token, 
    get_current_user, get_current_active_manager, Token
)

# --- SKEMA PYDANTIC ---
class UserRead(SQLModel):
    user_id: str
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

class TaskCreate(SQLModel):
    title: str
    description:str
    priority: str = "Medium"
    due_date: date
    user_id: str

class TaskRead(SQLModel):
    task_id: str
    user_id: str
    title: str
    description: Optional[str]
    status: str
    priority: str
    due_date: Optional[datetime]
    completed_at: Optional[datetime]
    submission_link: Optional[str]
    rating: Optional[int]
    feedback: Optional[str]
    user: Optional[UserRead] = None

class TaskSubmission(SQLModel):
    submission_link: str

class TaskReview(SQLModel):
    rating: int = Field(default=None, ge=1, le=5)
    feedback: str
    action: str

class ReportRequest(SQLModel):
    user_id: str
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
    allow_origins=[
        "http://localhost:5173",               # Agar tetap bisa di-test di komputer lokal
        "https://pih-frontend-nine.vercel.app" # Alamat Frontend Vercel kamu
    ],
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
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(status_code=401, detail="data yang dimasukkan tidak valid")
    token = create_access_token(data={"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

@app.post("/users", response_model=UserRead)
def create_user(*, session: Session = Depends(get_session), user_data: UserCreate):
    # 1. Validasi Keunikan Email & Samakan Pesan Error dengan Laporan (UC-02)
    if session.exec(select(User).where(User.email == user_data.email)).first():
        # Ganti pesan detail agar 1:1 dengan Tabel 4.7 di laporanmu
        raise HTTPException(status_code=400, detail="data yang dimasukkan tidak valid")

    # 2. Logika Auto-Increment USR0001 (Diletakkan SEBELUM instansiasi objek)
    last_user = session.exec(select(User).order_by(User.user_id.desc())).first()
    if last_user:
        # Menghapus kata "USR" lalu mengubah sisa angkanya jadi integer
        last_num = int(last_user.user_id.replace("USR", ""))
        new_id = f"USR{last_num + 1:04d}" # Hasilnya misal: USR0002
    else:
        new_id = "USR0001"

    # 3. Pengolahan Data Kamus (Dictionary)
    user_dict = user_data.model_dump()

    # --- PERBAIKAN LOGIKA PASSWORD DI SINI ---
    # Overwrite (timpa) password plain-text dengan hasil hashing.
    # JANGAN pakai 'del user_dict["password"]' karena kolom di DB sekarang bernama "password"
    user_dict["password"] = get_password_hash(user_data.password)

    # 4. Masukkan user_id yang baru saja kita generate
    user_dict["user_id"] = new_id

    # 5. Simpan ke Database
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
def update_user(*, session: Session = Depends(get_session), user_id: str, user_update: UserUpdate, manager: User = Depends(get_current_active_manager)):
    db_user = session.get(User, user_id)
    if not db_user: raise HTTPException(404, "User not found")
    data = user_update.model_dump(exclude_unset=True)
    
    # PERBAIKAN LOGIKA EDIT PASSWORD
    if "password" in data and data["password"]: 
        data["password"] = get_password_hash(data["password"]) # Tetap pakai "password"
        
    for k, v in data.items(): setattr(db_user, k, v)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user

@app.delete("/users/{user_id}")
def delete_user(*, session: Session = Depends(get_session), user_id: str, manager: User = Depends(get_current_active_manager)):
    user = session.get(User, user_id)
    if not user: raise HTTPException(404, "User not found")
    if user.user_id == manager.user_id: raise HTTPException(400, "Tidak bisa hapus diri sendiri")
    session.delete(user)
    session.commit()
    return {"ok": True}

# --- TASK MANAGEMENT ---
@app.post("/tasks", response_model=TaskRead)
def create_task(*, session: Session = Depends(get_session), task_data: TaskCreate, manager: User = Depends(get_current_active_manager)):
    # 1. Validasi parameter kosong (Harus 1:1 dengan narasi Use Case)
    if not task_data.title or not task_data.user_id:
        raise HTTPException(status_code=400, detail="parameter wajib diisi")

    # 2. Cek apakah user penerima tugas itu ada di database
    if not session.get(User, task_data.user_id): 
        raise HTTPException(404, "User not found")
    
    # 3. Logika Auto-Increment TSK0001
    last_task = session.exec(select(Task).order_by(Task.task_id.desc())).first()
    if last_task:
        last_num = int(last_task.task_id.replace("TSK", ""))
        new_id = f"TSK{last_num + 1:04d}"
    else:
        new_id = "TSK0001"

    # 4. Memasukkan data ke dalam tabel
    task_dict = task_data.model_dump()
    task_dict["task_id"] = new_id
    db_task = Task(**task_dict)
    
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    
    db_task = session.exec(
        select(Task).where(Task.task_id == db_task.task_id).options(joinedload(Task.user))
    ).one()
    
    return db_task

@app.get("/tasks/me", response_model=List[TaskRead])
def read_my_tasks(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    return session.exec(
        select(Task)
        .where(Task.user_id == user.user_id)
        .options(joinedload(Task.user))
    ).all()

@app.get("/tasks", response_model=List[TaskRead])
def read_all_tasks(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    return session.exec(select(Task).options(joinedload(Task.user))).all()

@app.put("/tasks/{task_id}/complete", response_model=TaskRead)
def complete_task(*, session: Session = Depends(get_session), task_id: str, link: TaskSubmission, user: User = Depends(get_current_user)):
    task = session.get(Task, task_id)
    if not task or task.user_id != user.user_id: raise HTTPException(404, "Tugas tidak valid")
    task.status = "Done"
    task.completed_at = datetime.utcnow()
    task.submission_link = link.submission_link
    session.add(task)
    session.commit()
    session.refresh(task)
    return task

@app.put("/tasks/{task_id}/review", response_model=TaskRead)
def review_task(*, session: Session = Depends(get_session), task_id: str, review: TaskReview, manager: User = Depends(get_current_active_manager)):
    task = session.get(Task, task_id)
    if not task: raise HTTPException(404, "Task not found")
    
    if review.action == "revise":
        task.status = "Need Revision"
        task.feedback = review.feedback
        task.rating = None
    elif review.action == "approve":
        if review.rating is None: raise HTTPException(400, "feedback dan rating wajib diisi")
        task.status = "Reviewed"
        task.rating = review.rating
        task.feedback = review.feedback
    
    session.add(task)
    session.commit()
    session.refresh(task)
    return task

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

# =====================================================================
# 1. MESIN PENGHITUNG SPK (PYTHON SCORING ENGINE)
# =====================================================================

def calculate_spk_scores(on_time_pct: float, avg_rating: float, feedbacks: list) -> dict:
    """Mesin SPK untuk laporan Individu"""
    text = " ".join(feedbacks).lower() if feedbacks else ""

    # INTEGRITY
    if on_time_pct == 100: integrity = 4 if any(w in text for w in ["terlambat", "pelanggaran", "abaikan"]) else 5
    elif on_time_pct >= 80: integrity = 4
    elif on_time_pct >= 50: integrity = 3
    elif on_time_pct > 0: integrity = 2
    else: integrity = 1

    # CREATIVE
    if avg_rating >= 4.5 and any(w in text for w in ["keren", "estetik", "bagus", "mantap", "sempurna"]): creative = 5
    elif avg_rating >= 4.0: creative = 4
    elif avg_rating >= 3.0: creative = 3
    elif avg_rating >= 2.0: creative = 2
    else: creative = 1

    # INNOVATIVE
    if any(w in text for w in ["terobosan", "ide", "brilian"]): innovative = 5
    elif any(w in text for w in ["inisiatif", "solutif", "baru"]): innovative = 4
    elif any(w in text for w in ["monoton", "membosankan", "biasa", "kaku"]): innovative = 1
    elif avg_rating >= 4.0: innovative = 3
    else: innovative = 2

    # COLLABORATIVE
    if any(w in text for w in ["komunikatif", "proaktif", "responsif", "cepat"]): collab = 5
    elif any(w in text for w in ["lambat", "slow", "kurang", "sulit dihubungi"]): collab = 2
    elif any(w in text for w in ["menghilang", "mangkir", "kabur"]): collab = 1
    else: collab = 4

    # RESILIENT
    if not feedbacks or not any(w in text for w in ["revisi", "perbaikan"]): resilient = 5
    elif any(w in text for w in ["fatal", "gagal", "menyerah", "mengecewakan"]): resilient = 1
    elif any(w in text for w in ["berulang", "sering salah", "ceroboh"]): resilient = 2
    elif any(w in text for w in ["perlu perbaikan", "kurang teliti"]): resilient = 3
    else: resilient = 4

    return {"Integrity": integrity, "Creative": creative, "Innovative": innovative, "Collaborative": collab, "Resilient": resilient}

def calculate_division_spk_scores(on_time_pct: float, avg_rating: float, feedbacks: list, total_tasks: int, target_total: int) -> dict:
    """Mesin SPK khusus untuk laporan Divisi (Kolektif)"""
    text = " ".join(feedbacks).lower() if feedbacks else ""

    # INTEGRITY
    if on_time_pct == 100: integrity = 4 if any(w in text for w in ["terlambat", "pelanggaran", "abaikan"]) else 5
    elif on_time_pct >= 80: integrity = 4
    elif on_time_pct >= 50: integrity = 3
    elif on_time_pct > 0: integrity = 2
    else: integrity = 1

    # CREATIVE
    if avg_rating >= 4.5 and any(w in text for w in ["keren", "estetik", "bagus", "mantap"]): creative = 5
    elif avg_rating >= 4.0: creative = 4
    elif avg_rating >= 3.0: creative = 3
    elif avg_rating >= 2.0: creative = 2
    else: creative = 1

    # INNOVATIVE
    if any(w in text for w in ["terobosan", "ide", "brilian"]): innovative = 5
    elif any(w in text for w in ["inisiatif", "solutif", "baru"]): innovative = 4
    elif any(w in text for w in ["monoton", "membosankan", "biasa", "tidak berkembang"]): innovative = 1
    elif avg_rating >= 4.0: innovative = 3
    else: innovative = 2

    # COLLABORATIVE
    if any(w in text for w in ["solid", "kompak", "kolaboratif", "sangat baik"]): collab = 5
    elif any(w in text for w in ["lambat respon", "sulit diajak", "kurang koordinasi"]): collab = 2
    elif any(w in text for w in ["menghilang", "mangkir"]): collab = 1
    else: collab = 4

    # RESILIENT (Fokus pada pencapaian Target Divisi vs Aktual)
    if total_tasks > target_total and not any(w in text for w in ["revisi", "perbaikan"]): resilient = 5
    elif total_tasks >= target_total: resilient = 4
    elif total_tasks >= (target_total * 0.8): resilient = 3
    elif total_tasks > 0: resilient = 2
    else: resilient = 1

    return {"Integrity": integrity, "Creative": creative, "Innovative": innovative, "Collaborative": collab, "Resilient": resilient}


# =====================================================================
# 2. PROMPT INDIVIDU
# =====================================================================

def create_kpi_prompt_advanced(user_name: str, divisi: str, kpi_data: dict) -> str:
    prompt_structure = {
        "system_instruction": {
            "role_definition": f"Anda adalah AI Report Writer. Tugas Anda HANYA MENYUSUN NARASI untuk intern: {user_name} dari divisi {divisi}. BUKAN TIM.",
            "scoring_guideline": {
                "rules": "Sistem Backend telah menghitung skor matematis. ANDA DILARANG KERAS MENGUBAH SKOR TERSEBUT. Gunakan angka persis dari 'precalculated_scores'."
            },
            "input_context": {
                "task_data": kpi_data,
                "logic": "Baca 'precalculated_scores', lalu buat kalimat 'justification' mengapa nilai itu didapat berdasarkan data on-time, avg_rating, dan feedbacks."
            },
            "response_requirement": {
                "format_constraint": "HANYA KEMBALIKAN JSON VALID.",
                "output_schema": {
                    "narrative_report": f"Wajib 3 paragraf. Gunakan subjek '{user_name}'. Paragraf 1: Ringkasan objektif (Sebutkan on-time & rata-rata rating). Paragraf 2: Analisis Kekuatan (Kutip feedback positif). Paragraf 3: Area perbaikan untuk rekomendasi ke Team Lead.",
                    "chart_data": {
                        "label": "Total Tugas Selesai",
                        "actual": kpi_data['total_tasks'],
                        "target": kpi_data['kpi_target']
                    },
                    "value_scores": [
                        {"value_name": "Creative", "score": kpi_data['precalculated_scores']['Creative'], "justification": "Berikan alasan berdasarkan avg_rating dan feedback visual."},
                        {"value_name": "Integrity", "score": kpi_data['precalculated_scores']['Integrity'], "justification": "Berikan alasan berdasarkan persentase tepat waktu."},
                        {"value_name": "Resilient", "score": kpi_data['precalculated_scores']['Resilient'], "justification": "Berikan alasan berdasarkan sejarah revisi di feedback."},
                        {"value_name": "Collaborative", "score": kpi_data['precalculated_scores']['Collaborative'], "justification": "Berikan alasan kelancaran komunikasi."},
                        {"value_name": "Innovative", "score": kpi_data['precalculated_scores']['Innovative'], "justification": "Berikan alasan terkait inisiatif/ide atau kurangnya terobosan."}
                    ]
                }
            }
        }
    }
    return json.dumps(prompt_structure, indent=2)

# =====================================================================
# 3. PROMPT DIVISI
# =====================================================================

def create_division_kpi_prompt_advanced(divisi: str, kpi_data: dict) -> str:
    prompt_structure = {
        "system_instruction": {
            "role_definition": f"Anda adalah AI Report Writer. Tugas Anda HANYA MENYUSUN NARASI untuk laporan kolektif Divisi: {divisi}. FOKUS PADA PERFORMA TIM.",
            "scoring_guideline": {
                "rules": "Sistem Backend telah menghitung skor matematis. ANDA DILARANG KERAS MENGUBAH SKOR TERSEBUT. Gunakan angka persis dari 'precalculated_scores'."
            },
            "input_context": {
                "division_data": kpi_data,
                "logic": "Baca 'precalculated_scores', lalu buat kalimat 'justification' mengapa nilai itu didapat berdasarkan pencapaian target, avg_rating, dan feedbacks tim."
            },
            "response_requirement": {
                "format_constraint": "HANYA KEMBALIKAN JSON VALID.",
                "output_schema": {
                    "narrative_report": f"Wajib 3 paragraf. Gunakan subjek 'Divisi {divisi}'. Paragraf 1: Pencapaian target (total_tasks vs kpi_target_total). Paragraf 2: Analisis Kekuatan Tim. Paragraf 3: Analisis Kelemahan & Rekomendasi Strategis untuk Kepala PIH.",
                    "chart_data": {
                        "label": "Total Tugas Divisi",
                        "actual": kpi_data['total_tasks'],
                        "target": kpi_data['kpi_target_total']
                    },
                    "value_scores": [
                        {"value_name": "Creative", "score": kpi_data['precalculated_scores']['Creative'], "justification": "Berikan alasan berdasarkan avg_rating divisi."},
                        {"value_name": "Integrity", "score": kpi_data['precalculated_scores']['Integrity'], "justification": "Berikan alasan berdasarkan persentase on-time kolektif."},
                        {"value_name": "Resilient", "score": kpi_data['precalculated_scores']['Resilient'], "justification": "Berikan alasan berdasarkan pencapaian target total vs aktual."},
                        {"value_name": "Collaborative", "score": kpi_data['precalculated_scores']['Collaborative'], "justification": "Berikan alasan berdasarkan evaluasi kerja sama divisi."},
                        {"value_name": "Innovative", "score": kpi_data['precalculated_scores']['Innovative'], "justification": "Berikan alasan berdasarkan ada/tidaknya inisiatif kolektif."}
                    ]
                }
            }
        }
    }
    return json.dumps(prompt_structure, indent=2)

# =====================================================================
# 4. ENDPOINT INDIVIDU
# =====================================================================

@app.post("/generate-report")
async def generate_report(request: ReportRequest, session: Session = Depends(get_session), manager: User = Depends(get_current_active_manager)):
    # 1. SATPAM PARAMETER: Pastikan Kepala PIH sudah memilih nama dan tanggal
    if not request.user_id.strip() or not request.start_date.strip() or not request.end_date.strip():
        raise HTTPException(status_code=400, detail="parameter wajib diisi")

    user = session.get(User, request.user_id)
    if not user: raise HTTPException(404, "User not found")
    
    try:
        start = date.fromisoformat(request.start_date)
        end = date.fromisoformat(request.end_date)
    except: raise HTTPException(400, "Format tanggal salah")

    tasks = session.exec(select(Task).where(
        Task.user_id == request.user_id, 
        Task.status == "Reviewed",
        Task.completed_at >= start, 
        Task.completed_at <= end
    )).all()

    if not tasks: raise HTTPException(404, "Tidak ada data tugas (Reviewed) pada periode ini")

    total = len(tasks)
    on_time = 0
    ratings = []
    feedbacks = []

    for t in tasks:
        if t.due_date and t.completed_at:
            due = t.due_date.date() if isinstance(t.due_date, datetime) else t.due_date
            comp = t.completed_at.date() if isinstance(t.completed_at, datetime) else t.completed_at
            if comp <= due: on_time += 1
            
        if t.rating: ratings.append(t.rating)
        if t.feedback: feedbacks.append(t.feedback)

    avg_rate = (sum(ratings) / len(ratings)) if ratings else 0
    on_time_pct = (on_time / total * 100) if total > 0 else 0
    target = KPI_TARGETS.get(user.divisi, 5)

    # JALANKAN MESIN SPK PYTHON (INDIVIDU)
    final_scores = calculate_spk_scores(on_time_pct, avg_rate, feedbacks)

    kpi_data = { 
        "total_tasks": total, 
        "kpi_target": target, 
        "avg_rating": round(avg_rate, 1), 
        "on_time_percentage": round(on_time_pct, 1), 
        "feedbacks": feedbacks,
        "precalculated_scores": final_scores
    }

    try:
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        response = await model.generate_content_async(
            create_kpi_prompt_advanced(user.nama, user.divisi, kpi_data), 
            generation_config={"response_mime_type": "application/json", "temperature": 0.0, "top_p": 0.1, "top_k": 1}
        )
        return json.loads(clean_json_string(response.text))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Gagal memuat analisis, silakan coba lagi di menit berikutnya")

# =====================================================================
# 5. ENDPOINT DIVISI
# =====================================================================

@app.post("/generate-report/division")
async def generate_division_report(request: DivisionReportRequest, session: Session = Depends(get_session), manager: User = Depends(get_current_active_manager)):
    # 1. SATPAM PARAMETER: Pastikan Kepala PIH sudah memilih divisi dan tanggal
    if not request.divisi.strip() or not request.start_date.strip() or not request.end_date.strip():
        raise HTTPException(status_code=400, detail="parameter wajib diisi")

    try:
        start = date.fromisoformat(request.start_date)
        end = date.fromisoformat(request.end_date)
    except: raise HTTPException(400, "Format tanggal salah")

    users = session.exec(select(User).where(User.divisi == request.divisi)).all()
    if not users: raise HTTPException(404, "Divisi kosong")
    
    u_ids = [u.user_id for u in users]
    tasks = session.exec(select(Task).where(
        Task.user_id.in_(u_ids), 
        Task.status == "Reviewed", 
        Task.completed_at >= start, 
        Task.completed_at <= end
    )).all()
    
    if not tasks: raise HTTPException(404, "Tidak ada tugas Reviewed di divisi ini")

    total = len(tasks)
    on_time = 0
    ratings = []
    feedbacks = []

    for t in tasks:
        if t.due_date and t.completed_at:
            due = t.due_date.date() if isinstance(t.due_date, datetime) else t.due_date
            comp = t.completed_at.date() if isinstance(t.completed_at, datetime) else t.completed_at
            if comp <= due: on_time += 1
            
        if t.rating: ratings.append(t.rating)
        if t.feedback: feedbacks.append(t.feedback)

    avg_rate = (sum(ratings) / len(ratings)) if ratings else 0
    on_time_pct = (on_time / total * 100) if total > 0 else 0
    interns = sum(1 for u in users if u.role == 'intern')
    target_total = KPI_TARGETS.get(request.divisi, 5) * interns

    # JALANKAN MESIN SPK PYTHON (DIVISI)
    final_scores = calculate_division_spk_scores(on_time_pct, avg_rate, feedbacks, total, target_total)

    kpi_data = { 
        "start_date": request.start_date, 
        "end_date": request.end_date, 
        "total_members": interns, 
        "total_tasks": total, 
        "kpi_target_total": target_total, 
        "avg_lead_time_days": 0,
        "avg_rating": round(avg_rate, 1), 
        "on_time_percentage": round(on_time_pct, 1), 
        "feedbacks": feedbacks,
        "precalculated_scores": final_scores
    }

    try:
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        response = await model.generate_content_async(
            create_division_kpi_prompt_advanced(request.divisi, kpi_data), 
            generation_config={"response_mime_type": "application/json", "temperature": 0.0, "top_p": 0.1, "top_k": 1}
        )
        return json.loads(clean_json_string(response.text))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Gagal memuat analisis, silakan coba lagi di menit berikutnya")