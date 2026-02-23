# =================================================================
# FILE: database.py (VERSI FULL CODE - LAMPIRAN SKRIPSI)
# FUNGSI: Konfigurasi Mesin Database dan Manajemen Sesi (Session)
# JUDUL: RANCANG BANGUN SISTEM MANAJEMEN KINERJA TIM MEDIA 
#        DENGAN INTEGRASI LARGE LANGUAGE MODEL SEBAGAI PENDUKUNG KEPUTUSAN
# =================================================================

from sqlmodel import create_engine, SQLModel, Session
from config import settings 

# // NOTES: Mengambil URL Database dari variabel environment (config.py) //
DATABASE_URL = settings.DATABASE_URL 

# // NOTES: Inisialisasi Engine Database. 
# Parameter echo=False digunakan agar terminal server bersih dari log query SQL saat produksi. //
engine = create_engine(DATABASE_URL, echo=False)

def create_db_and_tables():
    """
    Fungsi ini dipanggil saat aplikasi (main.py) pertama kali dijalankan (startup).
    Bertugas memvalidasi dan mencetak tabel fisik ke dalam database berdasarkan 
    skema ERD yang telah didefinisikan pada file models.py.
    """
    try:
        SQLModel.metadata.create_all(engine)
        print("Sistem Database: Sinkronisasi tabel berhasil dilakukan.")
    except Exception as e:
        print(f"Sistem Database: Terjadi kesalahan saat sinkronisasi tabel -> {e}")

def get_session():
    """
    Fungsi Dependency Injection (DI) yang digunakan oleh setiap endpoint di main.py.
    Bertugas membuka sesi database saat ada request, dan otomatis menutupnya 
    (db.close) saat request selesai untuk mencegah kebocoran memori (memory leak).
    """
    with Session(engine) as session:
        yield session