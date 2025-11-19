# list_models.py
import os
import google.generativeai as genai
from dotenv import load_dotenv

# Muat variabel dari file .env
load_dotenv() 

# Ambil API Key dari environment variable
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("ERROR: GEMINI_API_KEY tidak ditemukan di file .env")
else:
    try:
        print("INFO: Mengkonfigurasi API Key...")
        genai.configure(api_key=api_key)
        print("INFO: Konfigurasi berhasil.")

        print("\nINFO: Mencoba mengambil daftar model yang tersedia...")

        # Panggil fungsi list_models()
        models_list = genai.list_models()

        print("\n--- DAFTAR MODEL YANG TERSEDIA (yang mendukung 'generateContent') ---")
        count = 0
        for m in models_list:
          # Kita hanya tertarik pada model yang mendukung metode 'generateContent'
          if 'generateContent' in m.supported_generation_methods:
            print(f"- Nama Model: {m.name}")
            count += 1

        if count == 0:
             print("\nPERINGATAN: Tidak ada model yang ditemukan mendukung 'generateContent' untuk API Key ini.")
             print("           Pastikan 'Generative Language API' sudah aktif di Google Cloud Console.")
        else:
             print(f"\nINFO: Ditemukan {count} model yang mendukung 'generateContent'.")
             print("       Gunakan salah satu 'Nama Model' di atas dalam kode Anda.")

    except Exception as e:
        print(f"\nERROR saat mencoba mengambil daftar model: {type(e).__name__} - {e}")