# database.py
# Ini adalah versi FINAL yang kompatibel dengan SQLModel .exec()

from sqlmodel import create_engine, SQLModel, Session # HANYA impor Session dari sqlmodel
# HAPUS: from sqlalchemy.orm import sessionmaker
# HAPUS: from pydantic_settings import BaseSettings (sudah pindah ke config.py)

# Impor settings dari file config.py baru kita
from config import settings 

# Ambil URL langsung dari settings yang diimpor
DATABASE_URL = settings.DATABASE_URL 

# Buat 'mesin' yang menghubungkan SQLModel ke DB Anda
engine = create_engine(DATABASE_URL, echo=True)

# HAPUS: SessionLocal = sessionmaker(...)

def create_db_and_tables():
    print("Mencoba membuat tabel...")
    try:
        SQLModel.metadata.create_all(engine)
        print("Tabel berhasil dibuat atau sudah ada.")
    except Exception as e:
        print(f"ERROR saat membuat tabel: {e}")

# --- FUNGSI get_session YANG BENAR (WAJIB) ---
# Ini adalah pola yang direkomendasikan oleh SQLModel
# untuk memastikan kita mendapatkan 'SQLModel Session' (yang punya .exec())
def get_session():
    with Session(engine) as session: # Buat sesi SQLModel langsung dari engine
        yield session
    # Blok 'with' akan otomatis menutup sesi (db.close())
# -----------------------------------------